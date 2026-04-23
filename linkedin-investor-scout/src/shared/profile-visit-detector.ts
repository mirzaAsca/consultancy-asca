/**
 * Phase 5.6 — pure verdict logic for the profile-visit dwell detector.
 *
 * The content script (`src/content/interaction-detectors.ts`) watches the
 * current `/in/{slug}/` tab, collects DOM lifecycle events (top-card
 * rendered, tab blurred, tab hidden, tab closed, dwell timer elapsed),
 * and replays them through `decideVisitVerdict` to decide whether the
 * visit counts against the daily budget.
 *
 * Why a pure function:
 *  - dwell thresholds vary by Settings,
 *  - tab focus / visibility events are racy,
 *  - we want exactly-one-fire semantics per load — tab-close BEFORE the
 *    threshold must not count, tab-close AFTER must not double-fire.
 */

export type ProfileVisitEvent =
  | { kind: 'top_card_rendered'; t: number }
  | { kind: 'dwell_elapsed'; t: number }
  | { kind: 'visibility_hidden'; t: number }
  | { kind: 'tab_closed'; t: number }
  | { kind: 'navigated_away'; t: number };

export type ProfileVisitVerdict = 'counts' | 'aborted' | 'pending';

/**
 * Rules:
 *  - Must see `top_card_rendered` before anything else counts (we never
 *    bump the visit budget for a page that failed to load).
 *  - After top-card is rendered, the `dwell_elapsed` event (fired by a
 *    timer keyed off `profile_visit_dwell_ms`) moves us to `counts`.
 *  - Any abort signal (`visibility_hidden` past a hidden grace window,
 *    `tab_closed`, `navigated_away`) before `dwell_elapsed` moves us to
 *    `aborted`. Brief visibility flips are tolerated by the caller, not
 *    by this verdict function — callers should not emit
 *    `visibility_hidden` until the tab has been hidden continuously for
 *    the hidden grace window (default 2s).
 */
export function decideVisitVerdict(
  events: ReadonlyArray<ProfileVisitEvent>,
): ProfileVisitVerdict {
  let topCardAt: number | null = null;
  for (const e of events) {
    switch (e.kind) {
      case 'top_card_rendered':
        if (topCardAt === null) topCardAt = e.t;
        break;
      case 'dwell_elapsed':
        if (topCardAt !== null) return 'counts';
        // Top card never rendered but dwell fired → treat as aborted.
        return 'aborted';
      case 'visibility_hidden':
      case 'tab_closed':
      case 'navigated_away':
        return 'aborted';
    }
  }
  return 'pending';
}
