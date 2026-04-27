import { describe, expect, it } from 'vitest';
import {
  FEED_CRAWL_MAX_SCROLLS_PER_MODE,
  FEED_CRAWL_MAX_SCROLL_PX,
  FEED_CRAWL_MAX_WAIT_MS,
  FEED_CRAWL_MIN_SCROLL_PX,
  FEED_CRAWL_MIN_WAIT_MS,
} from '@/shared/constants';
import {
  computeOverlap,
  pickScrollStep,
  pickWaitMs,
  shouldStopCrawl,
} from '@/shared/feed-crawler';

// Deterministic PRNG — linear congruential, good enough for bounds checks.
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
    expect(mean).toBeGreaterThan(FEED_CRAWL_MIN_SCROLL_PX + 50);
    expect(mean).toBeLessThan(FEED_CRAWL_MAX_SCROLL_PX - 50);
  });

  it('guards against broken PRNGs (NaN / >=1 / <0) — always returns a safe step', () => {
    const broken = () => Number.NaN;
    const nanStep = pickScrollStep(broken);
    expect(nanStep).toBeGreaterThanOrEqual(FEED_CRAWL_MIN_SCROLL_PX);
    expect(nanStep).toBeLessThanOrEqual(FEED_CRAWL_MAX_SCROLL_PX);
    expect(pickScrollStep(() => 1.5)).toBeLessThanOrEqual(
      FEED_CRAWL_MAX_SCROLL_PX,
    );
    expect(pickScrollStep(() => -1)).toBeGreaterThanOrEqual(
      FEED_CRAWL_MIN_SCROLL_PX,
    );
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
  it('returns null while under the scroll cap', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: 3,
        user_interacted: false,
        canceled: false,
      }),
    ).toBeNull();
  });

  it('reports max_scrolls at the scroll cap', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: FEED_CRAWL_MAX_SCROLLS_PER_MODE,
        user_interacted: false,
        canceled: false,
      }),
    ).toBe('max_scrolls');
  });

  it('prioritizes user interaction over the scroll cap', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: FEED_CRAWL_MAX_SCROLLS_PER_MODE,
        user_interacted: true,
        canceled: false,
      }),
    ).toBe('user_interaction');
  });

  it('prioritizes cancel over everything else', () => {
    expect(
      shouldStopCrawl({
        scroll_steps: FEED_CRAWL_MAX_SCROLLS_PER_MODE,
        user_interacted: true,
        canceled: true,
      }),
    ).toBe('canceled');
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
  it('counts each occurrence on the right side that hits the left set', () => {
    expect(computeOverlap(['a'], ['a', 'a', 'a'])).toBe(3);
  });
});
