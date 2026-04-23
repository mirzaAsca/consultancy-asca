/**
 * Phase 4.2 — weekly deep-dive analytics (pure helpers).
 *
 * The dashboard `/analytics` route consumes this module. All DB reads happen
 * in the caller (background service worker); we receive pre-loaded inputs and
 * return a deterministic snapshot so the math stays unit-testable without an
 * IndexedDB shim.
 *
 * Invariant: free of `chrome.*`, `idb`, and DOM imports so it runs under
 * vitest without any polyfill stack.
 */
import type {
  AnalyticsCohortRow,
  AnalyticsSnapshot,
  AnalyticsTotals30d,
  DailyActionsPoint,
  DailyUsage,
  EventToActionLatency,
  FeedEventKind,
  FeedTaskStatus,
  FirmTierBucket,
  InboxRatio,
  OutreachAction,
  OutreachActionKind,
  ProspectLevel,
  WeeklyAcceptRatePoint,
} from './types';
import { localDayBucket } from './time';

const MS_PER_DAY = 86_400_000;

/**
 * Classify a persisted `score_breakdown.firm` weight into a coarse tier.
 * Thresholds match the v2 spec's default firm-weight convention
 * (top +40, mid +25, boutique +15).
 */
export function firmTierBucket(firmScore: number | null | undefined): FirmTierBucket {
  if (!firmScore || firmScore <= 0) return 'none';
  if (firmScore >= 30) return 'top';
  if (firmScore >= 15) return 'mid';
  return 'boutique';
}

/** Minimal prospect projection the analytics module needs. */
export interface AnalyticsProspectInput {
  id: number;
  level: ProspectLevel;
  /** From `Prospect.score_breakdown.firm` — may be null for unscored rows. */
  firm_score: number | null;
}

/** Minimal feed-event projection used for cohort + latency math. */
export interface AnalyticsFeedEventInput {
  id: number;
  prospect_id: number;
  event_kind: FeedEventKind;
  first_seen_at: number;
  task_status: FeedTaskStatus;
}

export interface ComputeAnalyticsInput {
  now: number;
  today_bucket: string;
  prospects: AnalyticsProspectInput[];
  outreach_actions: OutreachAction[];
  feed_events: AnalyticsFeedEventInput[];
  /** Last 30 local-day buckets, oldest → newest. */
  daily_usage: DailyUsage[];
}

/**
 * Build the rolling 30-day bucket strings (oldest → newest). Mirrors the
 * noon-anchor trick from `buildWeekBuckets` so DST transitions during the
 * arithmetic don't flip the wall-clock date.
 */
export function buildMonthBuckets(todayBucket: string, days = 30): string[] {
  const [y, m, d] = todayBucket.split('-').map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return [];
  }
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const stamp = new Date(anchor);
    stamp.setDate(anchor.getDate() - i);
    out.push(formatBucket(stamp));
  }
  return out;
}

/**
 * Given `nowMs`, return the Monday-anchored start-of-week in local time as
 * `YYYY-MM-DD`. Weeks start Monday for consistency with ISO-8601.
 */
export function weekStartBucket(epochMs: number): string {
  const d = new Date(epochMs);
  // `getDay()`: Sun=0..Sat=6. We want Mon=0..Sun=6.
  const offsetToMonday = (d.getDay() + 6) % 7;
  const monday = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - offsetToMonday,
    12,
    0,
    0,
    0,
  );
  return formatBucket(monday);
}

/** Build the last `weeks` Monday-start buckets (oldest → newest). */
export function build12WeekBuckets(nowMs: number, weeks = 12): string[] {
  const todayMonday = weekStartBucket(nowMs);
  const [y, m, d] = todayMonday.split('-').map(Number);
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  const out: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const stamp = new Date(anchor);
    stamp.setDate(anchor.getDate() - i * 7);
    out.push(formatBucket(stamp));
  }
  return out;
}

