/**
 * Phase 5.3 — pure verdict logic for the Mode A Connect-modal invite-sent
 * detector. The content script (`src/content/outreach-prefill.ts`) collects
 * DOM events (Send click, Cancel click, dialog unmount, error toast, timeout)
 * and replays them through `decideSendVerdict` to decide whether to flip the
 * outreach row from `draft` → `sent`. Logic is pure so it is unit-testable
 * without a DOM.
 *
 * Verdict rules:
 *  - `sent`:       Send clicked AND dialog removed within `sendWindowMs` AND
 *                  no intervening error toast.
 *  - `canceled`:   Cancel clicked OR dialog removed with no prior Send click.
 *  - `unknown`:    Send clicked but no unmount within the window, OR an error
 *                  toast appeared after Send. Fall back to manual confirm.
 *  - `pending`:    No terminal event yet.
 */

export type DetectorEvent =
  | { kind: 'send_clicked'; t: number }
  | { kind: 'cancel_clicked'; t: number }
  | { kind: 'dialog_removed'; t: number }
  | { kind: 'error_toast'; t: number }
  | { kind: 'timeout'; t: number };

export type Verdict = 'sent' | 'canceled' | 'unknown' | 'pending';

export const DEFAULT_SEND_WINDOW_MS = 5_000;

export function decideSendVerdict(
  events: ReadonlyArray<DetectorEvent>,
  sendWindowMs: number = DEFAULT_SEND_WINDOW_MS,
): Verdict {
  let sendAt: number | null = null;
  let cancelAt: number | null = null;
  let errorAt: number | null = null;

  for (const e of events) {
    switch (e.kind) {
      case 'send_clicked':
        if (sendAt === null) sendAt = e.t;
        break;
      case 'cancel_clicked':
        if (cancelAt === null) cancelAt = e.t;
        break;
      case 'error_toast':
        errorAt = e.t;
        break;
      case 'dialog_removed': {
        // If an error toast surfaced after the Send click, LinkedIn rejected
        // the invite — don't mark sent. Surface as `unknown` so the user can
        // manually confirm.
        if (sendAt !== null && errorAt !== null && errorAt >= sendAt) {
          return 'unknown';
        }
        if (sendAt !== null && e.t - sendAt <= sendWindowMs) {
          return 'sent';
        }
        // Cancel click or dismiss without Send.
        return 'canceled';
      }
      case 'timeout':
        // Send was clicked but we never saw the unmount in window → unknown.
        if (sendAt !== null) return 'unknown';
        // Never clicked Send → treat as canceled (user walked away).
        return 'canceled';
    }
  }
  return 'pending';
}
