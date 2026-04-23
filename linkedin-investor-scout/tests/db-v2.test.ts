import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DB_VERSION,
  DEFAULT_OUTREACH_CAPS,
  DEFAULT_TIER_THRESHOLDS,
} from '@/shared/constants';
import {
  addMessageTemplate,
  addOutreachAction,
  bulkUpdateFeedEventTaskStatus,
  clearAllData,
  countFeedEventsByTaskStatus,
  deleteScoutDatabase,
  getActiveMessageTemplate,
  getDailyUsage,
  getOutreachActionByIdempotencyKey,
  getSettings,
  incrementDailyUsage,
  listFeedEventsForProspect,
  listMessageTemplates,
  listOutreachActionsForProspect,
  openScoutDb,
  prospectInsertFromRawUrl,
  putSettings,
  queryFeedEvents,
  replaceAllProspects,
  requeueStaleSATierProspects,
  updateProspect,
  updateFeedEventTaskStatus,
  updateMessageTemplate,
  updateOutreachAction,
  upsertFeedEvent,
  upsertFeedEventsBulk,
} from '@/shared/db';
import { computeFeedEventFingerprint } from '@/shared/scoring';

beforeEach(async () => {
  await deleteScoutDatabase();
});

describe('v2 — schema bump + new stores', () => {
  it('opens at current DB_VERSION with all v2 + v3 stores present', async () => {
    const db = await openScoutDb();
    expect(db.version).toBe(DB_VERSION);
    const names = Array.from(db.objectStoreNames).sort();
    expect(names).toEqual(
      [
        'activity_log',
        'correlation_tokens',
        'daily_usage',
        'feed_events',
        'interaction_events',
        'message_templates',
        'outreach_actions',
        'prospects',
        'scan_state',
        'settings',
      ].sort(),
    );
  });

  it('new prospect rows include v2 default fields', async () => {
    await replaceAllProspects([prospectInsertFromRawUrl('https://linkedin.com/in/alice')]);
    const db = await openScoutDb();
    const all = await db.getAll('prospects');
    expect(all).toHaveLength(1);
    const row = all[0];
    expect(row.lifecycle_status).toBe('new');
    expect(row.priority_score).toBeNull();
    expect(row.score_breakdown).toBeNull();
    expect(row.tier).toBeNull();
    expect(row.mutual_count).toBeNull();
    expect(row.next_action).toBeNull();
    expect(row.last_outreach_at).toBeNull();
  });

  it('settings backfill surfaces outreach defaults when row predates v2', async () => {
    const db = await openScoutDb();
    // Simulate a pre-v2 settings row by writing a row with no `outreach` block.
    await db.put('settings', {
      id: 'global',
      scan: {
        min_delay_ms: 7000,
        max_delay_ms: 15000,
        daily_cap: 300,
        retry_on_failure: true,
        max_retries: 3,
      },
      highlight: {
        enabled: true,
        colors: {
          first: '#22c55e',
          second: '#3b82f6',
          third: '#a855f7',
          out_of_network: '#6b7280',
        },
        show_on: {
          post_authors: true,
          reposters: true,
          commenters: true,
          reactors: true,
          mentions: true,
          suggested: true,
        },
      },
      updated_at: Date.now(),
      // no `outreach` key — emulating a v1 install
    } as never);

    const settings = await getSettings();
    expect(settings.outreach.caps).toEqual(DEFAULT_OUTREACH_CAPS);
    expect(settings.outreach.tier_thresholds).toEqual(DEFAULT_TIER_THRESHOLDS);
    expect(settings.outreach.warm_visit_before_invite).toBe(true);
    expect(settings.outreach.keywords).toEqual([]);
    expect(settings.outreach.firms).toEqual([]);
    // pre-existing scan config is preserved
    expect(settings.scan.daily_cap).toBe(300);
  });

  it('putSettings merges outreach patch without clobbering defaults', async () => {
    const updated = await putSettings({
      outreach: {
        caps: { daily_invites: 8 },
        keywords: [{ term: 'Partner', weight: 40, kind: 'strong' }],
      },
    });
    expect(updated.outreach.caps.daily_invites).toBe(8);
    // other caps unchanged
    expect(updated.outreach.caps.daily_visits).toBe(
      DEFAULT_OUTREACH_CAPS.daily_visits,
    );
    expect(updated.outreach.keywords).toHaveLength(1);
    expect(updated.outreach.firms).toEqual([]);
  });
});

