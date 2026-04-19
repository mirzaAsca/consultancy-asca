import { describe, expect, it } from 'vitest';

import { jitterAround, localDayBucket, randomDelayMs } from '../src/shared/time';

describe('localDayBucket', () => {
  it('formats as YYYY-MM-DD in the local timezone', () => {
    const d = new Date(2026, 3, 19, 12, 0, 0); // Apr 19 2026 local noon
    const bucket = localDayBucket(d.getTime());
    expect(bucket).toBe('2026-04-19');
    expect(bucket).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pads single-digit months and days', () => {
    const d = new Date(2026, 0, 3, 6, 0, 0); // Jan 3 2026 local
    expect(localDayBucket(d.getTime())).toBe('2026-01-03');
  });

  it('rolls over at local midnight, not UTC midnight', () => {
    // 23:59:59 local and 00:00:01 next-day local must differ by one bucket
    const late = new Date(2026, 5, 10, 23, 59, 59).getTime(); // June 10
    const nextMorning = new Date(2026, 5, 11, 0, 0, 1).getTime(); // June 11
    expect(localDayBucket(late)).toBe('2026-06-10');
    expect(localDayBucket(nextMorning)).toBe('2026-06-11');
  });

  it('is stable across many samples within the same local day', () => {
    const start = new Date(2026, 7, 15, 0, 0, 1).getTime();
    const end = new Date(2026, 7, 15, 23, 59, 59).getTime();
    const mid = Math.floor((start + end) / 2);
    const first = localDayBucket(start);
    expect(localDayBucket(mid)).toBe(first);
    expect(localDayBucket(end)).toBe(first);
  });
});

describe('randomDelayMs', () => {
  it('always returns an integer within [min, max] inclusive', () => {
    for (let i = 0; i < 500; i += 1) {
      const v = randomDelayMs(5000, 10_000);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(5000);
      expect(v).toBeLessThanOrEqual(10_000);
    }
  });

  it('handles reversed arguments by normalizing bounds', () => {
    for (let i = 0; i < 50; i += 1) {
      const v = randomDelayMs(9000, 4000);
      expect(v).toBeGreaterThanOrEqual(4000);
      expect(v).toBeLessThanOrEqual(9000);
    }
  });

  it('returns the single value when min === max', () => {
    expect(randomDelayMs(7500, 7500)).toBe(7500);
  });
});

describe('jitterAround', () => {
  it('stays within ~4σ of the ±spread*base band over many samples', () => {
    const base = 10_000;
    const spread = 0.15;
    // 4σ is an extremely loose bound; this guards against unbounded output.
    const hardCeiling = base + base * spread * 4;
    const hardFloor = Math.max(0, base - base * spread * 4);
    for (let i = 0; i < 1000; i += 1) {
      const v = jitterAround(base, spread);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(hardFloor);
      expect(v).toBeLessThanOrEqual(hardCeiling);
    }
  });

  it('never returns a negative delay even when spread is huge', () => {
    for (let i = 0; i < 500; i += 1) {
      const v = jitterAround(1000, 5); // absurdly wide spread
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('centers roughly on baseMs across a large sample', () => {
    const base = 8000;
    const N = 2000;
    let sum = 0;
    for (let i = 0; i < N; i += 1) sum += jitterAround(base, 0.15);
    const mean = sum / N;
    // Allow 5% drift from the base — very forgiving to keep CI flake-free.
    expect(mean).toBeGreaterThan(base * 0.95);
    expect(mean).toBeLessThan(base * 1.05);
  });
});
