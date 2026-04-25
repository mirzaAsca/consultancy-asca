import { appendActivityLog, getScanState, putScanState } from '@/shared/db';
import { broadcast } from '@/shared/messaging';
import { localDayBucket } from '@/shared/time';
import {
  getOwnedTabIds,
  reconcileOwnedTabs,
  resumeScanOnStartup,
  runScanLoop,
} from './scan-worker';

const WATCHDOG_ALARM = 'investor-scout/watchdog';
const DAILY_ROLLOVER_ALARM = 'investor-scout/daily-rollover';

/** Register the 30s watchdog + daily midnight rollover alarms. */
export function registerScanAlarms(): void {
  void chrome.alarms.create(WATCHDOG_ALARM, {
    periodInMinutes: 0.5,
  });

  const nextMidnight = computeNextLocalMidnight(Date.now());
  void chrome.alarms.create(DAILY_ROLLOVER_ALARM, {
    when: nextMidnight,
    periodInMinutes: 60 * 24,
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
      if (alarm.name === WATCHDOG_ALARM) {
        await reconcileOwnedTabs();
        return;
      }
      if (alarm.name === DAILY_ROLLOVER_ALARM) {
        await handleDailyRollover();
      }
    } catch (error) {
      console.error('[investor-scout] alarm handler error', {
        alarm: alarm.name,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

async function handleDailyRollover(): Promise<void> {
  const state = await getScanState();
  const today = localDayBucket(Date.now());
  if (state.day_bucket === today) return;
  const next = await putScanState({ day_bucket: today, scans_today: 0 });
  await appendActivityLog({
    ts: Date.now(),
    level: 'info',
    event: 'day_bucket_rollover',
    prospect_id: null,
    data: { from: state.day_bucket, to: today, via: 'alarm' },
  });
  broadcast({ type: 'SCAN_STATE_CHANGED', payload: next });
  // If we were idle purely because of the cap, user must manually resume —
  // we do not auto-restart the loop on midnight to stay safe.
  if (state.status === 'running') {
    void runScanLoop();
  }
}

function computeNextLocalMidnight(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function isLinkedInUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/(www\.)?linkedin\.com\//.test(url);
}

/**
 * v2 invariant — when scan is `running` but the loop has yielded because the
 * user closed all LinkedIn tabs, re-fire it as soon as a fresh LinkedIn tab
 * appears. Worker-owned scan tabs are excluded so their churn doesn't trigger
 * spurious wakeups.
 */
export function registerLinkedInTabWatcher(): void {
  const onTab = async (url: string | undefined, tabId: number | undefined): Promise<void> => {
    if (!isLinkedInUrl(url)) return;
    if (typeof tabId === 'number' && getOwnedTabIds().includes(tabId)) return;
    const state = await getScanState();
    if (state.status !== 'running') return;
    void runScanLoop();
  };

  chrome.tabs.onCreated.addListener((tab) => {
    void onTab(tab.url, tab.id);
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;
    void onTab(changeInfo.url, tabId ?? tab.id);
  });
}

/** Wire service-worker lifecycle hooks: resume after crash or browser restart. */
export function registerLifecycleHooks(): void {
  chrome.runtime.onStartup.addListener(async () => {
    console.info('[investor-scout] onStartup', {
      version: chrome.runtime.getManifest().version,
      timestamp: new Date().toISOString(),
    });
    await resumeScanOnStartup();
  });

  chrome.runtime.onInstalled.addListener(async (details) => {
    console.info('[investor-scout] onInstalled', {
      reason: details.reason,
      previousVersion: details.previousVersion,
      timestamp: new Date().toISOString(),
    });
    await resumeScanOnStartup();
  });
}