describe('v2 — outreach_actions', () => {
  it('round-trips actions and dedupes via idempotency_key', async () => {
    const id1 = await addOutreachAction({
      prospect_id: 7,
      kind: 'connection_request_sent',
      state: 'draft',
      idempotency_key: '7:connection_request_sent:2026-04-22:abc',
      template_id: null,
      template_version: null,
      rendered_body: 'Hi {{first_name}}',
      source_feed_event_id: null,
      created_at: Date.now(),
      approved_at: null,
      sent_at: null,
      resolved_at: null,
      notes: null,
    });
    expect(id1).toBeGreaterThan(0);

    const fetched = await getOutreachActionByIdempotencyKey(
      '7:connection_request_sent:2026-04-22:abc',
    );
    expect(fetched?.id).toBe(id1);

    // Double-send race: attempting a second insert with same key aborts the tx.
    await expect(
      addOutreachAction({
        prospect_id: 7,
        kind: 'connection_request_sent',
        state: 'draft',
        idempotency_key: '7:connection_request_sent:2026-04-22:abc',
        template_id: null,
        template_version: null,
        rendered_body: 'duplicate',
        source_feed_event_id: null,
        created_at: Date.now(),
        approved_at: null,
        sent_at: null,
        resolved_at: null,
        notes: null,
      }),
    ).rejects.toThrow();
  });

  it('FSM transitions: draft → approved → sent', async () => {
    const id = await addOutreachAction({
      prospect_id: 7,
      kind: 'connection_request_sent',
      state: 'draft',
      idempotency_key: 'k1',
      template_id: null,
      template_version: null,
      rendered_body: null,
      source_feed_event_id: null,
      created_at: Date.now(),
      approved_at: null,
      sent_at: null,
      resolved_at: null,
      notes: null,
    });
    const approved = await updateOutreachAction(id, {
      state: 'approved',
      approved_at: Date.now(),
    });
    expect(approved.state).toBe('approved');
    const sent = await updateOutreachAction(id, {
      state: 'sent',
      sent_at: Date.now(),
    });
    expect(sent.state).toBe('sent');
    expect(sent.approved_at).not.toBeNull();

    const forProspect = await listOutreachActionsForProspect(7);
    expect(forProspect).toHaveLength(1);
  });
});

