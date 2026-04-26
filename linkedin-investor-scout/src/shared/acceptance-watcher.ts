/**
 * Phase 3.3 — acceptance watcher (pure helpers).
 *
 * When a scan detects a prospect's level transitioning from a pre-connected
 * state (2nd / 3rd) to `1st`, we infer they accepted an
 * invite we previously sent. This module is the single source of truth for
 * that inference — the scan worker calls {@link detectAcceptanceOnLevelChange}
 * with the raw history and applies the returned patches.
 *
 * Kept free of IndexedDB / chrome.* dependencies so it can be unit-tested
 * without a DB shim. All DB writes live in the background service worker.
 */
import type {
  OutreachAction,
  ProspectLevel,
  ProspectLifecycleStatus,
} from './types';
import { isActionLive } from './outreach-queue';

/** Pre-connected levels — a transition FROM any of these TO `1st` triggers acceptance. */
const PRE_CONNECTED_LEVELS: ReadonlySet<ProspectLevel> = new Set([
  '2nd',
  '3rd',
]);

export interface AcceptanceOutcome {
  /** True iff we matched a live invite to this level change. */
  accepted: boolean;
  /**
   * The outreach_action row to flip to `accepted`. Caller applies this via
   * `updateOutreachAction` (see background/index.ts). `null` when no live
   * invite was found — we still flip `lifecycle_status` to `connected` since
   * the level says they're connected, we just can't credit an invite.
   */
  invite_to_accept: OutreachAction | null;
  /**
   * The next lifecycle_status to persist on the prospect row. Always
   * `'connected'` when accepted=true — callers should apply this even when
   * `invite_to_accept` is null.
   */
  next_lifecycle_status: ProspectLifecycleStatus | null;
}

/**
 * Inspect a level transition and decide whether it counts as an invite
 * acceptance. Pure — caller passes the old/new level + the prospect's
 * outreach-action history and receives a patch description.
 *
 * Returns {accepted: false, ...} when:
 *   - level didn't change,
 *   - new level isn't `1st`,
 *   - old level wasn't pre-connected (e.g. NONE → 1st on first scan — we
 *     can't claim credit for an invite we never sent).
 *
 * When multiple live invites exist (shouldn't happen under idempotency, but
 * defensive), we pick the most recent `sent_at` — that's the one most likely
 * to have triggered the acceptance.
 */
export function detectAcceptanceOnLevelChange(input: {
  oldLevel: ProspectLevel;
  newLevel: ProspectLevel;
  history: readonly OutreachAction[];
  currentLifecycleStatus: ProspectLifecycleStatus;
}): AcceptanceOutcome {
  const { oldLevel, newLevel, history, currentLifecycleStatus } = input;

  if (oldLevel === newLevel) {
    return { accepted: false, invite_to_accept: null, next_lifecycle_status: null };
  }
  if (newLevel !== '1st') {
    return { accepted: false, invite_to_accept: null, next_lifecycle_status: null };
  }
  if (!PRE_CONNECTED_LEVELS.has(oldLevel)) {
    // e.g. NONE → 1st: the prospect was already connected before we scanned
    // them; no invite to credit. Still safe to flip lifecycle_status so the
    // outreach queue stops recommending a connect request.
    return {
      accepted: false,
      invite_to_accept: null,
      next_lifecycle_status:
        currentLifecycleStatus === 'do_not_contact' ? null : 'connected',
    };
  }

  const liveInvites = history
    .filter((a) => a.kind === 'connection_request_sent' && isActionLive(a))
    // Prefer invites already in the `sent` state over `draft` / `approved` /
    // `needs_review`; sort sent_at DESC, fall back to created_at DESC.
    .sort((a, b) => {
      const as = a.sent_at ?? 0;
      const bs = b.sent_at ?? 0;
      if (bs !== as) return bs - as;
      return b.created_at - a.created_at;
    });

  const invite = liveInvites[0] ?? null;
  return {
    accepted: true,
    invite_to_accept: invite,
    next_lifecycle_status:
      currentLifecycleStatus === 'do_not_contact' ? null : 'connected',
  };
}
