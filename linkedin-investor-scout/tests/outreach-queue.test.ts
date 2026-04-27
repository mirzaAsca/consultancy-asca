import { describe, expect, it } from 'vitest';
import {
  buildCandidates,
  buildIdempotencyKey,
  classifyDueBucket,
  compareQueueOrder,
  isActionLive,
  isActionOverBudget,
  passesDueFilter,
  pickNextBest,
  recommendAction,
} from '@/shared/outreach-queue';
import type {
  DailyUsage,
  OutreachAction,
  OutreachCaps,
  Prospect,
  ProspectLevel,
  ProspectTier,
} from '@/shared/types';

const NOW = 1_800_000_000_000;

function makeProspect(over: Partial<Prospect>): Prospect {
  return {
    id: over.id ?? 1,
    url: over.url ?? 'https://www.linkedin.com/in/example/',
    slug: over.slug ?? 'example',
    level: over.level ?? '2nd',
    name: over.name ?? 'Jane Doe',
    headline: over.headline ?? null,
    company: over.company ?? null,
    location: null,
    scan_status: 'done',
    scan_error: null,
    scan_attempts: 0,
    last_scanned: NOW - 86_400_000,
    activity: {
      connected: false,
      connected_at: null,
      commented: false,
      commented_at: null,
      messaged: false,
      messaged_at: null,
    },
    notes: '',
    created_at: NOW,
    updated_at: NOW,
    lifecycle_status: over.lifecycle_status ?? 'new',
    priority_score: over.priority_score ?? 100,
    score_breakdown: null,
    tier: over.tier ?? 'A',
    mutual_count: over.mutual_count ?? 3,
    next_action: null,
    next_action_due_at: null,
    last_level_change_at: over.last_level_change_at ?? null,
    last_outreach_at: over.last_outreach_at ?? null,
  };
}

function makeAction(over: Partial<OutreachAction>): OutreachAction {
  return {
    id: over.id ?? 1,
    prospect_id: over.prospect_id ?? 1,
    kind: over.kind ?? 'connection_request_sent',
    state: over.state ?? 'sent',
    idempotency_key: over.idempotency_key ?? 'k',
    template_id: null,
    template_version: null,
    rendered_body: null,
    source_feed_event_id: null,
    created_at: over.created_at ?? NOW,
    approved_at: over.approved_at ?? null,
    sent_at: over.sent_at ?? null,
    resolved_at: over.resolved_at ?? null,
    notes: null,
    auto_tracked_at: over.auto_tracked_at ?? null,
    auto_tracked_source: over.auto_tracked_source ?? null,
  };
}

const ZERO_USAGE: DailyUsage = {
  day_bucket: '2026-04-23',
  invites_sent: 0,
  visits: 0,
  messages_sent: 0,
  followups_sent: 0,
  feed_events_captured: 0,
  updated_at: NOW,
};

const DEFAULT_CAPS: OutreachCaps = {
  daily_invites: 15,
  daily_visits: 40,
  daily_messages: 10,
  weekly_invites: 80,
  shared_bucket: true,
};

describe('compareQueueOrder', () => {
  it('S tier ranks above A tier', () => {
    const s = makeProspect({ id: 1, tier: 'S', priority_score: 50 });
    const a = makeProspect({ id: 2, tier: 'A', priority_score: 500 });
    expect(compareQueueOrder(s, a)).toBeLessThan(0);
  });

  it('within same tier, higher priority_score wins', () => {
    const hi = makeProspect({ id: 1, tier: 'A', priority_score: 120 });
    const lo = makeProspect({ id: 2, tier: 'A', priority_score: 80 });
    expect(compareQueueOrder(hi, lo)).toBeLessThan(0);
  });

  it('breaks ties on older last_outreach_at (NULLS FIRST)', () => {
    const fresh = makeProspect({
      id: 1,
      tier: 'A',
      priority_score: 100,
      last_outreach_at: NOW,
    });
    const never = makeProspect({
      id: 2,
      tier: 'A',
      priority_score: 100,
      last_outreach_at: null,
    });
    expect(compareQueueOrder(never, fresh)).toBeLessThan(0);
  });
});

