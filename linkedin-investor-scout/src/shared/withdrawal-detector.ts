/**
 * Phase 5.6 — pure verdict logic for the invite-withdrawal detector.
 *
 * The content-side watcher runs on `/mynetwork/invitation-manager/sent/` and
 * attaches capture-phase click listeners to
 * `a[aria-label^="Withdraw invitation sent to "]` anchors (confirmed in
 * `example7.html`). When the user clicks Withdraw, LinkedIn issues an async
 * API call and then removes the invite row from the DOM (or pops a toast
 * confirming the withdrawal). We observe those signals and decide whether
 * the withdrawal completed or was canceled.
 *
 * The pure verdict function is kept DOM-free so it can be unit-tested
 * exhaustively and so the content-side watcher stays thin.
 */

export type WithdrawalEventKind =
  | 'withdraw_clicked'
  | 'row_removed'
  | 'toast_seen'
  | 'undo_clicked'
  | 'timeout';

export interface WithdrawalEvent {
  kind: WithdrawalEventKind;
  t: number;
}

export type WithdrawalVerdict = 'withdrawn' | 'canceled' | 'pending' | 'unknown';

/** Default window between the Withdraw click and a confirming signal. */
export const DEFAULT_WITHDRAWAL_WINDOW_MS = 4_000;

/**
 * Decide whether an invite withdrawal succeeded.
 *
 * Rules (ordered):
 * - No `withdraw_clicked` yet → `pending`.
 * - `undo_clicked` before any confirmation → `canceled` (LinkedIn renders an
 *   undo toast after Withdraw; clicking Undo rolls the withdrawal back).
 * - `row_removed` or `toast_seen` within `windowMs` of the click → `withdrawn`.
 * - `timeout` with no confirmation → `unknown` (don't credit the budget, don't
 *   flip state; the user's manual "Mark withdrawn" stays the fallback).
 * - Otherwise → `pending` (keep watching).
 */
export function decideWithdrawalVerdict(
  events: WithdrawalEvent[],
  windowMs: number = DEFAULT_WITHDRAWAL_WINDOW_MS,
): WithdrawalVerdict {
  const click = events.find((e) => e.kind === 'withdraw_clicked');
  if (!click) return 'pending';

  const windowSize = Math.max(0, windowMs);
  const deadline = click.t + windowSize;

  // Earliest confirmation within the window wins over a later undo.
  const confirmation = events.find(
    (e) =>
      (e.kind === 'row_removed' || e.kind === 'toast_seen') &&
      e.t >= click.t &&
      e.t <= deadline,
  );
  const undo = events.find((e) => e.kind === 'undo_clicked' && e.t >= click.t);

  if (confirmation && undo) {
    // Confirmation first, then undo → the undo rolls it back.
    return undo.t > confirmation.t ? 'canceled' : 'withdrawn';
  }
  if (confirmation) return 'withdrawn';
  if (undo) return 'canceled';

  const timedOut = events.some((e) => e.kind === 'timeout' && e.t >= deadline);
  if (timedOut) return 'unknown';

  return 'pending';
}
