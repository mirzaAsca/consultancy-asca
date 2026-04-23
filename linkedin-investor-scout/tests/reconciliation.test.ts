import { describe, it, expect } from 'vitest';
import {
  buildInteractionFingerprint,
  computeReconciliationStatus,
  generateCorrelationTokenId,
  isActionCompatible,
  pickMatchingToken,
} from '../src/shared/reconciliation';
import type { CorrelationToken, InteractionType } from '../src/shared/types';

function tok(overrides: Partial<CorrelationToken> = {}): CorrelationToken {
  return {
    token: overrides.token ?? 'tok-a',
    task_id: overrides.task_id ?? 1,
    prospect_id: overrides.prospect_id ?? 10,
    action_expected: overrides.action_expected ?? 'reacted',
    opened_at: overrides.opened_at ?? 1000,
    expires_at: overrides.expires_at ?? 10_000,
    consumed: overrides.consumed ?? false,
  };
}

describe('pickMatchingToken', () => {
  it('returns the single matching token', () => {
    const t = tok();
    expect(pickMatchingToken([t], 10, 'reacted', 500)).toBe(t);
  });

  it('skips expired tokens', () => {
    const t = tok({ expires_at: 100 });
    expect(pickMatchingToken([t], 10, 'reacted', 500)).toBeNull();
  });

  it('skips consumed tokens', () => {
    const t = tok({ consumed: true });
    expect(pickMatchingToken([t], 10, 'reacted', 500)).toBeNull();
  });

  it('skips tokens for a different prospect', () => {
    const t = tok({ prospect_id: 99 });
    expect(pickMatchingToken([t], 10, 'reacted', 500)).toBeNull();
  });

  it('picks the most recent opened_at when multiple match', () => {
    const older = tok({ token: 'older', opened_at: 1000 });
    const newer = tok({ token: 'newer', opened_at: 5000 });
    expect(pickMatchingToken([older, newer], 10, 'reacted', 500)?.token).toBe('newer');
  });

  it('matches a reacted token against an unreacted observation', () => {
    const t = tok({ action_expected: 'reacted' });
    expect(pickMatchingToken([t], 10, 'unreacted', 500)).toBe(t);
  });

  it('does not match commented token against reacted observation', () => {
    const t = tok({ action_expected: 'commented' });
    expect(pickMatchingToken([t], 10, 'reacted', 500)).toBeNull();
  });
});

describe('isActionCompatible', () => {
  it('identical actions match', () => {
    expect(isActionCompatible('commented', 'commented')).toBe(true);
  });

  it('reacted → unreacted compatible', () => {
    expect(isActionCompatible('reacted', 'unreacted')).toBe(true);
  });

  it('no cross-type matching', () => {
    const pairs: Array<[InteractionType, InteractionType]> = [
      ['commented', 'reacted'],
      ['invite_sent', 'message_sent'],
      ['unreacted', 'reacted'],
    ];
    for (const [a, b] of pairs) expect(isActionCompatible(a, b)).toBe(false);
  });
});

describe('computeReconciliationStatus', () => {
  it('token + urn → high/matched', () => {
    expect(computeReconciliationStatus({ tokenMatched: true, urnResolved: true }))
      .toEqual({ status: 'matched', confidence: 'high' });
  });

  it('token only → medium/matched', () => {
    expect(computeReconciliationStatus({ tokenMatched: true, urnResolved: false }))
      .toEqual({ status: 'matched', confidence: 'medium' });
  });

  it('urn only → low/unmatched', () => {
    expect(computeReconciliationStatus({ tokenMatched: false, urnResolved: true }))
      .toEqual({ status: 'unmatched', confidence: 'low' });
  });

  it('neither → low/unmatched', () => {
    expect(computeReconciliationStatus({ tokenMatched: false, urnResolved: false }))
      .toEqual({ status: 'unmatched', confidence: 'low' });
  });
});

describe('buildInteractionFingerprint', () => {
  it('stable across same-bucket timestamps', () => {
    const a = buildInteractionFingerprint({ prospect_id: 1, interaction_type: 'reacted', activity_urn: 'urn:a', detected_at: 1000 });
    const b = buildInteractionFingerprint({ prospect_id: 1, interaction_type: 'reacted', activity_urn: 'urn:a', detected_at: 1500 });
    expect(a).toBe(b);
  });

  it('differs across buckets', () => {
    const a = buildInteractionFingerprint({ prospect_id: 1, interaction_type: 'reacted', activity_urn: 'urn:a', detected_at: 1000 });
    const b = buildInteractionFingerprint({ prospect_id: 1, interaction_type: 'reacted', activity_urn: 'urn:a', detected_at: 5000 });
    expect(a).not.toBe(b);
  });

  it('collapses on prospect+type+URN', () => {
    const a = buildInteractionFingerprint({ prospect_id: 1, interaction_type: 'reacted', activity_urn: 'urn:a', detected_at: 1000 });
    const b = buildInteractionFingerprint({ prospect_id: 2, interaction_type: 'reacted', activity_urn: 'urn:a', detected_at: 1000 });
    expect(a).not.toBe(b);
  });
});

describe('generateCorrelationTokenId', () => {
  it('returns distinct values on repeated calls', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateCorrelationTokenId()));
    expect(ids.size).toBe(10);
  });
});
