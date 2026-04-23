import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  bulkAddProspectsInChunks,
  deleteScoutDatabase,
  getAllProspects,
  getProspectById,
  openScoutDb,
  prospectInsertFromRawUrl,
  putSettings,
  takePendingProspectsBatch,
  updateProspect,
  upsertFeedEventsBulk,
} from '@/shared/db';
import {
  computeProspectScorePatch,
  getLastFeedEventAtByProspect,
  recomputeAllProspects,
  recomputeAndPersistProspect,
  recomputeProspectsByIds,
} from '@/shared/prospect-scoring';
import { computeFeedEventFingerprint } from '@/shared/scoring';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import type {
  FeedEventInsert,
  OutreachKeyword,
  Prospect,
} from '@/shared/types';

beforeEach(async () => {
  await deleteScoutDatabase();
});

async function seed(urls: string[]): Promise<Prospect[]> {
  await openScoutDb();
  await bulkAddProspectsInChunks(urls.map(prospectInsertFromRawUrl));
  return getAllProspects();
}

function withLevel(id: number, level: Prospect['level']) {
  return updateProspect(id, { level });
}

function feedEvent(prospectId: number, seenAt: number, kind: string): FeedEventInsert {
  return {
    prospect_id: prospectId,
    slug: `slug-${prospectId}-${kind}`,
    event_kind: kind as FeedEventInsert['event_kind'],
    post_kind: 'activity',
    post_url: `https://www.linkedin.com/feed/update/urn:li:activity:${prospectId}${kind}/`,
    comment_url: null,
    activity_urn: `urn:li:activity:${prospectId}${kind}`,
    comment_urn: null,
    feed_mode: 'top',
    event_fingerprint: computeFeedEventFingerprint({
      prospect_id: prospectId,
      event_kind: kind as FeedEventInsert['event_kind'],
      activity_urn: `urn:li:activity:${prospectId}${kind}`,
      comment_urn: null,
    }),
    first_seen_at: seenAt,
    last_seen_at: seenAt,
    seen_count: 1,
    task_status: 'new',
  };
}

describe('prospect-scoring orchestration', () => {
  it('computeProspectScorePatch uses the pure scoring formula', () => {
    const prospect = {
      level: '2nd',
      headline: 'Partner at Acme Ventures',
      company: 'Acme Ventures',
      mutual_count: 4,
      last_outreach_at: null,
    } as Prospect;
    const patch = computeProspectScorePatch(
      prospect,
      DEFAULT_SETTINGS,
      null,
      Date.now(),
    );
    // level(2nd)=100 baseline; no keywords/firms configured
    expect(patch.priority_score).toBe(100 + Math.round(5 * Math.log2(1 + 4)));
    expect(patch.tier).toBe('A'); // 100..139 → A
    expect(patch.score_breakdown.level).toBe(100);
  });

  it('recomputeAndPersistProspect writes score + tier on a fresh row', async () => {
    const rows = await seed(['https://linkedin.com/in/p1']);
    await withLevel(rows[0].id, '2nd');
    const next = await recomputeAndPersistProspect(rows[0].id);
    expect(next).not.toBeNull();
    expect(next?.priority_score).toBe(100);
    expect(next?.tier).toBe('A');
    expect(next?.score_breakdown?.level).toBe(100);
  });

  it('recomputeAndPersistProspect is a no-op when score is unchanged', async () => {
    const rows = await seed(['https://linkedin.com/in/p1']);
    await withLevel(rows[0].id, '2nd');
    const first = await recomputeAndPersistProspect(rows[0].id);
    const touchedAt = first?.updated_at;
    // Second call with identical inputs must keep updated_at stable.
    await new Promise((r) => setTimeout(r, 5));
    await recomputeAndPersistProspect(rows[0].id);
    const row = await getProspectById(rows[0].id);
    expect(row?.updated_at).toBe(touchedAt);
  });

  it('recomputeProspectsByIds picks up feed-event recency signal', async () => {
    const rows = await seed([
      'https://linkedin.com/in/p1',
      'https://linkedin.com/in/p2',
    ]);
    await withLevel(rows[0].id, '2nd');
    await withLevel(rows[1].id, '2nd');

    const now = Date.now();
    const recent = now - 1 * 24 * 60 * 60 * 1000; // 1 day ago
    await upsertFeedEventsBulk([
      feedEvent(rows[0].id, recent, 'post'),
    ]);

    const { updated } = await recomputeProspectsByIds([rows[0].id, rows[1].id], {
      now,
    });
    expect(updated).toBe(2);

    const p1 = await getProspectById(rows[0].id);
    const p2 = await getProspectById(rows[1].id);
    expect(p1).toBeTruthy();
    expect(p2).toBeTruthy();
    // p1 has a feed event 1d old → positive recency, higher score than p2.
    expect(p1!.priority_score!).toBeGreaterThan(p2!.priority_score!);
    expect(p1!.score_breakdown!.recency).toBeGreaterThan(0);
    expect(p2!.score_breakdown!.recency).toBe(0);
  });

  it('recomputeAllProspects rescore on keyword list change lifts matching rows', async () => {
    const rows = await seed([
      'https://linkedin.com/in/match',
      'https://linkedin.com/in/miss',
    ]);
    await updateProspect(rows[0].id, {
      level: '2nd',
      headline: 'Partner at SeedCo',
    });
    await updateProspect(rows[1].id, {
      level: '2nd',
      headline: 'Engineer at SeedCo',
    });
    await recomputeAllProspects();
    const before = await Promise.all([
      getProspectById(rows[0].id),
      getProspectById(rows[1].id),
    ]);
    expect(before[0]!.priority_score).toBe(before[1]!.priority_score);

    // Add a 'partner' keyword worth +40.
    const kw: OutreachKeyword = { term: 'Partner', weight: 40, kind: 'strong' };
    await putSettings({ outreach: { keywords: [kw] } });
    const result = await recomputeAllProspects();
    expect(result.updated).toBe(1);

    const after = await Promise.all([
      getProspectById(rows[0].id),
      getProspectById(rows[1].id),
    ]);
    expect(after[0]!.priority_score).toBe(after[1]!.priority_score! + 40);
    expect(after[0]!.tier).toBe('S'); // 140 crosses the S threshold (≥140).
  });

  it('getLastFeedEventAtByProspect builds per-prospect max last_seen_at', async () => {
    const rows = await seed([
      'https://linkedin.com/in/p1',
      'https://linkedin.com/in/p2',
    ]);
    const t0 = 1_800_000_000_000;
    await upsertFeedEventsBulk([
      feedEvent(rows[0].id, t0, 'post'),
      feedEvent(rows[0].id, t0 + 1_000, 'comment'),
      feedEvent(rows[1].id, t0 + 500, 'post'),
    ]);
    const map = await getLastFeedEventAtByProspect();
    expect(map.get(rows[0].id)).toBe(t0 + 1_000);
    expect(map.get(rows[1].id)).toBe(t0 + 500);
  });
});

