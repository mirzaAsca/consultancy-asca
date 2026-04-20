import { describe, expect, it } from 'vitest';
import {
  FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS,
  canCoverAllFeedTestLevels,
  FEED_TEST_LEVELS,
  buildFeedTestRows,
  isLinkedInFeedTabUrl,
} from '@/background/feed-test';
import type { FeedVisibleProfile } from '@/shared/types';

function randomFromSequence(values: number[]): () => number {
  let idx = 0;
  return () => {
    const value = values[idx] ?? values[values.length - 1] ?? 0;
    idx += 1;
    return value;
  };
}

describe('isLinkedInFeedTabUrl', () => {
  it('accepts canonical LinkedIn feed URLs', () => {
    expect(isLinkedInFeedTabUrl('https://www.linkedin.com/feed/')).toBe(true);
    expect(isLinkedInFeedTabUrl('https://linkedin.com/feed')).toBe(true);
    expect(isLinkedInFeedTabUrl('https://www.linkedin.com/feed?trk=abc')).toBe(
      true,
    );
  });

  it('rejects non-feed URLs', () => {
    expect(isLinkedInFeedTabUrl('https://www.linkedin.com/feed/following/')).toBe(
      false,
    );
    expect(isLinkedInFeedTabUrl('https://www.linkedin.com/in/jane-doe/')).toBe(
      false,
    );
    expect(isLinkedInFeedTabUrl('https://example.com/feed/')).toBe(false);
  });
});

describe('buildFeedTestRows', () => {
  it('canonicalizes, deduplicates by slug, and stamps scan-ready fields', () => {
    const now = 1_713_000_000_000;
    const profiles: FeedVisibleProfile[] = [
      {
        url: 'https://linkedin.com/in/Alice-123?trk=feed',
        slug: 'unused',
        name: '  Alice Example  ',
      },
      {
        url: 'https://www.linkedin.com/in/alice-123/',
        slug: 'unused',
        name: 'Duplicate',
      },
      {
        url: 'https://www.linkedin.com/in/bob-xyz/',
        slug: 'unused',
        name: null,
      },
      {
        url: 'https://www.linkedin.com/company/acme/',
        slug: 'unused',
        name: 'Ignored',
      },
    ];

    const rows = buildFeedTestRows(profiles, {
      now,
      random: () => 0,
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.url)).toEqual([
      'https://www.linkedin.com/in/Alice-123/',
      'https://www.linkedin.com/in/bob-xyz/',
    ]);
    expect(rows.map((row) => row.slug)).toEqual(['alice-123', 'bob-xyz']);
    expect(rows.map((row) => row.name)).toEqual(['Alice Example', null]);
    for (const row of rows) {
      expect(row.scan_status).toBe('done');
      expect(row.scan_error).toBeNull();
      expect(row.last_scanned).toBe(now);
      expect(row.created_at).toBe(now);
      expect(row.updated_at).toBe(now);
      expect(row.activity.connected).toBe(false);
      expect(row.activity.commented).toBe(false);
      expect(row.activity.messaged).toBe(false);
    }
  });

  it('guarantees all four levels appear when at least four profiles are seeded', () => {
    const profiles: FeedVisibleProfile[] = Array.from({ length: 8 }, (_, i) => ({
      url: `https://www.linkedin.com/in/person-${i + 1}/`,
      slug: `person-${i + 1}`,
      name: `Person ${i + 1}`,
    }));

    const rows = buildFeedTestRows(profiles, {
      random: randomFromSequence([
        0.9,
        0.1,
        0.7,
        0.3,
        0.8,
        0.2,
        0.6,
        0.4,
      ]),
    });
    const presentLevels = new Set(rows.map((row) => row.level));

    expect(rows).toHaveLength(8);
    for (const level of FEED_TEST_LEVELS) {
      expect(presentLevels.has(level)).toBe(true);
    }
  });

  it('exposes the all-level coverage guard used by feed test seeding', () => {
    expect(canCoverAllFeedTestLevels(FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS - 1)).toBe(
      false,
    );
    expect(canCoverAllFeedTestLevels(FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS)).toBe(
      true,
    );
  });
});
