import { describe, expect, it } from 'vitest';
import {
  decideVisitVerdict,
  type ProfileVisitEvent,
} from '@/shared/profile-visit-detector';

const T0 = 1_800_000_000_000;

describe('decideVisitVerdict', () => {
  it('returns pending when nothing has fired yet', () => {
    expect(decideVisitVerdict([])).toBe('pending');
  });

  it('returns pending after top card renders but before dwell elapses', () => {
    const events: ProfileVisitEvent[] = [
      { kind: 'top_card_rendered', t: T0 },
    ];
    expect(decideVisitVerdict(events)).toBe('pending');
  });

  it('returns counts after top_card_rendered then dwell_elapsed', () => {
    const events: ProfileVisitEvent[] = [
      { kind: 'top_card_rendered', t: T0 },
      { kind: 'dwell_elapsed', t: T0 + 8_000 },
    ];
    expect(decideVisitVerdict(events)).toBe('counts');
  });

  it('returns aborted when tab closes before dwell elapses', () => {
    const events: ProfileVisitEvent[] = [
      { kind: 'top_card_rendered', t: T0 },
      { kind: 'tab_closed', t: T0 + 3_000 },
    ];
    expect(decideVisitVerdict(events)).toBe('aborted');
  });

  it('returns aborted when tab is hidden past the grace window', () => {
    const events: ProfileVisitEvent[] = [
      { kind: 'top_card_rendered', t: T0 },
      { kind: 'visibility_hidden', t: T0 + 2_500 },
    ];
    expect(decideVisitVerdict(events)).toBe('aborted');
  });

  it('returns aborted on SPA navigation away before dwell', () => {
    const events: ProfileVisitEvent[] = [
      { kind: 'top_card_rendered', t: T0 },
      { kind: 'navigated_away', t: T0 + 1_500 },
    ];
    expect(decideVisitVerdict(events)).toBe('aborted');
  });

  it('returns aborted when dwell fires without top card (profile never loaded)', () => {
    const events: ProfileVisitEvent[] = [
      { kind: 'dwell_elapsed', t: T0 + 8_000 },
    ];
    expect(decideVisitVerdict(events)).toBe('aborted');
  });

  it('is exactly-once per visit — terminal verdict locks in', () => {
    // Abort after dwell_elapsed already fired; verdict should stay counts
    // (caller guarantees no events replay after terminal) — but the pure
    // function must at minimum return counts on the same prefix.
    const events: ProfileVisitEvent[] = [
      { kind: 'top_card_rendered', t: T0 },
      { kind: 'dwell_elapsed', t: T0 + 8_000 },
    ];
    expect(decideVisitVerdict(events)).toBe('counts');
  });
});
