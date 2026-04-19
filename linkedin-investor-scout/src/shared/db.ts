import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  ACTIVITY_LOG_MAX_ENTRIES,
  DB_NAME,
  DB_VERSION,
  createDefaultSettings,
  defaultScanState,
} from './constants';

export { ACTIVITY_LOG_MAX_ENTRIES, DB_NAME, DB_VERSION } from './constants';
import type {
  ActivityKind,
  LogEntry,
  LogEntryInsert,
  LogQuery,
  Prospect,
  ProspectInsert,
  ProspectLevel,
  ProspectPage,
  ProspectPatch,
  ProspectQuery,
  ProspectStats,
  ScanState,
  ScanStatus,
  Settings,
  SettingsPatch,
  SlugMap,
} from './types';
import { canonicalizeLinkedInProfileUrl, slugFromCanonicalProfileUrl } from './url';
import { localDayBucket } from './time';

export interface ScoutDBSchema extends DBSchema {
  prospects: {
    key: number;
    value: Prospect;
    indexes: {
      by_url: string;
      by_level: string;
      by_scan_status: string;
      /** Indexed field may be null at runtime; `IDBValidKey` typing omits null. */
      by_last_scanned: number;
    };
  };
  settings: {
    key: Settings['id'];
    value: Settings;
  };
  scan_state: {
    key: ScanState['id'];
    value: ScanState;
  };
  activity_log: {
    key: number;
    value: LogEntry;
    indexes: { by_ts: number };
  };
}

let dbPromise: Promise<IDBPDatabase<ScoutDBSchema>> | null = null;

/** Test helper: next openDB() creates a fresh connection. */
export function resetDbConnectionForTests(): void {
  dbPromise = null;
}

/** Close the singleton connection (required before deleteDB in tests). */
export async function closeScoutDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  resetDbConnectionForTests();
}

/** Close connection and wipe the database file (tests / reset). */
export async function deleteScoutDatabase(): Promise<void> {
  await closeScoutDb();
  await deleteDB(DB_NAME);
}

export function openScoutDb(): Promise<IDBPDatabase<ScoutDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ScoutDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          const prospects = db.createObjectStore('prospects', {
            keyPath: 'id',
            autoIncrement: true,
          });
          prospects.createIndex('by_url', 'url', { unique: true });
          prospects.createIndex('by_level', 'level');
          prospects.createIndex('by_scan_status', 'scan_status');
          prospects.createIndex('by_last_scanned', 'last_scanned');

          db.createObjectStore('settings', { keyPath: 'id' });
          db.createObjectStore('scan_state', { keyPath: 'id' });

          const log = db.createObjectStore('activity_log', {
            keyPath: 'id',
            autoIncrement: true,
          });
          log.createIndex('by_ts', 'ts');
        }
        console.info('[investor-scout] db upgraded', {
          oldVersion,
          newVersion,
          timestamp: new Date().toISOString(),
        });
      },
      blocked(currentVersion, blockedVersion) {
        console.warn('[investor-scout] db upgrade blocked by another tab', {
          currentVersion,
          blockedVersion,
        });
      },
      blocking() {
        // Another tab is trying to upgrade — release this connection so it can
        // proceed. The next `openScoutDb()` call will re-open.
        console.warn('[investor-scout] db blocking upgrade; closing connection');
        void closeScoutDb();
      },
      terminated() {
        console.error('[investor-scout] db connection terminated unexpectedly');
        resetDbConnectionForTests();
      },
    });
  }
  return dbPromise;
}

function defaultActivity(): Prospect['activity'] {
  return {
    connected: false,
    connected_at: null,
    commented: false,
    commented_at: null,
    messaged: false,
    messaged_at: null,
  };
}

/** Build a new prospect row from a raw URL string (canonicalizes; throws if invalid). */
export function prospectInsertFromRawUrl(rawUrl: string): ProspectInsert {
  const url = canonicalizeLinkedInProfileUrl(rawUrl);
  if (!url) {
    throw new Error('Invalid LinkedIn profile URL');
  }
  const slug = slugFromCanonicalProfileUrl(url);
  if (!slug) {
    throw new Error('Could not derive slug from URL');
  }
  const now = Date.now();
  return {
    url,
    slug,
    level: 'NONE',
    name: null,
    headline: null,
    company: null,
    location: null,
    scan_status: 'pending',
    scan_error: null,
    scan_attempts: 0,
    last_scanned: null,
    activity: defaultActivity(),
    notes: '',
    created_at: now,
    updated_at: now,
  };
}