describe('recommendAction', () => {
  it('warms 2nd-degree with no history when warm_visit flag is on', () => {
    const p = makeProspect({ level: '2nd' });
    const result = recommendAction(p, [], { warm_visit_before_invite: true, now: NOW });
    expect(result).toBe('profile_visit');
  });

  it('skips warming when disabled → straight to invite', () => {
    const p = makeProspect({ level: '2nd' });
    const result = recommendAction(p, [], { warm_visit_before_invite: false, now: NOW });
    expect(result).toBe('connection_request_sent');
  });

  it('recommends invite after a warming visit aged past the 24h delay', () => {
    const p = makeProspect({ level: '2nd' });
    // Visit 2 days old → past the 24h warm-delay AND inside the 14d window.
    const history = [
      makeAction({
        kind: 'profile_visit',
        state: 'sent',
        sent_at: NOW - 2 * 24 * 60 * 60 * 1000,
        created_at: NOW - 2 * 24 * 60 * 60 * 1000,
      }),
    ];
    const result = recommendAction(p, history, {
      warm_visit_before_invite: true,
      now: NOW,
    });
    expect(result).toBe('connection_request_sent');
  });

  it('holds invite while warming visit is < 24h old', () => {
    const p = makeProspect({ level: '2nd' });
    const history = [
      makeAction({
        kind: 'profile_visit',
        state: 'sent',
        sent_at: NOW - 60 * 60 * 1000, // 1 hour ago
        created_at: NOW - 60 * 60 * 1000,
      }),
    ];
    const result = recommendAction(p, history, {
      warm_visit_before_invite: true,
      now: NOW,
    });
    expect(result).toBeNull();
  });

  it('re-recommends warming visit when prior visit is > 14d old (stale)', () => {
    const p = makeProspect({ level: '2nd' });
    const history = [
      makeAction({
        kind: 'profile_visit',
        state: 'sent',
        sent_at: NOW - 30 * 24 * 60 * 60 * 1000,
        created_at: NOW - 30 * 24 * 60 * 60 * 1000,
      }),
    ];
    const result = recommendAction(p, history, {
      warm_visit_before_invite: true,
      now: NOW,
    });
    expect(result).toBe('profile_visit');
  });

  it('ignores aborted/declined visits when picking the most recent', () => {
    const p = makeProspect({ level: '2nd' });
    // A fresh visit that never resolved (declined) shouldn't gate the invite.
    const history = [
      makeAction({
        kind: 'profile_visit',
        state: 'declined',
        sent_at: NOW - 60 * 60 * 1000,
        created_at: NOW - 60 * 60 * 1000,
      }),
      makeAction({
        id: 2,
        kind: 'profile_visit',
        state: 'sent',
        sent_at: NOW - 3 * 24 * 60 * 60 * 1000,
        created_at: NOW - 3 * 24 * 60 * 60 * 1000,
      }),
    ];
    const result = recommendAction(p, history, {
      warm_visit_before_invite: true,
      now: NOW,
    });
    expect(result).toBe('connection_request_sent');
  });

  it('suppresses invite when one is already live (pending)', () => {
    const p = makeProspect({ level: '2nd' });
    const history = [
      makeAction({ kind: 'connection_request_sent', state: 'sent' }),
    ];
    const result = recommendAction(p, history, { warm_visit_before_invite: false, now: NOW });
    expect(result).toBeNull();
  });

  it('surfaces DM opportunity for 1st-degree with no prior message', () => {
    const p = makeProspect({ level: '1st', lifecycle_status: 'connected' });
    const result = recommendAction(p, [], { warm_visit_before_invite: true, now: NOW });
    expect(result).toBe('message_sent');
  });

  it('surfaces follow-up for 1st-degree flagged followup_due', () => {
    const p = makeProspect({ level: '1st', lifecycle_status: 'followup_due' });
    const history = [makeAction({ kind: 'message_sent', state: 'sent' })];
    const result = recommendAction(p, history, { warm_visit_before_invite: true, now: NOW });
    expect(result).toBe('followup_message_sent');
  });

  it('never recommends for do_not_contact', () => {
    const p = makeProspect({ level: '2nd', lifecycle_status: 'do_not_contact' });
    const result = recommendAction(p, [], { warm_visit_before_invite: false, now: NOW });
    expect(result).toBeNull();
  });
});

