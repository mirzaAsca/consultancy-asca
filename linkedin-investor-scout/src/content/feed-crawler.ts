/**
 * Phase 3.1 / 3.2 — manual Feed Crawl Session runner.
 *
 * Runs inside the active `linkedin.com/feed` tab. Drives a two-mode pass
 * (Top → Recent) that: switches feed mode, waits for cards to hydrate,
 * scrolls with gentle jittered steps, yields to user interaction, and
 * returns the same `FeedCrawlSessionResult` the background relays to the
 * popup for telemetry. Feed events are captured by the existing highlight
 * scan pass (MutationObserver sees the new cards LinkedIn lazy-loads), so
 * we just need to track the *delta* of unique fingerprints per mode.
 */
import {
  FEED_CRAWL_FEED_READY_TIMEOUT_MS,
  FEED_CRAWL_MAX_SCROLLS_PER_MODE,
} from '@/shared/constants';
import {
  buildModeUrl,
  computeOverlap,
  isOnFeedMode,
  pickScrollStep,
  pickWaitMs,
  shouldStopCrawl,
} from '@/shared/feed-crawler';
import type {
  FeedCrawlModeMetrics,
  FeedCrawlSessionResult,
  FeedCrawlStopReason,
} from '@/shared/types';

/**
 * Surface given by the highlight bootstrap so the crawler can read the
 * current set of captured fingerprints without tight coupling to the module.
 */
export interface FeedCrawlFingerprintSource {
  /** Set of event fingerprints seen so far in this tab session. */
  snapshot(): Set<string>;
  /** Force a DOM scan so the highlighter captures any just-rendered cards. */
  scanNow(): void;
}

export interface RunFeedCrawlOptions {
  session_id: string;
  tab_id: number;
  fingerprints: FeedCrawlFingerprintSource;
  /** Optional override — primarily for tests / future remote dispatch. */
  now?: () => number;
  /**
   * Called whenever an interim per-mode pass finishes so background can
   * update its in-memory status snapshot.
   */
  onProgress?: (partial: Partial<FeedCrawlSessionResult>) => void;
  /** Signal set by a `FEED_CRAWL_CANCEL_IN_TAB` message from background. */
  isCanceled: () => boolean;
  /**
   * Phase 3.1 — passive mode (continuous harvester). When true, runs ONE
   * mode pass against the tab's current URL without navigation, never
   * switches to the other sort. Used by the background scheduler so the
   * harvester never disrupts the user's chosen feed view.
   */
  passive?: boolean;
}

const MODES: Array<'top' | 'recent'> = ['top', 'recent'];

/**
 * Detect the current feed mode from `location.href`. Falls back to `top` when
 * the URL doesn't carry a `?sortBy` we recognize — the manual session always
 * normalizes via navigation, but the passive harvester needs to honor whatever
 * surface the user is already looking at.
 */
function detectCurrentFeedMode(): 'top' | 'recent' {
  try {
    const url = new URL(location.href);
    const sort = (url.searchParams.get('sortBy') ?? '').toUpperCase();
    if (sort === 'LAST_MODIFIED' || sort === 'RECENT') return 'recent';
    return 'top';
  } catch {
    return 'top';
  }
}