function formatBucket(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Pure function — build the {@link AnalyticsSnapshot} from pre-loaded inputs.
 */
export function computeAnalyticsSnapshot(
  input: ComputeAnalyticsInput,
): AnalyticsSnapshot {
  const { now, today_bucket, prospects, outreach_actions, feed_events, daily_usage } =
    input;

  const prospectById = new Map<number, AnalyticsProspectInput>();
  for (const p of prospects) prospectById.set(p.id, p);

  const feedEventById = new Map<number, AnalyticsFeedEventInput>();
  const eventsByProspect = new Map<number, AnalyticsFeedEventInput[]>();
  for (const ev of feed_events) {
    feedEventById.set(ev.id, ev);
    let list = eventsByProspect.get(ev.prospect_id);
    if (!list) {
      list = [];
      eventsByProspect.set(ev.prospect_id, list);
    }
    list.push(ev);
  }
  for (const list of eventsByProspect.values()) {
    list.sort((a, b) => a.first_seen_at - b.first_seen_at);
  }

  const monthBuckets = buildMonthBuckets(today_bucket, 30);
  const monthBucketSet = new Set(monthBuckets);
  const usageByBucket = new Map<string, DailyUsage>();
  for (const row of daily_usage) usageByBucket.set(row.day_bucket, row);

  const actionsByBucket = new Map<string, Record<OutreachActionKind, number>>();
  for (const bucket of monthBuckets) {
    actionsByBucket.set(bucket, {
      profile_visit: 0,
      connection_request_sent: 0,
      message_sent: 0,
      followup_message_sent: 0,
    });
  }
  for (const action of outreach_actions) {
    if (action.sent_at === null) continue;
    const bucket = localDayBucket(action.sent_at);
    if (!monthBucketSet.has(bucket)) continue;
    const row = actionsByBucket.get(bucket);
    if (!row) continue;
    row[action.kind] = (row[action.kind] ?? 0) + 1;
  }

  const actions_30d: DailyActionsPoint[] = monthBuckets.map((bucket) => {
    const a = actionsByBucket.get(bucket) ?? ({
      profile_visit: 0,
      connection_request_sent: 0,
      message_sent: 0,
      followup_message_sent: 0,
    } as Record<OutreachActionKind, number>);
    const usage = usageByBucket.get(bucket);
    return {
      day_bucket: bucket,
      profile_visit: a.profile_visit,
      connection_request_sent: a.connection_request_sent,
      message_sent: a.message_sent,
      followup_message_sent: a.followup_message_sent,
      feed_events_captured: usage?.feed_events_captured ?? 0,
    };
  });

  // ——— 12-week accept rate ———
  const weekBuckets = build12WeekBuckets(now, 12);
  const weekBucketSet = new Set(weekBuckets);
  const weekStats = new Map<string, { invites_sent: number; accepts: number }>();
  for (const bucket of weekBuckets) {
    weekStats.set(bucket, { invites_sent: 0, accepts: 0 });
  }
  for (const action of outreach_actions) {
    if (action.kind !== 'connection_request_sent') continue;
    if (action.sent_at !== null) {
      const wk = weekStartBucket(action.sent_at);
      if (weekBucketSet.has(wk)) {
        const cur = weekStats.get(wk);
        if (cur) cur.invites_sent += 1;
      }
    }
    if (action.state === 'accepted' && action.resolved_at !== null) {
      const wk = weekStartBucket(action.resolved_at);
      if (weekBucketSet.has(wk)) {
        const cur = weekStats.get(wk);
        if (cur) cur.accepts += 1;
      }
    }
  }
  const accept_rate_12w: WeeklyAcceptRatePoint[] = weekBuckets.map((wk) => {
    const s = weekStats.get(wk) ?? { invites_sent: 0, accepts: 0 };
    return {
      week_start: wk,
      invites_sent: s.invites_sent,
      accepts: s.accepts,
      accept_rate:
        s.invites_sent > 0 ? s.accepts / s.invites_sent : null,
    };
  });

  // ——— Event → action latency ———
  const latencies: number[] = [];
  const monthCutoff = now - 30 * MS_PER_DAY;
  for (const action of outreach_actions) {
    if (action.sent_at === null || action.sent_at < monthCutoff) continue;
    if (action.kind === 'profile_visit') continue;
    // Prefer explicit correlation; otherwise nearest preceding event.
    let eventTs: number | null = null;
    if (action.source_feed_event_id !== null) {
      const ev = feedEventById.get(action.source_feed_event_id);
      if (ev && ev.first_seen_at <= action.sent_at) {
        eventTs = ev.first_seen_at;
      }
    }
    if (eventTs === null) {
      const bucket = eventsByProspect.get(action.prospect_id);
      if (bucket) {
        for (let i = bucket.length - 1; i >= 0; i--) {
          if (bucket[i].first_seen_at <= action.sent_at) {
            eventTs = bucket[i].first_seen_at;
            break;
          }
        }
      }
    }
    if (eventTs === null) continue;
    latencies.push(action.sent_at - eventTs);
  }
  const event_to_action: EventToActionLatency = summarizeLatencies(latencies);

  // ——— Inbox ratio ———
  let captured = 0;
  let handled = 0;
  let newCount = 0;
  for (const ev of feed_events) {
    captured++;
    if (ev.task_status === 'new') newCount++;
    else handled++;
  }
  const inbox_ratio: InboxRatio = {
    captured,
    handled,
    new_count: newCount,
    handled_rate: captured > 0 ? handled / captured : null,
  };

  // ——— Cohort: by level (current level as proxy for level-at-first-touch) ———
  const levelStats = new Map<
    ProspectLevel,
    { invites_sent: number; accepts: number }
  >();
  const firmStats = new Map<
    FirmTierBucket,
    { invites_sent: number; accepts: number }
  >();
  const eventKindStats = new Map<
    FeedEventKind | 'no_event',
    { invites_sent: number; accepts: number }
  >();

  for (const action of outreach_actions) {
    if (action.kind !== 'connection_request_sent') continue;
    if (action.sent_at === null) continue;
    if (action.sent_at < monthCutoff) continue;
    const p = prospectById.get(action.prospect_id);
    const level: ProspectLevel = p?.level ?? 'NONE';
    const firmKey = firmTierBucket(p?.firm_score ?? null);
    const sourceEvent =
      action.source_feed_event_id !== null
        ? feedEventById.get(action.source_feed_event_id)
        : undefined;
    const eventKey: FeedEventKind | 'no_event' = sourceEvent
      ? sourceEvent.event_kind
      : 'no_event';

    bumpCohort(levelStats, level, action.state === 'accepted');
    bumpCohort(firmStats, firmKey, action.state === 'accepted');
    bumpCohort(eventKindStats, eventKey, action.state === 'accepted');
  }

  const cohort_by_level: AnalyticsCohortRow<ProspectLevel>[] = (
    ['1st', '2nd', '3rd', 'OUT_OF_NETWORK', 'NONE'] as ProspectLevel[]
  )
    .map((k) => cohortRow(k, levelStats.get(k)))
    .filter((r) => r.invites_sent > 0);
  const cohort_by_firm_tier: AnalyticsCohortRow<FirmTierBucket>[] = (
    ['top', 'mid', 'boutique', 'none'] as FirmTierBucket[]
  )
    .map((k) => cohortRow(k, firmStats.get(k)))
    .filter((r) => r.invites_sent > 0);
  const cohort_by_event_kind: AnalyticsCohortRow<FeedEventKind | 'no_event'>[] = (
    [
      'post',
      'comment',
      'repost',
      'reaction',
      'mention',
      'tagged',
      'no_event',
    ] as Array<FeedEventKind | 'no_event'>
  )
    .map((k) => cohortRow(k, eventKindStats.get(k)))
    .filter((r) => r.invites_sent > 0);

  // ——— 30-day totals (headline strip) ———
  let inv = 0;
  let acc = 0;
  let msg = 0;
  let visits = 0;
  let feed = 0;
  for (const point of actions_30d) {
    inv += point.connection_request_sent;
    msg += point.message_sent + point.followup_message_sent;
    visits += point.profile_visit;
    feed += point.feed_events_captured;
  }
  for (const action of outreach_actions) {
    if (action.kind !== 'connection_request_sent') continue;
    if (action.state !== 'accepted') continue;
    if (action.resolved_at === null) continue;
    if (action.resolved_at < monthCutoff) continue;
    acc += 1;
  }
  const totals_30d: AnalyticsTotals30d = {
    invites_sent: inv,
    accepts: acc,
    messages_sent: msg,
    profile_visits: visits,
    feed_events_captured: feed,
  };

  return {
    generated_at: now,
    today_bucket,
    actions_30d,
    accept_rate_12w,
    event_to_action,
    inbox_ratio,
    cohort_by_level,
    cohort_by_firm_tier,
    cohort_by_event_kind,
    totals_30d,
  };
}

function bumpCohort<K>(
  map: Map<K, { invites_sent: number; accepts: number }>,
  key: K,
  accepted: boolean,
): void {
  let cur = map.get(key);
  if (!cur) {
    cur = { invites_sent: 0, accepts: 0 };
    map.set(key, cur);
  }
  cur.invites_sent += 1;
  if (accepted) cur.accepts += 1;
}

function cohortRow<K extends string>(
  key: K,
  raw: { invites_sent: number; accepts: number } | undefined,
): AnalyticsCohortRow<K> {
  const s = raw ?? { invites_sent: 0, accepts: 0 };
  return {
    key,
    invites_sent: s.invites_sent,
    accepts: s.accepts,
    accept_rate: s.invites_sent > 0 ? s.accepts / s.invites_sent : null,
  };
}

/** Quantile via the R-7 / Excel-compatible linear-interpolation rule. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

function summarizeLatencies(latencies: number[]): EventToActionLatency {
  if (latencies.length === 0) {
    return { sample_size: 0, median_ms: null, p90_ms: null };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    sample_size: sorted.length,
    median_ms: Math.round(quantile(sorted, 0.5)),
    p90_ms: Math.round(quantile(sorted, 0.9)),
  };
}