// ——— Prospects ———

export async function addProspect(row: ProspectInsert): Promise<number> {
  const db = await openScoutDb();
  return db.add('prospects', row as Prospect);
}

export async function putProspect(row: Prospect): Promise<number> {
  const db = await openScoutDb();
  return db.put('prospects', row);
}

export async function getProspectById(id: number): Promise<Prospect | undefined> {
  const db = await openScoutDb();
  return db.get('prospects', id);
}

export async function getProspectByUrl(
  url: string,
): Promise<Prospect | undefined> {
  const db = await openScoutDb();
  const canonical = canonicalizeLinkedInProfileUrl(url);
  if (!canonical) return undefined;
  return db.getFromIndex('prospects', 'by_url', canonical);
}

export async function updateProspect(
  id: number,
  patch: Partial<Omit<Prospect, 'id'>>,
): Promise<void> {
  const db = await openScoutDb();
  const existing = await db.get('prospects', id);
  if (!existing) {
    throw new Error(`Prospect not found: ${id}`);
  }
  const next: Prospect = {
    ...existing,
    ...patch,
    id,
    updated_at: Date.now(),
  };
  await db.put('prospects', next);
}

export async function deleteProspect(id: number): Promise<void> {
  const db = await openScoutDb();
  await db.delete('prospects', id);
}

export async function clearAllProspects(): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function countProspects(): Promise<number> {
  const db = await openScoutDb();
  return db.count('prospects');
}

/**
 * Fetch all prospect rows. Primary-key order (insertion order). For large
 * lists the dashboard will virtualize and paginate separately in M5 — this
 * helper is the simple path for export (M7) and scan-worker resume (M4).
 */
export async function getAllProspects(): Promise<Prospect[]> {
  const db = await openScoutDb();
  return db.getAll('prospects');
}

export interface PendingProspectRef {
  id: number;
  url: string;
}

/**
 * Next `limit` pending prospects (index order: `scan_status`, then primary `id`).
 */
export async function takePendingProspectsBatch(
  limit: number,
): Promise<PendingProspectRef[]> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readonly');
  const index = tx.store.index('by_scan_status');
  const out: PendingProspectRef[] = [];
  let cursor = await index.openCursor(IDBKeyRange.only('pending'));
  while (cursor && out.length < limit) {
    const row = cursor.value;
    out.push({ id: row.id, url: row.url });
    cursor = await cursor.continue();
  }
  await tx.done;
  return out;
}

/**
 * Bulk insert in chunks (CSV import). Each chunk is a single transaction.
 *
 * On a unique-index violation (e.g. duplicate URL) the transaction aborts and
 * the first error is rethrown — we always drain `tx.done` so the aborted
 * transaction never leaks as an unhandled rejection.
 */
export async function bulkAddProspectsInChunks(
  rows: ProspectInsert[],
  chunkSize = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const db = await openScoutDb();
    const tx = db.transaction('prospects', 'readwrite');
    let addError: unknown = null;
    for (const row of chunk) {
      try {
        await tx.store.add(row as Prospect);
      } catch (error) {
        addError = error;
        break;
      }
    }
    try {
      await tx.done;
    } catch (txError) {
      if (!addError) addError = txError;
    }
    if (addError) throw addError;
  }
}

/** Reset rows stuck in `in_progress` (e.g. after browser restart). */
export async function resetStuckInProgressProspects(): Promise<number> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  const index = tx.store.index('by_scan_status');
  let cursor = await index.openCursor(IDBKeyRange.only('in_progress'));
  let n = 0;
  while (cursor) {
    const row = cursor.value;
    await cursor.update({
      ...row,
      scan_status: 'pending',
      updated_at: Date.now(),
    });
    n++;
    cursor = await cursor.continue();
  }
  await tx.done;
  return n;
}

// ——— Settings ———

