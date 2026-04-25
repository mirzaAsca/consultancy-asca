/**
 * Phase 3.1 — passive continuous harvester.
 *
 * Peer of the scan worker under the same Start/Pause control. While
 * `scan_state.status === 'running'` AND a user-owned LinkedIn tab is open,
 * a setTimeout-based scheduler periodically dispatches a single-mode
 * `FEED_CRAWL_RUN_IN_TAB` (passive=true) into the active feed tab so the
 * inbox keeps filling without the user clicking the manual button.
 *
 * Invariants honored (per v2 spec):
 *  - No `chrome.alarms`. Scheduling is plain setTimeout — when the scan
 *    pauses we clear the timer and the scheduler goes silent.
 *  - Never navigates the user's tab (`passive: true` skips ensureFeedMode).
 *  - Yields immediately on user interaction (existing crawler guards).
 *  - Never competes with the manual Feed Crawl Session — gate skips when
 *    the manual session is in flight.
 *  - Cooldown gate (default 5 min) prevents thrashing.
 *  - User-idle gate (default 30 s) defers the cycle while the user is
 *    actively browsing the feed.
 */
import { appendActivityLog } from '@/shared/db';
import {
  PASSIVE_HARVEST_COOLDOWN_MS,
  PASSIVE_HARVEST_TICK_INTERVAL_MS,
  PASSIVE_HARVEST_USER_IDLE_MS,
} from '@/shared/constants';
import {
  decidePassiveHarvest,
  type PassiveHarvestSkipReason,
} from '@/shared/passive-harvester';
import type { FeedCrawlSessionResult, ScanWorkerStatus } from '@/shared/types';
import { isLinkedInFeedTabUrl } from './feed-test';
import { getOwnedTabIds } from './scan-worker';

/** Module-local state — the scheduler is a singleton in the SW. */
let scheduler: {
  timeoutId: ReturnType<typeof setTimeout> | null;
  running: boolean;
  inFlight: boolean;
  lastRunAt: number | null;
  lastUserInteractionAt: number | null;
} = {
  timeoutId: null,
  running: false,
  inFlight: false,
  lastRunAt: null,
  lastUserInteractionAt: null,
};

/**
 * Hook installed by `src/background/index.ts`. Decoupled from the module
 * to avoid an import cycle (scan-worker → passive-harvester → index → ...).
 */
type DispatchPassiveCycle = () => Promise<{
  ok: true;
  data: FeedCrawlSessionResult;
} | { ok: false; error: string; skipped?: boolean }>;

let dispatchPassiveCycle: DispatchPassiveCycle | null = null;
let getManualSessionRunning: () => boolean = () => false;
let getScanStatus: () => Promise<ScanWorkerStatus> = async () => 'idle';

export interface RegisterPassiveHarvesterOpts {
  dispatch: DispatchPassiveCycle;
  isManualSessionRunning: () => boolean;
  scanStatus: () => Promise<ScanWorkerStatus>;
}

/**
 * Wire up the scheduler's external dependencies. Called once at SW boot from
 * `src/background/index.ts` so the harvester can ask "is the manual session
 * running?" / "what's the scan status?" without importing back into the
 * message router (which would create a cycle).
 */
export function registerPassiveHarvester(
  opts: RegisterPassiveHarvesterOpts,
): void {
  dispatchPassiveCycle = opts.dispatch;
  getManualSessionRunning = opts.isManualSessionRunning;
  getScanStatus = opts.scanStatus;
}

/**
 * Returns the active LinkedIn feed tab the user is currently viewing, or
 * `null` if no eligible tab is open. Worker-owned scan tabs are excluded so
 * the scheduler never harvests inside a hidden profile-scan tab.
 */
async function pickActiveFeedTab(): Promise<chrome.tabs.Tab | null> {
  const ownedIds = new Set(getOwnedTabIds());
  // Prefer the active tab in the currently focused window — that's where
  // the user is looking. Fall back to any other LinkedIn feed tab if the
  // foreground tab isn't on `/feed`.
  const [active] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (
    active &&
    typeof active.id === 'number' &&
    !ownedIds.has(active.id) &&
    typeof active.url === 'string' &&
    isLinkedInFeedTabUrl(active.url)
  ) {
    return active;
  }
  const all = await chrome.tabs.query({
    url: ['https://www.linkedin.com/feed', 'https://www.linkedin.com/feed/*'],
  });
  for (const t of all) {
    if (typeof t.id !== 'number') continue;
    if (ownedIds.has(t.id)) continue;
    if (typeof t.url === 'string' && isLinkedInFeedTabUrl(t.url)) return t;
  }
  return null;
}

/**
 * Mark the user as "active right now". Reset on any signal that suggests
 * the user is browsing the feed (currently called from the same auto-pause
 * hook that cancels the manual session — extended at the next sprint to
 * include a content-script ping, see TODO file).
 */
export function recordUserInteraction(now: number = Date.now()): void {
  scheduler.lastUserInteractionAt = now;
}

