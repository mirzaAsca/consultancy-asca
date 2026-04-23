import {
  FEED_CRAWL_MAX_SCROLLS_PER_MODE,
  FEED_CRAWL_MAX_SCROLL_PX,
  FEED_CRAWL_MAX_WAIT_MS,
  FEED_CRAWL_MIN_SCROLL_PX,
  FEED_CRAWL_MIN_WAIT_MS,
  FEED_CRAWL_MODE_URL,
  FEED_CRAWL_NO_NEW_EVENTS_STOP,
} from './constants';
import type { FeedCrawlStopReason, FeedMode } from './types';

/**
 * Phase 3.1 — pure helpers for the manual Feed Crawl Session.
 * Separated from `src/content/feed-crawler.ts` (which owns the DOM loop)
 * so scroll-step / jitter / stop-reason logic can be unit-tested under
 * jsdom-less Vitest.
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
  // Box–Muller for a ~N(0, 1) sample without importing a stats lib.
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
 * Given the running state of a single-mode pass, decide whether to stop and
 * why. Returns `null` to keep going. Ordering matters: user interaction wins
 * over any organic stop reason so we yield immediately.
 */
export function shouldStopCrawl(state: {
  scroll_steps: number;
  consecutive_empty: number;
  user_interacted: boolean;
  canceled: boolean;
}): FeedCrawlStopReason | null {
  if (state.canceled) return 'canceled';
  if (state.user_interacted) return 'user_interaction';
  if (state.scroll_steps >= FEED_CRAWL_MAX_SCROLLS_PER_MODE) return 'max_scrolls';
  if (state.consecutive_empty >= FEED_CRAWL_NO_NEW_EVENTS_STOP) {
    return 'no_new_events';
  }
  return null;
}

/** Canonical URL for a given mode pass. */
export function buildModeUrl(mode: 'top' | 'recent'): string {
  return FEED_CRAWL_MODE_URL[mode];
}

/**
 * Does this URL already target the requested feed mode? If so we can skip the
 * nav + reload and jump straight into scrolling.
 */
export function isOnFeedMode(href: string, mode: 'top' | 'recent'): boolean {
  try {
    const url = new URL(href, 'https://www.linkedin.com');
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'linkedin.com') return false;
    const path = url.pathname.toLowerCase().replace(/\/+$/, '');
    if (path !== '/feed') return false;
    const sort = (url.searchParams.get('sortBy') ?? '').toUpperCase();
    const resolved: FeedMode =
      sort === 'LAST_MODIFIED' || sort === 'RECENT'
        ? 'recent'
        : sort === '' || sort === 'RELEVANCE' || sort === 'TOP'
          ? 'top'
          : 'unknown';
    return resolved === mode;
  } catch {
    return false;
  }
}

/**
 * Count fingerprints that appear in *both* mode passes. Exposed for the
 * session-level overlap telemetry (Phase 3.2).
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