export async function getSettings(): Promise<Settings> {
  const db = await openScoutDb();
  const row = await db.get('settings', 'global');
  if (row) return row;
  // NOTE: must be a fresh deep copy — spreading DEFAULT_SETTINGS directly would
  // alias nested objects (scan / highlight / colors / show_on), letting
  // consumer mutations silently corrupt the module-level defaults.
  const initial = createDefaultSettings();
  await db.put('settings', initial);
  return initial;
}

export async function putSettings(patch: SettingsPatch): Promise<Settings> {
  const db = await openScoutDb();
  const current = await getSettings();
  const next: Settings = {
    id: 'global',
    scan: { ...current.scan, ...patch.scan },
    highlight: {
      ...current.highlight,
      ...patch.highlight,
      colors: {
        ...current.highlight.colors,
        ...patch.highlight?.colors,
      },
      show_on: {
        ...current.highlight.show_on,
        ...patch.highlight?.show_on,
      },
    },
    updated_at: Date.now(),
  };
  await db.put('settings', next);
  return next;
}

// ——— Scan state ———

export async function getScanState(): Promise<ScanState> {
  const db = await openScoutDb();
  const row = await db.get('scan_state', 'current');
  if (row) return row;
  const initial = defaultScanState(localDayBucket(Date.now()));
  await db.put('scan_state', initial);
  return initial;
}

export async function putScanState(
  patch: Partial<Omit<ScanState, 'id'>>,
): Promise<ScanState> {
  const db = await openScoutDb();
  const current = await getScanState();
  const next: ScanState = {
    ...current,
    ...patch,
    id: 'current',
  };
  await db.put('scan_state', next);
  return next;
}

// ——— Activity log (ring buffer) ———

