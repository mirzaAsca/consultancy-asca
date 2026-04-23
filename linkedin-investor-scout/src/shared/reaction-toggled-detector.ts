/**
 * Phase 5.3 — pure verdict logic for the reaction-toggled detector. The
 * content script watches the feed-card reaction button (aria-label starts
 * with "Reaction button state: ...") and records each observed state
 * transition, plus a close-out `timeout` when the watch window elapses.
 * We decide whether the user reacted, unreacted, or made no net change.
 *
 * Selector rationale (confirmed from `example9.html`): the reaction button
 * carries `aria-label="Reaction button state: {state}"` where `{state}` is
 * one of `no reaction`, `like`, `celebrate`, `support`, `love`,
 * `insightful`, `funny`. LinkedIn mutates the label in-place on click, so
 * a MutationObserver on the attribute is sufficient — no synthetic clicks
 * or DOM injection (Mode A invariant).
 *
 * Verdict rules:
 *  - `reacted`:    the initial state was `no reaction` AND the latest
 *                  observed state is any real reaction kind.
 *  - `unreacted`:  the initial state was a real reaction AND the latest
 *                  observed state is `no reaction` (user removed their
 *                  reaction — surfaces as an "undo" signal for
 *                  reconciliation).
 *  - `no_change`:  first and last observed states match (toggle-and-untoggle
 *                  inside the window, or no change at all) — don't emit.
 *  - `pending`:    fewer than two states observed and no terminal event.
 */

export type ReactionKind =
  | 'no_reaction'
  | 'like'
  | 'celebrate'
  | 'support'
  | 'love'
  | 'insightful'
  | 'funny';

export type ReactionDetectorEvent =
  | { kind: 'state_observed'; state: ReactionKind; t: number }
  | { kind: 'timeout'; t: number };

export type ReactionVerdict =
  | 'reacted'
  | 'unreacted'
  | 'no_change'
  | 'pending';

/**
 * Parse the aria-label value ("Reaction button state: like") into a
 * canonical {@link ReactionKind}. Returns null when the label doesn't
 * match the expected prefix — caller should skip emission in that case.
 */
export function parseReactionState(ariaLabel: string | null): ReactionKind | null {
  if (!ariaLabel) return null;
  const match = ariaLabel.match(/^Reaction button state:\s*(.+?)\s*$/i);
  if (!match) return null;
  const raw = match[1].toLowerCase();
  switch (raw) {
    case 'no reaction':
      return 'no_reaction';
    case 'like':
    case 'celebrate':
    case 'support':
    case 'love':
    case 'insightful':
    case 'funny':
      return raw;
    default:
      return null;
  }
}

export function decideReactionVerdict(
  events: ReadonlyArray<ReactionDetectorEvent>,
): ReactionVerdict {
  let firstState: ReactionKind | null = null;
  let lastState: ReactionKind | null = null;
  let sawTimeout = false;

  for (const e of events) {
    switch (e.kind) {
      case 'state_observed':
        if (firstState === null) firstState = e.state;
        lastState = e.state;
        break;
      case 'timeout':
        sawTimeout = true;
        break;
    }
  }

  if (firstState === null || lastState === null) {
    return sawTimeout ? 'no_change' : 'pending';
  }
  // If the watcher has closed out (timeout) OR we have a transition plus a
  // second observation, settle. Otherwise keep collecting.
  if (!sawTimeout && firstState === lastState) {
    return 'pending';
  }
  if (firstState === lastState) return 'no_change';
  if (firstState === 'no_reaction') return 'reacted';
  if (lastState === 'no_reaction') return 'unreacted';
  // Switched between two real reactions (like → celebrate) — count as a
  // fresh reaction; the user is still engaging with the post.
  return 'reacted';
}
