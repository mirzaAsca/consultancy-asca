import { describe, expect, it } from 'vitest';
import {
  buildWeekBuckets,
  computeHealthSnapshot,
  computeResumeCooldown,
  detectKillSwitchBreach,
} from '@/shared/health';
import type {
  DailyUsage,
  KillSwitchThresholds,
} from '@/shared/types';

const HOUR = 3_600_000;

/**
 * Fixed "now" in UTC that falls cleanly inside a single local day regardless
 * of the runner's timezone, so day-bucket math stays reproducible.
 */
const NOW = new Date(2026, 3, 22, 15, 0, 0, 0).getTime(); // local Apr 22 2026 15:00
const TODAY = '2026-04-22';

const DEFAULT_THRESHOLDS: KillSwitchThresholds = {
  accept_rate_floor: 0.15,
  invites_sent_min: 20,
  safety_window_hours: 24,
  safety_trigger_max: 2,
};

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

describe('buildWeekBuckets', () => {
  it('returns 7 buckets oldest → newest, ending on today', () => {
    const buckets = buildWeekBuckets(TODAY);
    expect(buckets).toHaveLength(7);
    expect(buckets[6]).toBe(TODAY);
    // Each bucket is one day earlier than the next.
    for (let i = 0; i < buckets.length; i++) {
      const [y, m, d] = buckets[i].split('-').map(Number);
      const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
      const expected = new Date(2026, 3, 22 - (6 - i), 12, 0, 0, 0);
      expect(anchor.getTime()).toBe(expected.getTime());
    }
  });

  it('handles DST-sensitive arithmetic without date-skip', () => {
    // 2026-03-09 is the Monday after US DST spring-forward (Mar 8 2026).
    const buckets = buildWeekBuckets('2026-03-09');
    expect(buckets).toHaveLength(7);
    expect(buckets[6]).toBe('2026-03-09');
    expect(buckets[0]).toBe('2026-03-03');
  });

  it('returns empty array for malformed input', () => {
    expect(buildWeekBuckets('nope')).toEqual([]);
  });
});

