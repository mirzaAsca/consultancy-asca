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
  openScoutDb,
  putSettings,
  queryActivityLog,
  queryProspects,
  replaceAllProspects,
  updateProspectFromPatch,
} from '@/shared/db';
import { broadcast, registerMessageRouter } from '@/shared/messaging';
import type {
  CsvCommitPayload,
  Message,
  MessageResponse,
  ProspectQuery,
} from '@/shared/types';
import { pauseScan, resumeScan, runScanLoop, startScan } from './scan-worker';
import { registerLifecycleHooks, registerScanAlarms } from './startup';

async function handleCsvCommit(
  payload: CsvCommitPayload,
): Promise<MessageResponse<{ inserted: number }>> {
  const urls = Array.isArray(payload?.urls) ? payload.urls : [];
  const filename = payload?.filename ?? 'unknown.csv';
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
    data: { filename, inserted: rows.length, received: urls.length },
  });

  console.info('[investor-scout] CSV imported', {
    filename,
    inserted: rows.length,
    timestamp: new Date(ts).toISOString(),
  });

  broadcast({
    type: 'PROSPECTS_UPDATED',
    payload: { total: rows.length },
  });

  return { ok: true, data: { inserted: rows.length } };
}

async function broadcastProspectsUpdated(): Promise<void> {
  const stats = await getProspectStats();
  broadcast({ type: 'PROSPECTS_UPDATED', payload: { total: stats.total } });
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
      void broadcastProspectsUpdated();
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
      void broadcastProspectsUpdated();
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
      void broadcastProspectsUpdated();

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
      void broadcastProspectsUpdated();
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
      void broadcastProspectsUpdated();
      return { ok: true, data: { cleared: true } };
    }
    case 'EXPORT_CSV': {
      const data = await exportProspectsCsv(msg.payload?.filter ?? null);
      return { ok: true, data };
    }
    case 'SLUGS_QUERY': {
      const map = await getSlugMap();
      return { ok: true, data: map };
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
