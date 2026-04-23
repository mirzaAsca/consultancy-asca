import { describe, expect, it } from 'vitest';
import { decideSendVerdict, type DetectorEvent } from '@/shared/send-detector';

const T0 = 1_800_000_000_000;

describe('decideSendVerdict', () => {
  it('returns pending when no terminal event has fired', () => {
    const events: DetectorEvent[] = [{ kind: 'send_clicked', t: T0 }];
    expect(decideSendVerdict(events)).toBe('pending');
  });

  it('returns sent when dialog unmounts within the window after Send click', () => {
    const events: DetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'dialog_removed', t: T0 + 1_200 },
    ];
    expect(decideSendVerdict(events)).toBe('sent');
  });

  it('returns unknown when Send was clicked but unmount is outside window', () => {
    const events: DetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'dialog_removed', t: T0 + 10_000 },
    ];
    expect(decideSendVerdict(events, 5_000)).toBe('canceled');
    // Explicit timeout with Send prior yields `unknown`.
    const withTimeout: DetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'timeout', t: T0 + 30_000 },
    ];
    expect(decideSendVerdict(withTimeout, 5_000)).toBe('unknown');
  });

  it('returns canceled when dialog unmounts without Send click', () => {
    const events: DetectorEvent[] = [
      { kind: 'cancel_clicked', t: T0 + 100 },
      { kind: 'dialog_removed', t: T0 + 200 },
    ];
    expect(decideSendVerdict(events)).toBe('canceled');
  });

  it('returns canceled when dialog dismissed with no Send or Cancel event', () => {
    const events: DetectorEvent[] = [
      { kind: 'dialog_removed', t: T0 + 400 },
    ];
    expect(decideSendVerdict(events)).toBe('canceled');
  });

  it('returns unknown when an error toast appears after Send click', () => {
    const events: DetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'error_toast', t: T0 + 500 },
      { kind: 'dialog_removed', t: T0 + 900 },
    ];
    expect(decideSendVerdict(events)).toBe('unknown');
  });

  it('ignores an error toast that fired before Send (pre-existing banner)', () => {
    const events: DetectorEvent[] = [
      { kind: 'error_toast', t: T0 - 100 },
      { kind: 'send_clicked', t: T0 },
      { kind: 'dialog_removed', t: T0 + 800 },
    ];
    expect(decideSendVerdict(events)).toBe('sent');
  });

  it('returns canceled on timeout when Send was never clicked', () => {
    const events: DetectorEvent[] = [{ kind: 'timeout', t: T0 + 30_000 }];
    expect(decideSendVerdict(events)).toBe('canceled');
  });

  it('respects a custom sendWindowMs', () => {
    const events: DetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'dialog_removed', t: T0 + 7_500 },
    ];
    expect(decideSendVerdict(events, 10_000)).toBe('sent');
    expect(decideSendVerdict(events, 5_000)).toBe('canceled');
  });

  it('uses the first Send click if multiple are recorded (idempotent click)', () => {
    const events: DetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'send_clicked', t: T0 + 100 },
      { kind: 'dialog_removed', t: T0 + 1_000 },
    ];
    expect(decideSendVerdict(events)).toBe('sent');
  });
});
