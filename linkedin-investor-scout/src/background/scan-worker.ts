import {
  appendActivityLog,
  getProspectById,
  getProspectByUrl,
  getScanState,
  getSettings,
  putScanState,
  resetStuckInProgressProspects,
  takePendingProspectsBatch,
  updateOutreachAction,
  updateProspect,
  listOutreachActionsForProspect,
} from '@/shared/db';
import { recomputeAndPersistProspect } from '@/shared/prospect-scoring';
import { detectAcceptanceOnLevelChange } from '@/shared/acceptance-watcher';
import { broadcast } from '@/shared/messaging';
import { jitterAround, localDayBucket, randomDelayMs } from '@/shared/time';
import {
  canonicalizeLinkedInProfileUrl,
  slugFromCanonicalProfileUrl,
} from '@/shared/url';
import type {
  AutoPauseReason,
  Prospect,
  ProspectLevel,
  ScanState,
} from '@/shared/types';
import {
  DEFAULT_SCAN_ARGS,
  scanProfilePageInTab,
  type ScanArgs,
} from '@/content/scan';

const PENDING_BATCH_SIZE = 100;
const TAB_LOAD_TIMEOUT_MS = 45000;
/** Absolute ceiling on the in-page parser — matches the MutationObserver budget +5s buffer. */
const SCAN_EXEC_TIMEOUT_MS = 20000;

/** Map of tabIds currently owned by the scan worker (used by the watchdog). */
const ownedTabs = new Map<number, { prospectId: number; openedAt: number }>();

/**
 * Single-flight guard: prevents two concurrent scan loops from racing after
 * rapid-fire start/pause toggles.
 */
let loopRunning = false;

export function getOwnedTabIds(): number[] {
  return Array.from(ownedTabs.keys());
}

async function broadcastScanState(state: ScanState): Promise<void> {
  broadcast({ type: 'SCAN_STATE_CHANGED', payload: state });
}

function broadcastProspectsUpdated(changedIds: number[]): void {
  const normalized = Array.from(
    new Set(changedIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  broadcast({
    type: 'PROSPECTS_UPDATED',
    payload: { changed_ids: normalized },
  });
}

async function setScanStatus(
  patch: Partial<Omit<ScanState, 'id'>>,
): Promise<ScanState> {
  const next = await putScanState({
    ...patch,
    last_activity_at: Date.now(),
  });
  void broadcastScanState(next);
  return next;
}

async function rolloverDayBucketIfNeeded(state: ScanState): Promise<ScanState> {
  const today = localDayBucket(Date.now());
  if (state.day_bucket === today) return state;
  const next = await putScanState({
    day_bucket: today,
    scans_today: 0,
  });
  await appendActivityLog({
    ts: Date.now(),
    level: 'info',
    event: 'day_bucket_rollover',
    prospect_id: null,
    data: { from: state.day_bucket, to: today },
  });
  void broadcastScanState(next);
  return next;
}

export async function startScan(): Promise<ScanState> {
  const current = await getScanState();
  if (current.status === 'running') {
    return current;
  }
  const state = await setScanStatus({
    status: 'running',
    auto_pause_reason: null,
    started_at: current.started_at ?? Date.now(),
  });
  await appendActivityLog({
    ts: Date.now(),
    level: 'info',
    event: 'scan_start',
    prospect_id: null,
    data: {},
  });
  void runScanLoop();
  return state;
}

export async function pauseScan(): Promise<ScanState> {
  const state = await setScanStatus({
    status: 'paused',
    current_prospect_id: null,
  });
  await appendActivityLog({
    ts: Date.now(),
    level: 'info',
    event: 'scan_pause',
    prospect_id: null,
    data: {},
  });
  return state;
}

export async function resumeScan(): Promise<ScanState> {
  const current = await getScanState();
  if (current.status === 'running') return current;
  const state = await setScanStatus({
    status: 'running',
    auto_pause_reason: null,
  });
  await appendActivityLog({
    ts: Date.now(),
    level: 'info',
    event: 'scan_resume',
    prospect_id: null,
    data: {},
  });
  void runScanLoop();
  return state;
}

async function autoPause(reason: AutoPauseReason, prospectId: number | null) {
  const state = await setScanStatus({
    status: 'auto_paused',
    auto_pause_reason: reason,
    current_prospect_id: null,
  });
  await appendActivityLog({
    ts: Date.now(),
    level: 'warn',
    event: 'scan_auto_paused',
    prospect_id: prospectId,
    data: { reason },
  });
  return state;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTabComplete(
  tabId: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removedListener);
      clearTimeout(timeoutId);
      if (err) reject(err);
      else resolve();
    };
    const listener = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && info.status === 'complete') finish();
    };
    const removedListener = (removedTabId: number) => {
      if (removedTabId === tabId) finish(new Error('tab_closed_prematurely'));
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(removedListener);
    const timeoutId = setTimeout(
      () => finish(new Error('tab_load_timeout')),
      timeoutMs,
    );

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        finish(new Error(chrome.runtime.lastError.message ?? 'tab_get_failed'));
        return;
      }
      if (tab.status === 'complete') finish();
    });
  });
}

