import { DB_VERSION } from '@/shared/constants';
import {
  createDbSnapshot,
  downloadDbSnapshot,
  shouldBackupBeforeUpgrade,
} from '@/shared/backup';
import { appendActivityLog, registerDbBootHooks } from '@/shared/db';
import { recomputeAllProspects } from '@/shared/prospect-scoring';

const STORAGE_KEY = 'db_version_on_last_boot';

async function readLastBootedVersion(): Promise<number | undefined> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const v = stored[STORAGE_KEY];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

async function preOpen(): Promise<void> {
  const lastBooted = await readLastBootedVersion();
  if (!shouldBackupBeforeUpgrade(lastBooted)) return;
  const snapshot = await createDbSnapshot();
  // Fresh install (DB doesn't exist yet) — no upgrade to back up.
  if (!snapshot) return;
  // Already at target — no schema mutation will happen, skip download to avoid
  // spamming the user's downloads folder on every restart at the same version.
  if (snapshot.db_version >= DB_VERSION) return;
  const downloadId = await downloadDbSnapshot(snapshot);
  console.info('[investor-scout] pre-migration snapshot downloaded', {
    from: snapshot.db_version,
    to: DB_VERSION,
    download_id: downloadId,
    stores: Object.keys(snapshot.stores),
  });
}

async function postOpen(info: {
  oldVersion: number;
  newVersion: number;
}): Promise<void> {
  // Persist the version we just opened so the next boot can decide whether to
  // snapshot. Do this even when no upgrade ran so the first-ever boot stamps a
  // value and subsequent same-version boots short-circuit the snapshot path.
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: info.newVersion });
  } catch (err) {
    console.warn('[investor-scout] could not persist last-booted db version', {
      error: err instanceof Error ? err.message : err,
    });
  }

  // Auto-rescore on v1→v2 upgrade — pre-v2 prospect rows have null scores
  // (the upgrade backfill seeds them with `priority_score: null`). Without
  // this pass the outreach queue would silently treat the entire list as
  // tier=null until each row gets re-touched by another scoring trigger.
  if (info.oldVersion < info.newVersion && info.oldVersion < 2) {
    try {
      const result = await recomputeAllProspects();
      console.info('[investor-scout] post-upgrade rescore complete', {
        from: info.oldVersion,
        to: info.newVersion,
        ...result,
      });
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'db_upgrade_rescore',
        prospect_id: null,
        data: {
          from: info.oldVersion,
          to: info.newVersion,
          updated: result.updated,
          skipped: result.skipped,
        },
      });
    } catch (err) {
      console.error('[investor-scout] post-upgrade rescore failed', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }
}

/** Register the pre/post-open DB hooks. Must be called synchronously at module
 *  load, before any code path calls `openScoutDb()`. */
export function registerMigrationBoot(): void {
  registerDbBootHooks({ preOpen, postOpen });
}
