/**
 * Outreach queue — Phase 1.3 (Mode A only).
 *
 * Pure helpers that decide which prospects are ready for the next outreach
 * step. The DB layer feeds these functions raw rows; callers in the
 * background service worker layer the I/O on top (see `queryOutreachQueue`).
 *
 * Invariants enforced here:
 *  - 1st-degree prospects are filtered out (already connected).
 *  - `skip` / null tier is excluded unless the caller explicitly opts in.
 *  - No prospect gets two live actions of the same kind on the same day.
 *  - Budget caps (daily + weekly) bound what `next_best` surfaces — rows
 *    still appear in the list so the user can see the pipeline.
 */

import type {
  DailyUsage,
  OutreachAction,
  OutreachActionKind,
  OutreachActionState,
  OutreachCaps,
  OutreachQueueCandidate,
  OutreachQueueFilter,
  Prospect,
  ProspectLevel,
  ProspectTier,
} from './types';

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

/** Outreach-queue rank: tier DESC, priority_score DESC, last_outreach_at ASC NULLS FIRST. */
export function compareQueueOrder(
  a: Pick<Prospect, 'tier' | 'priority_score' | 'last_outreach_at' | 'id'>,
  b: Pick<Prospect, 'tier' | 'priority_score' | 'last_outreach_at' | 'id'>,
): number {
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

  const la = a.last_outreach_at;
  const lb = b.last_outreach_at;
  if (la === null && lb !== null) return -1;
  if (lb === null && la !== null) return 1;
  if (la !== null && lb !== null && la !== lb) return la - lb;

  return a.id - b.id;
}

/** An outreach action is "live" if we're still waiting on it to resolve. */
const LIVE_STATES: ReadonlySet<OutreachActionState> = new Set([
  'draft',
  'approved',
  'sent',
  'needs_review',
]);

export function isActionLive(action: OutreachAction): boolean {
  return LIVE_STATES.has(action.state);
}

export interface RecommendationOptions {
  /** If true, the user has `warm_visit_before_invite` turned on in Settings. */
  warm_visit_before_invite: boolean;
}

/**
 * Decide which action to surface next for a prospect. Rules (in order):
 *  - 2nd/3rd/OOO with no prior `profile_visit` + warming enabled → `profile_visit`.
 *  - 2nd/3rd/OOO with no pending invite → `connection_request_sent`.
 *  - 1st connected recently → `message_sent`.
 *  - 1st messaged 7+ days ago with no followup → `followup_message_sent`.
 *  - Everything else → null (no recommendation).
 */
export function recommendAction(
  prospect: Pick<Prospect, 'level' | 'lifecycle_status'>,
  history: readonly OutreachAction[],
  opts: RecommendationOptions,
): OutreachActionKind | null {
  const live = history.filter(isActionLive);
  const hasLive = (k: OutreachActionKind) => live.some((a) => a.kind === k);
  const anyOf = (k: OutreachActionKind) => history.some((a) => a.kind === k);

  if (prospect.lifecycle_status === 'do_not_contact') return null;
  if (prospect.level === 'NONE') return null;

  if (prospect.level === '2nd' || prospect.level === '3rd' || prospect.level === 'OUT_OF_NETWORK') {
    if (hasLive('connection_request_sent')) return null; // waiting on acceptance
    if (opts.warm_visit_before_invite && !anyOf('profile_visit')) {
      return 'profile_visit';
    }
    return 'connection_request_sent';
  }

  if (prospect.level === '1st') {
    if (!anyOf('message_sent')) return 'message_sent';
    if (prospect.lifecycle_status === 'followup_due' && !hasLive('followup_message_sent')) {
      return 'followup_message_sent';
    }
    return null;
  }

  return null;
}

/** Short badge-style reason string rendered alongside each queue row. */
export function buildReason(
  prospect: Pick<Prospect, 'level' | 'tier'>,
  action: OutreachActionKind,
): string {
  const tier = prospect.tier ? `${prospect.tier}-tier` : 'unscored';
  switch (action) {
    case 'profile_visit':
      return `Warm ${prospect.level} · ${tier}`;
    case 'connection_request_sent':
      return `Connect ${prospect.level} · ${tier}`;
    case 'message_sent':
      return `DM 1st · ${tier}`;
    case 'followup_message_sent':
      return `Follow-up · ${tier}`;
  }
}

/** Has the daily / weekly budget for this action been exhausted? */
export function isActionOverBudget(
  action: OutreachActionKind,
  caps: OutreachCaps,
  usage: DailyUsage,
  weeklyInvitesUsed: number,
): boolean {
  switch (action) {
    case 'profile_visit':
      return usage.visits >= caps.daily_visits;
    case 'connection_request_sent':
      if (usage.invites_sent >= caps.daily_invites) return true;
      if (weeklyInvitesUsed >= caps.weekly_invites) return true;
      // Shared bucket: invite also counts as a visit.
      if (caps.shared_bucket && usage.visits >= caps.daily_visits) return true;
      return false;
    case 'message_sent':
    case 'followup_message_sent':
      return usage.messages_sent >= caps.daily_messages;
  }
}

