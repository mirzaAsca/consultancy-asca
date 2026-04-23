import { describe, expect, it } from 'vitest';
import {
  build12WeekBuckets,
  buildMonthBuckets,
  computeAnalyticsSnapshot,
  firmTierBucket,
  weekStartBucket,
} from '@/shared/analytics';
import type {
  DailyUsage,
  OutreachAction,
  OutreachActionKind,
  OutreachActionState,
} from '@/shared/types';

const DAY = 86_400_000;
const NOW = new Date(2026, 3, 22, 15, 0, 0, 0).getTime(); // Wed Apr 22 2026 local
const TODAY = '2026-04-22';

function usage(over: Partial<DailyUsage> & { day_bucket: string }): DailyUsage {
  return {
    day_bucket: over.day_bucket,
    invites_sent: over.invites_sent ?? 0,
    visits: over.visits ?? 0,
    messages_sent: over.messages_sent ?? 0,
    followups_sent: over.followups_sent ?? 0,
    feed_events_captured: over.feed_events_captured ?? 0,
    updated_at: over.updated_at ?? NOW,
  };
}

let nextActionId = 1;
function action(
  over: Partial<OutreachAction> & {
    prospect_id: number;
    kind: OutreachActionKind;
    state: OutreachActionState;
  },
): OutreachAction {
  return {
    id: over.id ?? nextActionId++,
    prospect_id: over.prospect_id,
    kind: over.kind,
    state: over.state,
    idempotency_key:
      over.idempotency_key ??
      `${over.prospect_id}:${over.kind}:${nextActionId}`,
    template_id: over.template_id ?? null,
    template_version: over.template_version ?? null,
    rendered_body: over.rendered_body ?? null,
    source_feed_event_id: over.source_feed_event_id ?? null,
    created_at: over.created_at ?? NOW,
    approved_at: over.approved_at ?? null,
    sent_at: over.sent_at ?? null,
    resolved_at: over.resolved_at ?? null,
    notes: over.notes ?? null,
  };
}

describe('firmTierBucket', () => {
  it('maps firm weights to coarse tiers matching the spec defaults', () => {
    expect(firmTierBucket(null)).toBe('none');
    expect(firmTierBucket(0)).toBe('none');
    expect(firmTierBucket(40)).toBe('top');
    expect(firmTierBucket(30)).toBe('top');
    expect(firmTierBucket(29)).toBe('mid');
    expect(firmTierBucket(15)).toBe('mid');
    expect(firmTierBucket(14)).toBe('boutique');
    expect(firmTierBucket(1)).toBe('boutique');
  });
});

describe('buildMonthBuckets', () => {
  it('returns 30 buckets oldest → newest, ending on today', () => {
    const buckets = buildMonthBuckets(TODAY);
    expect(buckets).toHaveLength(30);
    expect(buckets[29]).toBe(TODAY);
    expect(buckets[0]).toBe('2026-03-24');
  });

  it('returns empty array for malformed input', () => {
    expect(buildMonthBuckets('nope')).toEqual([]);
  });
});

describe('weekStartBucket + build12WeekBuckets', () => {
  it('anchors any weekday to the previous Monday', () => {
    // Apr 22 2026 is a Wednesday → week starts Mon Apr 20 2026.
    expect(weekStartBucket(NOW)).toBe('2026-04-20');
    // Sunday Apr 26 2026 still maps to the Apr 20 Monday.
    const sunday = new Date(2026, 3, 26, 10, 0, 0, 0).getTime();
    expect(weekStartBucket(sunday)).toBe('2026-04-20');
    // Monday itself is its own anchor.
    const monday = new Date(2026, 3, 20, 10, 0, 0, 0).getTime();
    expect(weekStartBucket(monday)).toBe('2026-04-20');
  });

  it('returns 12 Monday buckets oldest → newest ending on the current week', () => {
    const buckets = build12WeekBuckets(NOW, 12);
    expect(buckets).toHaveLength(12);
    expect(buckets[11]).toBe('2026-04-20');
    expect(buckets[0]).toBe('2026-02-02');
    // All 12 deltas are exactly 7 calendar days. Use UTC so DST transitions
    // in local time don't add or remove the spring-forward / fall-back hour.
    for (let i = 1; i < buckets.length; i++) {
      const [y1, m1, d1] = buckets[i - 1].split('-').map(Number);
      const [y2, m2, d2] = buckets[i].split('-').map(Number);
      const prev = Date.UTC(y1, m1 - 1, d1);
      const next = Date.UTC(y2, m2 - 1, d2);
      expect(next - prev).toBe(7 * DAY);
    }
  });
});

