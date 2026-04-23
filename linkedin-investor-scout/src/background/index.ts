import {
  buildProspectInsertsFromCanonicalUrls,
  prospectsToCsv,
} from '@/shared/csv';
import {
  appendActivityLog,
  bulkDeleteProspects,
  bulkRescanProspects,
  bulkSetActivity,
  clearAllData,
  getActivityLogForProspect,
  getAllProspects,
  getProspectById,
  getProspectStats,
  getScanState,
  getSettings,
  getSlugMap,
  incrementDailyUsage,
  openScoutDb,
  putSettings,
  queryActivityLog,
  queryProspects,
  replaceAllProspects,
  updateProspectFromPatch,
  upsertFeedEventsBulk,
} from '@/shared/db';
import { localDayBucket } from '@/shared/time';
import { broadcast, registerMessageRouter } from '@/shared/messaging';
import type {
  CsvCommitPayload,
  Message,
  MessageResponse,
  MessageResponseMap,
  ProspectQuery,
} from '@/shared/types';
import { pauseScan, resumeScan, runScanLoop, startScan } from './scan-worker';
import { registerLifecycleHooks, registerScanAlarms } from './startup';
import {
  FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS,
  FEED_TEST_MAX_PROFILES,
  buildFeedTestRows,
  canCoverAllFeedTestLevels,
  isLinkedInFeedTabUrl,
} from './feed-test';

async function getActiveTabInFocusedWindow(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab ?? null;
}

function sendMessageToTab<M extends Message>(
  tabId: number,
  msg: M,
): Promise<MessageResponse<MessageResponseMap[M['type']]>> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({ ok: false, error: lastError.message ?? 'tab message failed' });
          return;
        }
        if (!response) {
          resolve({ ok: false, error: 'no response from feed tab' });
          return;
        }
        resolve(response as MessageResponse<MessageResponseMap[M['type']]>);
      });
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'tab message failed',
      });
    }
  });
}

async function handleFeedTestSeedRandomLevels(): Promise<
  MessageResponse<{ seeded: number; collected: number; tab_id: number }>
> {
  const tab = await getActiveTabInFocusedWindow();
  if (!tab || typeof tab.id !== 'number' || !tab.url) {
    return {
      ok: false,
      error: 'Open a LinkedIn feed tab, then run Test Feed Labels (Random).',
    };
  }
  if (!isLinkedInFeedTabUrl(tab.url)) {
    return {
      ok: false,
      error: 'Active tab must be https://www.linkedin.com/feed/.',
    };
  }

  const collect = await sendMessageToTab(tab.id, {
    type: 'FEED_TEST_COLLECT_VISIBLE_PROFILES',
    payload: { max_profiles: FEED_TEST_MAX_PROFILES },
  });
  if (!collect.ok) {
    return {
      ok: false,
      error: `Could not read visible feed profiles: ${collect.error}`,
    };
  }

  const rows = buildFeedTestRows(collect.data.profiles ?? []);
  if (rows.length === 0) {
    return {
      ok: false,
      error: 'No visible /in/ profiles found on this feed view.',
    };
  }
  if (!canCoverAllFeedTestLevels(rows.length)) {
    return {
      ok: false,
      error: `Need at least ${FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS} unique /in/ profiles rendered on the page to seed all four levels. Scroll the feed (or expand a reactor/comment modal) so more profiles mount into the DOM, then try again.`,
    };
  }

  const scanState = await getScanState();
  if (scanState.status === 'running') {
    return {
      ok: false,
      error: 'Pause the active scan before running Test Feed Labels (Random).',
    };
  }

  await replaceAllProspects(rows);
  const ts = Date.now();
  await appendActivityLog({
    ts,
    level: 'info',
    event: 'feed_test_seeded_random_levels',
    prospect_id: null,
    data: {
      tab_id: tab.id,
      tab_url: tab.url,
      collected: collect.data.profiles.length,
      seeded: rows.length,
      truncated: collect.data.truncated,
      max_profiles: FEED_TEST_MAX_PROFILES,
    },
  });

  broadcast({
    type: 'PROSPECTS_UPDATED',
    payload: { changed_ids: [] },
  });

  return {
    ok: true,
    data: {
      seeded: rows.length,
      collected: collect.data.profiles.length,
      tab_id: tab.id,
    },
  };
}