describe('v2 — feed_events', () => {
  it('upsert dedupes by fingerprint and bumps seen_count', async () => {
    const parts = {
      prospect_id: 1,
      event_kind: 'post' as const,
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
    };
    const fp = computeFeedEventFingerprint(parts);

    const idA = await upsertFeedEvent({
      prospect_id: 1,
      slug: 'alice',
      event_kind: 'post',
      post_kind: 'activity',
      post_url: 'https://www.linkedin.com/feed/update/urn:li:activity:X/',
      comment_url: null,
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
      feed_mode: 'top',
      event_fingerprint: fp,
      first_seen_at: 1000,
      last_seen_at: 1000,
      seen_count: 1,
      task_status: 'new',
    });

    const idB = await upsertFeedEvent({
      prospect_id: 1,
      slug: 'alice',
      event_kind: 'post',
      post_kind: 'activity',
      post_url: 'https://www.linkedin.com/feed/update/urn:li:activity:X/',
      comment_url: null,
      activity_urn: 'urn:li:activity:X',
      comment_urn: null,
      feed_mode: 'recent',
      event_fingerprint: fp,
      first_seen_at: 1000,
      last_seen_at: 2000,
      seen_count: 1,
      task_status: 'new',
    });

    expect(idB).toBe(idA);
    const events = await listFeedEventsForProspect(1);
    expect(events).toHaveLength(1);
    expect(events[0].seen_count).toBe(2);
    expect(events[0].last_seen_at).toBe(2000);
    expect(events[0].feed_mode).toBe('recent'); // latest pass wins
  });

  it('bulk upsert partitions inserts vs updates', async () => {
    const eventA = {
      prospect_id: 1,
      slug: 'a',
      event_kind: 'post' as const,
      post_kind: 'activity' as const,
      post_url: null,
      comment_url: null,
      activity_urn: 'urn:li:activity:A',
      comment_urn: null,
      feed_mode: 'top' as const,
      event_fingerprint: computeFeedEventFingerprint({
        prospect_id: 1,
        event_kind: 'post',
        activity_urn: 'urn:li:activity:A',
        comment_urn: null,
      }),
      first_seen_at: 1000,
      last_seen_at: 1000,
      seen_count: 1,
      task_status: 'new' as const,
    };
    const eventB = {
      ...eventA,
      activity_urn: 'urn:li:activity:B',
      event_fingerprint: computeFeedEventFingerprint({
        prospect_id: 1,
        event_kind: 'post',
        activity_urn: 'urn:li:activity:B',
        comment_urn: null,
      }),
    };

    const first = await upsertFeedEventsBulk([eventA, eventB]);
    expect(first).toEqual({ inserted: 2, updated: 0 });

    // Second pass: A re-seen, C new.
    const eventC = {
      ...eventA,
      activity_urn: 'urn:li:activity:C',
      event_fingerprint: computeFeedEventFingerprint({
        prospect_id: 1,
        event_kind: 'post',
        activity_urn: 'urn:li:activity:C',
        comment_urn: null,
      }),
    };
    const second = await upsertFeedEventsBulk([eventA, eventC]);
    expect(second).toEqual({ inserted: 1, updated: 1 });

    const newCount = await countFeedEventsByTaskStatus('new');
    expect(newCount).toBe(3);
  });
});