describe('isActionLive', () => {
  it.each<OutreachAction['state']>([
    'draft',
    'approved',
    'sent',
    'needs_review',
  ])('state %s is live', (state) => {
    expect(isActionLive(makeAction({ state }))).toBe(true);
  });

  it.each<OutreachAction['state']>([
    'accepted',
    'declined',
    'expired',
    'withdrawn',
  ])('state %s is resolved', (state) => {
    expect(isActionLive(makeAction({ state }))).toBe(false);
  });
});

describe('isActionOverBudget', () => {
  it('invite over budget when daily_invites exhausted', () => {
    const usage = { ...ZERO_USAGE, invites_sent: 15 };
    expect(
      isActionOverBudget('connection_request_sent', DEFAULT_CAPS, usage, 0),
    ).toBe(true);
  });

  it('invite over budget when weekly_invites exhausted', () => {
    expect(
      isActionOverBudget('connection_request_sent', DEFAULT_CAPS, ZERO_USAGE, 80),
    ).toBe(true);
  });

  it('shared bucket — daily_visits cap also blocks an invite', () => {
    const usage = { ...ZERO_USAGE, visits: 40 };
    expect(
      isActionOverBudget('connection_request_sent', DEFAULT_CAPS, usage, 0),
    ).toBe(true);
  });

  it('profile_visit gated by daily_visits only', () => {
    const exhausted = { ...ZERO_USAGE, visits: 40 };
    expect(isActionOverBudget('profile_visit', DEFAULT_CAPS, exhausted, 0)).toBe(true);
    expect(isActionOverBudget('profile_visit', DEFAULT_CAPS, ZERO_USAGE, 0)).toBe(false);
  });

  it('message_sent gated by daily_messages', () => {
    const exhausted = { ...ZERO_USAGE, messages_sent: 10 };
    expect(isActionOverBudget('message_sent', DEFAULT_CAPS, exhausted, 0)).toBe(true);
  });
});

