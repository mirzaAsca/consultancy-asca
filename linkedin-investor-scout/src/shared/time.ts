/**
 * `YYYY-MM-DD` in the user's local timezone (for daily scan cap bucket).
 */
export function localDayBucket(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Uniform random integer in [minMs, maxMs] inclusive.
 */
export function randomDelayMs(minMs: number, maxMs: number): number {
  const lo = Math.min(minMs, maxMs);
  const hi = Math.max(minMs, maxMs);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Apply ±15% Gaussian-ish jitter around baseMs (clamped to at least 0).
 */
export function jitterAround(baseMs: number, spread = 0.15): number {
  const u = Math.random();
  const v = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const delta = baseMs * spread * gaussian;
  return Math.max(0, Math.round(baseMs + delta));
}
