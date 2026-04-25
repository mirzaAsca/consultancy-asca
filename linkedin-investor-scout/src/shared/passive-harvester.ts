import {
  PASSIVE_HARVEST_COOLDOWN_MS,
  PASSIVE_HARVEST_USER_IDLE_MS,
} from './constants';
import type { ScanWorkerStatus } from './types';

/**
 * Phase 3.1 — pure decision logic for the passive continuous harvester.
 *
 * Separated from the runtime scheduler in `src/background/passive-harvester.ts`
 * so the firing rules can be unit-tested without faking timers / chrome.tabs.
 */

export interface PassiveHarvestDecisionInput {
  now: number;
  scan_status: ScanWorkerStatus;
  /** True when the manual Feed Crawl Session is running — never compete. */
  manual_session_running: boolean;
  /** True when at least one user-owned `linkedin.com/*` tab is open. */
  has_user_linkedin_tab: boolean;
  /** Last time a passive cycle completed (or started, if no completion yet). */
  last_run_at: number | null;
  /** Last time the user interacted on a LinkedIn tab. */
  last_user_interaction_at: number | null;
  /** Override windows — primarily for tests. */
  cooldown_ms?: number;
  idle_ms?: number;
}

export type PassiveHarvestSkipReason =
  | 'scan_not_running'
  | 'manual_session_running'
  | 'no_linkedin_tab'
  | 'cooldown_active'
  | 'user_active';

export type PassiveHarvestDecision =
  | { fire: true }
  | { fire: false; skip: PassiveHarvestSkipReason };

/**
 * Decide whether the scheduler should fire a passive harvest cycle right now.
 *
 * Order matters — we report the *first* failing condition so logs make the
 * cause obvious. `scan_not_running` and `manual_session_running` are hard
 * gates (the scheduler shouldn't even be ticking); the others are soft and
 * the scheduler will retry on the next tick.
 */
export function decidePassiveHarvest(
  input: PassiveHarvestDecisionInput,
): PassiveHarvestDecision {
  if (input.scan_status !== 'running') {
    return { fire: false, skip: 'scan_not_running' };
  }
  if (input.manual_session_running) {
    return { fire: false, skip: 'manual_session_running' };
  }
  if (!input.has_user_linkedin_tab) {
    return { fire: false, skip: 'no_linkedin_tab' };
  }

  const cooldownMs = input.cooldown_ms ?? PASSIVE_HARVEST_COOLDOWN_MS;
  if (
    input.last_run_at != null &&
    input.now - input.last_run_at < cooldownMs
  ) {
    return { fire: false, skip: 'cooldown_active' };
  }

  const idleMs = input.idle_ms ?? PASSIVE_HARVEST_USER_IDLE_MS;
  // No recorded interaction = treat as idle (fresh session, scheduler just
  // armed, nothing to disprove the assumption).
  if (
    input.last_user_interaction_at != null &&
    input.now - input.last_user_interaction_at < idleMs
  ) {
    return { fire: false, skip: 'user_active' };
  }

  return { fire: true };
}