describe('buildCandidates', () => {
  it('excludes 1st-degree prospects by default', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, level: '1st', lifecycle_status: 'connected' }),
      makeProspect({ id: 2, level: '2nd' }),
    ];
    const result = buildCandidates(prospects, new Map(), {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result.map((c) => c.prospect_id)).toEqual([2]);
  });

  it('honours filter.levels override', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, level: '2nd' }),
      makeProspect({ id: 2, level: '3rd' }),
    ];
    const result = buildCandidates(prospects, new Map(), {
      filter: { levels: ['2nd'] },
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result.map((c) => c.prospect_id)).toEqual([1]);
  });

  it('honours filter.tiers (excludes null-tier when filter is explicit)', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, level: '2nd', tier: 'S' }),
      makeProspect({ id: 2, level: '2nd', tier: null, priority_score: null }),
    ];
    const result = buildCandidates(prospects, new Map(), {
      filter: { tiers: ['S'] },
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result.map((c) => c.prospect_id)).toEqual([1]);
  });

  it('orders candidates by tier DESC, score DESC', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, tier: 'A', priority_score: 100 }),
      makeProspect({ id: 2, tier: 'S', priority_score: 50 }),
      makeProspect({ id: 3, tier: 'A', priority_score: 140 }),
    ];
    const result = buildCandidates(prospects, new Map(), {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result.map((c) => c.prospect_id)).toEqual([2, 3, 1]);
  });

  it('honours filter.lifecycle_statuses when provided', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, level: '2nd', lifecycle_status: 'new' }),
      makeProspect({
        id: 2,
        level: '2nd',
        lifecycle_status: 'ready_for_connect',
      }),
      makeProspect({
        id: 3,
        level: '2nd',
        lifecycle_status: 'request_sent',
      }),
    ];
    const onlyReady = buildCandidates(prospects, new Map(), {
      filter: { lifecycle_statuses: ['ready_for_connect'] },
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(onlyReady.map((c) => c.prospect_id)).toEqual([2]);

    const newOrReady = buildCandidates(prospects, new Map(), {
      filter: { lifecycle_statuses: ['new', 'ready_for_connect'] },
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(newOrReady.map((c) => c.prospect_id).sort()).toEqual([1, 2]);
  });

  it('excludes skipped prospects unless include_skipped is true', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1 }),
      makeProspect({ id: 2 }),
    ];
    const skipped = new Set<number>([1]);
    const hidden = buildCandidates(prospects, new Map(), {
      filter: {},
      skippedProspectIds: skipped,
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(hidden.map((c) => c.prospect_id)).toEqual([2]);

    const shown = buildCandidates(prospects, new Map(), {
      filter: { include_skipped: true },
      skippedProspectIds: skipped,
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(shown.find((c) => c.prospect_id === 1)?.skipped_today).toBe(true);
  });

  it('flags rows with a pending invite', () => {
    const prospects: Prospect[] = [makeProspect({ id: 1, level: '2nd' })];
    const actions = new Map<number, OutreachAction[]>([
      [
        1,
        [
          makeAction({
            prospect_id: 1,
            kind: 'profile_visit',
            state: 'sent',
          }),
          makeAction({
            id: 2,
            prospect_id: 1,
            kind: 'connection_request_sent',
            state: 'sent',
          }),
        ],
      ],
    ]);
    const result = buildCandidates(prospects, actions, {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: true,
      now: NOW,
    });
    // With a live invite, recommendAction returns null — so no candidate.
    expect(result).toHaveLength(0);
  });

  it('flags 2nd-degree rows whose level transition lands inside the unlock window', () => {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const prospects: Prospect[] = [
      makeProspect({
        id: 1,
        level: '2nd',
        last_level_change_at: NOW - 2 * ONE_DAY,
      }),
      makeProspect({
        id: 2,
        level: '2nd',
        last_level_change_at: NOW - 30 * ONE_DAY,
      }),
      makeProspect({
        id: 3,
        level: '3rd',
        last_level_change_at: NOW - 1 * ONE_DAY,
      }),
      makeProspect({ id: 4, level: '2nd', last_level_change_at: null }),
    ];
    const result = buildCandidates(prospects, new Map(), {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    const byId = Object.fromEntries(result.map((c) => [c.prospect_id, c]));
    expect(byId[1].recent_unlock).toBe(true);
    expect(byId[2].recent_unlock).toBe(false);
    expect(byId[3].recent_unlock).toBe(false);
    expect(byId[4].recent_unlock).toBe(false);
  });

  it('surfaces auto_tracked_today for detector-confirmed sent actions in today bucket', () => {
    // 2nd-degree prospect with a fresh auto-tracked profile_visit; the
    // recommender still surfaces them for the next step (connection_request_sent)
    // so the badge is visible alongside the active recommendation.
    const prospects = [makeProspect({ id: 1, level: '2nd' })];
    const actions = new Map<number, OutreachAction[]>([
      [
        1,
        [
          makeAction({
            id: 10,
            prospect_id: 1,
            kind: 'profile_visit',
            state: 'sent',
            sent_at: NOW - 60_000,
            created_at: NOW - 60_000,
            auto_tracked_at: NOW - 60_000,
            auto_tracked_source: 'profile_visit_detector',
          }),
        ],
      ],
    ]);
    const result = buildCandidates(prospects, actions, {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result[0].auto_tracked_today).toEqual({
      source: 'profile_visit_detector',
      at: NOW - 60_000,
      kind: 'profile_visit',
    });
  });

  it('omits auto_tracked_today when the auto-tracked action lands outside today', () => {
    const yesterday = NOW - 36 * 60 * 60 * 1000; // 36h ago — guaranteed prior local day
    const prospects = [makeProspect({ id: 1, level: '2nd' })];
    const actions = new Map<number, OutreachAction[]>([
      [
        1,
        [
          makeAction({
            id: 10,
            prospect_id: 1,
            kind: 'profile_visit',
            state: 'sent',
            sent_at: yesterday,
            created_at: yesterday,
            auto_tracked_at: yesterday,
            auto_tracked_source: 'profile_visit_detector',
          }),
        ],
      ],
    ]);
    const result = buildCandidates(prospects, actions, {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result[0].auto_tracked_today).toBeNull();
  });

  it('omits auto_tracked_today when sent action has no detector source (manual confirm)', () => {
    const prospects = [makeProspect({ id: 1, level: '2nd' })];
    const actions = new Map<number, OutreachAction[]>([
      [
        1,
        [
          makeAction({
            id: 10,
            prospect_id: 1,
            kind: 'profile_visit',
            state: 'sent',
            sent_at: NOW - 60_000,
            created_at: NOW - 60_000,
          }),
        ],
      ],
    ]);
    const result = buildCandidates(prospects, actions, {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    expect(result[0].auto_tracked_today).toBeNull();
  });
});

describe('pickNextBest', () => {
  const levels: ProspectLevel[] = ['2nd', '3rd'];
  const tiers: ProspectTier[] = ['S', 'A'];
  void levels;
  void tiers;

  it('returns first candidate that fits budget', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, tier: 'S', priority_score: 200, level: '2nd' }),
      makeProspect({ id: 2, tier: 'A', priority_score: 100, level: '2nd' }),
    ];
    const candidates = buildCandidates(prospects, new Map(), {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    const result = pickNextBest(candidates, DEFAULT_CAPS, ZERO_USAGE, 0);
    expect(result?.prospect_id).toBe(1);
  });

  it('skips candidates over budget', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, tier: 'S', priority_score: 200, level: '2nd' }),
      makeProspect({ id: 2, tier: 'A', priority_score: 100, level: '2nd' }),
    ];
    const candidates = buildCandidates(prospects, new Map(), {
      filter: {},
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now: NOW,
    });
    // daily_invites hit → shared bucket would also block visits; for the
    // invite-gated action both rows recommend `connection_request_sent`.
    const usage = { ...ZERO_USAGE, invites_sent: 15 };
    const result = pickNextBest(candidates, DEFAULT_CAPS, usage, 0);
    expect(result).toBeNull();
  });

  it('returns null when everything is already skipped', () => {
    const prospects: Prospect[] = [
      makeProspect({ id: 1, tier: 'S', priority_score: 200, level: '2nd' }),
    ];
    const candidates = buildCandidates(prospects, new Map(), {
      filter: { include_skipped: true },
      skippedProspectIds: new Set([1]),
      warm_visit_before_invite: false,
      now: NOW,
    });
    const result = pickNextBest(candidates, DEFAULT_CAPS, ZERO_USAGE, 0);
    expect(result).toBeNull();
  });
});

