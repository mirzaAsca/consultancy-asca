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
  AutoPauseReason,
  DailyUsage,
  FeedAutoTrackSource,
  FeedEvent,
  FeedEventInsert,
  FeedEventPage,
  FeedEventQuery,
  FeedEventRow,
  FeedTaskStatus,
  CorrelationToken,
  InteractionEvent,
  InteractionEventInsert,
  InteractionListQuery,
  LogEntry,
  LogEntryInsert,
  LogQuery,
  MessageTemplate,
  MessageTemplateInsert,
  MessageTemplateKind,
  OutreachAction,
  OutreachActionInsert,
  Prospect,
  ProspectInsert,
  ProspectLevel,
  ProspectPage,
  ProspectPatch,
  ProspectQuery,
  ProspectStats,
  ProspectTier,
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
      // ——— v2 indexes (added in v1→v2 upgrade) ———
      by_tier: string;
      by_lifecycle_status: string;
      by_priority_score: number;
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
  // ——— v2 stores ———
  outreach_actions: {
    key: number;
    value: OutreachAction;
    indexes: {
      by_prospect_id: number;
      by_state: string;
      by_kind: string;
      /** Unique — dedupes double-send races across service-worker restarts. */
      by_idempotency_key: string;
      by_created_at: number;
    };
  };
  feed_events: {
    key: number;
    value: FeedEvent;
    indexes: {
      by_slug: string;
      by_prospect_id: number;
      by_event_kind: string;
      by_first_seen_at: number;
      by_task_status: string;
      /** Unique — sha1-based dedupe key. See `shared/scoring.ts`. */
      by_event_fingerprint: string;
    };
  };
  message_templates: {
    key: number;
    value: MessageTemplate;
    indexes: {
      by_kind: string;
    };
  };
  daily_usage: {
    key: string; // day_bucket
    value: DailyUsage;
  };
  // ——— v3 stores (Phase 5 reconciliation) ———
  interaction_events: {
    key: number;
    value: InteractionEvent;
    indexes: {
      by_prospect_id: number;
      by_fingerprint: string;
      by_source_task_id: number;
      by_detected_at: number;
    };
  };
  correlation_tokens: {
    key: string; // token
    value: CorrelationToken;
    indexes: {
      by_expires_at: number;
      by_prospect_id: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ScoutDBSchema>> | null = null;

export interface DbBootHooks {
  /** Runs once before the first `openDB()` call (typically: snapshot the on-disk
   *  state for backup before the schema upgrade mutates it). Failures are
   *  swallowed by the boot path so a failed snapshot can't block opening the DB.
   */
  preOpen?: () => Promise<void>;
  /** Runs once immediately after the DB is opened. `oldVersion` is whichever
   *  version was on disk before this open (equal to `newVersion` when no upgrade
   *  was triggered). Used by the v1→v2 auto-rescore follow-up.
   */
  postOpen?: (info: { oldVersion: number; newVersion: number }) => Promise<void>;
}

let bootHooks: DbBootHooks = {};

/** Register pre/post-open hooks that run around the first `openScoutDb()` call.
 *  Idempotent — last call wins. Must be called before any `openScoutDb()`. */
export function registerDbBootHooks(hooks: DbBootHooks): void {
  bootHooks = { ...hooks };
}

/** Test helper: next openDB() creates a fresh connection. */
export function resetDbConnectionForTests(): void {
  dbPromise = null;
  bootHooks = {};
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
    dbPromise = (async () => {
      if (bootHooks.preOpen) {
        try {
          await bootHooks.preOpen();
        } catch (err) {
          console.error('[investor-scout] db preOpen hook failed', {
            error: err instanceof Error ? err.message : err,
          });
        }
      }
      let detectedOldVersion = DB_VERSION;
      const db = await openDB<ScoutDBSchema>(DB_NAME, DB_VERSION, {
        async upgrade(db, oldVersion, newVersion, transaction) {
          detectedOldVersion = oldVersion;
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

        if (oldVersion < 2) {
          // — Extend existing `prospects` store with v2 indexes + backfill.
          // Existing rows predate `lifecycle_status`/`tier`/etc — the index walk
          // must follow the backfill, otherwise `by_*` indexes on the new fields
          // would report `undefined` for every pre-v2 row.
          const prospectsStore = transaction.objectStore('prospects');

          // Backfill first: cursor-walk every row, add v2 fields with safe defaults.
          // Fresh v2 installs have zero rows, so this is a no-op for them.
          let cursor = await prospectsStore.openCursor();
          while (cursor) {
            const row = cursor.value as Partial<Prospect> & { id: number };
            const updated: Prospect = {
              id: row.id,
              url: row.url ?? '',
              slug: row.slug ?? '',
              level: row.level ?? 'NONE',
              name: row.name ?? null,
              headline: row.headline ?? null,
              company: row.company ?? null,
              location: row.location ?? null,
              scan_status: row.scan_status ?? 'pending',
              scan_error: row.scan_error ?? null,
              scan_attempts: row.scan_attempts ?? 0,
              last_scanned: row.last_scanned ?? null,
              activity: row.activity ?? defaultActivity(),
              notes: row.notes ?? '',
              created_at: row.created_at ?? Date.now(),
              updated_at: Date.now(),
              lifecycle_status: row.lifecycle_status ?? 'new',
              priority_score: row.priority_score ?? null,
              score_breakdown: row.score_breakdown ?? null,
              tier: row.tier ?? null,
              mutual_count: row.mutual_count ?? null,
              next_action: row.next_action ?? null,
              next_action_due_at: row.next_action_due_at ?? null,
              last_level_change_at: row.last_level_change_at ?? null,
              last_outreach_at: row.last_outreach_at ?? null,
            };
            await cursor.update(updated);
            cursor = await cursor.continue();
          }

          // Now safe to index on the backfilled fields.
          if (!prospectsStore.indexNames.contains('by_tier')) {
            prospectsStore.createIndex('by_tier', 'tier');
          }
          if (!prospectsStore.indexNames.contains('by_lifecycle_status')) {
            prospectsStore.createIndex('by_lifecycle_status', 'lifecycle_status');
          }
          if (!prospectsStore.indexNames.contains('by_priority_score')) {
            prospectsStore.createIndex('by_priority_score', 'priority_score');
          }

          // — New stores (Phase 1.1 + Phase 2.1).
          const outreach = db.createObjectStore('outreach_actions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          outreach.createIndex('by_prospect_id', 'prospect_id');
          outreach.createIndex('by_state', 'state');
          outreach.createIndex('by_kind', 'kind');
          outreach.createIndex('by_idempotency_key', 'idempotency_key', {
            unique: true,
          });
          outreach.createIndex('by_created_at', 'created_at');

          const feed = db.createObjectStore('feed_events', {
            keyPath: 'id',
            autoIncrement: true,
          });
          feed.createIndex('by_slug', 'slug');
          feed.createIndex('by_prospect_id', 'prospect_id');
          feed.createIndex('by_event_kind', 'event_kind');
          feed.createIndex('by_first_seen_at', 'first_seen_at');
          feed.createIndex('by_task_status', 'task_status');
          feed.createIndex('by_event_fingerprint', 'event_fingerprint', {
            unique: true,
          });

          const templates = db.createObjectStore('message_templates', {
            keyPath: 'id',
            autoIncrement: true,
          });
          templates.createIndex('by_kind', 'kind');

          db.createObjectStore('daily_usage', { keyPath: 'day_bucket' });
        }

        if (oldVersion < 3) {
          const interactions = db.createObjectStore('interaction_events', {
            keyPath: 'id',
            autoIncrement: true,
          });
          interactions.createIndex('by_prospect_id', 'prospect_id');
          interactions.createIndex('by_fingerprint', 'fingerprint', { unique: true });
          interactions.createIndex('by_source_task_id', 'source_task_id');
          interactions.createIndex('by_detected_at', 'detected_at');

          const tokens = db.createObjectStore('correlation_tokens', {
            keyPath: 'token',
          });
          tokens.createIndex('by_expires_at', 'expires_at');
          tokens.createIndex('by_prospect_id', 'prospect_id');
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
      if (bootHooks.postOpen) {
        try {
          await bootHooks.postOpen({
            oldVersion: detectedOldVersion,
            newVersion: DB_VERSION,
          });
        } catch (err) {
          console.error('[investor-scout] db postOpen hook failed', {
            error: err instanceof Error ? err.message : err,
          });
        }
      }
      return db;
    })();
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

/**
 * v2 default field block for a newly-created Prospect row. Centralized so
 * every call site (`prospectInsertFromRawUrl`, CSV import, feed-test seeding)
 * stays in sync as the v2 surface evolves.
 */
export function defaultProspectV2Fields(): Pick<
  Prospect,
  | 'lifecycle_status'
  | 'priority_score'
  | 'score_breakdown'
  | 'tier'
  | 'mutual_count'
  | 'next_action'
  | 'next_action_due_at'
  | 'last_level_change_at'
  | 'last_outreach_at'
> {
  return {
    lifecycle_status: 'new',
    priority_score: null,
    score_breakdown: null,
    tier: null,
    mutual_count: null,
    next_action: null,
    next_action_due_at: null,
    last_level_change_at: null,
    last_outreach_at: null,
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
    ...defaultProspectV2Fields(),
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

/** Tier → rank for the scan-queue sort. Higher rank scans first. */
const TIER_RANK: Record<Exclude<ProspectTier, null>, number> = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  skip: 1,
};

function tierRank(tier: ProspectTier | null): number {
  return tier === null ? 0 : (TIER_RANK[tier] ?? 0);
}

/**
 * MASTER §19.4 / EXTENSION_GROWTH_TODO Phase 1.2 queue order:
 *   `tier DESC, priority_score DESC, last_scanned ASC NULLS FIRST`
 *
 * Breakdown: unscanned/new rows (`last_scanned = null`) lead within their
 * tier+score bucket, then oldest-scanned first; identical rows tie-break on
 * insertion id to keep the order stable (pre-v2 installs have null
 * tier/score and fall through to id-ASC, preserving v1 behavior).
 */
function compareScanQueueOrder(a: Prospect, b: Prospect): number {
  const ta = tierRank(a.tier);
  const tb = tierRank(b.tier);
  if (ta !== tb) return tb - ta;

  const sa = a.priority_score;
  const sb = b.priority_score;
  if (sa !== null && sb !== null) {
    if (sa !== sb) return sb - sa;
  } else if (sa !== null) {
    return -1;
  } else if (sb !== null) {
    return 1;
  }

  const la = a.last_scanned;
  const lb = b.last_scanned;
  if (la !== null && lb !== null) {
    if (la !== lb) return la - lb;
  } else if (la === null && lb !== null) {
    return -1;
  } else if (lb === null && la !== null) {
    return 1;
  }

  return a.id - b.id;
}

/**
 * Next `limit` pending prospects ordered by
 * `tier DESC, priority_score DESC, last_scanned ASC NULLS FIRST` (see
 * {@link compareScanQueueOrder}). For v1 data (no tier/score yet) this
 * degrades to id-ASC — same effective order as before v2.
 */
export async function takePendingProspectsBatch(
  limit: number,
): Promise<PendingProspectRef[]> {
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readonly');
  const rows = await tx.store
    .index('by_scan_status')
    .getAll(IDBKeyRange.only('pending'));
  await tx.done;
  rows.sort(compareScanQueueOrder);
  return rows.slice(0, limit).map((row) => ({ id: row.id, url: row.url }));
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

/**
 * MASTER §19.4 — flip `done` S/A-tier prospects whose `last_scanned` is older
 * than `staleDays` back to `'pending'` so the worker re-checks them on the
 * next scan pass. Fresh metadata (level transitions, role changes) on the
 * highest-value targets is worth more than the marginal scan cost.
 *
 * Only `done` rows are eligible: `failed` rows are gated by retry policy and
 * `in_progress` rows belong to an active scan tab.
 */
export async function requeueStaleSATierProspects(
  staleDays: number,
  now: number = Date.now(),
): Promise<number> {
  if (!Number.isFinite(staleDays) || staleDays <= 0) return 0;
  const cutoff = now - staleDays * 24 * 60 * 60 * 1000;
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  const index = tx.store.index('by_scan_status');
  let cursor = await index.openCursor(IDBKeyRange.only('done'));
  let n = 0;
  while (cursor) {
    const row = cursor.value;
    const isPriorityTier = row.tier === 'S' || row.tier === 'A';
    const wasScannedBeforeCutoff =
      typeof row.last_scanned === 'number' && row.last_scanned < cutoff;
    if (isPriorityTier && wasScannedBeforeCutoff) {
      await cursor.update({
        ...row,
        scan_status: 'pending',
        scan_attempts: 0,
        scan_error: null,
        updated_at: now,
      });
      n++;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return n;
}

/**
 * FSM closure — flip `connection_request_sent` rows in `state='sent'` whose
 * `sent_at` is older than `staleDays` to `state='expired'`, stamping
 * `resolved_at` so analytics / queue builders treat them as terminal.
 *
 * No budget credit: unlike a withdrawal (which can free a slot the same day),
 * an expired invite already burned its slot 180 days ago and the relevant
 * `daily_usage` rows have rolled out of every health / cap window. Crediting
 * here would silently inflate today's headroom.
 *
 * Idempotent: re-running yields zero additional flips until another row
 * crosses the cutoff. Returns the number of rows expired.
 */
export async function expireStaleSentInvites(
  staleDays: number,
  now: number = Date.now(),
): Promise<number> {
  if (!Number.isFinite(staleDays) || staleDays <= 0) return 0;
  const cutoff = now - staleDays * 24 * 60 * 60 * 1000;
  const db = await openScoutDb();
  const tx = db.transaction('outreach_actions', 'readwrite');
  const index = tx.store.index('by_state');
  let cursor = await index.openCursor(IDBKeyRange.only('sent'));
  let n = 0;
  while (cursor) {
    const row = cursor.value;
    if (
      row.kind === 'connection_request_sent' &&
      typeof row.sent_at === 'number' &&
      row.sent_at < cutoff
    ) {
      await cursor.update({
        ...row,
        state: 'expired',
        resolved_at: now,
      });
      n++;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return n;
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
  if (row) {
    // Forward-compatible backfill: existing installs may predate new
    // `show_on` keys (e.g. `mentions`) or the full `outreach` v2 namespace.
    // Merge defaults for missing fields so the UI never crashes on access.
    const defaults = createDefaultSettings(row.updated_at || Date.now());
    const rowOutreach = (row as Partial<Settings>).outreach;
    const merged: Settings = {
      ...defaults,
      ...row,
      scan: { ...defaults.scan, ...row.scan },
      highlight: {
        ...defaults.highlight,
        ...row.highlight,
        colors: { ...defaults.highlight.colors, ...row.highlight?.colors },
        show_on: { ...defaults.highlight.show_on, ...row.highlight?.show_on },
      },
      outreach: {
        ...defaults.outreach,
        ...(rowOutreach ?? {}),
        caps: { ...defaults.outreach.caps, ...(rowOutreach?.caps ?? {}) },
        tier_thresholds: {
          ...defaults.outreach.tier_thresholds,
          ...(rowOutreach?.tier_thresholds ?? {}),
        },
        kill_switch_thresholds: {
          ...defaults.outreach.kill_switch_thresholds,
          ...(rowOutreach?.kill_switch_thresholds ?? {}),
        },
        keywords: rowOutreach?.keywords ?? [],
        firms: rowOutreach?.firms ?? [],
      },
    };
    return merged;
  }
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
    outreach: {
      ...current.outreach,
      ...(patch.outreach ? {
        warm_visit_before_invite:
          patch.outreach.warm_visit_before_invite ?? current.outreach.warm_visit_before_invite,
        profile_visit_dwell_ms:
          patch.outreach.profile_visit_dwell_ms ?? current.outreach.profile_visit_dwell_ms,
        health_cooldown_hours:
          patch.outreach.health_cooldown_hours ?? current.outreach.health_cooldown_hours,
      } : {}),
      caps: { ...current.outreach.caps, ...patch.outreach?.caps },
      tier_thresholds: {
        ...current.outreach.tier_thresholds,
        ...patch.outreach?.tier_thresholds,
      },
      kill_switch_thresholds: {
        ...current.outreach.kill_switch_thresholds,
        ...patch.outreach?.kill_switch_thresholds,
      },
      keywords: patch.outreach?.keywords ?? current.outreach.keywords,
      firms: patch.outreach?.firms ?? current.outreach.firms,
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

/**
 * "Skip today" markers are persisted as activity_log entries so they survive
 * service-worker restarts without adding a new IDB store. `skip = true`
 * appends an `outreach_skipped_today` entry; `skip = false` appends an
 * `outreach_unskipped_today` entry. The effective set is the last event per
 * prospect_id within the given day bucket.
 */
const OUTREACH_SKIP_EVENT = 'outreach_skipped_today';
const OUTREACH_UNSKIP_EVENT = 'outreach_unskipped_today';

export async function getSkippedProspectIdsForDay(
  dayBucket: string,
): Promise<Set<number>> {
  const db = await openScoutDb();
  const all = await db.getAll('activity_log');
  const latest = new Map<number, 'skip' | 'unskip'>();
  // Walk oldest → newest so the final assignment wins per prospect.
  all.sort((a, b) => a.ts - b.ts || a.id - b.id);
  for (const entry of all) {
    const isSkip = entry.event === OUTREACH_SKIP_EVENT;
    const isUnskip = entry.event === OUTREACH_UNSKIP_EVENT;
    if (!isSkip && !isUnskip) continue;
    if (entry.prospect_id === null) continue;
    const bucket = (entry.data as { day_bucket?: string } | undefined)
      ?.day_bucket;
    if (bucket !== dayBucket) continue;
    latest.set(entry.prospect_id, isSkip ? 'skip' : 'unskip');
  }
  const out = new Set<number>();
  for (const [id, state] of latest) {
    if (state === 'skip') out.add(id);
  }
  return out;
}

export const OUTREACH_SKIP_EVENTS = {
  skip: OUTREACH_SKIP_EVENT,
  unskip: OUTREACH_UNSKIP_EVENT,
} as const;

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

/**
 * Nuke prospects + scan_state + activity_log + v2 derived stores
 * (outreach_actions / feed_events / daily_usage). Keeps settings and
 * message_templates — both are user-curated config that should survive
 * a "reset all data" action.
 */
export async function clearAllData(): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction(
    [
      'prospects',
      'scan_state',
      'activity_log',
      'outreach_actions',
      'feed_events',
      'daily_usage',
      'interaction_events',
      'correlation_tokens',
    ],
    'readwrite',
  );
  await tx.objectStore('prospects').clear();
  await tx.objectStore('scan_state').clear();
  await tx.objectStore('activity_log').clear();
  await tx.objectStore('outreach_actions').clear();
  await tx.objectStore('feed_events').clear();
  await tx.objectStore('daily_usage').clear();
  await tx.objectStore('interaction_events').clear();
  await tx.objectStore('correlation_tokens').clear();
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

// ———————————————————————————————————————————————————————————
// v2 — outreach_actions CRUD
// ———————————————————————————————————————————————————————————

export async function addOutreachAction(
  row: OutreachActionInsert,
): Promise<number> {
  const db = await openScoutDb();
  return db.add('outreach_actions', row as OutreachAction);
}

export async function getOutreachActionById(
  id: number,
): Promise<OutreachAction | undefined> {
  const db = await openScoutDb();
  return db.get('outreach_actions', id);
}

/**
 * Phase 4.2 — every outreach_actions row. Used by the analytics snapshot
 * (30-day activity by kind + 12-week accept rate). Volume is small (hundreds
 * of rows at steady state) so a full read is cheaper than multiple indexed
 * scans, and keeps the pure aggregator deterministic.
 */
export async function getAllOutreachActions(): Promise<OutreachAction[]> {
  const db = await openScoutDb();
  return db.getAll('outreach_actions');
}

/**
 * Lookup by idempotency key — call this before insert to avoid unique-index
 * aborts on double-send races across service-worker restarts.
 */
export async function getOutreachActionByIdempotencyKey(
  key: string,
): Promise<OutreachAction | undefined> {
  const db = await openScoutDb();
  return db.getFromIndex('outreach_actions', 'by_idempotency_key', key);
}

export async function updateOutreachAction(
  id: number,
  patch: Partial<Omit<OutreachAction, 'id' | 'prospect_id'>>,
): Promise<OutreachAction> {
  const db = await openScoutDb();
  const existing = await db.get('outreach_actions', id);
  if (!existing) {
    throw new Error(`OutreachAction not found: ${id}`);
  }
  const next: OutreachAction = { ...existing, ...patch, id };
  await db.put('outreach_actions', next);
  return next;
}

export async function listOutreachActionsForProspect(
  prospectId: number,
): Promise<OutreachAction[]> {
  const db = await openScoutDb();
  const all = await db.getAllFromIndex(
    'outreach_actions',
    'by_prospect_id',
    prospectId,
  );
  return all.sort((a, b) => b.created_at - a.created_at);
}

/**
 * Load every outreach_actions row, grouped by prospect_id. Used by the
 * outreach-queue builder (Phase 1.3) where we need per-prospect history for
 * thousands of candidates in a single pass.
 */
export async function getAllOutreachActionsByProspect(): Promise<
  Map<number, OutreachAction[]>
> {
  const db = await openScoutDb();
  const all = await db.getAll('outreach_actions');
  const out = new Map<number, OutreachAction[]>();
  for (const row of all) {
    let bucket = out.get(row.prospect_id);
    if (!bucket) {
      bucket = [];
      out.set(row.prospect_id, bucket);
    }
    bucket.push(row);
  }
  for (const list of out.values()) {
    list.sort((a, b) => b.created_at - a.created_at);
  }
  return out;
}

/**
 * Phase 3.3 — find the latest live (`draft` / `approved` / `sent` /
 * `needs_review`) `connection_request_sent` action for a prospect. Used by
 * the scan-worker acceptance watcher to credit an invite when the
 * prospect's level flips to `1st`.
 */
export async function getLiveConnectionRequestForProspect(
  prospectId: number,
): Promise<OutreachAction | undefined> {
  const db = await openScoutDb();
  const rows = await db.getAllFromIndex(
    'outreach_actions',
    'by_prospect_id',
    prospectId,
  );
  const live = rows.filter(
    (r) =>
      r.kind === 'connection_request_sent' &&
      (r.state === 'draft' ||
        r.state === 'approved' ||
        r.state === 'sent' ||
        r.state === 'needs_review'),
  );
  live.sort((a, b) => {
    const as = a.sent_at ?? 0;
    const bs = b.sent_at ?? 0;
    if (bs !== as) return bs - as;
    return b.created_at - a.created_at;
  });
  return live[0];
}

/**
 * Phase 4.1 — count `outreach_actions` that transitioned to `accepted` inside
 * the given local day bucket. Uses `resolved_at` as the timestamp (stamped
 * by {@link updateOutreachAction} when the state is a terminal one).
 */
export async function countAcceptedActionsForDay(
  dayBucket: string,
): Promise<number> {
  const db = await openScoutDb();
  const rows = await db.getAllFromIndex(
    'outreach_actions',
    'by_state',
    'accepted',
  );
  let count = 0;
  for (const r of rows) {
    if (r.resolved_at === null) continue;
    if (localDayBucket(r.resolved_at) === dayBucket) count++;
  }
  return count;
}

/**
 * Phase 4.1 — count live `connection_request_sent` rows currently in the
 * `sent` state. This is the "Pending invites" surface in the popup.
 */
export async function countPendingInvites(): Promise<number> {
  const db = await openScoutDb();
  const rows = await db.getAllFromIndex('outreach_actions', 'by_state', 'sent');
  let count = 0;
  for (const r of rows) {
    if (r.kind === 'connection_request_sent') count++;
  }
  return count;
}

/**
 * Sum of `daily_usage.invites_sent` across the trailing 7 day buckets
 * (inclusive of today). Used to enforce the `weekly_invites` cap.
 */
export async function getWeeklyInvitesUsed(
  todayBucket: string,
): Promise<number> {
  const db = await openScoutDb();
  const tx = db.transaction('daily_usage', 'readonly');
  // Local-tz math — build the 7 bucket strings anchored on today at noon to
  // avoid DST edge cases flipping the wall-clock date during arithmetic.
  const [y, m, d] = todayBucket.split('-').map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    await tx.done;
    return 0;
  }
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const stamp = new Date(anchor);
    stamp.setDate(anchor.getDate() - i);
    const bucket = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(stamp.getDate()).padStart(2, '0')}`;
    const row = await tx.store.get(bucket);
    if (row) total += row.invites_sent;
  }
  await tx.done;
  return total;
}

/**
 * Phase 4.3 — return `DailyUsage` rows for the trailing `days` buckets
 * (oldest → newest, inclusive of today). Missing buckets are filled with
 * zeroed rows so the caller always gets a dense array of length `days`.
 */
export async function getDailyUsageRange(
  todayBucket: string,
  days: number,
): Promise<DailyUsage[]> {
  const db = await openScoutDb();
  const tx = db.transaction('daily_usage', 'readonly');
  const [y, m, d] = todayBucket.split('-').map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    await tx.done;
    return [];
  }
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  const out: DailyUsage[] = [];
  // Walk oldest → newest so downstream rendering doesn't need to re-sort.
  for (let i = days - 1; i >= 0; i--) {
    const stamp = new Date(anchor);
    stamp.setDate(anchor.getDate() - i);
    const bucket = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(stamp.getDate()).padStart(2, '0')}`;
    const row = await tx.store.get(bucket);
    out.push(row ?? zeroDailyUsage(bucket));
  }
  await tx.done;
  return out;
}

/**
 * Phase 4.3 — return `scan_auto_paused` events since `sinceMs`. Caller uses
 * this to compute the 7d safety-trigger rollup + live rolling-window breach.
 */
export async function listSafetyEventsSince(
  sinceMs: number,
): Promise<Array<{ ts: number; reason: AutoPauseReason }>> {
  const db = await openScoutDb();
  const all = await db.getAll('activity_log');
  const out: Array<{ ts: number; reason: AutoPauseReason }> = [];
  for (const entry of all) {
    if (entry.event !== 'scan_auto_paused') continue;
    if (entry.ts < sinceMs) continue;
    const reason = (entry.data as { reason?: AutoPauseReason } | undefined)
      ?.reason;
    out.push({ ts: entry.ts, reason: reason ?? null });
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/**
 * Phase 4.3 — accepted outreach_actions resolved at or after `sinceMs`.
 * Returned as raw `{ resolved_at }` tuples so the pure health module doesn't
 * depend on the full `OutreachAction` type.
 */
export async function listAcceptsSince(
  sinceMs: number,
): Promise<Array<{ resolved_at: number }>> {
  const db = await openScoutDb();
  const rows = await db.getAllFromIndex(
    'outreach_actions',
    'by_state',
    'accepted',
  );
  const out: Array<{ resolved_at: number }> = [];
  for (const r of rows) {
    if (r.resolved_at === null) continue;
    if (r.resolved_at < sinceMs) continue;
    out.push({ resolved_at: r.resolved_at });
  }
  return out;
}

/**
 * Phase 4.3 — `connection_request_sent` actions with a `sent_at` stamp at or
 * after `sinceMs`. Includes rows in any post-sent state (sent / accepted /
 * declined / expired / withdrawn) — the invite was physically sent.
 */
export async function listInvitesSince(
  sinceMs: number,
): Promise<Array<{ sent_at: number }>> {
  const db = await openScoutDb();
  const rows = await db.getAllFromIndex(
    'outreach_actions',
    'by_kind',
    'connection_request_sent',
  );
  const out: Array<{ sent_at: number }> = [];
  for (const r of rows) {
    if (r.sent_at === null) continue;
    if (r.sent_at < sinceMs) continue;
    out.push({ sent_at: r.sent_at });
  }
  return out;
}

/**
 * Phase 4.3 — timestamp of the most recent `scan_auto_paused` entry with
 * `data.reason === 'health_breach'`. Seeds the resume-cooldown gate.
 */
export async function getLastHealthBreachAt(): Promise<number | null> {
  const db = await openScoutDb();
  const all = await db.getAll('activity_log');
  let latest: number | null = null;
  for (const entry of all) {
    if (entry.event !== 'scan_auto_paused') continue;
    const reason = (entry.data as { reason?: AutoPauseReason } | undefined)
      ?.reason;
    if (reason !== 'health_breach') continue;
    if (latest === null || entry.ts > latest) latest = entry.ts;
  }
  return latest;
}

// ———————————————————————————————————————————————————————————
// v2 — feed_events CRUD
// ———————————————————————————————————————————————————————————

export async function getFeedEventByFingerprint(
  fingerprint: string,
): Promise<FeedEvent | undefined> {
  const db = await openScoutDb();
  return db.getFromIndex('feed_events', 'by_event_fingerprint', fingerprint);
}

/**
 * Insert a feed event, or bump `last_seen_at` + `seen_count` if one with the
 * same fingerprint already exists. Returns the resulting row id.
 * Use via `FEED_EVENTS_UPSERT_BULK` from the content script (debounced 500ms /
 * max batch 50 — see MASTER v1.1 §19 / EXTENSION_GROWTH_TODO Phase 2.2).
 */
export async function upsertFeedEvent(row: FeedEventInsert): Promise<number> {
  const db = await openScoutDb();
  const existing = await db.getFromIndex(
    'feed_events',
    'by_event_fingerprint',
    row.event_fingerprint,
  );
  if (existing) {
    const next: FeedEvent = {
      ...existing,
      last_seen_at: row.last_seen_at,
      seen_count: existing.seen_count + 1,
      // feed_mode may legitimately change between passes — keep latest.
      feed_mode: row.feed_mode,
    };
    await db.put('feed_events', next);
    return existing.id;
  }
  return db.add('feed_events', row as FeedEvent);
}

export async function upsertFeedEventsBulk(
  rows: FeedEventInsert[],
): Promise<{ inserted: number; updated: number }> {
  if (rows.length === 0) return { inserted: 0, updated: 0 };
  const db = await openScoutDb();
  const tx = db.transaction('feed_events', 'readwrite');
  const index = tx.store.index('by_event_fingerprint');
  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = await index.get(row.event_fingerprint);
    if (existing) {
      await tx.store.put({
        ...existing,
        last_seen_at: row.last_seen_at,
        seen_count: existing.seen_count + 1,
        feed_mode: row.feed_mode,
      });
      updated++;
    } else {
      await tx.store.add(row as FeedEvent);
      inserted++;
    }
  }
  await tx.done;
  return { inserted, updated };
}

/**
 * Phase 4.2 — every feed_events row. Used by the analytics snapshot for
 * captured-vs-handled ratio + event-to-action latency + cohort-by-event-kind.
 */
export async function getAllFeedEvents(): Promise<FeedEvent[]> {
  const db = await openScoutDb();
  return db.getAll('feed_events');
}

export async function listFeedEventsForProspect(
  prospectId: number,
): Promise<FeedEvent[]> {
  const db = await openScoutDb();
  const all = await db.getAllFromIndex(
    'feed_events',
    'by_prospect_id',
    prospectId,
  );
  return all.sort((a, b) => b.last_seen_at - a.last_seen_at);
}

export async function countFeedEventsByTaskStatus(
  status: FeedEvent['task_status'],
): Promise<number> {
  const db = await openScoutDb();
  const index = db
    .transaction('feed_events', 'readonly')
    .store.index('by_task_status');
  return index.count(IDBKeyRange.only(status));
}

/**
 * Query feed events with filters + denormalized prospect info for the
 * Engagement Tasks dashboard table. Rows are sorted by `last_seen_at DESC`.
 * `total` is the filtered count; `new_count` is the store-wide count of
 * `task_status = 'new'` (drives the `chrome.action` badge).
 */
export async function queryFeedEvents(
  filter: FeedEventQuery = {},
): Promise<FeedEventPage> {
  const db = await openScoutDb();
  const limit = Math.max(1, filter.limit ?? 500);

  const allEvents = filter.prospect_id
    ? await db.getAllFromIndex(
        'feed_events',
        'by_prospect_id',
        filter.prospect_id,
      )
    : await db.getAll('feed_events');

  const statusSet =
    filter.task_statuses && filter.task_statuses.length > 0
      ? new Set<FeedTaskStatus>(filter.task_statuses)
      : null;
  const kindSet =
    filter.event_kinds && filter.event_kinds.length > 0
      ? new Set<FeedEvent['event_kind']>(filter.event_kinds)
      : null;
  const searchNeedle = (filter.search ?? '').trim().toLowerCase();

  const filtered = allEvents.filter((e) => {
    if (statusSet && !statusSet.has(e.task_status)) return false;
    if (kindSet && !kindSet.has(e.event_kind)) return false;
    return true;
  });

  filtered.sort((a, b) => b.last_seen_at - a.last_seen_at);

  const prospectIds = Array.from(new Set(filtered.map((e) => e.prospect_id)));
  const prospects = await Promise.all(
    prospectIds.map((id) => db.get('prospects', id)),
  );
  const prospectById = new Map<number, Prospect>();
  for (const p of prospects) {
    if (p) prospectById.set(p.id, p);
  }

  const enriched: FeedEventRow[] = filtered.map((e) => {
    const p = prospectById.get(e.prospect_id);
    return {
      ...e,
      prospect_name: p?.name ?? null,
      prospect_level: p?.level ?? 'NONE',
      prospect_headline: p?.headline ?? null,
      prospect_company: p?.company ?? null,
    };
  });

  const searched = searchNeedle
    ? enriched.filter((r) => {
        const haystack = [
          r.slug,
          r.prospect_name,
          r.prospect_headline,
          r.prospect_company,
        ]
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchNeedle);
      })
    : enriched;

  const newCount = await countFeedEventsByTaskStatus('new');

  return {
    rows: searched.slice(0, limit),
    total: searched.length,
    new_count: newCount,
  };
}

/** Patch a single feed event's task_status. Returns the updated row. */
export async function updateFeedEventTaskStatus(
  id: number,
  taskStatus: FeedTaskStatus,
): Promise<FeedEvent> {
  const db = await openScoutDb();
  const existing = await db.get('feed_events', id);
  if (!existing) {
    throw new Error(`FeedEvent not found: ${id}`);
  }
  const next: FeedEvent = { ...existing, task_status: taskStatus };
  await db.put('feed_events', next);
  return next;
}

/**
 * Bulk-set `task_status` on a list of feed events. Rows that don't exist are
 * silently skipped. Returns the number actually updated.
 */
export async function bulkUpdateFeedEventTaskStatus(
  ids: number[],
  taskStatus: FeedTaskStatus,
): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await openScoutDb();
  const tx = db.transaction('feed_events', 'readwrite');
  let updated = 0;
  for (const id of ids) {
    const existing = await tx.store.get(id);
    if (!existing) continue;
    await tx.store.put({ ...existing, task_status: taskStatus });
    updated++;
  }
  await tx.done;
  return updated;
}

export interface AutoTrackTransition {
  id: number;
  previous_task_status: FeedTaskStatus;
  next_task_status: FeedTaskStatus;
}

/**
 * Phase 5.5 — reconciliation-driven status flip. Stamps `auto_tracked_at`,
 * `auto_tracked_source`, and `previous_task_status` alongside the
 * `task_status` write so the Engagement Tasks UI can render an Auto-tracked
 * badge + Undo within a time-limited window. No-op for rows that already
 * carry the target status (so repeat detector fires don't clobber the
 * previous_task_status needed for undo).
 */
export async function bulkAutoTrackFeedEvents(
  ids: number[],
  nextStatus: FeedTaskStatus,
  source: FeedAutoTrackSource,
  now: number = Date.now(),
): Promise<AutoTrackTransition[]> {
  if (ids.length === 0) return [];
  const db = await openScoutDb();
  const tx = db.transaction('feed_events', 'readwrite');
  const transitions: AutoTrackTransition[] = [];
  for (const id of ids) {
    const existing = await tx.store.get(id);
    if (!existing) continue;
    if (existing.task_status === nextStatus) continue;
    const prev = existing.task_status;
    await tx.store.put({
      ...existing,
      task_status: nextStatus,
      auto_tracked_at: now,
      auto_tracked_source: source,
      previous_task_status: prev,
    });
    transitions.push({
      id,
      previous_task_status: prev,
      next_task_status: nextStatus,
    });
  }
  await tx.done;
  return transitions;
}

/**
 * Phase 5.5 — revert an auto-track. Returns null if the row doesn't exist
 * or carries no auto-track stamp (nothing to undo).
 */
export async function undoAutoTrackFeedEvent(
  id: number,
): Promise<FeedEvent | null> {
  const db = await openScoutDb();
  const existing = await db.get('feed_events', id);
  if (!existing) return null;
  if (!existing.auto_tracked_at || !existing.previous_task_status) return null;
  const reverted: FeedEvent = {
    ...existing,
    task_status: existing.previous_task_status,
    auto_tracked_at: null,
    auto_tracked_source: 'manual_undo',
    previous_task_status: null,
  };
  await db.put('feed_events', reverted);
  return reverted;
}

/**
 * Phase 5.5 — list interaction_events currently flagged needs_review. The
 * `reconciliation.ts` engine returns this status for ambiguous detector
 * matches (token expired, confidence low but URN resolved, etc.). Surfaced
 * in the Engagement Tasks dashboard as a dedicated filter.
 */
export async function listNeedsReviewInteractionEvents(
  limit = 200,
): Promise<InteractionEvent[]> {
  const db = await openScoutDb();
  const all = await db.getAll('interaction_events');
  return all
    .filter((row) => row.reconciliation_status === 'needs_review')
    .sort((a, b) => b.detected_at - a.detected_at)
    .slice(0, Math.max(1, limit));
}

/**
 * Phase 5.4 — resolve a `needs_review` interaction_event by promoting it to
 * `matched` (Confirm) or downgrading to `unmatched` (Dismiss). Idempotent:
 * resolving an already-resolved row returns the row unchanged. Returns null
 * when the id doesn't exist.
 */
export async function resolveInteractionEventReview(
  id: number,
  resolution: 'matched' | 'unmatched',
): Promise<InteractionEvent | null> {
  const db = await openScoutDb();
  const tx = db.transaction('interaction_events', 'readwrite');
  const row = await tx.store.get(id);
  if (!row) {
    await tx.done;
    return null;
  }
  if (row.reconciliation_status === resolution) {
    await tx.done;
    return row;
  }
  const next: InteractionEvent = {
    ...row,
    reconciliation_status: resolution,
    data: {
      ...row.data,
      review_resolved_at: Date.now(),
      review_resolution: resolution,
    },
  };
  await tx.store.put(next);
  await tx.done;
  return next;
}

// ———————————————————————————————————————————————————————————
// v2 — message_templates CRUD (single active template per kind in v2.0)
// ———————————————————————————————————————————————————————————

export async function addMessageTemplate(
  row: MessageTemplateInsert,
): Promise<number> {
  const db = await openScoutDb();
  return db.add('message_templates', row as MessageTemplate);
}

export async function listMessageTemplates(
  kind?: MessageTemplateKind,
): Promise<MessageTemplate[]> {
  const db = await openScoutDb();
  const all = kind
    ? await db.getAllFromIndex('message_templates', 'by_kind', kind)
    : await db.getAll('message_templates');
  return all.sort((a, b) => b.version - a.version || b.created_at - a.created_at);
}

/** Latest unarchived template for the given kind, or `null`. */
export async function getActiveMessageTemplate(
  kind: MessageTemplateKind,
): Promise<MessageTemplate | null> {
  const all = await listMessageTemplates(kind);
  return all.find((t) => !t.archived) ?? null;
}

export async function updateMessageTemplate(
  id: number,
  patch: Partial<Omit<MessageTemplate, 'id' | 'kind'>>,
): Promise<MessageTemplate> {
  const db = await openScoutDb();
  const existing = await db.get('message_templates', id);
  if (!existing) {
    throw new Error(`MessageTemplate not found: ${id}`);
  }
  const next: MessageTemplate = {
    ...existing,
    ...patch,
    id,
    updated_at: Date.now(),
  };
  await db.put('message_templates', next);
  return next;
}

// ———————————————————————————————————————————————————————————
// v2 — daily_usage (budget counters, keyed by local day bucket)
// ———————————————————————————————————————————————————————————

function zeroDailyUsage(dayBucket: string): DailyUsage {
  return {
    day_bucket: dayBucket,
    invites_sent: 0,
    visits: 0,
    messages_sent: 0,
    followups_sent: 0,
    feed_events_captured: 0,
    updated_at: Date.now(),
  };
}

/** Read today's counters (or zero-filled if none yet). */
export async function getDailyUsage(dayBucket: string): Promise<DailyUsage> {
  const db = await openScoutDb();
  const row = await db.get('daily_usage', dayBucket);
  return row ?? zeroDailyUsage(dayBucket);
}

/**
 * Atomically increment one or more counters for the given day bucket.
 * Caller passes the deltas (positive integers). Negative deltas are allowed
 * but clamped to zero to keep budgets non-negative.
 */
export async function incrementDailyUsage(
  dayBucket: string,
  deltas: Partial<Omit<DailyUsage, 'day_bucket' | 'updated_at'>>,
): Promise<DailyUsage> {
  const db = await openScoutDb();
  const tx = db.transaction('daily_usage', 'readwrite');
  const existing = (await tx.store.get(dayBucket)) ?? zeroDailyUsage(dayBucket);
  const next: DailyUsage = {
    day_bucket: dayBucket,
    invites_sent: Math.max(0, existing.invites_sent + (deltas.invites_sent ?? 0)),
    visits: Math.max(0, existing.visits + (deltas.visits ?? 0)),
    messages_sent: Math.max(0, existing.messages_sent + (deltas.messages_sent ?? 0)),
    followups_sent: Math.max(
      0,
      existing.followups_sent + (deltas.followups_sent ?? 0),
    ),
    feed_events_captured: Math.max(
      0,
      existing.feed_events_captured + (deltas.feed_events_captured ?? 0),
    ),
    updated_at: Date.now(),
  };
  await tx.store.put(next);
  await tx.done;
  return next;
}

// ———————————————————————————————————————————————————————————
// v3 — interaction_events CRUD
// ———————————————————————————————————————————————————————————

/**
 * Append an interaction_event row. Returns the existing id on fingerprint
 * collision (same detector fired twice for the same event) — keeps the audit
 * trail append-only without letting dupes inflate counts.
 */
export async function addInteractionEvent(
  row: InteractionEventInsert,
): Promise<number> {
  const db = await openScoutDb();
  const tx = db.transaction('interaction_events', 'readwrite');
  const store = tx.objectStore('interaction_events');
  const existing = await store.index('by_fingerprint').get(row.fingerprint);
  if (existing) {
    await tx.done;
    return existing.id;
  }
  const id = (await store.add(row as InteractionEvent)) as number;
  await tx.done;
  return id;
}

export async function listInteractionEvents(
  query: InteractionListQuery = {},
): Promise<InteractionEvent[]> {
  const db = await openScoutDb();
  const limit = Math.max(1, query.limit ?? 200);
  if (typeof query.prospect_id === 'number') {
    const rows = await db.getAllFromIndex(
      'interaction_events',
      'by_prospect_id',
      IDBKeyRange.only(query.prospect_id),
    );
    return rows
      .sort((a, b) => b.detected_at - a.detected_at)
      .slice(0, limit);
  }
  if (Array.isArray(query.task_ids) && query.task_ids.length > 0) {
    const tx = db.transaction('interaction_events', 'readonly');
    const idx = tx.objectStore('interaction_events').index('by_source_task_id');
    const out: InteractionEvent[] = [];
    for (const id of query.task_ids) {
      const rows = await idx.getAll(IDBKeyRange.only(id));
      out.push(...rows);
    }
    await tx.done;
    return out
      .sort((a, b) => b.detected_at - a.detected_at)
      .slice(0, limit);
  }
  const all = await db.getAll('interaction_events');
  return all
    .sort((a, b) => b.detected_at - a.detected_at)
    .slice(0, limit);
}

// ———————————————————————————————————————————————————————————
// v3 — correlation_tokens CRUD
// ———————————————————————————————————————————————————————————

export async function putCorrelationToken(
  token: CorrelationToken,
): Promise<void> {
  const db = await openScoutDb();
  await db.put('correlation_tokens', token);
}

export async function getCorrelationToken(
  value: string,
): Promise<CorrelationToken | undefined> {
  const db = await openScoutDb();
  return db.get('correlation_tokens', value);
}

export async function listCorrelationTokensForProspect(
  prospectId: number,
): Promise<CorrelationToken[]> {
  const db = await openScoutDb();
  return db.getAllFromIndex(
    'correlation_tokens',
    'by_prospect_id',
    IDBKeyRange.only(prospectId),
  );
}

export async function consumeCorrelationToken(value: string): Promise<void> {
  const db = await openScoutDb();
  const tx = db.transaction('correlation_tokens', 'readwrite');
  const store = tx.objectStore('correlation_tokens');
  const row = await store.get(value);
  if (row) {
    row.consumed = true;
    await store.put(row);
  }
  await tx.done;
}

/** GC expired tokens. Called opportunistically on write paths. */
export async function gcExpiredCorrelationTokens(now: number): Promise<number> {
  const db = await openScoutDb();
  const tx = db.transaction('correlation_tokens', 'readwrite');
  const idx = tx.objectStore('correlation_tokens').index('by_expires_at');
  let cursor = await idx.openCursor(IDBKeyRange.upperBound(now));
  let removed = 0;
  while (cursor) {
    await cursor.delete();
    removed += 1;
    cursor = await cursor.continue();
  }
  await tx.done;
  return removed;
}