describe('computeAnalyticsSnapshot — shape', () => {
  it('returns empty series when no data', () => {
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions: [],
      feed_events: [],
      daily_usage: [],
    });
    expect(snap.generated_at).toBe(NOW);
    expect(snap.today_bucket).toBe(TODAY);
    expect(snap.actions_30d).toHaveLength(30);
    expect(snap.accept_rate_12w).toHaveLength(12);
    expect(snap.event_to_action.sample_size).toBe(0);
    expect(snap.event_to_action.median_ms).toBeNull();
    expect(snap.inbox_ratio.captured).toBe(0);
    expect(snap.inbox_ratio.handled_rate).toBeNull();
    expect(snap.cohort_by_level).toEqual([]);
    expect(snap.cohort_by_firm_tier).toEqual([]);
    expect(snap.cohort_by_event_kind).toEqual([]);
    expect(snap.totals_30d).toEqual({
      invites_sent: 0,
      accepts: 0,
      messages_sent: 0,
      profile_visits: 0,
      feed_events_captured: 0,
    });
  });

  it('zero-fills 30-day action series when daily_usage is sparse', () => {
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions: [],
      feed_events: [],
      daily_usage: [usage({ day_bucket: TODAY, feed_events_captured: 5 })],
    });
    expect(snap.actions_30d[29].day_bucket).toBe(TODAY);
    expect(snap.actions_30d[29].feed_events_captured).toBe(5);
    expect(snap.actions_30d[0].feed_events_captured).toBe(0);
    expect(snap.totals_30d.feed_events_captured).toBe(5);
  });
});

describe('computeAnalyticsSnapshot — actions_30d', () => {
  it('bucketizes sent_at by local day and distinguishes kinds', () => {
    const today = NOW;
    const yesterday = NOW - DAY;
    const outreach_actions = [
      action({
        prospect_id: 1,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: today,
      }),
      action({
        prospect_id: 2,
        kind: 'connection_request_sent',
        state: 'accepted',
        sent_at: today,
        resolved_at: today + 3600_000,
      }),
      action({
        prospect_id: 3,
        kind: 'profile_visit',
        state: 'sent',
        sent_at: yesterday,
      }),
      action({
        prospect_id: 4,
        kind: 'message_sent',
        state: 'sent',
        sent_at: today,
      }),
      // Sent 40 days ago — OUTSIDE the 30-day window, must be excluded.
      action({
        prospect_id: 5,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: today - 40 * DAY,
      }),
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions,
      feed_events: [],
      daily_usage: [],
    });
    const todayPt = snap.actions_30d[29];
    const yesterdayPt = snap.actions_30d[28];
    expect(todayPt.connection_request_sent).toBe(2);
    expect(todayPt.message_sent).toBe(1);
    expect(yesterdayPt.profile_visit).toBe(1);
    expect(snap.totals_30d.invites_sent).toBe(2);
    expect(snap.totals_30d.messages_sent).toBe(1);
    expect(snap.totals_30d.profile_visits).toBe(1);
  });
});

describe('computeAnalyticsSnapshot — accept_rate_12w', () => {
  it('computes accept rate per Monday-anchored week', () => {
    // Current week of NOW = Mon Apr 20. 2 invites, 1 accepted.
    const thisWeekInvite = new Date(2026, 3, 21, 10).getTime(); // Tue Apr 21
    const thisWeekAcceptResolve = new Date(2026, 3, 22, 10).getTime();
    const lastWeekInvite = new Date(2026, 3, 13, 10).getTime(); // Mon Apr 13
    const outreach_actions = [
      action({
        prospect_id: 1,
        kind: 'connection_request_sent',
        state: 'accepted',
        sent_at: thisWeekInvite,
        resolved_at: thisWeekAcceptResolve,
      }),
      action({
        prospect_id: 2,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: thisWeekInvite,
      }),
      action({
        prospect_id: 3,
        kind: 'connection_request_sent',
        state: 'declined',
        sent_at: lastWeekInvite,
      }),
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions,
      feed_events: [],
      daily_usage: [],
    });
    const current = snap.accept_rate_12w[11];
    const previous = snap.accept_rate_12w[10];
    expect(current.week_start).toBe('2026-04-20');
    expect(current.invites_sent).toBe(2);
    expect(current.accepts).toBe(1);
    expect(current.accept_rate).toBeCloseTo(0.5, 5);
    expect(previous.week_start).toBe('2026-04-13');
    expect(previous.invites_sent).toBe(1);
    expect(previous.accepts).toBe(0);
    expect(previous.accept_rate).toBe(0);
  });

  it('accept_rate is null when a week has no invites', () => {
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions: [],
      feed_events: [],
      daily_usage: [],
    });
    for (const pt of snap.accept_rate_12w) {
      expect(pt.accept_rate).toBeNull();
    }
  });
});