describe('computeHealthSnapshot', () => {
  it('zero-fills daily entries when daily_usage is sparse', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [usage({ day_bucket: TODAY, invites_sent: 3 })],
      safety_events: [],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.daily).toHaveLength(7);
    expect(snap.daily[6].invites_sent).toBe(3);
    expect(snap.daily[0].invites_sent).toBe(0);
    expect(snap.invites_sent_7d).toBe(3);
  });

  it('accept_rate_7d is null when no invites were sent', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [],
      safety_events: [],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.invites_sent_7d).toBe(0);
    expect(snap.accept_rate_7d).toBeNull();
    expect(snap.breach).toBeNull();
  });

  it('computes accept_rate_7d from accepts / invites', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [usage({ day_bucket: TODAY, invites_sent: 20 })],
      safety_events: [],
      accepts: [
        { resolved_at: NOW - HOUR },
        { resolved_at: NOW - 2 * HOUR },
        { resolved_at: NOW - 3 * HOUR },
        { resolved_at: NOW - 4 * HOUR },
      ],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.invites_sent_7d).toBe(20);
    expect(snap.accepts_7d).toBe(4);
    expect(snap.accept_rate_7d).toBeCloseTo(0.2, 5);
  });

  it('snapshots the thresholds object onto the output', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [],
      safety_events: [],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.thresholds).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe('detectKillSwitchBreach', () => {
  it('does not trip accept_rate_floor below invites_sent_min', () => {
    const breach = detectKillSwitchBreach({
      invites_sent_7d: 10,
      accepts_7d: 0,
      accept_rate_7d: 0,
      safety_triggers_in_window: 0,
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(breach).toBeNull();
  });

  it('trips accept_rate_floor when sample is meaningful and rate is low', () => {
    const breach = detectKillSwitchBreach({
      invites_sent_7d: 24,
      accepts_7d: 2,
      accept_rate_7d: 2 / 24,
      safety_triggers_in_window: 0,
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(breach?.reason).toBe('accept_rate_floor');
    expect(breach?.detail).toContain('n=24');
  });

  it('does not trip safety_pileup below the max', () => {
    const breach = detectKillSwitchBreach({
      invites_sent_7d: 0,
      accepts_7d: 0,
      accept_rate_7d: null,
      safety_triggers_in_window: 1,
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(breach).toBeNull();
  });

  it('trips safety_pileup when count meets the max', () => {
    const breach = detectKillSwitchBreach({
      invites_sent_7d: 0,
      accepts_7d: 0,
      accept_rate_7d: null,
      safety_triggers_in_window: 2,
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(breach?.reason).toBe('safety_pileup');
  });

  it('prefers accept_rate_floor over safety_pileup when both trip', () => {
    const breach = detectKillSwitchBreach({
      invites_sent_7d: 30,
      accepts_7d: 1,
      accept_rate_7d: 1 / 30,
      safety_triggers_in_window: 5,
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(breach?.reason).toBe('accept_rate_floor');
  });
});

describe('computeHealthSnapshot safety-trigger pile-up', () => {
  it('excludes health_breach events from the pile-up window count', () => {
    const windowMs = DEFAULT_THRESHOLDS.safety_window_hours * HOUR;
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [],
      safety_events: [
        { ts: NOW - windowMs / 2, reason: 'health_breach' },
        { ts: NOW - windowMs / 3, reason: 'health_breach' },
      ],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.safety_triggers_in_window).toBe(0);
    expect(snap.breach).toBeNull();
  });

  it('counts only events inside the rolling window', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [],
      safety_events: [
        { ts: NOW - HOUR, reason: 'captcha' },
        { ts: NOW - 5 * HOUR, reason: 'rate_limit' },
        { ts: NOW - 48 * HOUR, reason: 'captcha' }, // outside window
      ],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.safety_triggers_in_window).toBe(2);
    expect(snap.breach?.reason).toBe('safety_pileup');
  });
});

describe('computeResumeCooldown', () => {
  it('returns null when no breach has been recorded', () => {
    expect(
      computeResumeCooldown({ now: NOW, last_breach_at: null, cooldown_hours: 24 }),
    ).toBeNull();
  });

  it('returns a cooldown window until the hours elapse', () => {
    const cd = computeResumeCooldown({
      now: NOW,
      last_breach_at: NOW - HOUR,
      cooldown_hours: 24,
    });
    expect(cd).not.toBeNull();
    expect(cd?.until).toBe(NOW - HOUR + 24 * HOUR);
    expect(cd?.hours).toBe(24);
  });

  it('returns null once the cooldown has elapsed', () => {
    const cd = computeResumeCooldown({
      now: NOW,
      last_breach_at: NOW - 25 * HOUR,
      cooldown_hours: 24,
    });
    expect(cd).toBeNull();
  });

  it('treats negative cooldown_hours as zero', () => {
    const cd = computeResumeCooldown({
      now: NOW,
      last_breach_at: NOW - HOUR,
      cooldown_hours: -5,
    });
    expect(cd).toBeNull();
  });
});

describe('computeHealthSnapshot cooldown wiring', () => {
  it('surfaces the active cooldown on the snapshot', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [],
      safety_events: [],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 12,
      last_breach_at: NOW - HOUR,
    });
    expect(snap.cooldown).not.toBeNull();
    expect(snap.cooldown?.until).toBe(NOW - HOUR + 12 * HOUR);
  });

  it('clears the cooldown once enough time has passed', () => {
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [],
      safety_events: [],
      accepts: [],
      invites: [],
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 1,
      last_breach_at: NOW - 2 * HOUR,
    });
    expect(snap.cooldown).toBeNull();
  });
});

describe('computeHealthSnapshot invites fallback', () => {
  it('prefers the outreach_actions count when it exceeds daily_usage', () => {
    // daily_usage reports 5 invites but the authoritative action rows show 8
    // — snapshot should surface 8 so we don't under-count and miss a breach.
    const snap = computeHealthSnapshot({
      now: NOW,
      today_bucket: TODAY,
      daily_usage: [usage({ day_bucket: TODAY, invites_sent: 5 })],
      safety_events: [],
      accepts: [],
      invites: Array.from({ length: 8 }, (_, i) => ({
        sent_at: NOW - i * HOUR,
      })),
      thresholds: DEFAULT_THRESHOLDS,
      cooldown_hours: 24,
      last_breach_at: null,
    });
    expect(snap.invites_sent_7d).toBe(8);
  });
});
