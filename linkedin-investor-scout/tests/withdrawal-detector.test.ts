import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WITHDRAWAL_WINDOW_MS,
  decideWithdrawalVerdict,
  type WithdrawalEvent,
} from '@/shared/withdrawal-detector';

const T0 = 1_800_000_000_000;

describe('decideWithdrawalVerdict', () => {
  it('returns pending when no Withdraw click has fired yet', () => {
    expect(decideWithdrawalVerdict([])).toBe('pending');
    expect(
      decideWithdrawalVerdict([{ kind: 'row_removed', t: T0 }]),
    ).toBe('pending');
  });

  it('returns pending after Withdraw with no signal yet inside the window', () => {
    const events: WithdrawalEvent[] = [{ kind: 'withdraw_clicked', t: T0 }];
    expect(decideWithdrawalVerdict(events)).toBe('pending');
  });

  it('returns withdrawn when the row is removed inside the window', () => {
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'row_removed', t: T0 + 800 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('withdrawn');
  });

  it('returns withdrawn when only a confirmation toast appears', () => {
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'toast_seen', t: T0 + 1_200 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('withdrawn');
  });

  it('returns canceled when the user clicks Undo after a toast', () => {
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'toast_seen', t: T0 + 500 },
      { kind: 'undo_clicked', t: T0 + 2_000 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('canceled');
  });

  it('returns canceled when Undo fires before any confirmation', () => {
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'undo_clicked', t: T0 + 600 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('canceled');
  });

  it('returns unknown on timeout with no confirmation', () => {
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'timeout', t: T0 + DEFAULT_WITHDRAWAL_WINDOW_MS + 100 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('unknown');
  });

  it('respects a custom window size', () => {
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'row_removed', t: T0 + 2_000 },
    ];
    expect(decideWithdrawalVerdict(events, 1_000)).toBe('pending');
    expect(decideWithdrawalVerdict(events, 3_000)).toBe('withdrawn');
  });

  it('treats undo that lands before the row-removal signal as withdrawn', () => {
    // Semantic: the row was removed AFTER the undo fired, meaning the undo
    // click didn't actually roll back the withdrawal server-side. Confirmed
    // removal wins over an earlier undo.
    const events: WithdrawalEvent[] = [
      { kind: 'withdraw_clicked', t: T0 },
      { kind: 'undo_clicked', t: T0 + 300 },
      { kind: 'row_removed', t: T0 + 900 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('withdrawn');
  });

  it('ignores confirmation signals that predate the Withdraw click', () => {
    // A row being removed before Withdraw was clicked isn't evidence of the
    // current withdrawal — the observer may have caught stale mutations.
    const events: WithdrawalEvent[] = [
      { kind: 'row_removed', t: T0 - 1_000 },
      { kind: 'withdraw_clicked', t: T0 },
    ];
    expect(decideWithdrawalVerdict(events)).toBe('pending');
  });
});