describe('takePendingProspectsBatch v2 ordering', () => {
  it('preserves insertion order when no tier / score set (v1 parity)', async () => {
    await bulkAddProspectsInChunks([
      prospectInsertFromRawUrl('https://linkedin.com/in/a'),
      prospectInsertFromRawUrl('https://linkedin.com/in/b'),
      prospectInsertFromRawUrl('https://linkedin.com/in/c'),
    ]);
    const batch = await takePendingProspectsBatch(10);
    expect(batch.map((r) => r.url)).toEqual([
      'https://www.linkedin.com/in/a/',
      'https://www.linkedin.com/in/b/',
      'https://www.linkedin.com/in/c/',
    ]);
  });

  it('sorts tier DESC, score DESC, last_scanned ASC NULLS FIRST', async () => {
    await bulkAddProspectsInChunks([
      prospectInsertFromRawUrl('https://linkedin.com/in/b-tier'),
      prospectInsertFromRawUrl('https://linkedin.com/in/s-tier-fresh'),
      prospectInsertFromRawUrl('https://linkedin.com/in/s-tier-stale'),
      prospectInsertFromRawUrl('https://linkedin.com/in/a-tier'),
      prospectInsertFromRawUrl('https://linkedin.com/in/unscanned-c'),
    ]);
    const all = await getAllProspects();
    const byUrl = (u: string) => all.find((r) => r.url === u)!;
    const bTier = byUrl('https://www.linkedin.com/in/b-tier/');
    const sFresh = byUrl('https://www.linkedin.com/in/s-tier-fresh/');
    const sStale = byUrl('https://www.linkedin.com/in/s-tier-stale/');
    const aTier = byUrl('https://www.linkedin.com/in/a-tier/');
    const unscannedC = byUrl('https://www.linkedin.com/in/unscanned-c/');

    const now = 1_800_000_000_000;
    await updateProspect(bTier.id, {
      tier: 'B',
      priority_score: 80,
      last_scanned: now - 10_000,
    });
    await updateProspect(sFresh.id, {
      tier: 'S',
      priority_score: 150,
      last_scanned: now - 1_000,
    });
    await updateProspect(sStale.id, {
      tier: 'S',
      priority_score: 150,
      last_scanned: now - 100_000,
    });
    await updateProspect(aTier.id, {
      tier: 'A',
      priority_score: 120,
      last_scanned: now - 5_000,
    });
    await updateProspect(unscannedC.id, {
      tier: 'C',
      priority_score: 40,
      last_scanned: null,
    });

    const batch = await takePendingProspectsBatch(10);
    // Expected order:
    //   1. S-tier stale (tier S, score 150, oldest last_scanned)
    //   2. S-tier fresh (tier S, score 150, newer last_scanned)
    //   3. A-tier
    //   4. B-tier
    //   5. Unscanned C (tier C, null last_scanned is FIRST within tier bucket —
    //      but it sits below B because tier DESC rules first)
    expect(batch.map((r) => r.url)).toEqual([
      'https://www.linkedin.com/in/s-tier-stale/',
      'https://www.linkedin.com/in/s-tier-fresh/',
      'https://www.linkedin.com/in/a-tier/',
      'https://www.linkedin.com/in/b-tier/',
      'https://www.linkedin.com/in/unscanned-c/',
    ]);
  });

  it('within the same tier+score bucket, null last_scanned sorts first', async () => {
    await bulkAddProspectsInChunks([
      prospectInsertFromRawUrl('https://linkedin.com/in/scanned'),
      prospectInsertFromRawUrl('https://linkedin.com/in/unscanned'),
    ]);
    const all = await getAllProspects();
    const scanned = all.find((r) => r.url.endsWith('scanned/'))!;
    const unscanned = all.find((r) => r.url.endsWith('unscanned/'))!;
    await updateProspect(scanned.id, {
      tier: 'A',
      priority_score: 120,
      last_scanned: Date.now() - 10_000,
    });
    await updateProspect(unscanned.id, {
      tier: 'A',
      priority_score: 120,
      last_scanned: null,
    });

    const batch = await takePendingProspectsBatch(10);
    expect(batch[0].url).toBe('https://www.linkedin.com/in/unscanned/');
    expect(batch[1].url).toBe('https://www.linkedin.com/in/scanned/');
  });
});
