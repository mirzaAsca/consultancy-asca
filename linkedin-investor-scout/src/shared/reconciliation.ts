import type {
  CorrelationToken,
  InteractionConfidence,
  InteractionType,
  ReconciliationStatus,
} from './types';

/**
 * Pure: pick the best live token for a detected interaction.
 *
 * "Best" = same prospect, compatible action, not consumed, not expired, most
 * recently opened. Returns `null` when none match — the caller treats that as
 * an organic (un-tokened) interaction.
 *
 * Un-reacts are compatible with `reacted` tokens — the user may react then
 * undo inside the window, and both observations belong to the same click.
 */
export function pickMatchingToken(
  tokens: readonly CorrelationToken[],
  prospectId: number,
  actionObserved: InteractionType,
  now: number,
): CorrelationToken | null {
  const candidates = tokens
    .filter((t) => !t.consumed)
    .filter((t) => t.expires_at > now)
    .filter((t) => t.prospect_id === prospectId)
    .filter((t) => isActionCompatible(t.action_expected, actionObserved))
    .sort((a, b) => b.opened_at - a.opened_at);
  return candidates[0] ?? null;
}

/**
 * Whether an observed interaction type should match a token that was opened
 * expecting `expected`. Typically 1:1, with reacted/unreacted treated as one
 * engagement.
 */
export function isActionCompatible(
  expected: InteractionType,
  observed: InteractionType,
): boolean {
  if (expected === observed) return true;
  if (expected === 'reacted' && observed === 'unreacted') return true;
  return false;
}

/**
 * Pure: decide reconciliation status + confidence for a detection.
 *
 * - Matching token + URN: high / matched.
 * - Matching token, no URN resolved: medium / matched (the token link is
 *   strong enough to auto-update, but URN miss is a soft warning).
 * - No token, URN present: low / unmatched (organic — still captured).
 * - No token, no URN: low / unmatched.
 */
export function computeReconciliationStatus(args: {
  tokenMatched: boolean;
  urnResolved: boolean;
}): { status: ReconciliationStatus; confidence: InteractionConfidence } {
  if (args.tokenMatched && args.urnResolved) {
    return { status: 'matched', confidence: 'high' };
  }
  if (args.tokenMatched) {
    return { status: 'matched', confidence: 'medium' };
  }
  return { status: 'unmatched', confidence: 'low' };
}

/** Stable fingerprint for the interaction_events idempotency index. */
export function buildInteractionFingerprint(args: {
  prospect_id: number;
  interaction_type: InteractionType;
  activity_urn: string | null;
  detected_at: number;
  /** Round to this ms resolution so detector re-fires within the window dedup. */
  resolution_ms?: number;
}): string {
  const res = args.resolution_ms ?? 2000;
  const tsBucket = Math.floor(args.detected_at / res) * res;
  return [
    args.prospect_id,
    args.interaction_type,
    args.activity_urn ?? '-',
    tsBucket,
  ].join('|');
}

/** Random-enough token id for browser-side use (not a security token). */
export function generateCorrelationTokenId(now: number = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `tok-${now.toString(36)}-${rand}`;
}