describe('v2 — feed_events Engagement Tasks (Phase 2.3)', () => {
  async function seedProspectsAndEvents() {
    await replaceAllProspects([
      prospectInsertFromRawUrl('https://linkedin.com/in/alice'),
      prospectInsertFromRawUrl('https://linkedin.com/in/bob'),
    ]);
    const db = await openScoutDb();
    const all = await db.getAll('prospects');
    const alice = all.find((p) => p.slug === 'alice')!;
    const bob = all.find((p) => p.slug === 'bob')!;

    // Enrich prospects so queryFeedEvents returns prospect_name / level.
    await db.put('prospects', {
      ...alice,
      name: 'Alice Example',
      headline: 'Partner at Acme',
      company: 'Acme',
      level: '2nd',
    });
    await db.put('prospects', {
      ...bob,
      name: 'Bob Example',
      headline: 'Angel investor',
      company: 'Beta',
      level: '3rd',
    });

    const base = {
      post_kind: 'activity' as const,
      post_url: null,
      comment_url: null,
      comment_urn: null,
      feed_mode: 'top' as const,
      first_seen_at: 1000,
      seen_count: 1,
      task_status: 'new' as const,
    };

    await upsertFeedEvent({
      ...base,
      prospect_id: alice.id,
      slug: 'alice',
      event_kind: 'post',
      activity_urn: 'urn:li:activity:A1',
      event_fingerprint: 'fp-a1',
      last_seen_at: 3000,
    });
    await upsertFeedEvent({
      ...base,
      prospect_id: alice.id,
      slug: 'alice',
      event_kind: 'comment',
      activity_urn: 'urn:li:activity:A2',
      event_fingerprint: 'fp-a2',
      last_seen_at: 2000,
    });
    await upsertFeedEvent({
      ...base,
      prospect_id: bob.id,
      slug: 'bob',
      event_kind: 'post',
      activity_urn: 'urn:li:activity:B1',
      event_fingerprint: 'fp-b1',
      last_seen_at: 1500,
    });

    return { aliceId: alice.id, bobId: bob.id };
  }

  it('queryFeedEvents denormalizes prospect info and sorts by last_seen DESC', async () => {
    await seedProspectsAndEvents();
    const page = await queryFeedEvents({});
    expect(page.total).toBe(3);
    expect(page.new_count).toBe(3);
    expect(page.rows.map((r) => r.slug)).toEqual(['alice', 'alice', 'bob']);
    expect(page.rows[0].prospect_name).toBe('Alice Example');
    expect(page.rows[0].prospect_level).toBe('2nd');
    expect(page.rows[2].prospect_level).toBe('3rd');
  });

  it('filters by task_statuses and event_kinds independently', async () => {
    const { aliceId } = await seedProspectsAndEvents();
    await updateFeedEventTaskStatus(
      (await queryFeedEvents({ prospect_id: aliceId })).rows[0].id,
      'done',
    );

    const onlyNew = await queryFeedEvents({ task_statuses: ['new'] });
    expect(onlyNew.total).toBe(2);

    const onlyDone = await queryFeedEvents({ task_statuses: ['done'] });
    expect(onlyDone.total).toBe(1);

    const onlyPosts = await queryFeedEvents({ event_kinds: ['post'] });
    expect(onlyPosts.total).toBe(2);
    expect(onlyPosts.rows.every((r) => r.event_kind === 'post')).toBe(true);
  });

  it('search matches against name / slug / headline / company case-insensitively', async () => {
    await seedProspectsAndEvents();
    const byName = await queryFeedEvents({ search: 'alice example' });
    expect(byName.total).toBe(2);

    const byHeadline = await queryFeedEvents({ search: 'ANGEL' });
    expect(byHeadline.total).toBe(1);
    expect(byHeadline.rows[0].slug).toBe('bob');

    const byCompany = await queryFeedEvents({ search: 'acme' });
    expect(byCompany.total).toBe(2);
  });

  it('new_count reflects store-wide unread count, not filtered set', async () => {
    const { aliceId } = await seedProspectsAndEvents();
    const alicePage = await queryFeedEvents({ prospect_id: aliceId });
    expect(alicePage.total).toBe(2);
    expect(alicePage.new_count).toBe(3);
  });

  it('updateFeedEventTaskStatus flips task_status and updateable fields', async () => {
    await seedProspectsAndEvents();
    const events = await queryFeedEvents({});
    const target = events.rows[0];
    const next = await updateFeedEventTaskStatus(target.id, 'queued');
    expect(next.task_status).toBe('queued');
    expect(next.id).toBe(target.id);

    const after = await queryFeedEvents({ task_statuses: ['queued'] });
    expect(after.total).toBe(1);
  });

  it('updateFeedEventTaskStatus throws for unknown id', async () => {
    await seedProspectsAndEvents();
    await expect(updateFeedEventTaskStatus(99999, 'done')).rejects.toThrow(
      /not found/,
    );
  });

  it('bulkUpdateFeedEventTaskStatus returns updated count and skips unknown ids', async () => {
    await seedProspectsAndEvents();
    const events = await queryFeedEvents({});
    const ids = events.rows.slice(0, 2).map((r) => r.id);
    ids.push(99999); // missing — must be skipped
    const updated = await bulkUpdateFeedEventTaskStatus(ids, 'ignored');
    expect(updated).toBe(2);
    const newCount = await countFeedEventsByTaskStatus('new');
    expect(newCount).toBe(1);
    const ignoredCount = await countFeedEventsByTaskStatus('ignored');
    expect(ignoredCount).toBe(2);
  });

  it('bulkUpdateFeedEventTaskStatus short-circuits for empty id list', async () => {
    await seedProspectsAndEvents();
    const updated = await bulkUpdateFeedEventTaskStatus([], 'done');
    expect(updated).toBe(0);
  });
});

