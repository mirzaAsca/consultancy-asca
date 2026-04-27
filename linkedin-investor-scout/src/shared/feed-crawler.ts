import {
  FEED_CRAWL_MAX_SCROLLS_PER_MODE,
  FEED_CRAWL_MAX_SCROLL_PX,
  FEED_CRAWL_MAX_WAIT_MS,
  FEED_CRAWL_MIN_SCROLL_PX,
  FEED_CRAWL_MIN_WAIT_MS,
} from './constants';
import type { FeedCrawlStopReason } from './types';

/**
 * Pure helpers for the manual Feed Crawl Session. Separated from
 * `src/content/feed-crawler.ts` (DOM loop) so jitter / stop-reason logic can
 * be unit-tested without jsdom.
 */

/**
 * Draw a gentle scroll step in pixels.
 *
 * Base: uniform [MIN, MAX]. Jitter: ±20 % centered via a Box–Muller draw,
 * clamped to stay inside the absolute safety bounds so we never scroll 0 px
 * or jump 3 screens.
 */
export function pickScrollStep(random: () => number): number {
  const r1 = safeRandom(random);
  const base =
    FEED_CRAWL_MIN_SCROLL_PX +
    r1 * (FEED_CRAWL_MAX_SCROLL_PX - FEED_CRAWL_MIN_SCROLL_PX);
  const r2 = safeRandom(random);
  const r3 = safeRandom(random);
  const gauss =
    Math.sqrt(-2 * Math.log(Math.max(r2, 1e-9))) *
    Math.cos(2 * Math.PI * r3);
  const jittered = base * (1 + 0.2 * clamp(gauss, -1, 1));
  return Math.round(
    clamp(jittered, FEED_CRAWL_MIN_SCROLL_PX, FEED_CRAWL_MAX_SCROLL_PX),
  );
}

/** Wait between scroll cycles, in ms, uniform in [MIN, MAX]. */
export function pickWaitMs(random: () => number): number {
  const r = safeRandom(random);
  return Math.round(
    FEED_CRAWL_MIN_WAIT_MS + r * (FEED_CRAWL_MAX_WAIT_MS - FEED_CRAWL_MIN_WAIT_MS),
  );
}

/**
 * Decide whether to stop a single-mode pass and why. Returns `null` to keep
 * going. Cancel beats user-interaction beats the hard scroll cap.
 */
export function shouldStopCrawl(state: {
  scroll_steps: number;
  user_interacted: boolean;
  canceled: boolean;
}): FeedCrawlStopReason | null {
  if (state.canceled) return 'canceled';
  if (state.user_interacted) return 'user_interaction';
  if (state.scroll_steps >= FEED_CRAWL_MAX_SCROLLS_PER_MODE) return 'max_scrolls';
  return null;
}

/**
 * Count fingerprints that appear in *both* mode passes. Exposed for the
 * session-level overlap telemetry.
 */
export function computeOverlap(
  topFingerprints: Iterable<string>,
  recentFingerprints: Iterable<string>,
): number {
  const topSet = new Set(topFingerprints);
  let overlap = 0;
  for (const fp of recentFingerprints) {
    if (topSet.has(fp)) overlap += 1;
  }
  return overlap;
}

function safeRandom(random: () => number): number {
  const r = random();
  if (!Number.isFinite(r) || r < 0) return 0;
  if (r >= 1) return 0.999_999_999_999;
  return r;
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