async function handleCsvCommit(
  payload: CsvCommitPayload,
): Promise<MessageResponse<{ inserted: number }>> {
  const urls = Array.isArray(payload?.urls) ? payload.urls : [];
  const filename = payload?.filename ?? 'unknown.csv';
  const invalidCount = Math.max(0, Number(payload?.invalid_count ?? 0));
  const invalidSamples = Array.isArray(payload?.invalid_samples)
    ? payload.invalid_samples
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0)
        .slice(0, 5)
    : [];
  if (urls.length === 0) {
    return { ok: false, error: 'No URLs to import' };
  }

  const rows = buildProspectInsertsFromCanonicalUrls(urls);
  await replaceAllProspects(rows);

  const ts = Date.now();
  await appendActivityLog({
    ts,
    level: 'info',
    event: 'csv_imported',
    prospect_id: null,
    data: {
      filename,
      inserted: rows.length,
      received: urls.length,
      invalid: invalidCount,
    },
  });

  if (invalidCount > 0) {
    await appendActivityLog({
      ts,
      level: 'warn',
      event: 'csv_invalid_rows',
      prospect_id: null,
      data: {
        filename,
        invalid: invalidCount,
        sample_count: invalidSamples.length,
      },
    });
    for (const raw of invalidSamples) {
      await appendActivityLog({
        ts,
        level: 'warn',
        event: 'csv_invalid_row',
        prospect_id: null,
        data: { filename, raw },
      });
    }
  }

  console.info('[investor-scout] CSV imported', {
    filename,
    inserted: rows.length,
    timestamp: new Date(ts).toISOString(),
  });

  broadcast({
    type: 'PROSPECTS_UPDATED',
    // Full-list replacement — use empty array as "refresh all" sentinel.
    payload: { changed_ids: [] },
  });

  return { ok: true, data: { inserted: rows.length } };
}