describe('classifyDueBucket', () => {
  // Pin "now" to a stable midday so DST drift can't move the day boundaries.
  const middayLocal = new Date(2026, 3, 23, 12, 0, 0).getTime();
  const startOfTodayLocal = new Date(2026, 3, 23, 0, 0, 0).getTime();
  const startOfTomorrowLocal = new Date(2026, 3, 24, 0, 0, 0).getTime();

  it('returns "none" when due-at is null', () => {
    expect(classifyDueBucket(null, middayLocal)).toBe('none');
  });

  it('returns "overdue" for any moment before today\'s start', () => {
    expect(classifyDueBucket(startOfTodayLocal - 1, middayLocal)).toBe('overdue');
    expect(
      classifyDueBucket(startOfTodayLocal - 24 * 60 * 60 * 1000, middayLocal),
    ).toBe('overdue');
  });

  it('returns "due_today" for any moment inside today\'s local-day bounds', () => {
    expect(classifyDueBucket(startOfTodayLocal, middayLocal)).toBe('due_today');
    expect(classifyDueBucket(middayLocal, middayLocal)).toBe('due_today');
    expect(classifyDueBucket(startOfTomorrowLocal - 1, middayLocal)).toBe(
      'due_today',
    );
  });

  it('returns "future" for any moment >= start of tomorrow', () => {
    expect(classifyDueBucket(startOfTomorrowLocal, middayLocal)).toBe('future');
  });
});