async function closeTabSafely(tabId: number): Promise<void> {
  ownedTabs.delete(tabId);
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.warn('[investor-scout] tab remove failed', {
      tabId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

async function executeScanInTab(tabId: number) {
  const args: ScanArgs = DEFAULT_SCAN_ARGS;
  const exec = chrome.scripting.executeScript({
    target: { tabId },
    world: 'ISOLATED',
    func: scanProfilePageInTab,
    args: [args],
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('scan_exec_timeout')),
      SCAN_EXEC_TIMEOUT_MS,
    ),
  );
  const results = await Promise.race([exec, timeout]);
  const first = (results as chrome.scripting.InjectionResult[])[0];
  if (!first) throw new Error('scan_no_result');
  return first.result as Awaited<ReturnType<typeof scanProfilePageInTab>>;
}

async function buildRedirectPatch(
  prospect: Prospect,
  tabId: number,
): Promise<Partial<Omit<Prospect, 'id'>>> {
  let currentTabUrl: string | null = null;
  try {
    const tab = await chrome.tabs.get(tabId);
    currentTabUrl = typeof tab.url === 'string' ? tab.url : null;
  } catch {
    return {};
  }
  if (!currentTabUrl) return {};

  const canonical = canonicalizeLinkedInProfileUrl(currentTabUrl);
  if (!canonical || canonical === prospect.url) return {};

  const redirectedSlug = slugFromCanonicalProfileUrl(canonical);
  if (!redirectedSlug) return {};

  const existing = await getProspectByUrl(canonical);
  if (existing && existing.id !== prospect.id) {
    await appendActivityLog({
      ts: Date.now(),
      level: 'warn',
      event: 'profile_redirect_conflict',
      prospect_id: prospect.id,
      data: {
        from_url: prospect.url,
        to_url: canonical,
        existing_prospect_id: existing.id,
      },
    });
    return {};
  }

  return { url: canonical, slug: redirectedSlug };
}

export interface ScanProspectOutcome {
  kind: 'done' | 'retry' | 'failed' | 'auto_paused';
  level?: ProspectLevel;
  error?: string;
  reason?: AutoPauseReason;
}

async function scanSingleProspect(
  prospect: Prospect,
): Promise<ScanProspectOutcome> {
  await updateProspect(prospect.id, {
    scan_status: 'in_progress',
    scan_attempts: prospect.scan_attempts + 1,
  });
  await setScanStatus({ current_prospect_id: prospect.id });

  let tabId: number | null = null;

  try {
    const created = await chrome.tabs.create({
      url: prospect.url,
      active: false,
      pinned: false,
    });
    if (typeof created.id !== 'number') {
      throw new Error('tab_create_no_id');
    }
    tabId = created.id;
    ownedTabs.set(tabId, { prospectId: prospect.id, openedAt: Date.now() });

    await waitForTabComplete(tabId, TAB_LOAD_TIMEOUT_MS);

    const result = await executeScanInTab(tabId);

    if (!result) throw new Error('scan_no_result');

    const d = result.data;
    if (d?.detected_captcha || d?.detected_rate_limit || d?.detected_auth_wall) {
      const reason: AutoPauseReason = d.detected_captcha
        ? 'captcha'
        : d.detected_rate_limit
          ? 'rate_limit'
          : 'auth_wall';
      // Leave the tab open so the user can solve it manually; just drop our claim.
      ownedTabs.delete(tabId);
      tabId = null;
      return { kind: 'auto_paused', reason };
    }

    if (d?.profile_unavailable) {
      return { kind: 'failed', error: 'profile_unavailable' };
    }

    if (!result.ok || !d) {
      throw new Error(result.error ?? 'scan_failed');
    }

    const redirectPatch = await buildRedirectPatch(prospect, tabId);

    const now = Date.now();
    const previousLevel = prospect.level;
    const levelChanged = d.level !== previousLevel;

    // Phase 3.3 acceptance watcher: a transition from a pre-connected level
    // (2nd / 3rd / OOON) to `1st` implies the prospect accepted an invite we
    // previously sent. Decide the action + lifecycle patch BEFORE writing the
    // prospect row so we can bundle `lifecycle_status = 'connected'` into the
    // same update and flip the matching outreach_action row to `accepted`.
    let acceptanceLifecycle: Prospect['lifecycle_status'] | null = null;
    let acceptedActionId: number | null = null;
    if (levelChanged) {
      try {
        const history = await listOutreachActionsForProspect(prospect.id);
        const outcome = detectAcceptanceOnLevelChange({
          oldLevel: previousLevel,
          newLevel: d.level,
          history,
          currentLifecycleStatus: prospect.lifecycle_status,
        });
        if (outcome.next_lifecycle_status) {
          acceptanceLifecycle = outcome.next_lifecycle_status;
        }
        if (outcome.accepted && outcome.invite_to_accept) {
          const updated = await updateOutreachAction(
            outcome.invite_to_accept.id,
            {
              state: 'accepted',
              resolved_at: now,
            },
          );
          acceptedActionId = updated.id;
        }
      } catch (error) {
        console.warn('[investor-scout] acceptance watcher failed', {
          prospectId: prospect.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    await updateProspect(prospect.id, {
      ...redirectPatch,
      level: d.level,
      name: d.name,
      headline: d.headline,
      company: d.company,
      location: d.location,
      scan_status: 'done',
      scan_error: null,
      last_scanned: now,
      // Phase 3.3 unlock tracking hook — stamp the transition so later sprints
      // can query level-change history without a separate event store.
      ...(levelChanged ? { last_level_change_at: now } : {}),
      ...(acceptanceLifecycle ? { lifecycle_status: acceptanceLifecycle } : {}),
    });

    // Phase 1.2 recompute trigger: scan completion refreshes score/tier.
    // Failures here must not fail the scan — just log and move on.
    try {
      await recomputeAndPersistProspect(prospect.id);
    } catch (error) {
      console.warn('[investor-scout] recompute after scan failed', {
        prospectId: prospect.id,
        error: error instanceof Error ? error.message : error,
      });
    }

    await appendActivityLog({
      ts: Date.now(),
      level: 'info',
      event: 'profile_scanned',
      prospect_id: prospect.id,
      data: {
        url: redirectPatch.url ?? prospect.url,
        original_url: prospect.url,
        level: d.level,
        level_changed: levelChanged,
        previous_level: levelChanged ? previousLevel : undefined,
        name: d.name,
        company: d.company,
      },
    });

    if (levelChanged) {
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'level_transition',
        prospect_id: prospect.id,
        data: {
          from: previousLevel,
          to: d.level,
          accepted_action_id: acceptedActionId,
        },
      });
    }

    if (acceptedActionId !== null) {
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'outreach_accepted',
        prospect_id: prospect.id,
        data: {
          outreach_action_id: acceptedActionId,
          from_level: previousLevel,
          to_level: d.level,
        },
      });
    }

    return { kind: 'done', level: d.level };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { kind: 'retry', error: msg };
  } finally {
    if (tabId !== null) {
      await closeTabSafely(tabId);
    }
  }
}

async function applyOutcome(
  prospect: Prospect,
  outcome: ScanProspectOutcome,
  maxRetries: number,
  retryOnFailure: boolean,
): Promise<'continue' | 'stop'> {
  if (outcome.kind === 'done') {
    return 'continue';
  }
  if (outcome.kind === 'auto_paused') {
    await updateProspect(prospect.id, { scan_status: 'pending' });
    await autoPause(outcome.reason ?? 'captcha', prospect.id);
    return 'stop';
  }
  if (outcome.kind === 'failed') {
    await updateProspect(prospect.id, {
      scan_status: 'failed',
      scan_error: outcome.error ?? 'unknown_failure',
    });
    await appendActivityLog({
      ts: Date.now(),
      level: 'warn',
      event: 'profile_scan_failed',
      prospect_id: prospect.id,
      data: { url: prospect.url, error: outcome.error },
    });
    return 'continue';
  }

  // 'retry'
  const attempts = prospect.scan_attempts + 1;
  if (!retryOnFailure) {
    await updateProspect(prospect.id, {
      scan_status: 'failed',
      scan_error: outcome.error ?? 'retry_disabled',
    });
    await appendActivityLog({
      ts: Date.now(),
      level: 'warn',
      event: 'profile_scan_failed',
      prospect_id: prospect.id,
      data: {
        url: prospect.url,
        error: outcome.error,
        attempts,
        retry_on_failure: false,
      },
    });
    return 'continue';
  }

  if (attempts >= maxRetries) {
    await updateProspect(prospect.id, {
      scan_status: 'failed',
      scan_error: outcome.error ?? 'max_retries_exceeded',
    });
    await appendActivityLog({
      ts: Date.now(),
      level: 'error',
      event: 'profile_scan_failed',
      prospect_id: prospect.id,
      data: {
        url: prospect.url,
        error: outcome.error,
        attempts,
        max_retries_exceeded: true,
      },
    });
  } else {
    await updateProspect(prospect.id, {
      scan_status: 'pending',
      scan_error: outcome.error ?? null,
    });
    await appendActivityLog({
      ts: Date.now(),
      level: 'warn',
      event: 'profile_scan_retry',
      prospect_id: prospect.id,
      data: { url: prospect.url, error: outcome.error, attempts },
    });
  }
  return 'continue';
}

/**
 * Main scheduler loop. Only one invocation runs at a time (single-flight);
 * additional callers are dropped and the in-flight loop carries the queue.
 */
export async function runScanLoop(): Promise<void> {
  if (loopRunning) return;
  loopRunning = true;
  try {
    while (true) {
      let state = await getScanState();
      if (state.status !== 'running') break;

      state = await rolloverDayBucketIfNeeded(state);
      const settings = await getSettings();

      if (state.scans_today >= settings.scan.daily_cap) {
        await setScanStatus({
          status: 'idle',
          current_prospect_id: null,
        });
        await appendActivityLog({
          ts: Date.now(),
          level: 'info',
          event: 'daily_cap_reached',
          prospect_id: null,
          data: { scans_today: state.scans_today, cap: settings.scan.daily_cap },
        });
        break;
      }

      const batch = await takePendingProspectsBatch(PENDING_BATCH_SIZE);
      if (batch.length === 0) {
        await setScanStatus({ status: 'idle', current_prospect_id: null });
        await appendActivityLog({
          ts: Date.now(),
          level: 'info',
          event: 'scan_completed',
          prospect_id: null,
          data: {},
        });
        break;
      }

      for (const ref of batch) {
        const check = await getScanState();
        if (check.status !== 'running') return;

        const today = await rolloverDayBucketIfNeeded(check);
        if (today.scans_today >= settings.scan.daily_cap) {
          await setScanStatus({ status: 'idle', current_prospect_id: null });
          return;
        }

        const base = randomDelayMs(
          settings.scan.min_delay_ms,
          settings.scan.max_delay_ms,
        );
        await sleep(jitterAround(base));

        const guard = await getScanState();
        if (guard.status !== 'running') return;

        const prospect = await getProspectById(ref.id);
        if (!prospect) continue;

        const outcome = await scanSingleProspect(prospect);
        const next = await applyOutcome(
          prospect,
          outcome,
          settings.scan.max_retries,
          settings.scan.retry_on_failure,
        );
        // Batch prospect-row mutations into one broadcast per processed prospect.
        broadcastProspectsUpdated([prospect.id]);

        // Daily cap tracks scan attempts, not only successful outcomes.
        const s = await getScanState();
        await setScanStatus({ scans_today: s.scans_today + 1 });

        if (next === 'stop') return;
      }
    }
  } catch (error) {
    console.error('[investor-scout] scan loop error', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    await appendActivityLog({
      ts: Date.now(),
      level: 'error',
      event: 'scan_loop_error',
      prospect_id: null,
      data: { error: error instanceof Error ? error.message : String(error) },
    });
    await setScanStatus({ status: 'paused', current_prospect_id: null });
  } finally {
    loopRunning = false;
  }
}

/**
 * Close any tabs we registered but that no longer exist according to Chrome,
 * and close tabs that have been open longer than 2 minutes (likely stuck).
 */
export async function reconcileOwnedTabs(): Promise<void> {
  const now = Date.now();
  const all = await chrome.tabs.query({});
  const alive = new Set(all.map((t) => t.id).filter((id): id is number => typeof id === 'number'));

  for (const [tabId, info] of Array.from(ownedTabs.entries())) {
    if (!alive.has(tabId)) {
      ownedTabs.delete(tabId);
      continue;
    }
    if (now - info.openedAt > 120_000) {
      console.warn('[investor-scout] watchdog closing stale scan tab', {
        tabId,
        prospectId: info.prospectId,
        ageMs: now - info.openedAt,
      });
      await closeTabSafely(tabId);
    }
  }
}

/**
 * Called on service-worker startup. Releases any rows that were mid-scan
 * (their tabs are gone) and resumes the loop if state was running.
 */
export async function resumeScanOnStartup(): Promise<void> {
  const n = await resetStuckInProgressProspects();
  if (n > 0) {
    await appendActivityLog({
      ts: Date.now(),
      level: 'info',
      event: 'reset_stuck_in_progress',
      prospect_id: null,
      data: { count: n },
    });
  }
  const state = await getScanState();
  if (state.status === 'running') {
    void runScanLoop();
  }
}
