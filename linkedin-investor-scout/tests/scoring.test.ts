import { describe, expect, it } from 'vitest';
import {
  computeFeedEventFingerprint,
  scoreProspect,
  tierForScore,
  type ScoringContext,
} from '@/shared/scoring';
import {
  DEFAULT_TIER_THRESHOLDS,
  SCORE_WEIGHTS,
} from '@/shared/constants';
import type {
  OutreachSettings,
  Prospect,
  ProspectLevel,
} from '@/shared/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000; // fixed epoch for determinism

function baseOutreach(
  overrides: Partial<Pick<OutreachSettings, 'keywords' | 'firms' | 'tier_thresholds'>> = {},
): Pick<OutreachSettings, 'keywords' | 'firms' | 'tier_thresholds'> {
  return {
    keywords: overrides.keywords ?? [],
    firms: overrides.firms ?? [],
    tier_thresholds: overrides.tier_thresholds ?? DEFAULT_TIER_THRESHOLDS,
  };
}

function baseProspect(
  overrides: Partial<
    Pick<
      Prospect,
      | 'level'
      | 'headline'
      | 'company'
      | 'mutual_count'
      | 'last_outreach_at'
      | 'last_level_change_at'
    >
  > = {},
): Pick<
  Prospect,
  | 'level'
  | 'headline'
  | 'company'
  | 'mutual_count'
  | 'last_outreach_at'
  | 'last_level_change_at'
> {
  return {
    level: overrides.level ?? 'NONE',
    headline: overrides.headline ?? null,
    company: overrides.company ?? null,
    mutual_count: overrides.mutual_count ?? null,
    last_outreach_at: overrides.last_outreach_at ?? null,
    last_level_change_at: overrides.last_level_change_at ?? null,
  };
}

const baseContext: ScoringContext = {
  last_feed_event_at: null,
  now: NOW,
};

describe('scoreProspect — level component', () => {
  it.each<[ProspectLevel, number]>([
    ['2nd', SCORE_WEIGHTS.level_2nd],
    ['3rd', SCORE_WEIGHTS.level_3rd],
    ['OUT_OF_NETWORK', SCORE_WEIGHTS.level_out_of_network],
    ['NONE', 0],
  ])('level %s → +%d', (level, expected) => {
    const result = scoreProspect(
      baseProspect({ level }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.level).toBe(expected);
    expect(result.skip).toBe(expected < DEFAULT_TIER_THRESHOLDS.C);
  });

  it('level 1st is excluded entirely (already connected)', () => {
    const result = scoreProspect(
      baseProspect({
        level: '1st',
        headline: 'Partner',
        company: 'Sequoia',
        mutual_count: 50,
      }),
      baseOutreach({
        keywords: [{ term: 'Partner', weight: 40, kind: 'strong' }],
        firms: [{ name: 'Sequoia', weight: 40, tier: 'top' }],
      }),
      baseContext,
    );
    expect(result.skip).toBe(true);
    expect(result.tier).toBe('skip');
    expect(result.score).toBe(0);
    // Breakdown must be zero-filled, not partial — consumers rely on this for auditing.
    expect(result.breakdown.level).toBe(0);
    expect(result.breakdown.keyword).toBe(0);
    expect(result.breakdown.firm).toBe(0);
  });
});

describe('scoreProspect — keyword matching', () => {
  it('picks the max weight of matching keywords (not sum)', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        headline: 'Partner and Director at Acme',
      }),
      baseOutreach({
        keywords: [
          { term: 'Partner', weight: 40, kind: 'strong' },
          { term: 'Director', weight: 15, kind: 'soft' },
        ],
      }),
      baseContext,
    );
    expect(result.breakdown.keyword).toBe(40);
  });

  it('keyword matching is case-insensitive', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', headline: 'GP at fund' }),
      baseOutreach({ keywords: [{ term: 'gp', weight: 30, kind: 'strong' }] }),
      baseContext,
    );
    expect(result.breakdown.keyword).toBe(30);
  });

  it('no keywords matched → 0', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', headline: 'Engineer' }),
      baseOutreach({ keywords: [{ term: 'partner', weight: 40, kind: 'strong' }] }),
      baseContext,
    );
    expect(result.breakdown.keyword).toBe(0);
  });

  it('empty headline → 0 keyword score', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', headline: null }),
      baseOutreach({ keywords: [{ term: 'partner', weight: 40, kind: 'strong' }] }),
      baseContext,
    );
    expect(result.breakdown.keyword).toBe(0);
  });
});

