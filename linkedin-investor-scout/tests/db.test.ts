import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  ACTIVITY_LOG_MAX_ENTRIES,
  appendActivityLog,
  bulkAddProspectsInChunks,
  clearAllProspects,
  countProspects,
  deleteScoutDatabase,
  getAllProspects,
  getProspectByUrl,
  getRecentActivityLog,
  getScanState,
  getSettings,
  openScoutDb,
  prospectInsertFromRawUrl,
  queryProspects,
  putScanState,
  putSettings,
  replaceAllProspects,
  resetStuckInProgressProspects,
  takePendingProspectsBatch,
  updateProspect,
} from '@/shared/db';
import { DEFAULT_SETTINGS } from '@/shared/constants';

beforeEach(async () => {
  await deleteScoutDatabase();
});

describe('IndexedDB data layer', () => {
  it('opens DB and seeds settings + scan_state', async () => {
    await openScoutDb();
    const settings = await getSettings();
    expect(settings.id).toBe('global');
    expect(settings.scan.daily_cap).toBe(500);

    const scan = await getScanState();
    expect(scan.id).toBe('current');
    expect(scan.status).toBe('idle');
  });

  it('replaces prospects and reads pending batch', async () => {
    await replaceAllProspects([
      prospectInsertFromRawUrl('https://linkedin.com/in/a'),
      prospectInsertFromRawUrl('https://linkedin.com/in/b'),
    ]);
    expect(await countProspects()).toBe(2);
    const batch = await takePendingProspectsBatch(10);
    expect(batch).toHaveLength(2);
    expect(batch.map((b) => b.url)).toEqual([
      'https://www.linkedin.com/in/a/',
      'https://www.linkedin.com/in/b/',
    ]);
  });

  it('bulkAddProspectsInChunks inserts rows', async () => {
    await openScoutDb();
    await bulkAddProspectsInChunks(
      [
        prospectInsertFromRawUrl('linkedin.com/in/one'),
        prospectInsertFromRawUrl('linkedin.com/in/two'),
      ],
      1,
    );
    expect(await countProspects()).toBe(2);
  });

  it('ring-buffers activity log', async () => {
    await openScoutDb();
    const n = ACTIVITY_LOG_MAX_ENTRIES + 5;
    for (let i = 0; i < n; i++) {
      await appendActivityLog({
        ts: i,
        level: 'info',
        event: 'test',
        prospect_id: null,
        data: { i },
      });
    }
    const recent = await getRecentActivityLog(ACTIVITY_LOG_MAX_ENTRIES + 1);
    expect(recent.length).toBe(ACTIVITY_LOG_MAX_ENTRIES);
  });

  it('resets stuck in_progress rows', async () => {
    await replaceAllProspects([
      { ...prospectInsertFromRawUrl('linkedin.com/in/stuck'), scan_status: 'in_progress' },
    ]);
    const n = await resetStuckInProgressProspects();
    expect(n).toBe(1);
    const batch = await takePendingProspectsBatch(5);
    expect(batch).toHaveLength(1);
  });

  it('updateProspect patches row', async () => {
    await replaceAllProspects([prospectInsertFromRawUrl('linkedin.com/in/x')]);
    const batch = await takePendingProspectsBatch(1);
    await updateProspect(batch[0].id, { name: 'Test', scan_status: 'done' });
    const db = await openScoutDb();
    const row = await db.get('prospects', batch[0].id);
    expect(row?.name).toBe('Test');
    expect(row?.scan_status).toBe('done');
  });

  it('putScanState merges', async () => {
    await putScanState({ status: 'running', scans_today: 3 });
    const s = await getScanState();
    expect(s.status).toBe('running');
    expect(s.scans_today).toBe(3);
  });

  it('clearAllProspects empties store', async () => {
    await replaceAllProspects([prospectInsertFromRawUrl('linkedin.com/in/z')]);
    await clearAllProspects();
    expect(await countProspects()).toBe(0);
  });

  it('enforces unique by_url index', async () => {
    await replaceAllProspects([prospectInsertFromRawUrl('linkedin.com/in/dup')]);
    await expect(
      bulkAddProspectsInChunks(
        [prospectInsertFromRawUrl('linkedin.com/in/dup')],
        1,
      ),
    ).rejects.toThrow();
    expect(await countProspects()).toBe(1);
  });

  it('prospectInsertFromRawUrl throws on invalid input', () => {
    expect(() => prospectInsertFromRawUrl('not a url')).toThrow(
      /Invalid LinkedIn profile URL/,
    );
    expect(() => prospectInsertFromRawUrl('')).toThrow();
    expect(() =>
      prospectInsertFromRawUrl('https://www.linkedin.com/company/acme/'),
    ).toThrow();
  });

  it('getProspectByUrl canonicalizes input', async () => {
    await replaceAllProspects([prospectInsertFromRawUrl('linkedin.com/in/jane')]);
    const row = await getProspectByUrl('https://linkedin.com/in/jane?x=1');
    expect(row?.slug).toBe('jane');
  });

  it('getAllProspects returns rows in primary-key order', async () => {
    await replaceAllProspects([
      prospectInsertFromRawUrl('linkedin.com/in/first'),
      prospectInsertFromRawUrl('linkedin.com/in/second'),
    ]);
    const rows = await getAllProspects();
    expect(rows.map((r) => r.slug)).toEqual(['first', 'second']);
  });

  it('3rd-level filter returns all far prospects (post OOO→3rd collapse)', async () => {
    const now = Date.now();
    await replaceAllProspects([
      {
        ...prospectInsertFromRawUrl('linkedin.com/in/third-level'),
        level: '3rd',
        scan_status: 'done',
        last_scanned: now,
      },
      {
        ...prospectInsertFromRawUrl('linkedin.com/in/follow-only'),
        level: '3rd',
        scan_status: 'done',
        last_scanned: now,
      },
    ]);

    const thirdOnly = await queryProspects({
      levels: ['3rd'],
      page: 0,
      page_size: 20,
    });

    expect(thirdOnly.rows.map((row) => row.slug).sort()).toEqual([
      'follow-only',
      'third-level',
    ]);
  });

  it('getSettings returns an independent copy (no DEFAULT_SETTINGS aliasing)', async () => {
    const s = await getSettings();
    expect(s.scan.daily_cap).toBe(500);

    // If the returned object aliased DEFAULT_SETTINGS, this would throw
    // (DEFAULT_SETTINGS is Object.frozen) or leak across future reads.
    s.scan.daily_cap = 1;
    s.highlight.colors.first = '#000000';
    s.highlight.show_on.post_authors = false;

    expect(DEFAULT_SETTINGS.scan.daily_cap).toBe(500);
    expect(DEFAULT_SETTINGS.highlight.colors.first).toBe('#22c55e');
    expect(DEFAULT_SETTINGS.highlight.show_on.post_authors).toBe(true);
  });

  it('putSettings deep-merges nested patches', async () => {
    await getSettings();
    const updated = await putSettings({
      scan: { daily_cap: 100 },
      highlight: { colors: { first: '#111111' } },
    });
    expect(updated.scan.daily_cap).toBe(100);
    expect(updated.scan.min_delay_ms).toBe(5000);
    expect(updated.highlight.colors.first).toBe('#111111');
    expect(updated.highlight.colors.second).toBe('#3b82f6');
    expect(updated.highlight.show_on.post_authors).toBe(true);

    const roundtrip = await getSettings();
    expect(roundtrip.scan.daily_cap).toBe(100);
    expect(roundtrip.highlight.colors.first).toBe('#111111');
  });

  it('ring-buffer trims correctly when many rows overflow at once', async () => {
    await openScoutDb();
    const overshoot = 50;
    for (let i = 0; i < ACTIVITY_LOG_MAX_ENTRIES; i++) {
      await appendActivityLog({
        ts: i,
        level: 'info',
        event: 'seed',
        prospect_id: null,
        data: {},
      });
    }
    for (let i = 0; i < overshoot; i++) {
      await appendActivityLog({
        ts: ACTIVITY_LOG_MAX_ENTRIES + i,
        level: 'info',
        event: 'overflow',
        prospect_id: null,
        data: {},
      });
    }
    const recent = await getRecentActivityLog(ACTIVITY_LOG_MAX_ENTRIES + 10);
    expect(recent.length).toBe(ACTIVITY_LOG_MAX_ENTRIES);
    // Newest kept, oldest evicted.
    expect(recent[0].ts).toBe(ACTIVITY_LOG_MAX_ENTRIES + overshoot - 1);
    const oldestKept = recent[recent.length - 1];
    expect(oldestKept.ts).toBeGreaterThanOrEqual(overshoot);
  });
});