export async function appendActivityLog(entry: LogEntryInsert): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction('activity_log', 'readwrite');
  await tx.store.add(entry as LogEntry);
  const count = await tx.store.count();
  const overflow = Math.max(0, count - ACTIVITY_LOG_MAX_ENTRIES);
  if (overflow > 0) {
    // Walk a single forward cursor (oldest → newest by primary key) and delete
    // until we've trimmed `overflow` rows. This is O(overflow) — the previous
    // impl reopened a cursor per deletion which degraded sharply for bulk
    // trims (e.g. post-migration or bulk imports).
    let cursor = await tx.store.openCursor();
    let deleted = 0;
    while (cursor && deleted < overflow) {
      await cursor.delete();
      deleted++;
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}

export async function getRecentActivityLog(
  limit: number,
): Promise<LogEntry[]> {
  const db = await openScoutDb();
  const all = await db.getAll('activity_log');
  return all.sort((a, b) => b.ts - a.ts || b.id - a.id).slice(0, limit);
}

export async function clearActivityLog(): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction('activity_log', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

/**
 * Replace all prospects in one transaction (used by CSV import in M3).
 * Caller must pre-dedupe by canonical URL; duplicates will abort the tx.
 */
export async function replaceAllProspects(rows: ProspectInsert[]): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  let addError: unknown = null;
  try {
    await tx.store.clear();
    for (const row of rows) {
      try {
        await tx.store.add(row as Prospect);
      } catch (error) {
        addError = error;
        break;
      }
    }
  } catch (error) {
    addError = error;
  }
  try {
    await tx.done;
  } catch (txError) {
    if (!addError) addError = txError;
  }
  if (addError) throw addError;
}

const EMPTY_LEVEL_COUNTS: Record<ProspectLevel, number> = {
  NONE: 0,
  '1st': 0,
  '2nd': 0,
  '3rd': 0,
  OUT_OF_NETWORK: 0,
};
const EMPTY_STATUS_COUNTS: Record<ScanStatus, number> = {
  pending: 0,
  in_progress: 0,
  done: 0,
  failed: 0,
  skipped: 0,
};

// ——— Dashboard queries ———

const DEFAULT_PAGE_SIZE = 50;

/**
 * Lowercase compare helper — used by dashboard free-text search.
 * Returns `true` if any of the provided haystacks contains the needle.
 */
function matchesSearch(row: Prospect, needle: string): boolean {
  const fields = [row.slug, row.name, row.headline, row.company];
  for (const field of fields) {
    if (field && field.toLowerCase().includes(needle)) return true;
  }
  return false;
}

function matchesFilter(row: Prospect, q: ProspectQuery): boolean {
  if (q.levels && q.levels.length > 0 && !q.levels.includes(row.level)) {
    return false;
  }
  if (
    q.scan_statuses &&
    q.scan_statuses.length > 0 &&
    !q.scan_statuses.includes(row.scan_status)
  ) {
    return false;
  }
  if (q.activity) {
    if (q.activity.connected === true && !row.activity.connected) return false;
    if (q.activity.commented === true && !row.activity.commented) return false;
    if (q.activity.messaged === true && !row.activity.messaged) return false;
  }
  if (q.search && q.search.trim().length > 0) {
    const needle = q.search.trim().toLowerCase();
    if (!matchesSearch(row, needle)) return false;
  }
  return true;
}

function compareProspects(
  a: Prospect,
  b: Prospect,
  field: ProspectQuery['sort_field'] = 'created_at',
  dir: ProspectQuery['sort_direction'] = 'desc',
): number {
  const sign = dir === 'asc' ? 1 : -1;
  const pick = (row: Prospect): string | number | null => {
    switch (field) {
      case 'name':
        return row.name ?? '';
      case 'company':
        return row.company ?? '';
      case 'level':
        return row.level;
      case 'scan_status':
        return row.scan_status;
      case 'last_scanned':
        return row.last_scanned ?? 0;
      case 'updated_at':
        return row.updated_at;
      case 'created_at':
      default:
        return row.created_at;
    }
  };
  const av = pick(a);
  const bv = pick(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1 * sign;
  if (bv === null) return -1 * sign;
  if (typeof av === 'number' && typeof bv === 'number') {
    return (av - bv) * sign;
  }
  return String(av).localeCompare(String(bv)) * sign;
}

/**
 * Paginated query over prospects. For the 20k–50k scale target this loads all
 * rows once and filters/sorts in memory — IndexedDB scans are plenty fast at
 * that size and this keeps the filter surface flexible without juggling
 * multiple composite indexes.
 */
export async function queryProspects(
  q: ProspectQuery = {},
): Promise<ProspectPage> {
  const all = await getAllProspects();
  const filtered = all.filter((row) => matchesFilter(row, q));
  filtered.sort((a, b) =>
    compareProspects(a, b, q.sort_field, q.sort_direction),
  );

  const page = Math.max(0, q.page ?? 0);
  const page_size = Math.max(1, q.page_size ?? DEFAULT_PAGE_SIZE);
  const start = page * page_size;
  const rows = filtered.slice(start, start + page_size);
  return { rows, total: filtered.length, page, page_size };
}

/** Patch notes and/or activity. Activity stamps are touched automatically. */
export async function updateProspectFromPatch(
  id: number,
  patch: ProspectPatch,
): Promise<Prospect> {
  const db = await openScoutDb();
  const existing = await db.get('prospects', id);
  if (!existing) throw new Error(`Prospect not found: ${id}`);
  const now = Date.now();
  const activity = {
    ...existing.activity,
    ...(patch.activity ? applyActivityPatch(existing.activity, patch.activity, now) : {}),
  };
  const next: Prospect = {
    ...existing,
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    activity,
    updated_at: now,
  };
  await db.put('prospects', next);
  return next;
}

function applyActivityPatch(
  current: Prospect['activity'],
  patch: Partial<Prospect['activity']>,
  now: number,
): Partial<Prospect['activity']> {
  const out: Partial<Prospect['activity']> = {};
  if (patch.connected !== undefined) {
    out.connected = patch.connected;
    out.connected_at = patch.connected ? (current.connected_at ?? now) : null;
  }
  if (patch.commented !== undefined) {
    out.commented = patch.commented;
    out.commented_at = patch.commented ? (current.commented_at ?? now) : null;
  }
  if (patch.messaged !== undefined) {
    out.messaged = patch.messaged;
    out.messaged_at = patch.messaged ? (current.messaged_at ?? now) : null;
  }
  return out;
}

/** Bulk toggle activity flags; returns the number of rows actually changed. */
export async function bulkSetActivity(
  ids: number[],
  activity: ActivityKind,
): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  const now = Date.now();
  let updated = 0;
  for (const id of ids) {
    const row = await tx.store.get(id);
    if (!row) continue;
    const patched = applyActivityPatch(row.activity, activity, now);
    await tx.store.put({
      ...row,
      activity: { ...row.activity, ...patched },
      updated_at: now,
    });
    updated++;
  }
  await tx.done;
  return updated;
}

/**
 * Re-queue rows for scanning: reset status to `pending`, clear errors,
 * reset attempt counter. Skips rows currently `in_progress`.
 */
export async function bulkRescanProspects(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  const now = Date.now();
  let updated = 0;
  for (const id of ids) {
    const row = await tx.store.get(id);
    if (!row) continue;
    if (row.scan_status === 'in_progress') continue;
    await tx.store.put({
      ...row,
      scan_status: 'pending',
      scan_error: null,
      scan_attempts: 0,
      updated_at: now,
    });
    updated++;
  }
  await tx.done;
  return updated;
}

export async function bulkDeleteProspects(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  let deleted = 0;
  for (const id of ids) {
    const row = await tx.store.get(id);
    if (!row) continue;
    await tx.store.delete(id);
    deleted++;
  }
  await tx.done;
  return deleted;
}

/** Return all log entries referencing a prospect (chronological, newest first). */
export async function getActivityLogForProspect(
  prospectId: number,
  limit = 100,
): Promise<LogEntry[]> {
  const db = await openScoutDb();
  const all = await db.getAll('activity_log');
  return all
    .filter((e) => e.prospect_id === prospectId)
    .sort((a, b) => b.ts - a.ts || b.id - a.id)
    .slice(0, limit);
}

/** Filter the activity log for the dashboard Logs page. */
export async function queryActivityLog(q: LogQuery = {}): Promise<LogEntry[]> {
  const db = await openScoutDb();
  const all = await db.getAll('activity_log');
  const needle = q.event_contains?.trim().toLowerCase();
  const filtered = all.filter((e) => {
    if (q.levels && q.levels.length > 0 && !q.levels.includes(e.level)) return false;
    if (q.prospect_id !== undefined && q.prospect_id !== null && e.prospect_id !== q.prospect_id) {
      return false;
    }
    if (needle && !e.event.toLowerCase().includes(needle)) return false;
    return true;
  });
  filtered.sort((a, b) => b.ts - a.ts || b.id - a.id);
  const limit = q.limit ?? 500;
  return filtered.slice(0, limit);
}

/** Nuke prospects + scan_state + activity_log; keep settings (user-configured). */
export async function clearAllData(): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction(['prospects', 'scan_state', 'activity_log'], 'readwrite');
  await tx.objectStore('prospects').clear();
  await tx.objectStore('scan_state').clear();
  await tx.objectStore('activity_log').clear();
  await tx.done;
}