describe('scoreProspect — firm matching', () => {
  it('matches firm substring, picks max weight', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', company: 'Sequoia Capital' }),
      baseOutreach({
        firms: [
          { name: 'Sequoia', weight: 40, tier: 'top' },
          { name: 'Acme', weight: 15, tier: 'boutique' },
        ],
      }),
      baseContext,
    );
    expect(result.breakdown.firm).toBe(40);
  });

  it('empty company → 0 firm score', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', company: null }),
      baseOutreach({ firms: [{ name: 'Sequoia', weight: 40, tier: 'top' }] }),
      baseContext,
    );
    expect(result.breakdown.firm).toBe(0);
  });
});

describe('scoreProspect — mutuals curve', () => {
  it.each<[number, number]>([
    [0, 0],
    [1, 5], // round(5 * log2(2)) = 5
    [3, 10], // round(5 * log2(4)) = 10
    [7, SCORE_WEIGHTS.mutuals_cap], // caps at 15
    [50, SCORE_WEIGHTS.mutuals_cap],
  ])('mutual_count=%d → +%d', (count, expected) => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', mutual_count: count }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.mutuals).toBe(expected);
  });
});

describe('scoreProspect — recency decay', () => {
  it('never seen → 0', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd' }),
      baseOutreach(),
      { last_feed_event_at: null, now: NOW },
    );
    expect(result.breakdown.recency).toBe(0);
  });

  it('just now → near max (20)', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd' }),
      baseOutreach(),
      { last_feed_event_at: NOW, now: NOW },
    );
    expect(result.breakdown.recency).toBe(SCORE_WEIGHTS.recency_max);
  });

  it('one half-life ago (30d) → ~half of max', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd' }),
      baseOutreach(),
      {
        last_feed_event_at: NOW - 30 * MS_PER_DAY,
        now: NOW,
      },
    );
    // 20 * exp(-1) ≈ 7.36, rounded to 7
    expect(result.breakdown.recency).toBe(7);
  });

  it('very old event → ~0', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd' }),
      baseOutreach(),
      {
        last_feed_event_at: NOW - 365 * MS_PER_DAY,
        now: NOW,
      },
    );
    expect(result.breakdown.recency).toBe(0);
  });
});

describe('scoreProspect — cooldown penalty', () => {
  it('within 14 days → −30', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        last_outreach_at: NOW - 7 * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.cooldown).toBe(SCORE_WEIGHTS.cooldown_penalty);
  });

  it('exactly at 14d boundary → no penalty', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        last_outreach_at: NOW - 14 * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.cooldown).toBe(0);
  });

  it('never contacted → no penalty', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', last_outreach_at: null }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.cooldown).toBe(0);
  });
});

describe('scoreProspect — combined fixture', () => {
  it('hot 2nd-degree GP at top firm with warm mutuals and recent post → S tier', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        headline: 'General Partner',
        company: 'Sequoia Capital',
        mutual_count: 12, // caps to 15
      }),
      baseOutreach({
        keywords: [{ term: 'General Partner', weight: 40, kind: 'strong' }],
        firms: [{ name: 'Sequoia', weight: 40, tier: 'top' }],
      }),
      { last_feed_event_at: NOW - MS_PER_DAY, now: NOW },
    );
    // 100 + 40 + 40 + 15 + ~19 + 0 ≈ 214 → S (≥140)
    expect(result.score).toBeGreaterThanOrEqual(DEFAULT_TIER_THRESHOLDS.S);
    expect(result.tier).toBe('S');
    expect(result.skip).toBe(false);
  });

  it('cold 3rd-degree with firm hit but recent cooldown → lands C or skip', () => {
    const result = scoreProspect(
      baseProspect({
        level: '3rd',
        company: 'Acme Ventures',
        last_outreach_at: NOW - 5 * MS_PER_DAY, // cooldown active
      }),
      baseOutreach({
        firms: [{ name: 'Acme', weight: 25, tier: 'mid' }],
      }),
      { last_feed_event_at: null, now: NOW },
    );
    // 20 + 0 + 25 + 0 + 0 − 30 = 15 → skip (<30)
    expect(result.score).toBe(15);
    expect(result.tier).toBe('skip');
    expect(result.skip).toBe(true);
  });

  it('OUT_OF_NETWORK with no signals → low score, skip tier', () => {
    const result = scoreProspect(
      baseProspect({ level: 'OUT_OF_NETWORK' }),
      baseOutreach(),
      baseContext,
    );
    expect(result.score).toBe(SCORE_WEIGHTS.level_out_of_network);
    expect(result.tier).toBe('skip');
  });
});