describe('passesDueFilter', () => {
  it('all / undefined accept every bucket', () => {
    for (const b of ['none', 'overdue', 'due_today', 'future'] as const) {
      expect(passesDueFilter(b, 'all')).toBe(true);
      expect(passesDueFilter(b, undefined)).toBe(true);
    }
  });

  it('due_today only matches the today bucket', () => {
    expect(passesDueFilter('due_today', 'due_today')).toBe(true);
    expect(passesDueFilter('overdue', 'due_today')).toBe(false);
    expect(passesDueFilter('future', 'due_today')).toBe(false);
    expect(passesDueFilter('none', 'due_today')).toBe(false);
  });

  it('overdue only matches the overdue bucket', () => {
    expect(passesDueFilter('overdue', 'overdue')).toBe(true);
    expect(passesDueFilter('due_today', 'overdue')).toBe(false);
    expect(passesDueFilter('future', 'overdue')).toBe(false);
    expect(passesDueFilter('none', 'overdue')).toBe(false);
  });
});

describe('buildCandidates · due_filter', () => {
  // Anchor "now" at local midday so today-vs-tomorrow math is unambiguous.
  const now = new Date(2026, 3, 23, 12, 0, 0).getTime();
  const startOfToday = new Date(2026, 3, 23, 0, 0, 0).getTime();
  const startOfTomorrow = new Date(2026, 3, 24, 0, 0, 0).getTime();

  function rows(filter: { due_filter?: 'all' | 'due_today' | 'overdue' }) {
    const prospects: Prospect[] = [
      { ...makeProspect({ id: 1, level: '2nd' }), next_action_due_at: null },
      {
        ...makeProspect({ id: 2, level: '2nd' }),
        next_action_due_at: startOfToday + 60 * 60 * 1000, // due today @01:00
      },
      {
        ...makeProspect({ id: 3, level: '2nd' }),
        next_action_due_at: startOfToday - 60 * 60 * 1000, // overdue (yesterday 23:00)
      },
      {
        ...makeProspect({ id: 4, level: '2nd' }),
        next_action_due_at: startOfTomorrow + 60 * 60 * 1000, // future
      },
    ];
    return buildCandidates(prospects, new Map(), {
      filter,
      skippedProspectIds: new Set(),
      warm_visit_before_invite: false,
      now,
    }).map((c) => c.prospect_id);
  }

  it('"all" returns every recommended candidate including null due-at', () => {
    expect(rows({ due_filter: 'all' }).sort()).toEqual([1, 2, 3, 4]);
  });

  it('undefined behaves like "all"', () => {
    expect(rows({}).sort()).toEqual([1, 2, 3, 4]);
  });

  it('"due_today" surfaces only rows due within the local-day bounds', () => {
    expect(rows({ due_filter: 'due_today' })).toEqual([2]);
  });

  it('"overdue" surfaces only rows due before start-of-today', () => {
    expect(rows({ due_filter: 'overdue' })).toEqual([3]);
  });
});

describe('buildIdempotencyKey', () => {
  it('is stable for the same (prospect, kind, day)', () => {
    const k1 = buildIdempotencyKey(1, 'connection_request_sent', '2026-04-23');
    const k2 = buildIdempotencyKey(1, 'connection_request_sent', '2026-04-23');
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^1:connection_request_sent:2026-04-23$/);
  });

  it('differs across days so a prospect can be re-engaged tomorrow', () => {
    const k1 = buildIdempotencyKey(1, 'connection_request_sent', '2026-04-23');
    const k2 = buildIdempotencyKey(1, 'connection_request_sent', '2026-04-24');
    expect(k1).not.toBe(k2);
  });
});
