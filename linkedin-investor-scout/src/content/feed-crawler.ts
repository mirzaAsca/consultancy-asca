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
  /**
   * Optional mode subset. Background-owned manual sessions use this to run one
   * mode per fresh page context after navigating the tab itself.
   */
  modes?: Array<'top' | 'recent'>;
  /**
   * When true, assume the background already navigated the tab to the requested
   * mode and only wait for the feed root to hydrate.
   */
  skipNavigation?: boolean;
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
    : opts.modes && opts.modes.length > 0
      ? opts.modes
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
      const nav =
        opts.passive || opts.skipNavigation
          ? await waitForCurrentFeedRoot()
          : await ensureFeedMode(mode);
      if (!nav.ok) {
        perMode.push({
          mode,
          scroll_steps: 0,
          events_captured: 0,
          started_at: modeStart,
          ended_at: now(),
          stop_reason: 'navigation_failed',
          event_fingerprints: [],
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
        event_fingerprints: [],
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
    // Resolve the right scroll surface. LinkedIn's SDUI feed lives inside
    // `<main id="workspace" tabindex="0">` (see example1.html line 197), and
    // on that layout `window.scrollBy` is a no-op because <main> owns its own
    // scroller. Falling back to documentElement keeps us working on legacy
    // surfaces and in tests where <main> isn't present.
    const scrollTarget = pickScrollTarget();
    focusScrollTarget(scrollTarget);

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
          event_fingerprints: Array.from(modeFingerprints),
        };
      }

      const step = pickScrollStep(rng);
      scrollContainerBy(scrollTarget, step);
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
    return waitForCurrentFeedRoot();
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

  return waitForCurrentFeedRoot();
}

async function waitForCurrentFeedRoot(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
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

/**
 * Resolve LinkedIn's actual scroll surface. The SDUI feed is rendered inside
 * `<main id="workspace" tabindex="0">` (see example1.html line 197), and on
 * that layout `<main>` owns the scroll container — `window.scrollBy` does not
 * scroll the feed. Falling back to `documentElement` keeps us working on
 * legacy pre-SDUI surfaces and in tests where `<main>` isn't mounted yet.
 */
function pickScrollTarget(): Element {
  const main = document.querySelector(
    'main#workspace, main[tabindex="0"]',
  ) as HTMLElement | null;
  if (main) return main;
  return document.scrollingElement ?? document.documentElement;
}

/**
 * LinkedIn's scroll surface is keyboard-focusable (`<main tabindex="0">`).
 * Parking focus there mirrors a user pressing into the feed, which is what
 * the SDUI hydration relies on. Skip if the user has a composer / search
 * input focused so we don't yank them out mid-typing.
 */
function focusScrollTarget(target: Element): void {
  try {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && active !== document.documentElement) {
      const tag = active.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || active.isContentEditable) {
        return;
      }
    }
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
    }
  } catch {
    /* focus seeding is best-effort */
  }
}

/**
 * Issue a smooth scroll on the resolved container. `behavior: 'smooth'` lets
 * the browser interpolate frames so LinkedIn's IntersectionObserver-driven
 * card hydration keeps up with our advance — the previous instant 600–1200 px
 * `behavior: 'auto'` jump flew past the virtualized window faster than cards
 * could mount, leaving floating badges with no card body underneath. Falls
 * back through three successively dumber scroll APIs in case the resolved
 * target doesn't expose the modern signature.
 */
function scrollContainerBy(target: Element, deltaY: number): void {
  try {
    target.scrollBy({ top: deltaY, left: 0, behavior: 'smooth' });
    return;
  } catch {
    /* fall through */
  }
  try {
    target.scrollBy(0, deltaY);
    return;
  } catch {
    /* fall through */
  }
  try {
    if (target instanceof HTMLElement) {
      target.scrollTop = target.scrollTop + deltaY;
      return;
    }
  } catch {
    /* fall through */
  }
  // Last resort — should never trigger on the LinkedIn surface but keeps the
  // crawler functional on minimal test fixtures.
  try {
    window.scrollBy(0, deltaY);
  } catch {
    /* no-op */
  }
}

// ——— User-interaction guards ———
//
// The moment the user wheels, taps, clicks, or types while a crawl is running,
// we must yield. Raw `scroll` is intentionally not observed: LinkedIn layout
// shifts and our own scrollBy calls can emit it after the programmatic scroll.

function attachUserInteractionGuards(onInteract: () => void): void {
  document.addEventListener('keydown', onInteract, { passive: true });
  document.addEventListener('mousedown', onInteract, { passive: true });
  document.addEventListener('touchstart', onInteract, { passive: true });
  window.addEventListener('wheel', onInteract, { passive: true });
}

function detachUserInteractionGuards(onInteract: () => void): void {
  document.removeEventListener('keydown', onInteract);
  document.removeEventListener('mousedown', onInteract);
  document.removeEventListener('touchstart', onInteract);
  window.removeEventListener('wheel', onInteract);
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
