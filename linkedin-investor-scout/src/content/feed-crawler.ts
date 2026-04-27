/**
 * Manual Feed Crawl Session runner — runs inside the LinkedIn /feed/ tab.
 *
 * Drives a Top → Recent pass that:
 *   1. Reads the current sort by inspecting the on-page "Sort by: …" button
 *      (LinkedIn does NOT honor `?sortBy=LAST_MODIFIED` in the URL — switching
 *      is a DOM-only action).
 *   2. If we're not on the requested mode, clicks the sort dropdown and the
 *      target menu item, then waits for the feed root to re-hydrate.
 *   3. Performs FEED_CRAWL_MAX_SCROLLS_PER_MODE (=10) full-auto scrolls on
 *      LinkedIn's `<main id="workspace">` scroll container, each with a
 *      randomized step and a randomized wait between steps.
 *   4. Yields to user interaction (keydown / mousedown / touchstart / wheel)
 *      and to background-driven cancel.
 *
 * Feed events are captured by the existing highlight scan pass — we just
 * track the *delta* of unique fingerprints per mode for telemetry.
 */
import {
  FEED_CRAWL_FEED_READY_TIMEOUT_MS,
  FEED_CRAWL_MAX_SCROLLS_PER_MODE,
} from '@/shared/constants';
import {
  computeOverlap,
  pickScrollStep,
  pickWaitMs,
  shouldStopCrawl,
} from '@/shared/feed-crawler';
import type {
  FeedCrawlModeMetrics,
  FeedCrawlSessionResult,
  FeedCrawlStopReason,
} from '@/shared/types';

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
  now?: () => number;
  onProgress?: (partial: Partial<FeedCrawlSessionResult>) => void;
  isCanceled: () => boolean;
  /**
   * Passive mode (continuous harvester). Runs ONE pass against whatever mode
   * the user is currently viewing — never clicks the sort dropdown so we
   * don't disrupt their feed.
   */
  passive?: boolean;
  /**
   * Optional mode subset for manual sessions. Defaults to `['top', 'recent']`.
   * Passive mode ignores this and uses the current on-page mode.
   */
  modes?: Array<'top' | 'recent'>;
}

