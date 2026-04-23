/**
 * Phase 4.3 — health snapshot + kill switch + resume cooldown (pure helpers).
 *
 * The dashboard `/health` route and the scan worker both consume this module.
 * All DB reads happen in the caller (background service worker); we receive
 * pre-loaded inputs and return a deterministic snapshot so the math stays
 * unit-testable without an IndexedDB shim.
 *
 * Invariant: this file must stay free of `chrome.*`, `idb`, and DOM imports
 * so it can run under vitest without a jsdom-equivalent polyfill stack.
 */
import type {
  AutoPauseReason,
  DailyUsage,
  HealthBreach,
  HealthCooldown,
  HealthDaily,
  HealthSnapshot,
  KillSwitchThresholds,
} from './types';
import { localDayBucket } from './time';

const MS_PER_HOUR = 3_600_000;

/**
 * Pre-loaded inputs for {@link computeHealthSnapshot}. Caller is responsible
 * for loading the raw rows (see `db.ts#getDailyUsageRange` etc.).
 */
export interface ComputeHealthSnapshotInput {
  now: number;
  today_bucket: string;
  /** Caller loads 7 rows (today + 6 prior); missing days can be absent. */
  daily_usage: DailyUsage[];
  /** Raw `scan_auto_paused` entries from activity_log within the 7d window. */
  safety_events: Array<{ ts: number; reason: AutoPauseReason }>;
  /** Accepted outreach_actions resolved within the 7d window. */
  accepts: Array<{ resolved_at: number }>;
  /** Sent/accepted/declined/expired/withdrawn invites stamped within 7d. */
  invites: Array<{ sent_at: number }>;
  thresholds: KillSwitchThresholds;
  cooldown_hours: number;
  /** Latest `scan_auto_paused` entry with `data.reason === 'health_breach'`. */
  last_breach_at: number | null;
}

/**
 * Build the rolling 7-day bucket strings (oldest → newest). Mirrors the
 * noon-anchor trick from `getWeeklyInvitesUsed` so DST transitions during
 * the arithmetic don't flip the wall-clock date.
 */
