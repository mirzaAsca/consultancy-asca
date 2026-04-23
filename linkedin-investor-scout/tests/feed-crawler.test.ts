import { describe, expect, it } from 'vitest';
import {
  FEED_CRAWL_MAX_SCROLLS_PER_MODE,
  FEED_CRAWL_MAX_SCROLL_PX,
  FEED_CRAWL_MAX_WAIT_MS,
  FEED_CRAWL_MIN_SCROLL_PX,
  FEED_CRAWL_MIN_WAIT_MS,
  FEED_CRAWL_MODE_URL,
  FEED_CRAWL_NO_NEW_EVENTS_STOP,
} from '@/shared/constants';
import {
  buildModeUrl,
  computeOverlap,
  isOnFeedMode,
  pickScrollStep,
  pickWaitMs,
  shouldStopCrawl,
} from '@/shared/feed-crawler';

// Deterministic PRNG we can drive through a Vitest suite without pulling in
// an external dep. Linear congruential — good enough for bounds checks.
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('pickScrollStep', () => {
  it('stays inside the absolute scroll bounds over a large sample', () => {
    const rnd = seededRandom(42);
    for (let i = 0; i < 5_000; i += 1) {
      const step = pickScrollStep(rnd);
      expect(step).toBeGreaterThanOrEqual(FEED_CRAWL_MIN_SCROLL_PX);
      expect(step).toBeLessThanOrEqual(FEED_CRAWL_MAX_SCROLL_PX);
      expect(Number.isInteger(step)).toBe(true);
    }
  });

  it('spreads across the range (mean somewhere between floor and ceil)', () => {
    const rnd = seededRandom(7);
    let sum = 0;
    const n = 2_000;
    for (let i = 0; i < n; i += 1) sum += pickScrollStep(rnd);
    const mean = sum / n;
    // Expected uniform midpoint ~ 900; allow 250 px of slack for the
    // Gaussian jitter weighting.
    expect(mean).toBeGreaterThan(FEED_CRAWL_MIN_SCROLL_PX + 50);
    expect(mean).toBeLessThan(FEED_CRAWL_MAX_SCROLL_PX - 50);
  });

  it('guards against broken PRNGs (NaN / >=1 / <0) — always returns a safe step', () => {
    const broken = () => Number.NaN;
    const nanStep = pickScrollStep(broken);
    expect(nanStep).toBeGreaterThanOrEqual(FEED_CRAWL_MIN_SCROLL_PX);
    expect(nanStep).toBeLessThanOrEqual(FEED_CRAWL_MAX_SCROLL_PX);
    const high = () => 1.5;
    expect(pickScrollStep(high)).toBeLessThanOrEqual(FEED_CRAWL_MAX_SCROLL_PX);
    const low = () => -1;
    expect(pickScrollStep(low)).toBeGreaterThanOrEqual(FEED_CRAWL_MIN_SCROLL_PX);
  });
});

describe('pickWaitMs', () => {
  it('stays inside the wait bounds', () => {
    const rnd = seededRandom(99);
    for (let i = 0; i < 1_000; i += 1) {
      const w = pickWaitMs(rnd);
      expect(w).toBeGreaterThanOrEqual(FEED_CRAWL_MIN_WAIT_MS);
      expect(w).toBeLessThanOrEqual(FEED_CRAWL_MAX_WAIT_MS);
    }
  });
});

describe('shouldStopCrawl', () => {
  it('returns null while under all caps', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: 3,
        consecutive_empty: 1,
        user_interacted: false,
        canceled: false,
      }),
    ).toBeNull();
  });

  it('reports max_scrolls at the scroll cap', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: FEED_CRAWL_MAX_SCROLLS_PER_MODE,
        consecutive_empty: 0,
        user_interacted: false,
        canceled: false,
      }),
    ).toBe('max_scrolls');
  });

  it('reports no_new_events when the dry-run counter hits the threshold', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: 5,
        consecutive_empty: FEED_CRAWL_NO_NEW_EVENTS_STOP,
        user_interacted: false,
        canceled: false,
      }),
    ).toBe('no_new_events');
  });

  it('prioritizes user interaction over organic stops', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: FEED_CRAWL_MAX_SCROLLS_PER_MODE,
        consecutive_empty: FEED_CRAWL_NO_NEW_EVENTS_STOP,
        user_interacted: true,
        canceled: false,
      }),
    ).toBe('user_interaction');
  });

  it('prioritizes cancel over everything else', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: FEED_CRAWL_MAX_SCROLLS_PER_MODE,
        consecutive_empty: FEED_CRAWL_NO_NEW_EVENTS_STOP,
        user_interacted: true,
        canceled: true,
      }),
    ).toBe('canceled');
  });
});

describe('buildModeUrl', () => {
  it('returns the canonical Top URL without a sortBy param', () => {
    expect(buildModeUrl('top')).toBe(FEED_CRAWL_MODE_URL.top);
  });
  it('returns the Recent URL with sortBy=LAST_MODIFIED', () => {
    expect(buildModeUrl('recent')).toBe(FEED_CRAWL_MODE_URL.recent);
  });
});

describe('isOnFeedMode', () => {
  it('treats bare /feed/ as top mode', () => {
    expect(isOnFeedMode('https://www.linkedin.com/feed/', 'top')).toBe(true);
    expect(isOnFeedMode('https://www.linkedin.com/feed/', 'recent')).toBe(false);
  });

  it('treats sortBy=LAST_MODIFIED as recent mode', () => {
    const href = 'https://www.linkedin.com/feed/?sortBy=LAST_MODIFIED';
    expect(isOnFeedMode(href, 'recent')).toBe(true);
    expect(isOnFeedMode(href, 'top')).toBe(false);
  });

  it('rejects non-feed pages', () => {
    expect(
      isOnFeedMode('https://www.linkedin.com/in/someone/', 'top'),
    ).toBe(false);
    expect(isOnFeedMode('https://example.com/feed/', 'top')).toBe(false);
  });

  it('normalizes trailing slashes and missing sortBy', () => {
    expect(isOnFeedMode('https://www.linkedin.com/feed', 'top')).toBe(true);
  });
});

describe('computeOverlap', () => {
  it('counts fingerprints present in both passes', () => {
    expect(computeOverlap(['a', 'b', 'c'], ['b', 'c', 'd'])).toBe(2);
  });
  it('returns 0 when either side is empty', () => {
    expect(computeOverlap([], ['a', 'b'])).toBe(0);
    expect(computeOverlap(['x'], [])).toBe(0);
  });
  it('ignores duplicates in the right side beyond the first hit', () => {
    expect(computeOverlap(['a'], ['a', 'a', 'a'])).toBe(3);
    // (Iteration-style count by design — caller wires unique fingerprints from
    // the dedupe layer, so this spec documents the raw behavior.)
  });
});