async function tick(): Promise<void> {
  if (!scheduler.running) return;
  // Re-arm before doing the work so a slow dispatch doesn't drift the cadence.
  scheduler.timeoutId = setTimeout(tick, PASSIVE_HARVEST_TICK_INTERVAL_MS);
  if (scheduler.inFlight) return;

  const status = await getScanStatus();
  const tab = await pickActiveFeedTab();
  const decision = decidePassiveHarvest({
    now: Date.now(),
    scan_status: status,
    manual_session_running: getManualSessionRunning(),
    has_user_linkedin_tab: tab !== null,
    last_run_at: scheduler.lastRunAt,
    last_user_interaction_at: scheduler.lastUserInteractionAt,
  });

  if (!decision.fire) {
    logSkip(decision.skip);
    return;
  }
  if (!dispatchPassiveCycle) return;

  scheduler.inFlight = true;
  const startedAt = Date.now();
  await appendActivityLog({
    ts: startedAt,
    level: 'info',
    event: 'passive_harvest_cycle_start',
    prospect_id: null,
    data: { tab_id: tab?.id ?? null },
  });

  try {
    const res = await dispatchPassiveCycle();
    const endedAt = Date.now();
    scheduler.lastRunAt = endedAt;
    if (res.ok) {
      await appendActivityLog({
        ts: endedAt,
        level: 'info',
        event: 'passive_harvest_cycle_end',
        prospect_id: null,
        data: {
          duration_ms: endedAt - startedAt,
          total_events_captured: res.data.total_events_captured,
          stop_reason: res.data.stop_reason,
        },
      });
      // Yielding to the user counts as a user-interaction for the gate.
      if (res.data.stop_reason === 'user_interaction') {
        recordUserInteraction(endedAt);
      }
    } else if (res.skipped) {
      // dispatch decided not to run (e.g. manual session won the race) —
      // don't log as a failure, just clear in-flight and let the next tick
      // re-evaluate.
    } else {
      await appendActivityLog({
        ts: endedAt,
        level: 'warn',
        event: 'passive_harvest_cycle_failed',
        prospect_id: null,
        data: { error: res.error, duration_ms: endedAt - startedAt },
      });
    }
  } catch (err) {
    await appendActivityLog({
      ts: Date.now(),
      level: 'warn',
      event: 'passive_harvest_cycle_failed',
      prospect_id: null,
      data: { error: err instanceof Error ? err.message : String(err) },
    });
  } finally {
    scheduler.inFlight = false;
  }
}

let lastSkipLogged: { reason: PassiveHarvestSkipReason; at: number } | null =
  null;
function logSkip(reason: PassiveHarvestSkipReason): void {
  // Avoid log spam — only emit a skip line when the reason changes or 5 min
  // has elapsed since the last identical log.
  const now = Date.now();
  if (
    lastSkipLogged &&
    lastSkipLogged.reason === reason &&
    now - lastSkipLogged.at < 5 * 60_000
  ) {
    return;
  }
  lastSkipLogged = { reason, at: now };
  void appendActivityLog({
    ts: now,
    level: 'info',
    event: 'passive_harvest_cycle_skipped',
    prospect_id: null,
    data: { reason },
  });
}

/**
 * Arm the scheduler. Idempotent — calling while already running is a no-op
 * so scan-worker `startScan` / `resumeScan` can both wire it without
 * coordinating.
 */
export function startPassiveHarvester(): void {
  if (scheduler.running) return;
  scheduler.running = true;
  // Tick once on the next macrotask so a fresh start surfaces a decision
  // entry without waiting a full interval — useful for debugging.
  scheduler.timeoutId = setTimeout(tick, 0);
}

export function stopPassiveHarvester(): void {
  scheduler.running = false;
  if (scheduler.timeoutId !== null) {
    clearTimeout(scheduler.timeoutId);
    scheduler.timeoutId = null;
  }
  // Don't reset lastRunAt / lastUserInteractionAt — the cooldown should
  // persist across pause/resume so the user doesn't get a burst of cycles
  // immediately after un-pausing.
  scheduler.inFlight = false;
}

/** Test helper — fully reset the in-memory scheduler state. */
export function __resetPassiveHarvesterForTests(): void {
  stopPassiveHarvester();
  scheduler = {
    timeoutId: null,
    running: false,
    inFlight: false,
    lastRunAt: null,
    lastUserInteractionAt: null,
  };
  lastSkipLogged = null;
  dispatchPassiveCycle = null;
  getManualSessionRunning = () => false;
  getScanStatus = async () => 'idle';
}

export const PASSIVE_HARVESTER_INTERNAL = {
  /** Test helper — directly observe scheduler state. */
  snapshot(): {
    running: boolean;
    inFlight: boolean;
    lastRunAt: number | null;
    lastUserInteractionAt: number | null;
  } {
    return {
      running: scheduler.running,
      inFlight: scheduler.inFlight,
      lastRunAt: scheduler.lastRunAt,
      lastUserInteractionAt: scheduler.lastUserInteractionAt,
    };
  },
};

void PASSIVE_HARVEST_COOLDOWN_MS;
void PASSIVE_HARVEST_USER_IDLE_MS;
