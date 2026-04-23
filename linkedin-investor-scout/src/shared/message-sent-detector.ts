/**
 * Phase 5.3 — pure verdict logic for the messaging-thread `message_sent`
 * detector. Per `EXTENSION_GROWTH_TODO.md` DOM Reference (example5.html),
 * a sent message is signaled by THREE correlated DOM changes within a
 * short window of Send click:
 *
 *  1. a new `li.msg-s-event-listitem--last-in-group` appended to the
 *     active thread's message list,
 *  2. the composer `[contenteditable]` returns to the empty `<p><br></p>`
 *     shape,
 *  3. the send `<button>` re-disables.
 *
 * Any two of the three within `sendWindowMs` is high confidence. Fewer
 * than two → `unknown` (manual confirm fallback).
 *
 * The content script collects these signals as events and replays them
 * through `decideMessageVerdict`. Pure so unit tests can cover the
 * threshold math without a DOM.
 */

export type MessageDetectorEvent =
  | { kind: 'send_clicked'; t: number }
  | { kind: 'bubble_appended'; t: number }
  | { kind: 'composer_cleared'; t: number }
  | { kind: 'send_disabled'; t: number }
  | { kind: 'error_toast'; t: number }
  | { kind: 'timeout'; t: number };

export type MessageVerdict = 'sent' | 'canceled' | 'unknown' | 'pending';

export const DEFAULT_MESSAGE_SEND_WINDOW_MS = 5_000;

/** Minimum number of post-click confirmation signals needed to mark sent. */
export const MIN_CONFIRMATION_SIGNALS = 2;

export function decideMessageVerdict(
  events: ReadonlyArray<MessageDetectorEvent>,
  sendWindowMs: number = DEFAULT_MESSAGE_SEND_WINDOW_MS,
): MessageVerdict {
  let sendAt: number | null = null;
  let errorAt: number | null = null;
  const confirmTs: { bubble?: number; cleared?: number; disabled?: number } = {};

  for (const e of events) {
    switch (e.kind) {
      case 'send_clicked':
        if (sendAt === null) sendAt = e.t;
        break;
      case 'error_toast':
        errorAt = e.t;
        break;
      case 'bubble_appended':
        if (sendAt !== null && confirmTs.bubble === undefined) {
          confirmTs.bubble = e.t;
        }
        break;
      case 'composer_cleared':
        if (sendAt !== null && confirmTs.cleared === undefined) {
          confirmTs.cleared = e.t;
        }
        break;
      case 'send_disabled':
        if (sendAt !== null && confirmTs.disabled === undefined) {
          confirmTs.disabled = e.t;
        }
        break;
      case 'timeout':
        if (sendAt === null) return 'canceled';
        return countInWindow(confirmTs, sendAt, sendWindowMs) >=
          MIN_CONFIRMATION_SIGNALS
          ? 'sent'
          : 'unknown';
    }

    // Incremental recompute after each event: if Send was clicked and we
    // have enough correlated confirmations in the window, finalize.
    if (sendAt !== null) {
      if (errorAt !== null && errorAt >= sendAt) {
        // LinkedIn rejected the send — fall through to unknown so the
        // user can manually confirm or retry.
        return 'unknown';
      }
      if (
        countInWindow(confirmTs, sendAt, sendWindowMs) >=
        MIN_CONFIRMATION_SIGNALS
      ) {
        return 'sent';
      }
    }
  }
  return 'pending';
}

function countInWindow(
  confirmTs: { bubble?: number; cleared?: number; disabled?: number },
  sendAt: number,
  windowMs: number,
): number {
  let n = 0;
  if (
    confirmTs.bubble !== undefined &&
    confirmTs.bubble >= sendAt &&
    confirmTs.bubble - sendAt <= windowMs
  ) {
    n += 1;
  }
  if (
    confirmTs.cleared !== undefined &&
    confirmTs.cleared >= sendAt &&
    confirmTs.cleared - sendAt <= windowMs
  ) {
    n += 1;
  }
  if (
    confirmTs.disabled !== undefined &&
    confirmTs.disabled >= sendAt &&
    confirmTs.disabled - sendAt <= windowMs
  ) {
    n += 1;
  }
  return n;
}
