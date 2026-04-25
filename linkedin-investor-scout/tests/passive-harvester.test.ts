import { describe, expect, it } from 'vitest';
import {
  PASSIVE_HARVEST_COOLDOWN_MS,
  PASSIVE_HARVEST_USER_IDLE_MS,
} from '@/shared/constants';
import { decidePassiveHarvest } from '@/shared/passive-harvester';

const baseInput = {
  now: 10_000_000,
  scan_status: 'running' as const,
  manual_session_running: false,
  has_user_linkedin_tab: true,
  last_run_at: null,
  last_user_interaction_at: null,
};

describe('decidePassiveHarvest — gating', () => {
  it('fires when scan is running, no manual session, tab open, fresh state', () => {
    expect(decidePassiveHarvest(baseInput)).toEqual({ fire: true });
  });

  it('skips when scan is not running', () => {
    expect(
      decidePassiveHarvest({ ...baseInput, scan_status: 'paused' }),
    ).toEqual({ fire: false, skip: 'scan_not_running' });
    expect(
      decidePassiveHarvest({ ...baseInput, scan_status: 'idle' }),
    ).toEqual({ fire: false, skip: 'scan_not_running' });
    expect(
      decidePassiveHarvest({ ...baseInput, scan_status: 'auto_paused' }),
    ).toEqual({ fire: false, skip: 'scan_not_running' });
  });

  it('skips when the manual Feed Crawl Session is running', () => {
    expect(
      decidePassiveHarvest({ ...baseInput, manual_session_running: true }),
    ).toEqual({ fire: false, skip: 'manual_session_running' });
  });

  it('skips when no user-owned LinkedIn tab is open', () => {
    expect(
      decidePassiveHarvest({ ...baseInput, has_user_linkedin_tab: false }),
    ).toEqual({ fire: false, skip: 'no_linkedin_tab' });
  });

  it('blocks the manual session before checking the cheaper gates', () => {
    // If both manual_session_running AND no tab are true, the gate order
    // surfaces manual_session_running first because it's the more
    // actionable problem.
    expect(
      decidePassiveHarvest({
        ...baseInput,
        manual_session_running: true,
        has_user_linkedin_tab: false,
      }),
    ).toEqual({ fire: false, skip: 'manual_session_running' });
  });
});

describe('decidePassiveHarvest — cooldown gate', () => {
  it('blocks within the default cooldown window', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_run_at: baseInput.now - (PASSIVE_HARVEST_COOLDOWN_MS - 1),
      }),
    ).toEqual({ fire: false, skip: 'cooldown_active' });
  });

  it('clears once the cooldown elapses exactly', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_run_at: baseInput.now - PASSIVE_HARVEST_COOLDOWN_MS,
      }),
    ).toEqual({ fire: true });
  });

  it('honors a custom cooldown override', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_run_at: baseInput.now - 1000,
        cooldown_ms: 5000,
      }),
    ).toEqual({ fire: false, skip: 'cooldown_active' });
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_run_at: baseInput.now - 6000,
        cooldown_ms: 5000,
      }),
    ).toEqual({ fire: true });
  });

  it('treats a never-run scheduler as cooldown-clear', () => {
    expect(
      decidePassiveHarvest({ ...baseInput, last_run_at: null }),
    ).toEqual({ fire: true });
  });
});

describe('decidePassiveHarvest — user-idle gate', () => {
  it('blocks while the user is actively interacting', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_user_interaction_at: baseInput.now - 5000,
      }),
    ).toEqual({ fire: false, skip: 'user_active' });
  });

  it('fires once the idle window elapses exactly', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_user_interaction_at:
          baseInput.now - PASSIVE_HARVEST_USER_IDLE_MS,
      }),
    ).toEqual({ fire: true });
  });

  it('treats a never-recorded interaction as idle', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_user_interaction_at: null,
      }),
    ).toEqual({ fire: true });
  });

  it('honors a custom idle override', () => {
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_user_interaction_at: baseInput.now - 100,
        idle_ms: 500,
      }),
    ).toEqual({ fire: false, skip: 'user_active' });
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_user_interaction_at: baseInput.now - 600,
        idle_ms: 500,
      }),
    ).toEqual({ fire: true });
  });
});

describe('decidePassiveHarvest — gate ordering', () => {
  it('reports cooldown before user_active when both fail', () => {
    // Cooldown is the cheaper / earlier gate; report it first so logs
    // surface the more durable cause.
    expect(
      decidePassiveHarvest({
        ...baseInput,
        last_run_at: baseInput.now - 1000,
        last_user_interaction_at: baseInput.now - 1000,
      }),
    ).toEqual({ fire: false, skip: 'cooldown_active' });
  });
});
