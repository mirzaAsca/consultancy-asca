import { openScoutDb, getSettings } from './db';
import { scoreProspect } from './scoring';
import type {
  Prospect,
  ProspectScoreBreakdown,
  ProspectTier,
  Settings,
} from './types';

/**
 * DB-aware orchestration around the pure {@link scoreProspect} helper.
 *
 * The scoring formula itself is frozen in `scoring.ts` (pure, unit-tested).
 * This module provides the wrappers that read prospects + feed events from
 * IndexedDB, recompute the score, and persist the `priority_score` / `tier` /
 * `score_breakdown` fields on the prospect row.
 *
 * Recompute triggers (Phase 1.2):
 * - scan completion → {@link recomputeAndPersistProspect}
 * - feed-event ingestion → {@link recomputeProspectsByIds}
 * - outreach settings change (keywords / firms / thresholds) → {@link recomputeAllProspects}
 */

export interface ProspectScorePatch {
  priority_score: number;
  tier: ProspectTier;
  score_breakdown: ProspectScoreBreakdown;
}

/**
 * Build a `prospect_id → max(last_seen_at)` map in a single cursor walk over
 * feed_events. Cheaper than per-prospect lookups when recomputing in bulk.
 */
export async function getLastFeedEventAtByProspect(): Promise<Map<number, number>> {
  const db = await openScoutDb();
  const tx = db.transaction('feed_events', 'readonly');
  const out = new Map<number, number>();
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const { prospect_id, last_seen_at } = cursor.value;
    const prev = out.get(prospect_id);
    if (prev === undefined || last_seen_at > prev) {
      out.set(prospect_id, last_seen_at);
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return out;
}

async function getLatestFeedEventAtForProspect(
  prospectId: number,
): Promise<number | null> {
  const db = await openScoutDb();
  const rows = await db.getAllFromIndex(
    'feed_events',
    'by_prospect_id',
    prospectId,
  );
  let max = 0;
  for (const row of rows) {
    if (row.last_seen_at > max) max = row.last_seen_at;
  }
  return max > 0 ? max : null;
}

export function computeProspectScorePatch(
  prospect: Prospect,
  settings: Settings,
  lastFeedEventAt: number | null,
  now: number,
): ProspectScorePatch {
  const r = scoreProspect(
    prospect,
    {
      keywords: settings.outreach.keywords,
      firms: settings.outreach.firms,
      tier_thresholds: settings.outreach.tier_thresholds,
    },
    { last_feed_event_at: lastFeedEventAt, now },
  );
  return {
    priority_score: r.score,
    tier: r.tier,
    score_breakdown: r.breakdown,
  };
}

function isScoreUnchanged(row: Prospect, patch: ProspectScorePatch): boolean {
  return (
    row.priority_score === patch.priority_score &&
    row.tier === patch.tier &&
    row.score_breakdown?.total === patch.score_breakdown.total
  );
}

/**
 * Recompute + persist for one prospect. No-ops if score/tier are unchanged.
 * Returns the (possibly new) row, or `null` if the prospect has been deleted.
 */
export async function recomputeAndPersistProspect(
  prospectId: number,
  opts: { settings?: Settings; now?: number } = {},
): Promise<Prospect | null> {
  const db = await openScoutDb();
  const row = await db.get('prospects', prospectId);
  if (!row) return null;
  const now = opts.now ?? Date.now();
  const settings = opts.settings ?? (await getSettings());
  const lastFeedAt = await getLatestFeedEventAtForProspect(prospectId);
  const patch = computeProspectScorePatch(row, settings, lastFeedAt, now);
  if (isScoreUnchanged(row, patch)) return row;
  const next: Prospect = {
    ...row,
    ...patch,
    updated_at: Date.now(),
  };
  await db.put('prospects', next);
  return next;
}

/**
 * Recompute a specific set of prospect ids in one read-write transaction over
 * the prospects store. Uses a single feed-event pass to build the recency map
 * so N prospect updates cost one feed-events cursor walk instead of N lookups.
 */
export async function recomputeProspectsByIds(
  ids: number[],
  opts: { settings?: Settings; now?: number } = {},
): Promise<{ updated: number; skipped: number; changed_ids: number[] }> {
  if (ids.length === 0) return { updated: 0, skipped: 0, changed_ids: [] };
  const settings = opts.settings ?? (await getSettings());
  const now = opts.now ?? Date.now();
  const lastFeedAtMap = await getLastFeedEventAtByProspect();
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  const changed: number[] = [];
  let updated = 0;
  let skipped = 0;
  for (const id of ids) {
    const row = await tx.store.get(id);
    if (!row) {
      skipped++;
      continue;
    }
    const lastFeedAt = lastFeedAtMap.get(id) ?? null;
    const patch = computeProspectScorePatch(row, settings, lastFeedAt, now);
    if (isScoreUnchanged(row, patch)) {
      skipped++;
      continue;
    }
    await tx.store.put({ ...row, ...patch, updated_at: Date.now() });
    updated++;
    changed.push(id);
  }
  await tx.done;
  return { updated, skipped, changed_ids: changed };
}

/**
 * Full rescore — triggered by keyword/firm/tier-threshold edits and by the
 * v1→v2 migration follow-up pass. One transaction, one feed-event cursor walk.
 */
export async function recomputeAllProspects(
  opts: { settings?: Settings; now?: number } = {},
): Promise<{ updated: number; skipped: number }> {
  const settings = opts.settings ?? (await getSettings());
  const now = opts.now ?? Date.now();
  const lastFeedAtMap = await getLastFeedEventAtByProspect();
  const db = await openScoutDb();
  const tx = db.transaction('prospects', 'readwrite');
  let updated = 0;
  let skipped = 0;
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const row = cursor.value;
    const lastFeedAt = lastFeedAtMap.get(row.id) ?? null;
    const patch = computeProspectScorePatch(row, settings, lastFeedAt, now);
    if (isScoreUnchanged(row, patch)) {
      skipped++;
    } else {
      await cursor.update({ ...row, ...patch, updated_at: Date.now() });
      updated++;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return { updated, skipped };
}