export function buildWeekBuckets(todayBucket: string): string[] {
  const [y, m, d] = todayBucket.split('-').map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return [];
  }
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  const out: string[] = [];
  // Build oldest → newest: i=6 is 6 days ago, i=0 is today.
  for (let i = 6; i >= 0; i--) {
    const stamp = new Date(anchor);
    stamp.setDate(anchor.getDate() - i);
    const bucket = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(stamp.getDate()).padStart(2, '0')}`;
    out.push(bucket);
  }
  return out;
}

/**
 * Pure function: build the {@link HealthSnapshot} from pre-loaded inputs.
 * Returns zero-filled rows for any day without a `DailyUsage` entry so the
 * sparkline is always length 7.
 */
export function computeHealthSnapshot(
  input: ComputeHealthSnapshotInput,
): HealthSnapshot {
  const {
    now,
    today_bucket,
    daily_usage,
    safety_events,
    accepts,
    invites,
    thresholds,
    cooldown_hours,
    last_breach_at,
  } = input;

  const buckets = buildWeekBuckets(today_bucket);
  const bucketSet = new Set(buckets);

  const usageByBucket = new Map<string, DailyUsage>();
  for (const row of daily_usage) {
    usageByBucket.set(row.day_bucket, row);
  }

  const acceptsByBucket = new Map<string, number>();
  for (const a of accepts) {
    const bucket = localDayBucket(a.resolved_at);
    if (!bucketSet.has(bucket)) continue;
    acceptsByBucket.set(bucket, (acceptsByBucket.get(bucket) ?? 0) + 1);
  }

  const safetyCountByBucket = new Map<string, number>();
  const safetyReasonTotals = {
    captcha: 0,
    rate_limit: 0,
    auth_wall: 0,
    health_breach: 0,
  };
  for (const ev of safety_events) {
    const bucket = localDayBucket(ev.ts);
    if (bucketSet.has(bucket)) {
      safetyCountByBucket.set(
        bucket,
        (safetyCountByBucket.get(bucket) ?? 0) + 1,
      );
    }
    if (ev.reason === 'captcha') safetyReasonTotals.captcha++;
    else if (ev.reason === 'rate_limit') safetyReasonTotals.rate_limit++;
    else if (ev.reason === 'auth_wall') safetyReasonTotals.auth_wall++;
    else if (ev.reason === 'health_breach') safetyReasonTotals.health_breach++;
  }

  const daily: HealthDaily[] = buckets.map((bucket) => {
    const usage = usageByBucket.get(bucket);
    return {
      day_bucket: bucket,
      invites_sent: usage?.invites_sent ?? 0,
      accepts: acceptsByBucket.get(bucket) ?? 0,
      visits: usage?.visits ?? 0,
      messages_sent: usage?.messages_sent ?? 0,
      feed_events_captured: usage?.feed_events_captured ?? 0,
      safety_triggers: safetyCountByBucket.get(bucket) ?? 0,
    };
  });

  let invites_sent_7d = 0;
  let accepts_7d = 0;
  let visits_7d = 0;
  let messages_sent_7d = 0;
  let feed_events_captured_7d = 0;
  for (const d of daily) {
    invites_sent_7d += d.invites_sent;
    accepts_7d += d.accepts;
    visits_7d += d.visits;
    messages_sent_7d += d.messages_sent;
    feed_events_captured_7d += d.feed_events_captured;
  }

  // Prefer the outreach_actions row count when it diverges from daily_usage
  // (daily_usage.invites_sent is incremented on the same call path but could
  // drift if a user manually edits history). Use max so the floor check is
  // conservative — we never under-count invites and accidentally trip.
  const invitesFromActions = invites.filter((iv) => {
    const bucket = localDayBucket(iv.sent_at);
    return bucketSet.has(bucket);
  }).length;
  if (invitesFromActions > invites_sent_7d) {
    invites_sent_7d = invitesFromActions;
  }

  const accept_rate_7d =
    invites_sent_7d > 0 ? accepts_7d / invites_sent_7d : null;

  // Pile-up window: only count real safety events (captcha / rate_limit /
  // auth_wall). `health_breach` is excluded to avoid self-reinforcing loops
  // where one breach retriggers the kill switch forever.
  const windowMs = Math.max(0, thresholds.safety_window_hours) * MS_PER_HOUR;
  const windowStart = now - windowMs;
  let safety_triggers_in_window = 0;
  for (const ev of safety_events) {
    if (ev.ts < windowStart) continue;
    if (
      ev.reason === 'captcha' ||
      ev.reason === 'rate_limit' ||
      ev.reason === 'auth_wall'
    ) {
      safety_triggers_in_window++;
    }
  }

  const safety_triggers_7d = {
    captcha: safetyReasonTotals.captcha,
    rate_limit: safetyReasonTotals.rate_limit,
    auth_wall: safetyReasonTotals.auth_wall,
    health_breach: safetyReasonTotals.health_breach,
    total:
      safetyReasonTotals.captcha +
      safetyReasonTotals.rate_limit +
      safetyReasonTotals.auth_wall +
      safetyReasonTotals.health_breach,
  };

  const breach = detectKillSwitchBreach({
    invites_sent_7d,
    accepts_7d,
    accept_rate_7d,
    safety_triggers_in_window,
    thresholds,
  });

  const cooldown = computeResumeCooldown({
    now,
    last_breach_at,
    cooldown_hours,
  });

  return {
    day_bucket: today_bucket,
    invites_sent_7d,
    accepts_7d,
    accept_rate_7d,
    visits_7d,
    messages_sent_7d,
    feed_events_captured_7d,
    safety_triggers_7d,
    safety_triggers_in_window,
    daily,
    breach,
    cooldown,
    thresholds,
  };
}

/**
 * Priority-ordered breach detection. First match wins.
 *
 * 1. `accept_rate_floor` — only meaningful with enough sample size.
 * 2. `safety_pileup` — multiple real (non-self) safety triggers in the window.
 * 3. `restriction_banner` — never set here; wired separately when LinkedIn
 *    surfaces a restriction banner.
 */
export function detectKillSwitchBreach(
  snapshot: Pick<
    HealthSnapshot,
    | 'invites_sent_7d'
    | 'accepts_7d'
    | 'accept_rate_7d'
    | 'safety_triggers_in_window'
    | 'thresholds'
  >,
): HealthBreach | null {
  const {
    invites_sent_7d,
    accepts_7d,
    accept_rate_7d,
    safety_triggers_in_window,
    thresholds,
  } = snapshot;

  if (
    invites_sent_7d >= thresholds.invites_sent_min &&
    accept_rate_7d !== null &&
    accept_rate_7d < thresholds.accept_rate_floor
  ) {
    const pct = Math.round(accept_rate_7d * 100);
    const floorPct = Math.round(thresholds.accept_rate_floor * 100);
    return {
      reason: 'accept_rate_floor',
      detail: `Accept rate ${pct}% over 7d (floor ${floorPct}%, n=${invites_sent_7d} invites, ${accepts_7d} accepts)`,
    };
  }

  if (safety_triggers_in_window >= thresholds.safety_trigger_max) {
    return {
      reason: 'safety_pileup',
      detail: `${safety_triggers_in_window} safety triggers in the last ${thresholds.safety_window_hours}h (max ${thresholds.safety_trigger_max})`,
    };
  }

  return null;
}

/**
 * Return the active cooldown window, or `null` when resume is allowed.
 *
 * No breach recorded → no cooldown. Otherwise `until = since + hours`; when
 * `now` passes that mark, we return null so the popup / dashboard unlock the
 * Resume button.
 */
export function computeResumeCooldown(args: {
  now: number;
  last_breach_at: number | null;
  cooldown_hours: number;
}): HealthCooldown | null {
  const { now, last_breach_at, cooldown_hours } = args;
  if (last_breach_at === null) return null;
  const hours = Math.max(0, cooldown_hours);
  const until = last_breach_at + hours * MS_PER_HOUR;
  if (now >= until) return null;
  return { since: last_breach_at, until, hours };
}
