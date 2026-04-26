/**
 * Phase 5.4 — lifecycle_status auto-advance on detector-confirmed outreach.
 *
 * When `handleOutreachActionRecord` flips an outreach_action to `sent`, the
 * prospect's `lifecycle_status` should advance to reflect the new state of
 * the relationship. This module is the pure source of truth for that mapping.
 *
 * Acceptance (`sent` → `accepted` invite, level transitions to `1st`) is
 * handled in {@link ./acceptance-watcher} since it triggers from a scan, not
 * from an outreach write. This helper covers the forward-only transitions
 * driven by outreach action confirmations:
 *   - `profile_visit` (sent): advances `new` / `ready_for_visit` → `ready_for_connect`.
 *   - `connection_request_sent` (sent): advances pre-request states → `request_sent`.
 *   - `message_sent` / `followup_message_sent`: no transition (the user is
 *     messaging an existing connection; nothing to advance).
 *
 * Invariants:
 *   - `do_not_contact` is never overwritten — user opt-out wins.
 *   - `connected` and `followup_due` are never regressed by an outreach write
 *     (those statuses are post-acceptance; an outreach action does not undo
 *     them).
 *   - Returning `null` means "no change" — callers must skip the write.
 */
import type {
  OutreachAction,
  ProspectLifecycleStatus,
} from './types';

/**
 * Decide the lifecycle_status to write for a freshly-`sent` outreach action.
 * Pure — caller passes the current status + the outreach action kind that
 * just transitioned to `sent` and receives the next status (or `null` when
 * no advance is appropriate).
 */
export function nextLifecycleAfterOutreachSent(input: {
  currentStatus: ProspectLifecycleStatus;
  kind: OutreachAction['kind'];
}): ProspectLifecycleStatus | null {
  const { currentStatus, kind } = input;

  if (currentStatus === 'do_not_contact') {
    return null;
  }

  switch (kind) {
    case 'profile_visit':
      if (currentStatus === 'new' || currentStatus === 'ready_for_visit') {
        return 'ready_for_connect';
      }
      return null;

    case 'connection_request_sent':
      if (
        currentStatus === 'new' ||
        currentStatus === 'ready_for_visit' ||
        currentStatus === 'ready_for_connect'
      ) {
        return 'request_sent';
      }
      return null;

    case 'message_sent':
    case 'followup_message_sent':
      return null;
  }
}