export async function runFeedCrawlSession(
  opts: RunFeedCrawlOptions,
): Promise<FeedCrawlSessionResult> {
  const now = opts.now ?? Date.now;
  const sessionStart = now();

  const fingerprintsByMode: Record<'top' | 'recent', Set<string>> = {
    top: new Set(),
    recent: new Set(),
  };
  const perMode: FeedCrawlModeMetrics[] = [];
  let sessionStop: FeedCrawlStopReason = 'completed';

  const baselineFingerprints = new Set(opts.fingerprints.snapshot());

  // Phase 3.1 — passive mode runs a single pass against the tab's current
  // mode, skipping any navigation. Manual sessions still walk Top → Recent.
  const modes: Array<'top' | 'recent'> = opts.passive
    ? [detectCurrentFeedMode()]
    : MODES;

  for (const mode of modes) {
    if (opts.isCanceled()) {
      sessionStop = 'canceled';
      break;
    }

    const modeStart = now();
    try {
      // Passive harvester never navigates — it harvests whatever the user is
      // already viewing. Skip the ensureFeedMode reload to avoid clobbering
      // their tab.
      const nav = opts.passive
        ? { ok: true as const }
        : await ensureFeedMode(mode);
      if (!nav.ok) {
        perMode.push({
          mode,
          scroll_steps: 0,
          events_captured: 0,
          started_at: modeStart,
          ended_at: now(),
          stop_reason: 'navigation_failed',
        });
        sessionStop = 'navigation_failed';
        opts.onProgress?.({ modes: [...perMode] });
        break;
      }
    } catch (error) {
      logWarn('feed_crawl_navigation_error', {
        mode,
        error: error instanceof Error ? error.message : String(error),
      });
      perMode.push({
        mode,
        scroll_steps: 0,
        events_captured: 0,
        started_at: modeStart,
        ended_at: now(),
        stop_reason: 'navigation_failed',
      });
      sessionStop = 'navigation_failed';
      opts.onProgress?.({ modes: [...perMode] });
      break;
    }

    const modeMetrics = await crawlMode({
      mode,
      baseline: baselineFingerprints,
      modeFingerprints: fingerprintsByMode[mode],
      startedAt: modeStart,
      opts,
      now,
    });
    perMode.push(modeMetrics);

    // Merge this mode's new fingerprints into the baseline so the next mode
    // only counts *its* deltas — otherwise top-mode hits would also count
    // against the recent pass.
    for (const fp of fingerprintsByMode[mode]) baselineFingerprints.add(fp);

    opts.onProgress?.({ modes: [...perMode] });

    if (modeMetrics.stop_reason === 'user_interaction') {
      sessionStop = 'user_interaction';
      break;
    }
    if (modeMetrics.stop_reason === 'canceled') {
      sessionStop = 'canceled';
      break;
    }
  }

  const ended_at = now();
  const total_events_captured = perMode.reduce(
    (acc, m) => acc + m.events_captured,
    0,
  );
  const overlap = computeOverlap(
    fingerprintsByMode.top,
    fingerprintsByMode.recent,
  );

  return {
    session_id: opts.session_id,
    tab_id: opts.tab_id,
    started_at: sessionStart,
    ended_at,
    duration_ms: ended_at - sessionStart,
    total_events_captured,
    overlap_count: overlap,
    modes: perMode,
    stop_reason: sessionStop,
  };
}

interface CrawlModeArgs {
  mode: 'top' | 'recent';
  baseline: Set<string>;
  modeFingerprints: Set<string>;
  startedAt: number;
  opts: RunFeedCrawlOptions;
  now: () => number;
}

async function crawlMode(args: CrawlModeArgs): Promise<FeedCrawlModeMetrics> {
  const { mode, baseline, modeFingerprints, startedAt, opts, now } = args;
  let scrollSteps = 0;
  let consecutiveEmpty = 0;
  let userInteracted = false;
  const rng = Math.random;

  const onUserInteraction = () => {
    userInteracted = true;
  };
  attachUserInteractionGuards(onUserInteraction);

  try {
    // Kick a scan so any cards already on-screen count against the baseline
    // before we start scrolling (avoids inflating the first delta).
    opts.fingerprints.scanNow();
    for (const fp of opts.fingerprints.snapshot()) baseline.add(fp);

    while (true) {
      const stopReason = shouldStopCrawl({
        scroll_steps: scrollSteps,
        consecutive_empty: consecutiveEmpty,
        user_interacted: userInteracted,
        canceled: opts.isCanceled(),
      });
      if (stopReason) {
        return {
          mode,
          scroll_steps: scrollSteps,
          events_captured: modeFingerprints.size,
          started_at: startedAt,
          ended_at: now(),
          stop_reason: stopReason,
        };
      }

      const step = pickScrollStep(rng);
      markProgrammaticScroll();
      try {
        window.scrollBy({ top: step, left: 0, behavior: 'smooth' });
      } catch {
        window.scrollBy(0, step);
      }
      scrollSteps += 1;

      const waitMs = pickWaitMs(rng);
      await sleep(waitMs);

      opts.fingerprints.scanNow();
      const snapshot = opts.fingerprints.snapshot();
      let added = 0;
      for (const fp of snapshot) {
        if (baseline.has(fp)) continue;
        if (modeFingerprints.has(fp)) continue;
        modeFingerprints.add(fp);
        added += 1;
      }
      consecutiveEmpty = added === 0 ? consecutiveEmpty + 1 : 0;
    }
  } finally {
    detachUserInteractionGuards(onUserInteraction);
  }
}

