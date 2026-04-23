import { describe, expect, it } from 'vitest';
import {
  decideReactionVerdict,
  parseReactionState,
  type ReactionDetectorEvent,
} from '@/shared/reaction-toggled-detector';

const T0 = 1_800_000_000_000;

describe('parseReactionState', () => {
  it('maps the confirmed aria-labels to canonical kinds', () => {
    expect(parseReactionState('Reaction button state: no reaction')).toBe(
      'no_reaction',
    );
    expect(parseReactionState('Reaction button state: like')).toBe('like');
    expect(parseReactionState('Reaction button state: celebrate')).toBe(
      'celebrate',
    );
    expect(parseReactionState('Reaction button state: support')).toBe('support');
    expect(parseReactionState('Reaction button state: love')).toBe('love');
    expect(parseReactionState('Reaction button state: insightful')).toBe(
      'insightful',
    );
    expect(parseReactionState('Reaction button state: funny')).toBe('funny');
  });

  it('is case-insensitive', () => {
    expect(parseReactionState('reaction button state: LIKE')).toBe('like');
  });

  it('returns null for labels that do not match the Reaction-button prefix', () => {
    expect(parseReactionState(null)).toBeNull();
    expect(parseReactionState('')).toBeNull();
    expect(parseReactionState('Open reactions menu')).toBeNull();
    expect(parseReactionState('Reaction button state: laugh')).toBeNull();
  });
});

describe('decideReactionVerdict', () => {
  it('returns pending when no states have been observed', () => {
    expect(decideReactionVerdict([])).toBe('pending');
  });

  it('returns pending after a single baseline observation with no timeout', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'no_reaction', t: T0 },
    ];
    expect(decideReactionVerdict(events)).toBe('pending');
  });

  it('returns reacted when state transitions from no_reaction to a real kind', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'no_reaction', t: T0 },
      { kind: 'state_observed', state: 'like', t: T0 + 500 },
    ];
    expect(decideReactionVerdict(events)).toBe('reacted');
  });

  it('returns unreacted when the user removes a prior reaction', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'like', t: T0 },
      { kind: 'state_observed', state: 'no_reaction', t: T0 + 500 },
    ];
    expect(decideReactionVerdict(events)).toBe('unreacted');
  });

  it('returns reacted when user switches between two real reactions (like → celebrate)', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'like', t: T0 },
      { kind: 'state_observed', state: 'celebrate', t: T0 + 500 },
    ];
    expect(decideReactionVerdict(events)).toBe('reacted');
  });

  it('returns no_change when a user toggles and untoggles inside the window', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'no_reaction', t: T0 },
      { kind: 'state_observed', state: 'like', t: T0 + 300 },
      { kind: 'state_observed', state: 'no_reaction', t: T0 + 800 },
      { kind: 'timeout', t: T0 + 60_000 },
    ];
    expect(decideReactionVerdict(events)).toBe('no_change');
  });

  it('returns no_change when timeout fires on a single baseline with no transition', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'no_reaction', t: T0 },
      { kind: 'timeout', t: T0 + 60_000 },
    ];
    expect(decideReactionVerdict(events)).toBe('no_change');
  });

  it('returns no_change when no observations happened at all and the watcher times out', () => {
    const events: ReactionDetectorEvent[] = [{ kind: 'timeout', t: T0 + 60_000 }];
    expect(decideReactionVerdict(events)).toBe('no_change');
  });

  it('uses the first and latest observation to decide, ignoring intermediate flips', () => {
    const events: ReactionDetectorEvent[] = [
      { kind: 'state_observed', state: 'no_reaction', t: T0 },
      { kind: 'state_observed', state: 'like', t: T0 + 100 },
      { kind: 'state_observed', state: 'celebrate', t: T0 + 500 },
    ];
    expect(decideReactionVerdict(events)).toBe('reacted');
  });
});
