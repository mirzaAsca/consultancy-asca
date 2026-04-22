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
  replaceAllProspects,
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
  it('opens at DB_VERSION=2 with all v2 stores present', async () => {
    const db = await openScoutDb();
    expect(db.version).toBe(DB_VERSION);
    const names = Array.from(db.objectStoreNames).sort();
    expect(names).toEqual(
      [
        'activity_log',
        'daily_usage',
        'feed_events',
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