/**
 * Navigate the current tab to the canonical URL for `mode` and wait for the
 * main feed list to appear (so the highlighter has cards to scan). No-ops
 * when we're already in the target mode.
 */
async function ensureFeedMode(
  mode: 'top' | 'recent',
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (isOnFeedMode(location.href, mode)) {
    const ready = await waitForFeedRoot();
    return ready ? { ok: true } : { ok: false, reason: 'feed_root_timeout' };
  }

  const targetUrl = buildModeUrl(mode);

  // In-page nav that triggers LinkedIn's SPA router. `location.assign` keeps
  // the tab history clean and forces a full reload for the mode switch.
  const preNavPath = location.pathname + location.search;
  try {
    location.assign(targetUrl);
  } catch (error) {
    logWarn('feed_crawl_nav_assign_error', {
      error: error instanceof Error ? error.message : String(error),
      mode,
    });
    return { ok: false, reason: 'nav_assign_threw' };
  }

  // Poll for the URL change; `location.assign` is async from our POV.
  const navDeadline = Date.now() + 10_000;
  while (Date.now() < navDeadline) {
    if (location.pathname + location.search !== preNavPath) break;
    await sleep(150);
  }

  const ready = await waitForFeedRoot();
  return ready ? { ok: true } : { ok: false, reason: 'feed_root_timeout' };
}

/**
 * Wait for the feed list root to show up. We look for either the modern SDUI
 * marker or the classical feed-shared container — whichever renders first.
 */
async function waitForFeedRoot(): Promise<boolean> {
  const deadline = Date.now() + FEED_CRAWL_FEED_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const found =
      document.querySelector('[data-testid="mainFeed"]') ??
      document.querySelector('[componentkey*="FeedType_MAIN_FEED"]') ??
      document.querySelector('main [data-component-type="LazyColumn"]') ??
      document.querySelector('article.feed-shared-update-v2');
    if (found) return true;
    await sleep(250);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ——— User-interaction guards ———
//
// The moment the user scrolls, clicks, or types while a crawl is running, we
// must yield. Anything else feels hostile. We use bubble-phase listeners and
// remove them as soon as the pass ends.

const IDLE_SCROLL_WINDOW_MS = 250;
let lastProgrammaticScrollAt = 0;

function attachUserInteractionGuards(onInteract: () => void): void {
  document.addEventListener('keydown', onInteract, { passive: true });
  document.addEventListener('mousedown', onInteract, { passive: true });
  document.addEventListener('touchstart', onInteract, { passive: true });
  window.addEventListener('wheel', onInteract, { passive: true });
  // Guard against programmatic scrolls: we mark a short window around our
  // scrollBy call so the scroll listener ignores our own input.
  const scrollHandler = () => {
    if (Date.now() - lastProgrammaticScrollAt < IDLE_SCROLL_WINDOW_MS) return;
    onInteract();
  };
  (onInteract as { __scrollHandler?: typeof scrollHandler }).__scrollHandler =
    scrollHandler;
  window.addEventListener('scroll', scrollHandler, {
    passive: true,
    capture: true,
  });
}

function detachUserInteractionGuards(onInteract: () => void): void {
  document.removeEventListener('keydown', onInteract);
  document.removeEventListener('mousedown', onInteract);
  document.removeEventListener('touchstart', onInteract);
  window.removeEventListener('wheel', onInteract);
  const scrollHandler = (
    onInteract as { __scrollHandler?: EventListener }
  ).__scrollHandler;
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true);
  }
}

/** Marks a programmatic scroll so the user-scroll guard ignores it. */
export function markProgrammaticScroll(): void {
  lastProgrammaticScrollAt = Date.now();
}

function logWarn(event: string, data: Record<string, unknown>): void {
  try {
    console.warn(`[investor-scout/feed-crawler] ${event}`, data);
  } catch {
    /* no-op */
  }
}

// Ensure the unused cap import is referenced so TS doesn't flag it — it's
// kept here because future session summaries might echo the cap back to the
// popup.
void FEED_CRAWL_MAX_SCROLLS_PER_MODE;