describe('v2 — message_templates', () => {
  it('listMessageTemplates filters by kind; getActive returns latest unarchived', async () => {
    const now = Date.now();
    await addMessageTemplate({
      kind: 'connect_note',
      version: 1,
      name: 'v1',
      body: 'Hi {{first_name}}, noticed we share {{mutual_count}} connections.',
      archived: false,
      created_at: now,
      updated_at: now,
    });
    const v2Id = await addMessageTemplate({
      kind: 'connect_note',
      version: 2,
      name: 'v2',
      body: 'Hi {{first_name}}',
      archived: false,
      created_at: now + 1,
      updated_at: now + 1,
    });
    await addMessageTemplate({
      kind: 'first_message',
      version: 1,
      name: 'DM v1',
      body: 'Hello!',
      archived: false,
      created_at: now,
      updated_at: now,
    });

    const connects = await listMessageTemplates('connect_note');
    expect(connects).toHaveLength(2);
    expect(connects[0].version).toBe(2);

    const active = await getActiveMessageTemplate('connect_note');
    expect(active?.id).toBe(v2Id);

    // Archive v2 → v1 becomes active.
    await updateMessageTemplate(v2Id, { archived: true });
    const next = await getActiveMessageTemplate('connect_note');
    expect(next?.version).toBe(1);
  });
});

describe('v2 — daily_usage', () => {
  it('getDailyUsage returns zero-filled row when missing', async () => {
    const usage = await getDailyUsage('2026-04-22');
    expect(usage.day_bucket).toBe('2026-04-22');
    expect(usage.invites_sent).toBe(0);
    expect(usage.visits).toBe(0);
  });

  it('increments accumulate and clamp to zero', async () => {
    await incrementDailyUsage('2026-04-22', { invites_sent: 1, visits: 3 });
    await incrementDailyUsage('2026-04-22', { invites_sent: 2 });
    const usage = await getDailyUsage('2026-04-22');
    expect(usage.invites_sent).toBe(3);
    expect(usage.visits).toBe(3);

    // Negative delta larger than current → clamped to 0, not negative.
    const after = await incrementDailyUsage('2026-04-22', { invites_sent: -100 });
    expect(after.invites_sent).toBe(0);
    expect(after.visits).toBe(3);
  });
});

