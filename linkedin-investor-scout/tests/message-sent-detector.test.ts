import { describe, expect, it } from 'vitest';
import {
  decideMessageVerdict,
  DEFAULT_MESSAGE_SEND_WINDOW_MS,
  type MessageDetectorEvent,
} from '@/shared/message-sent-detector';

const T0 = 1_800_000_000_000;

describe('decideMessageVerdict', () => {
  it('returns pending when no terminal event has fired', () => {
    expect(
      decideMessageVerdict([{ kind: 'send_clicked', t: T0 }]),
    ).toBe('pending');
  });

  it('returns sent when two of three confirmations correlate after Send click', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'bubble_appended', t: T0 + 200 },
      { kind: 'composer_cleared', t: T0 + 400 },
    ];
    expect(decideMessageVerdict(events)).toBe('sent');
  });

  it('returns sent when all three confirmations correlate', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'bubble_appended', t: T0 + 200 },
      { kind: 'composer_cleared', t: T0 + 300 },
      { kind: 'send_disabled', t: T0 + 400 },
    ];
    expect(decideMessageVerdict(events)).toBe('sent');
  });

  it('returns unknown when only one confirmation signal lands', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'bubble_appended', t: T0 + 200 },
      { kind: 'timeout', t: T0 + 6_000 },
    ];
    expect(decideMessageVerdict(events)).toBe('unknown');
  });

  it('returns canceled when timeout fires before Send was ever clicked', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'composer_cleared', t: T0 + 100 },
      { kind: 'timeout', t: T0 + 5_000 },
    ];
    expect(decideMessageVerdict(events)).toBe('canceled');
  });

  it('returns unknown when an error toast appears after Send click', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'error_toast', t: T0 + 200 },
      { kind: 'composer_cleared', t: T0 + 300 },
      { kind: 'bubble_appended', t: T0 + 400 },
    ];
    expect(decideMessageVerdict(events)).toBe('unknown');
  });

  it('ignores confirmations that predate the Send click', () => {
    // Pre-send composer mutations (user focusing the composer, pasting, etc.)
    // should never count toward confirmations after a later Send click.
    const events: MessageDetectorEvent[] = [
      { kind: 'composer_cleared', t: T0 - 100 },
      { kind: 'bubble_appended', t: T0 - 50 },
      { kind: 'send_clicked', t: T0 },
      { kind: 'timeout', t: T0 + 5_000 },
    ];
    expect(decideMessageVerdict(events)).toBe('unknown');
  });

  it('ignores confirmations that fall outside the send window', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      {
        kind: 'bubble_appended',
        t: T0 + DEFAULT_MESSAGE_SEND_WINDOW_MS + 500,
      },
      {
        kind: 'composer_cleared',
        t: T0 + DEFAULT_MESSAGE_SEND_WINDOW_MS + 700,
      },
      { kind: 'timeout', t: T0 + DEFAULT_MESSAGE_SEND_WINDOW_MS + 1_000 },
    ];
    expect(decideMessageVerdict(events)).toBe('unknown');
  });

  it('respects a custom send window', () => {
    const events: MessageDetectorEvent[] = [
      { kind: 'send_clicked', t: T0 },
      { kind: 'bubble_appended', t: T0 + 1_500 },
      { kind: 'composer_cleared', t: T0 + 1_800 },
    ];
    expect(decideMessageVerdict(events, 1_000)).toBe('pending');
    // Timeout collapses to unknown because 2/3 confirmations are outside 1s.
    const withTimeout: MessageDetectorEvent[] = [
      ...events,
      { kind: 'timeout', t: T0 + 2_000 },
    ];
    expect(decideMessageVerdict(withTimeout, 1_000)).toBe('unknown');
    // With the default window both confirmations are in-window → sent.
    expect(decideMessageVerdict(events)).toBe('sent');
  });
});
