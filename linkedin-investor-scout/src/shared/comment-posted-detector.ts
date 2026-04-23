/**
 * Phase 5.3 — pure verdict logic for the comment-posted detector. When
 * the user posts a comment on a tracked prospect's feed post, three DOM
 * signals correlate within a short window of the submit click:
 *
 *  1. the composer `[contenteditable]` returns to the empty shape
 *     (`<p><br></p>` / textContent === ''),
 *  2. a new `[aria-label^="View more options for"]` comment node is
 *     appended to the post's `data-testid*="commentList"` container.
 *
 * Two-of-two confirmation inside `postWindowMs` is high confidence.
 * One signal alone falls back to `unknown` (manual reconciliation path).
 *
 * Mirrors the `message-sent-detector` shape so downstream reconciliation
 * code can reuse the same mental model. Pure logic — unit-tested without
 * touching the DOM.
 */

export type CommentDetectorEvent =
  | { kind: 'submit_clicked'; t: number }
  | { kind: 'composer_cleared'; t: number }
  | { kind: 'new_comment_appended'; t: number }
  | { kind: 'error_toast'; t: number }
  | { kind: 'timeout'; t: number };

export type CommentVerdict = 'posted' | 'canceled' | 'unknown' | 'pending';

export const DEFAULT_COMMENT_POST_WINDOW_MS = 5_000;

/** Minimum confirmation signals (of 2) required to mark `posted`. */
export const MIN_COMMENT_CONFIRMATION_SIGNALS = 2;

export function decideCommentVerdict(
  events: ReadonlyArray<CommentDetectorEvent>,
  postWindowMs: number = DEFAULT_COMMENT_POST_WINDOW_MS,
): CommentVerdict {
  let submitAt: number | null = null;
  let errorAt: number | null = null;
  const confirmTs: { cleared?: number; appended?: number } = {};

  for (const e of events) {
    switch (e.kind) {
      case 'submit_clicked':
        if (submitAt === null) submitAt = e.t;
        break;
      case 'error_toast':
        errorAt = e.t;
        break;
      case 'composer_cleared':
        if (submitAt !== null && confirmTs.cleared === undefined) {
          confirmTs.cleared = e.t;
        }
        break;
      case 'new_comment_appended':
        if (submitAt !== null && confirmTs.appended === undefined) {
          confirmTs.appended = e.t;
        }
        break;
      case 'timeout':
        if (submitAt === null) return 'canceled';
        return countInWindow(confirmTs, submitAt, postWindowMs) >=
          MIN_COMMENT_CONFIRMATION_SIGNALS
          ? 'posted'
          : 'unknown';
    }

    if (submitAt !== null) {
      if (errorAt !== null && errorAt >= submitAt) {
        return 'unknown';
      }
      if (
        countInWindow(confirmTs, submitAt, postWindowMs) >=
        MIN_COMMENT_CONFIRMATION_SIGNALS
      ) {
        return 'posted';
      }
    }
  }
  return 'pending';
}

function countInWindow(
  confirmTs: { cleared?: number; appended?: number },
  submitAt: number,
  windowMs: number,
): number {
  let n = 0;
  if (
    confirmTs.cleared !== undefined &&
    confirmTs.cleared >= submitAt &&
    confirmTs.cleared - submitAt <= windowMs
  ) {
    n += 1;
  }
  if (
    confirmTs.appended !== undefined &&
    confirmTs.appended >= submitAt &&
    confirmTs.appended - submitAt <= windowMs
  ) {
    n += 1;
  }
  return n;
}