describe('v2 — requeueStaleSATierProspects (MASTER §19.4)', () => {
  // Helper: bulk-seed N prospects in a single `replaceAllProspects` call (which
  // wipes the table per call — must not be looped) and apply per-row patches.
  async function seedRows(
    rowsSpec: Array<{
      slug: string;
      tier: 'S' | 'A' | 'B' | 'C' | null;
      scanStatus: 'done' | 'pending' | 'in_progress' | 'failed';
      daysSinceScan: number | null;
    }>,
    now: number,
  ): Promise<number[]> {
    await replaceAllProspects(
      rowsSpec.map((spec) =>
        prospectInsertFromRawUrl(`https://linkedin.com/in/${spec.slug}`),
      ),
    );
    const db = await openScoutDb();
    const all = await db.getAll('prospects');
    // replaceAllProspects preserves insertion order; align by index.
    const ids: number[] = [];
    for (let i = 0; i < rowsSpec.length; i++) {
      const row = all[i];
      const spec = rowsSpec[i];
      await updateProspect(row.id, {
        tier: spec.tier,
        scan_status: spec.scanStatus,
        last_scanned:
          spec.daysSinceScan === null
            ? null
            : now - spec.daysSinceScan * 24 * 60 * 60 * 1000,
        scan_attempts: 2,
        scan_error: 'previous-error',
      });
      ids.push(row.id);
    }
    return ids;
  }

  it('flips done S/A-tier rows scanned > 30d ago back to pending', async () => {
    const now = Date.UTC(2026, 4, 1, 12, 0, 0);
    // Seed three rows in one bulk insert so we keep IDs predictable.
    await replaceAllProspects([
      prospectInsertFromRawUrl('https://linkedin.com/in/stale-s'),
      prospectInsertFromRawUrl('https://linkedin.com/in/stale-a'),
      prospectInsertFromRawUrl('https://linkedin.com/in/fresh-s'),
      prospectInsertFromRawUrl('https://linkedin.com/in/stale-b'),
      prospectInsertFromRawUrl('https://linkedin.com/in/stale-s-pending'),
    ]);
    const db = await openScoutDb();
    const rows = await db.getAll('prospects');
    const [staleS, staleA, freshS, staleB, staleSPending] = rows;
    const day = 24 * 60 * 60 * 1000;
    await updateProspect(staleS.id, {
      tier: 'S',
      scan_status: 'done',
      last_scanned: now - 31 * day,
      scan_attempts: 2,
      scan_error: 'old-err',
    });
    await updateProspect(staleA.id, {
      tier: 'A',
      scan_status: 'done',
      last_scanned: now - 45 * day,
    });
    await updateProspect(freshS.id, {
      tier: 'S',
      scan_status: 'done',
      last_scanned: now - 5 * day,
    });
    await updateProspect(staleB.id, {
      tier: 'B',
      scan_status: 'done',
      last_scanned: now - 90 * day,
    });
    // S-tier but currently pending — must NOT be touched (already in queue).
    await updateProspect(staleSPending.id, {
      tier: 'S',
      scan_status: 'pending',
      last_scanned: now - 60 * day,
    });

    const flipped = await requeueStaleSATierProspects(30, now);
    expect(flipped).toBe(2);

    const after = await db.getAll('prospects');
    const byId = new Map(after.map((r) => [r.id, r]));
    expect(byId.get(staleS.id)!.scan_status).toBe('pending');
    expect(byId.get(staleS.id)!.scan_attempts).toBe(0);
    expect(byId.get(staleS.id)!.scan_error).toBeNull();
    expect(byId.get(staleA.id)!.scan_status).toBe('pending');
    expect(byId.get(freshS.id)!.scan_status).toBe('done'); // not stale
    expect(byId.get(staleB.id)!.scan_status).toBe('done'); // wrong tier
    expect(byId.get(staleSPending.id)!.scan_status).toBe('pending'); // already pending
  });

  it('skips rows with null tier or null last_scanned', async () => {
    const now = Date.UTC(2026, 4, 1, 12, 0, 0);
    const [untieredId, neverScannedId] = await seedRows(
      [
        {
          slug: 'untiered',
          tier: null,
          scanStatus: 'done',
          daysSinceScan: 90,
        },
        {
          slug: 'never-scanned',
          tier: 'S',
          scanStatus: 'done',
          daysSinceScan: null,
        },
      ],
      now,
    );
    expect(await requeueStaleSATierProspects(30, now)).toBe(0);
    const db = await openScoutDb();
    expect((await db.get('prospects', untieredId))!.scan_status).toBe('done');
    expect((await db.get('prospects', neverScannedId))!.scan_status).toBe('done');
  });

  it('returns 0 for non-positive or non-finite stale windows', async () => {
    const now = Date.UTC(2026, 4, 1, 12, 0, 0);
    await seedRows(
      [
        {
          slug: 'old-s',
          tier: 'S',
          scanStatus: 'done',
          daysSinceScan: 365,
        },
      ],
      now,
    );
    expect(await requeueStaleSATierProspects(0, now)).toBe(0);
    expect(await requeueStaleSATierProspects(-1, now)).toBe(0);
    expect(await requeueStaleSATierProspects(NaN, now)).toBe(0);
  });
});

describe('v2 — clearAllData behavior', () => {
  it('nukes derived stores but keeps settings + templates', async () => {
    // Seed everything.
    await replaceAllProspects([prospectInsertFromRawUrl('https://linkedin.com/in/alice')]);
    await addOutreachAction({
      prospect_id: 1,
      kind: 'profile_visit',
      state: 'sent',
      idempotency_key: 'k-clear',
      template_id: null,
      template_version: null,
      rendered_body: null,
      source_feed_event_id: null,
      created_at: Date.now(),
      approved_at: null,
      sent_at: Date.now(),
      resolved_at: null,
      notes: null,
    });
    await incrementDailyUsage('2026-04-22', { visits: 1 });
    await addMessageTemplate({
      kind: 'connect_note',
      version: 1,
      name: 'keep-me',
      body: 'persist',
      archived: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    // Touch settings so there's a non-default row.
    await putSettings({ outreach: { caps: { daily_invites: 12 } } });

    await clearAllData();

    expect(await listOutreachActionsForProspect(1)).toHaveLength(0);
    expect((await getDailyUsage('2026-04-22')).visits).toBe(0);
    // Settings survive — user-owned config.
    const settings = await getSettings();
    expect(settings.outreach.caps.daily_invites).toBe(12);
    // Templates survive — user-owned content.
    expect(await listMessageTemplates()).toHaveLength(1);
  });
});