describe('computeAnalyticsSnapshot — event_to_action latency', () => {
  it('measures time from first_seen_at to the next outreach action', () => {
    // Event seen 5h ago, invite sent now → latency 5h.
    const eventTs = NOW - 5 * 3_600_000;
    const outreach_actions = [
      action({
        prospect_id: 1,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: NOW,
      }),
    ];
    const feed_events = [
      {
        id: 1,
        prospect_id: 1,
        event_kind: 'post' as const,
        first_seen_at: eventTs,
        task_status: 'queued' as const,
      },
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions,
      feed_events,
      daily_usage: [],
    });
    expect(snap.event_to_action.sample_size).toBe(1);
    expect(snap.event_to_action.median_ms).toBe(5 * 3_600_000);
  });

  it('ignores actions without a preceding event', () => {
    const outreach_actions = [
      action({
        prospect_id: 99,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: NOW,
      }),
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions,
      feed_events: [],
      daily_usage: [],
    });
    expect(snap.event_to_action.sample_size).toBe(0);
    expect(snap.event_to_action.median_ms).toBeNull();
  });
});

describe('computeAnalyticsSnapshot — inbox_ratio', () => {
  it('counts handled = non-new feed_event rows', () => {
    const feed_events = [
      { id: 1, prospect_id: 1, event_kind: 'post' as const, first_seen_at: NOW, task_status: 'new' as const },
      { id: 2, prospect_id: 1, event_kind: 'post' as const, first_seen_at: NOW, task_status: 'queued' as const },
      { id: 3, prospect_id: 2, event_kind: 'comment' as const, first_seen_at: NOW, task_status: 'done' as const },
      { id: 4, prospect_id: 3, event_kind: 'reaction' as const, first_seen_at: NOW, task_status: 'ignored' as const },
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects: [],
      outreach_actions: [],
      feed_events,
      daily_usage: [],
    });
    expect(snap.inbox_ratio.captured).toBe(4);
    expect(snap.inbox_ratio.new_count).toBe(1);
    expect(snap.inbox_ratio.handled).toBe(3);
    expect(snap.inbox_ratio.handled_rate).toBeCloseTo(0.75, 5);
  });
});

describe('computeAnalyticsSnapshot — cohort slices', () => {
  it('slices invites by current connection level', () => {
    const outreach_actions = [
      action({
        prospect_id: 1,
        kind: 'connection_request_sent',
        state: 'accepted',
        sent_at: NOW,
        resolved_at: NOW,
      }),
      action({
        prospect_id: 2,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: NOW,
      }),
      action({
        prospect_id: 3,
        kind: 'connection_request_sent',
        state: 'declined',
        sent_at: NOW,
      }),
    ];
    const prospects = [
      { id: 1, level: '2nd' as const, firm_score: null },
      { id: 2, level: '2nd' as const, firm_score: null },
      { id: 3, level: '3rd' as const, firm_score: null },
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects,
      outreach_actions,
      feed_events: [],
      daily_usage: [],
    });
    const second = snap.cohort_by_level.find((r) => r.key === '2nd');
    const third = snap.cohort_by_level.find((r) => r.key === '3rd');
    expect(second).toEqual({
      key: '2nd',
      invites_sent: 2,
      accepts: 1,
      accept_rate: 0.5,
    });
    expect(third).toEqual({
      key: '3rd',
      invites_sent: 1,
      accepts: 0,
      accept_rate: 0,
    });
  });

  it('slices invites by firm-weight bucket and event kind', () => {
    const feed_events = [
      {
        id: 10,
        prospect_id: 1,
        event_kind: 'post' as const,
        first_seen_at: NOW - DAY,
        task_status: 'queued' as const,
      },
    ];
    const outreach_actions = [
      action({
        prospect_id: 1,
        kind: 'connection_request_sent',
        state: 'accepted',
        sent_at: NOW,
        resolved_at: NOW,
        source_feed_event_id: 10,
      }),
      action({
        prospect_id: 2,
        kind: 'connection_request_sent',
        state: 'sent',
        sent_at: NOW,
        source_feed_event_id: null,
      }),
    ];
    const prospects = [
      { id: 1, level: '2nd' as const, firm_score: 40 }, // top-tier firm
      { id: 2, level: '2nd' as const, firm_score: null },
    ];
    const snap = computeAnalyticsSnapshot({
      now: NOW,
      today_bucket: TODAY,
      prospects,
      outreach_actions,
      feed_events,
      daily_usage: [],
    });
    const topFirm = snap.cohort_by_firm_tier.find((r) => r.key === 'top');
    const noFirm = snap.cohort_by_firm_tier.find((r) => r.key === 'none');
    expect(topFirm?.invites_sent).toBe(1);
    expect(topFirm?.accepts).toBe(1);
    expect(noFirm?.invites_sent).toBe(1);
    expect(noFirm?.accepts).toBe(0);

    const postEvent = snap.cohort_by_event_kind.find((r) => r.key === 'post');
    const noEvent = snap.cohort_by_event_kind.find(
      (r) => r.key === 'no_event',
    );
    expect(postEvent?.invites_sent).toBe(1);
    expect(postEvent?.accepts).toBe(1);
    expect(noEvent?.invites_sent).toBe(1);
  });
});