async function broadcastProspectsUpdated(changedIds: number[]): Promise<void> {
  const normalized = Array.from(
    new Set(changedIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  broadcast({
    type: 'PROSPECTS_UPDATED',
    payload: { changed_ids: normalized },
  });
}

async function exportProspectsCsv(
  filter: ProspectQuery | null,
): Promise<{ csv: string; row_count: number }> {
  if (!filter) {
    const rows = await getAllProspects();
    return { csv: prospectsToCsv(rows), row_count: rows.length };
  }
  const { rows } = await queryProspects({
    ...filter,
    page: 0,
    page_size: Number.MAX_SAFE_INTEGER,
  });
  return { csv: prospectsToCsv(rows), row_count: rows.length };
}

registerMessageRouter(async (msg) => {
  switch (msg.type) {
    case 'CSV_COMMIT':
      return handleCsvCommit(msg.payload);
    case 'STATS_QUERY': {
      const stats = await getProspectStats();
      return { ok: true, data: stats };
    }
    case 'SCAN_STATE_QUERY': {
      const state = await getScanState();
      return { ok: true, data: state };
    }
    case 'SCAN_START': {
      const state = await startScan();
      return { ok: true, data: state };
    }
    case 'SCAN_PAUSE': {
      const state = await pauseScan();
      return { ok: true, data: state };
    }
    case 'SCAN_RESUME': {
      const state = await resumeScan();
      return { ok: true, data: state };
    }
    case 'PROSPECTS_LIST': {
      const page = await queryProspects(msg.payload ?? {});
      return { ok: true, data: page };
    }
    case 'PROSPECT_GET': {
      const row = await getProspectById(msg.payload.id);
      return { ok: true, data: row ?? null };
    }
    case 'PROSPECT_UPDATE': {
      const next = await updateProspectFromPatch(
        msg.payload.id,
        msg.payload.patch,
      );
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'prospect_patched',
        prospect_id: next.id,
        data: { patch: msg.payload.patch },
      });
      void broadcastProspectsUpdated([next.id]);
      return { ok: true, data: next };
    }
    case 'PROSPECTS_BULK_ACTIVITY': {
      const updated = await bulkSetActivity(
        msg.payload.ids,
        msg.payload.activity,
      );
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'bulk_activity_update',
        prospect_id: null,
        data: { ids_count: msg.payload.ids.length, activity: msg.payload.activity, updated },
      });
      void broadcastProspectsUpdated(msg.payload.ids);
      return { ok: true, data: { updated } };
    }
    case 'PROSPECTS_RESCAN': {
      const updated = await bulkRescanProspects(msg.payload.ids);
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'bulk_rescan_queued',
        prospect_id: null,
        data: { ids_count: msg.payload.ids.length, updated },
      });
      void broadcastProspectsUpdated(msg.payload.ids);

      const state = await getScanState();
      if (state.status === 'running') {
        void runScanLoop();
      }
      return { ok: true, data: { updated } };
    }
    case 'PROSPECTS_DELETE': {
      const deleted = await bulkDeleteProspects(msg.payload.ids);
      await appendActivityLog({
        ts: Date.now(),
        level: 'warn',
        event: 'bulk_delete',
        prospect_id: null,
        data: { ids_count: msg.payload.ids.length, deleted },
      });
      void broadcastProspectsUpdated(msg.payload.ids);
      return { ok: true, data: { deleted } };
    }
    case 'PROSPECT_LOG_QUERY': {
      const entries = await getActivityLogForProspect(
        msg.payload.prospect_id,
        msg.payload.limit ?? 100,
      );
      return { ok: true, data: entries };
    }
    case 'SETTINGS_QUERY': {
      const settings = await getSettings();
      return { ok: true, data: settings };
    }
    case 'SETTINGS_UPDATE': {
      const next = await putSettings(msg.payload);
      broadcast({ type: 'SETTINGS_CHANGED', payload: next });
      return { ok: true, data: next };
    }
    case 'LOGS_QUERY': {
      const entries = await queryActivityLog(msg.payload ?? {});
      return { ok: true, data: entries };
    }
    case 'CLEAR_ALL_DATA': {
      await clearAllData();
      await appendActivityLog({
        ts: Date.now(),
        level: 'warn',
        event: 'data_cleared',
        prospect_id: null,
        data: {},
      });
      void broadcastProspectsUpdated([]);
      return { ok: true, data: { cleared: true } };
    }
    case 'EXPORT_CSV': {
      const data = await exportProspectsCsv(msg.payload?.filter ?? null);
      return { ok: true, data };
    }
    case 'FEED_TEST_SEED_RANDOM_LEVELS':
      return handleFeedTestSeedRandomLevels();
    case 'SLUGS_QUERY': {
      const map = await getSlugMap();
      return { ok: true, data: map };
    }
    case 'FEED_EVENTS_UPSERT_BULK': {
      const events = msg.payload?.events ?? [];
      if (events.length === 0) {
        return { ok: true, data: { inserted: 0, updated: 0 } };
      }
      const result = await upsertFeedEventsBulk(events);
      if (result.inserted > 0) {
        await incrementDailyUsage(localDayBucket(Date.now()), {
          feed_events_captured: result.inserted,
        });
      }
      return { ok: true, data: result };
    }
    default:
      return { ok: false, error: `Unhandled message: ${(msg as Message).type}` };
  }
});

registerLifecycleHooks();
registerScanAlarms();

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await openScoutDb();
    await getSettings();
    await getScanState();
  } catch (error) {
    console.error('[investor-scout] IndexedDB init failed:', {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
  }
});

chrome.action?.onClicked?.addListener?.((tab) => {
  console.info('[investor-scout] action clicked', { tabId: tab.id });
});

self.addEventListener('error', (event) => {
  console.error('[investor-scout] service worker error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[investor-scout] unhandled rejection', {
    reason: (event as PromiseRejectionEvent).reason,
  });
});

console.info('[investor-scout] service worker booted', {
  timestamp: new Date().toISOString(),
});

export {};