const DEFAULT_MODES: Array<'top' | 'recent'> = ['top', 'recent'];

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

  // Wait for the feed root to be present at least once before any pass.
  const rootReady = await waitForFeedRoot();
  if (!rootReady) {
    return {
      session_id: opts.session_id,
      tab_id: opts.tab_id,
      started_at: sessionStart,
      ended_at: now(),
      duration_ms: now() - sessionStart,
      total_events_captured: 0,
      overlap_count: 0,
      modes: [
        {
          mode: 'top',
          scroll_steps: 0,
          events_captured: 0,
          started_at: sessionStart,
          ended_at: now(),
          stop_reason: 'navigation_failed',
          event_fingerprints: [],
        },
      ],
      stop_reason: 'navigation_failed',
    };
  }

  const modes: Array<'top' | 'recent'> = opts.passive
    ? [readCurrentMode() ?? 'top']
    : opts.modes && opts.modes.length > 0
      ? opts.modes
      : DEFAULT_MODES;

  for (const mode of modes) {
    if (opts.isCanceled()) {
      sessionStop = 'canceled';
      break;
    }

    const modeStart = now();

    if (!opts.passive) {
      const switched = await switchFeedMode(mode);
      if (!switched) {
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

    // Merge this mode's fingerprints into baseline so the next mode only
    // counts *its* deltas.
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
  let userInteracted = false;
  const rng = Math.random;

  const onUserInteraction = () => {
    userInteracted = true;
  };
  attachUserInteractionGuards(onUserInteraction);

  try {
    const scrollTarget = pickScrollTarget();
    focusScrollTarget(scrollTarget);

    // Count cards already on-screen against the baseline so the first delta
    // doesn't lump in everything that was already mounted.
    opts.fingerprints.scanNow();
    for (const fp of opts.fingerprints.snapshot()) baseline.add(fp);

    while (true) {
      const stopReason = shouldStopCrawl({
        scroll_steps: scrollSteps,
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

      await sleep(pickWaitMs(rng));

      opts.fingerprints.scanNow();
      const snapshot = opts.fingerprints.snapshot();
      for (const fp of snapshot) {
        if (baseline.has(fp)) continue;
        if (modeFingerprints.has(fp)) continue;
        modeFingerprints.add(fp);
      }
    }
  } finally {
    detachUserInteractionGuards(onUserInteraction);
  }
}

// ——— DOM-driven mode switching ———

/**
 * Find LinkedIn's "Sort by: Top|Recent" button. The componentkey is a per-
 * render UUID and class names are hashed, so we match by `role="button"` +
 * visible text. Stable across SDUI builds.
 */
function findSortButton(): HTMLElement | null {
  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>('div[role="button"]'),
  );
  return (
    buttons.find((el) => /sort by/i.test(el.textContent || '')) ?? null
  );
}

/**
 * Read the current feed sort by inspecting the sort button's text. Returns
 * `null` when the button isn't mounted yet — caller should treat that as
 * "feed not ready" and retry.
 */
function readCurrentMode(): 'top' | 'recent' | null {
  const btn = findSortButton();
  if (!btn) return null;
  const text = (btn.textContent || '').trim().toLowerCase();
  if (text.endsWith('top')) return 'top';
  if (text.endsWith('recent')) return 'recent';
  return null;
}

/**
 * Click LinkedIn's sort dropdown to switch feed mode. No-op (returns true)
 * when we're already on the target mode. Returns false on any failure —
 * caller treats that as `navigation_failed` for the mode metric.
 */
async function switchFeedMode(target: 'top' | 'recent'): Promise<boolean> {
  if (readCurrentMode() === target) {
    return true;
  }

  const btn = findSortButton();
  if (!btn) {
    logWarn('feed_crawl_sort_button_missing', { target });
    return false;
  }
  btn.click();

  const targetLabel = target === 'top' ? 'Top' : 'Recent';
  const itemDeadline = Date.now() + 2_000;
  let item: HTMLElement | undefined;
  while (Date.now() < itemDeadline) {
    item = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).find((el) => (el.textContent || '').trim() === targetLabel);
    if (item) break;
    await sleep(50);
  }
  if (!item) {
    logWarn('feed_crawl_sort_menu_item_missing', { target });
    // Best-effort close the menu by clicking the button again.
    try {
      btn.click();
    } catch {
      /* no-op */
    }
    return false;
  }
  item.click();

  // Confirm the sort label flipped — this is our proof the switch took.
  const switchDeadline = Date.now() + 5_000;
  while (Date.now() < switchDeadline) {
    if (readCurrentMode() === target) {
      // Feed re-hydrates after the switch — wait for cards to mount before
      // letting the scroll loop run, otherwise the first deltas land empty.
      const ready = await waitForFeedRoot();
      return ready;
    }
    await sleep(100);
  }
  logWarn('feed_crawl_sort_switch_unconfirmed', { target });
  return false;
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
 * LinkedIn's SDUI feed renders inside `<main id="workspace" tabindex="0">`,
 * and on that layout `<main>` owns its own scroll container — `window.scrollBy`
 * is a no-op for the feed. Falls back to `documentElement` for legacy / test
 * surfaces.
 */
function pickScrollTarget(): Element {
  const main = document.querySelector(
    'main#workspace, main[tabindex="0"]',
  ) as HTMLElement | null;
  if (main) return main;
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Park keyboard focus on the scroll container so SDUI hydration treats us
 * like a user. Skip if the user has a composer / search input focused.
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
 * Smooth scroll on the resolved container. Browsers explicitly ignore
 * synthesized KeyboardEvents for native scroll, so `dispatchEvent(new
 * KeyboardEvent(...))` would be a no-op — `scrollBy` is the closest thing to
 * "press Down arrow" we actually have. Three fallbacks for minimal fixtures.
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
  try {
    window.scrollBy(0, deltaY);
  } catch {
    /* no-op */
  }
}

// ——— User-interaction guards ———

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

void FEED_CRAWL_MAX_SCROLLS_PER_MODE;