/**
 * Build the slug→summary map consumed by the feed-highlighter content script.
 * Cursor-driven so we never materialize the full prospect row list just to
 * pluck 5 fields each.
 */
export async function getSlugMap(): Promise<SlugMap> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readonly');
  const out: SlugMap = {};
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const row = cursor.value;
    if (row.slug) {
      out[row.slug.toLowerCase()] = {
        id: row.id,
        level: row.level,
        name: row.name,
        headline: row.headline,
        company: row.company,
      };
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return out;
}

/**
 * Aggregate stats for popup tiles (counts by level + scan_status).
 * Single read-only transaction; index cursors avoid loading all rows.
 */
export async function getProspectStats(): Promise<ProspectStats> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readonly');
  const total = await tx.store.count();

  const by_level: Record<ProspectLevel, number> = { ...EMPTY_LEVEL_COUNTS };
  const by_scan_status: Record<ScanStatus, number> = { ...EMPTY_STATUS_COUNTS };

  const levelIndex = tx.store.index('by_level');
  for (const level of Object.keys(by_level) as ProspectLevel[]) {
    by_level[level] = await levelIndex.count(IDBKeyRange.only(level));
  }
  const statusIndex = tx.store.index('by_scan_status');
  for (const status of Object.keys(by_scan_status) as ScanStatus[]) {
    by_scan_status[status] = await statusIndex.count(IDBKeyRange.only(status));
  }

  await tx.done;
  return { total, by_level, by_scan_status };
}
