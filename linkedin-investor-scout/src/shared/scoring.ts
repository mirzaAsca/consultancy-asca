import { SCORE_WEIGHTS } from './constants';
import type {
  FeedEventKind,
  OutreachFirm,
  OutreachKeyword,
  OutreachSettings,
  Prospect,
  ProspectScoreBreakdown,
  ProspectTier,
  TierThresholds,
} from './types';

/**
 * Inputs the scoring engine needs that live outside the `Prospect` row itself.
 * The caller is responsible for resolving these before calling `scoreProspect`.
 */
export interface ScoringContext {
  /**
   * Latest `last_seen_at` across the prospect's feed events, used for the
   * recency signal. `null` when we've never seen a feed event.
   */
  last_feed_event_at: number | null;
  /** Current epoch ms — injectable for deterministic tests. */
  now: number;
}

export interface ProspectScoreResult {
  score: number;
  tier: ProspectTier;
  breakdown: ProspectScoreBreakdown;
  /** True iff this prospect is excluded from the outreach queue entirely. */
  skip: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function emptyBreakdown(): ProspectScoreBreakdown {
  return {
    level: 0,
    keyword: 0,
    firm: 0,
    mutuals: 0,
    recency: 0,
    cooldown: 0,
    recent_unlock: 0,
    total: 0,
  };
}

function levelScore(level: Prospect['level']): number {
  switch (level) {
    case '2nd':
      return SCORE_WEIGHTS.level_2nd;
    case '3rd':
      return SCORE_WEIGHTS.level_3rd;
    case 'OUT_OF_NETWORK':
      return SCORE_WEIGHTS.level_out_of_network;
    // '1st' is excluded before we reach this helper; 'NONE' scores 0 (not yet scanned).
    case '1st':
    case 'NONE':
    default:
      return 0;
  }
}

function maxMatchingKeywordWeight(
  headline: string | null,
  keywords: OutreachKeyword[],
): number {
  if (!headline || keywords.length === 0) return 0;
  const needle = headline.toLowerCase();
  let best = 0;
  for (const kw of keywords) {
    if (!kw.term) continue;
    if (needle.includes(kw.term.toLowerCase()) && kw.weight > best) {
      best = kw.weight;
    }
  }
  return best;
}

function maxMatchingFirmWeight(
  company: string | null,
  firms: OutreachFirm[],
): number {
  if (!company || firms.length === 0) return 0;
  const needle = company.toLowerCase();
  let best = 0;
  for (const f of firms) {
    if (!f.name) continue;
    if (needle.includes(f.name.toLowerCase()) && f.weight > best) {
      best = f.weight;
    }
  }
  return best;
}

function mutualsScore(mutualCount: number | null): number {
  const n = mutualCount ?? 0;
  if (n <= 0) return 0;
  // min(15, round(5 * log2(1 + n))) — caps at 7+ mutuals in practice.
  return Math.min(SCORE_WEIGHTS.mutuals_cap, Math.round(5 * Math.log2(1 + n)));
}

function recencyScore(
  lastFeedEventAt: number | null,
  now: number,
): number {
  if (lastFeedEventAt === null) return 0;
  const daysSince = Math.max(0, (now - lastFeedEventAt) / MS_PER_DAY);
  return Math.round(
    SCORE_WEIGHTS.recency_max *
      Math.exp(-daysSince / SCORE_WEIGHTS.recency_half_life_days),
  );
}

function cooldownScore(
  lastOutreachAt: number | null,
  now: number,
): number {
  if (lastOutreachAt === null) return 0;
  const days = (now - lastOutreachAt) / MS_PER_DAY;
  return days < SCORE_WEIGHTS.cooldown_days ? SCORE_WEIGHTS.cooldown_penalty : 0;
}

/**
 * Phase 3.3 "newly unlocked 2nd-degree" bonus. Only fires for 2nd-degree rows
 * whose `last_level_change_at` falls inside the unlock window — 3rd / OOON
 * transitions aren't actionable outreach yet, and the caller already biases
 * the queue toward newer rows via `last_outreach_at ASC`. The bonus is flat
 * (not decayed) so the tier promotion is crisp: either the row is hot-off-
 * the-unlock-press or it isn't.
 */
function recentUnlockScore(
  level: Prospect['level'],
  lastLevelChangeAt: number | null,
  now: number,
): number {
  return isRecentlyUnlocked(level, lastLevelChangeAt, now)
    ? SCORE_WEIGHTS.recent_unlock_boost
    : 0;
}

/**
 * Predicate mirror of `recentUnlockScore` — true when a 2nd-degree prospect's
 * level transition lands inside `SCORE_WEIGHTS.recent_unlock_days`. UI surfaces
 * a "Newly unlocked" badge based on this so the +25 scoring boost is visible
 * to the user, not just hidden inside the tier bump.
 */
export function isRecentlyUnlocked(
  level: Prospect['level'],
  lastLevelChangeAt: number | null | undefined,
  now: number,
): boolean {
  if (level !== '2nd') return false;
  if (lastLevelChangeAt == null || !Number.isFinite(lastLevelChangeAt)) {
    return false;
  }
  const days = (now - lastLevelChangeAt) / MS_PER_DAY;
  return days >= 0 && days <= SCORE_WEIGHTS.recent_unlock_days;
}

/**
 * Map a total score to a tier bucket using inclusive-lower-bound thresholds.
 *
 * Defaults: **S ≥ 140, A ≥ 100, B ≥ 60, C ≥ 30, skip < 30**. The thresholds
 * live in Settings so the user can re-calibrate without a code change.
 */
export function tierForScore(
  score: number,
  thresholds: TierThresholds,
): ProspectTier {
  if (score >= thresholds.S) return 'S';
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  if (score >= thresholds.C) return 'C';
  return 'skip';
}

/**
 * Deterministic outreach score for a single prospect (Phase 1.2).
 *
 * Inputs, weighting, and rationale are documented in
 * `linkedin-investor-scout/EXTENSION_GROWTH_TODO.md` Phase 1.2 and frozen as
 * constants in `SCORE_WEIGHTS`. Pure function — re-run on scan completion,
 * feed-event ingestion, outreach resolution, and keyword/firm list edits.
 *
 * 1st-degree prospects are excluded from the queue (already connected).
 */
export function scoreProspect(
  prospect: Pick<
    Prospect,
    | 'level'
    | 'headline'
    | 'company'
    | 'mutual_count'
    | 'last_outreach_at'
    | 'last_level_change_at'
  >,
  outreach: Pick<OutreachSettings, 'keywords' | 'firms' | 'tier_thresholds'>,
  context: ScoringContext,
): ProspectScoreResult {
  if (prospect.level === '1st') {
    return {
      score: 0,
      tier: 'skip',
      breakdown: emptyBreakdown(),
      skip: true,
    };
  }
  const level = levelScore(prospect.level);
  const keyword = maxMatchingKeywordWeight(prospect.headline, outreach.keywords);
  const firm = maxMatchingFirmWeight(prospect.company, outreach.firms);
  const mutuals = mutualsScore(prospect.mutual_count);
  const recency = recencyScore(context.last_feed_event_at, context.now);
  const cooldown = cooldownScore(prospect.last_outreach_at, context.now);
  const recent_unlock = recentUnlockScore(
    prospect.level,
    prospect.last_level_change_at,
    context.now,
  );
  const total = level + keyword + firm + mutuals + recency + cooldown + recent_unlock;

  const breakdown: ProspectScoreBreakdown = {
    level,
    keyword,
    firm,
    mutuals,
    recency,
    cooldown,
    recent_unlock,
    total,
  };
  const tier = tierForScore(total, outreach.tier_thresholds);
  return { score: total, tier, breakdown, skip: tier === 'skip' };
}

// ———————————————————————————————————————————————————————————
// Feed event fingerprint
// ———————————————————————————————————————————————————————————

/**
 * 64-bit FNV-1a hash over the dedup payload. Returns a 16-char lowercase hex
 * string.
 *
 * The v2 plan names "sha1" as the fingerprint algorithm; FNV-1a is substituted
 * because (1) it's synchronous, so content-script batches don't pay an
 * `await crypto.subtle.digest` per event, and (2) collision resistance at our
 * scale — ~O(10^4) events/day in a single local IndexedDB — is well within
 * FNV-1a's comfort zone. Dedup, not security.
 */
function fnv1a64Hex(input: string): string {
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash ^ BigInt(input.charCodeAt(i))) * FNV_PRIME) & MASK;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Stable dedup key for a feed event. Same prospect + kind + activity URN +
 * comment URN (if any) always collapses to the same fingerprint — whether
 * observed in the Top or Recent feed, in full-page or drawer, across multiple
 * scroll passes.
 */
export function computeFeedEventFingerprint(parts: {
  prospect_id: number;
  event_kind: FeedEventKind;
  activity_urn: string | null;
  comment_urn: string | null;
}): string {
  const payload = [
    parts.prospect_id,
    parts.event_kind,
    parts.activity_urn ?? '',
    parts.comment_urn ?? '',
  ].join('|');
  return fnv1a64Hex(payload);
}
