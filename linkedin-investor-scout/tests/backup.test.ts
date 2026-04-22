import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDbSnapshot,
  shouldBackupBeforeUpgrade,
} from '@/shared/backup';
import { DB_VERSION } from '@/shared/constants';
import {
  deleteScoutDatabase,
  openScoutDb,
  prospectInsertFromRawUrl,
  replaceAllProspects,
} from '@/shared/db';

beforeEach(async () => {
  await deleteScoutDatabase();
});

describe('backup — shouldBackupBeforeUpgrade', () => {
  it('first-ever boot (undefined) → backup', () => {
    expect(shouldBackupBeforeUpgrade(undefined)).toBe(true);
  });

  it('previous boot matches current version → skip', () => {
    expect(shouldBackupBeforeUpgrade(DB_VERSION)).toBe(false);
  });

  it('previous boot below current → backup (upgrade is about to run)', () => {
    expect(shouldBackupBeforeUpgrade(DB_VERSION - 1)).toBe(true);
  });

  it('previous boot above current (downgrade edge case) → no backup', () => {
    expect(shouldBackupBeforeUpgrade(DB_VERSION + 1)).toBe(false);
  });
});

describe('backup — createDbSnapshot', () => {
  it('returns null when no database exists yet', async () => {
    // fake-indexeddb ships databases(); when the DB is freshly deleted it
    // should report an empty list.
    if (typeof indexedDB.databases !== 'function') {
      // Environment doesn't expose databases() — snapshot will still proceed
      // but will create an empty DB, which is benign for the test.
      return;
    }
    const snap = await createDbSnapshot();
    expect(snap).toBeNull();
  });

  it('snapshots every store present on disk', async () => {
    await openScoutDb();
    await replaceAllProspects([
      prospectInsertFromRawUrl('https://linkedin.com/in/alice'),
      prospectInsertFromRawUrl('https://linkedin.com/in/bob'),
    ]);

    const snap = await createDbSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.db_version).toBe(DB_VERSION);
    expect(snap!.target_version).toBe(DB_VERSION);
    expect(snap!.stores.prospects).toHaveLength(2);
    // Every v2 store should appear, even if empty — lets the consumer
    // restore a full round-trip.
    expect(snap!.stores).toHaveProperty('outreach_actions');
    expect(snap!.stores).toHaveProperty('feed_events');
    expect(snap!.stores).toHaveProperty('message_templates');
    expect(snap!.stores).toHaveProperty('daily_usage');
  });
});