export interface FilterOptions {
  filter: OutreachQueueFilter;
  skippedProspectIds: ReadonlySet<number>;
  warm_visit_before_invite: boolean;
}

/** Default levels surfaced when no explicit filter is provided. */
const DEFAULT_LEVELS: ReadonlyArray<ProspectLevel> = ['2nd', '3rd', 'OUT_OF_NETWORK'];

/** Default tiers surfaced when no explicit filter is provided. */
const DEFAULT_TIERS: ReadonlyArray<ProspectTier> = ['S', 'A', 'B', 'C'];

/**
 * Produce the full list of queue candidates for a set of prospect rows and
 * their per-prospect outreach-action history. Pure — pass everything in.
 *
 * `skippedProspectIds` are excluded unless `filter.include_skipped` is true
 * (in which case the `skipped_today` flag is set on the returned row so the
 * UI can indicate it).
 */
export function buildCandidates(
  prospects: readonly Prospect[],
  actionsByProspect: ReadonlyMap<number, OutreachAction[]>,
  opts: FilterOptions,
): OutreachQueueCandidate[] {
  const { filter, skippedProspectIds, warm_visit_before_invite } = opts;

  const levelSet = new Set<ProspectLevel>(
    filter.levels && filter.levels.length > 0 ? filter.levels : DEFAULT_LEVELS,
  );
  const tierFilter = filter.tiers && filter.tiers.length > 0 ? filter.tiers : null;
  const tierSet = tierFilter
    ? new Set<ProspectTier>(tierFilter)
    : new Set<ProspectTier>(DEFAULT_TIERS);
  const actionSet =
    filter.actions && filter.actions.length > 0
      ? new Set<OutreachActionKind>(filter.actions)
      : null;
  const lifecycleSet =
    filter.lifecycle_statuses && filter.lifecycle_statuses.length > 0
      ? new Set(filter.lifecycle_statuses)
      : null;

  const candidates: OutreachQueueCandidate[] = [];
  for (const p of prospects) {
    if (!levelSet.has(p.level)) continue;
    if (lifecycleSet && !lifecycleSet.has(p.lifecycle_status)) continue;

    const tier = p.tier;
    if (tier === null) {
      // Only include unscored rows when the user didn't pick a tier filter.
      if (filter.tiers && filter.tiers.length > 0) continue;
    } else if (!tierSet.has(tier)) {
      continue;
    }

    const skipped = skippedProspectIds.has(p.id);
    if (skipped && !filter.include_skipped) continue;

    const history = actionsByProspect.get(p.id) ?? [];
    const recommended = recommendAction(p, history, { warm_visit_before_invite });
    if (!recommended) continue;
    if (actionSet && !actionSet.has(recommended)) continue;

    const hasPendingInvite = history.some(
      (a) => a.kind === 'connection_request_sent' && isActionLive(a),
    );

    candidates.push({
      prospect_id: p.id,
      slug: p.slug,
      url: p.url,
      name: p.name,
      headline: p.headline,
      company: p.company,
      level: p.level,
      tier: p.tier,
      priority_score: p.priority_score,
      lifecycle_status: p.lifecycle_status,
      mutual_count: p.mutual_count,
      last_outreach_at: p.last_outreach_at,
      recommended_action: recommended,
      recommended_reason: buildReason(p, recommended),
      has_pending_invite: hasPendingInvite,
      skipped_today: skipped,
    });
  }

  candidates.sort((a, b) =>
    compareQueueOrder(
      {
        tier: a.tier,
        priority_score: a.priority_score,
        last_outreach_at: a.last_outreach_at,
        id: a.prospect_id,
      },
      {
        tier: b.tier,
        priority_score: b.priority_score,
        last_outreach_at: b.last_outreach_at,
        id: b.prospect_id,
      },
    ),
  );
  return candidates;
}

/** First candidate whose recommended action still fits the day's budget. */
export function pickNextBest(
  candidates: readonly OutreachQueueCandidate[],
  caps: OutreachCaps,
  usage: DailyUsage,
  weeklyInvitesUsed: number,
): OutreachQueueCandidate | null {
  for (const c of candidates) {
    if (c.skipped_today) continue;
    if (c.has_pending_invite) continue;
    if (isActionOverBudget(c.recommended_action, caps, usage, weeklyInvitesUsed)) continue;
    return c;
  }
  return null;
}

/**
 * Stable idempotency key for an outreach action: prevents double-counted
 * invites across service-worker restarts and detector races.
 */
export function buildIdempotencyKey(
  prospectId: number,
  kind: OutreachActionKind,
  dayBucket: string,
): string {
  return `${prospectId}:${kind}:${dayBucket}`;
}
