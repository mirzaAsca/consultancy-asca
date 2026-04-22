import { DB_NAME, DB_VERSION } from './constants';

/**
 * v1→v2 migration safety net — capture a JSON snapshot of all stores before
 * the upgrade hook mutates the schema. Sprint 1 acceptance item.
 *
 * Design constraints:
 * - Uses raw `indexedDB.open()` with NO version argument, so it attaches to
 *   whichever version currently exists on disk (no upgrade triggered).
 * - Iterates stores dynamically via `db.objectStoreNames`, so v1 databases
 *   without the v2 stores still snapshot cleanly.
 * - Consumers decide when to call this (typically on service-worker boot,
 *   guarded by a `chrome.storage.local` key that tracks "last booted version").
 */

export interface DbSnapshot {
  db_name: string;
  /** Current on-disk DB version at snapshot time. */
  db_version: number;
  /** `DB_VERSION` the extension bundle is targeting (post-upgrade). */
  target_version: number;
  captured_at: number;
  stores: Record<string, unknown[]>;
}

/** Open the database at its *current* version (no upgrade). */
function openCurrentVersion(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onerror = () => reject(req.error ?? new Error('open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onblocked = () => reject(new Error('open blocked by another tab'));
  });
}

function getAll(store: IDBObjectStore): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onerror = () => reject(req.error ?? new Error('getAll failed'));
    req.onsuccess = () => resolve(req.result as unknown[]);
  });
}

/**
 * Read every object store into an in-memory snapshot. Returns `null` if the
 * database hasn't been created yet (fresh install — nothing to back up).
 */
export async function createDbSnapshot(): Promise<DbSnapshot | null> {
  // Check existence first so we don't accidentally create an empty DB.
  const existing = await indexedDB.databases?.();
  if (existing && !existing.some((d) => d.name === DB_NAME)) {
    return null;
  }
  const db = await openCurrentVersion();
  try {
    const snapshot: DbSnapshot = {
      db_name: DB_NAME,
      db_version: db.version,
      target_version: DB_VERSION,
      captured_at: Date.now(),
      stores: {},
    };
    const names = Array.from(db.objectStoreNames);
    if (names.length === 0) return snapshot;
    const tx = db.transaction(names, 'readonly');
    for (const name of names) {
      snapshot.stores[name] = await getAll(tx.objectStore(name));
    }
    return snapshot;
  } finally {
    db.close();
  }
}

/**
 * Whether a snapshot should be captured on next boot.
 *
 * Consumers pass the version string persisted from the previous boot
 * (e.g. `chrome.storage.local.get('db_version_on_last_boot')`). When the
 * on-bundle `DB_VERSION` is strictly greater, the next `openScoutDb()` call
 * will trigger an upgrade — snapshot first.
 */
export function shouldBackupBeforeUpgrade(
  lastBootedVersion: number | undefined,
): boolean {
  if (lastBootedVersion === undefined) {
    // Unknown previous version — safest to snapshot once.
    return true;
  }
  return lastBootedVersion < DB_VERSION;
}

/**
 * MV3 service-worker-safe download trigger. Builds a Blob, converts to an
 * object URL, hands it to `chrome.downloads.download`. Returns the download id.
 *
 * Not called during tests — the Blob+URL+chrome.downloads stack is a runtime
 * concern; the snapshot itself is what's unit-testable.
 */
export async function downloadDbSnapshot(
  snapshot: DbSnapshot,
  filename?: string,
): Promise<number> {
  const fname =
    filename ??
    `investor-scout-backup-v${snapshot.db_version}-${new Date(snapshot.captured_at)
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  try {
    const id = await chrome.downloads.download({
      url,
      filename: fname,
      saveAs: false,
    });
    return id;
  } finally {
    // Defer revocation slightly so the download has time to latch the URL.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