describe('scoreProspect — recent unlock bonus (Phase 3.3)', () => {
  it('2nd-degree unlocked within window → +recent_unlock_boost', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        last_level_change_at: NOW - 2 * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.recent_unlock).toBe(
      SCORE_WEIGHTS.recent_unlock_boost,
    );
    expect(result.score).toBe(
      SCORE_WEIGHTS.level_2nd + SCORE_WEIGHTS.recent_unlock_boost,
    );
  });

  it('2nd-degree unlocked outside window → no bonus', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        last_level_change_at:
          NOW - (SCORE_WEIGHTS.recent_unlock_days + 1) * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.recent_unlock).toBe(0);
    expect(result.score).toBe(SCORE_WEIGHTS.level_2nd);
  });

  it('2nd-degree with no unlock timestamp → no bonus', () => {
    const result = scoreProspect(
      baseProspect({ level: '2nd', last_level_change_at: null }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.recent_unlock).toBe(0);
  });

  it('3rd-degree inside window → no bonus (only 2nd is actionable)', () => {
    const result = scoreProspect(
      baseProspect({
        level: '3rd',
        last_level_change_at: NOW - 2 * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.recent_unlock).toBe(0);
  });

  it('OUT_OF_NETWORK inside window → no bonus', () => {
    const result = scoreProspect(
      baseProspect({
        level: 'OUT_OF_NETWORK',
        last_level_change_at: NOW - 1 * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.recent_unlock).toBe(0);
  });

  it('future timestamp (clock skew) → no bonus (no retroactive credit)', () => {
    const result = scoreProspect(
      baseProspect({
        level: '2nd',
        last_level_change_at: NOW + 2 * MS_PER_DAY,
      }),
      baseOutreach(),
      baseContext,
    );
    expect(result.breakdown.recent_unlock).toBe(0);
  });

  it('boost is additive to other signals and can promote tier', () => {
    // Plain 2nd with a mid firm + some mutuals: ~100+25+5 = 130 (A tier).
    // With fresh unlock: +25 → 155, bumping to S.
    const fresh = scoreProspect(
      baseProspect({
        level: '2nd',
        company: 'Mid Ventures',
        mutual_count: 3,
        last_level_change_at: NOW - 1 * MS_PER_DAY,
      }),
      baseOutreach({
        firms: [{ name: 'Mid Ventures', weight: 25, tier: 'mid' }],
      }),
      baseContext,
    );
    const stale = scoreProspect(
      baseProspect({
        level: '2nd',
        company: 'Mid Ventures',
        mutual_count: 3,
        last_level_change_at: null,
      }),
      baseOutreach({
        firms: [{ name: 'Mid Ventures', weight: 25, tier: 'mid' }],
      }),
      baseContext,
    );
    expect(fresh.score).toBe(stale.score + SCORE_WEIGHTS.recent_unlock_boost);
    expect(fresh.tier).toBe('S');
    expect(stale.tier).toBe('A');
  });
});

describe('tierForScore', () => {
  it.each<[number, string]>([
    [200, 'S'],
    [140, 'S'],
    [139, 'A'],
    [100, 'A'],
    [99, 'B'],
    [60, 'B'],
    [59, 'C'],
    [30, 'C'],
    [29, 'skip'],
    [0, 'skip'],
    [-30, 'skip'],
  ])('score=%d → tier=%s', (score, expected) => {
    expect(tierForScore(score, DEFAULT_TIER_THRESHOLDS)).toBe(expected);
  });
});

describe('computeFeedEventFingerprint', () => {
  it('produces stable 16-char hex', () => {
    const fp = computeFeedEventFingerprint({
      prospect_id: 42,
      event_kind: 'post',
      activity_urn: 'urn:li:activity:7451889312482283521',
      comment_urn: null,
    });
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it('same inputs → same fingerprint (dedup across passes)', () => {
    const parts = {
      prospect_id: 42,
      event_kind: 'comment' as const,
      activity_urn: 'urn:li:activity:7451889312482283521',
      comment_urn: 'urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)',
    };
    expect(computeFeedEventFingerprint(parts)).toBe(
      computeFeedEventFingerprint(parts),
    );
  });

  it('different prospect → different fingerprint', () => {
    const a = computeFeedEventFingerprint({
      prospect_id: 1,
      event_kind: 'post',
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
    });
    const b = computeFeedEventFingerprint({
      prospect_id: 2,
      event_kind: 'post',
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
    });
    expect(a).not.toBe(b);
  });

  it('different event kind → different fingerprint', () => {
    const a = computeFeedEventFingerprint({
      prospect_id: 1,
      event_kind: 'post',
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
    });
    const b = computeFeedEventFingerprint({
      prospect_id: 1,
      event_kind: 'reaction',
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
    });
    expect(a).not.toBe(b);
  });

  it('same post, different comment → different fingerprint', () => {
    const a = computeFeedEventFingerprint({
      prospect_id: 1,
      event_kind: 'comment',
      activity_urn: 'urn:li:activity:X',
      comment_urn: 'urn:li:comment:(X,A)',
    });
    const b = computeFeedEventFingerprint({
      prospect_id: 1,
      event_kind: 'comment',
      activity_urn: 'urn:li:activity:X',
      comment_urn: 'urn:li:comment:(X,B)',
    });
    expect(a).not.toBe(b);
  });
});
