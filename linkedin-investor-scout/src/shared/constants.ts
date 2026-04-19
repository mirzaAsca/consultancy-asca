import type { Settings, ScanState } from './types';

export const DB_NAME = 'linkedin-investor-scout';
export const DB_VERSION = 1;
export const ACTIVITY_LOG_MAX_ENTRIES = 2000;

/**
 * Deep-frozen canonical defaults. Treat as read-only; use
 * {@link createDefaultSettings} when you need a mutable copy to persist.
 */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  id: 'global',
  scan: Object.freeze({
    min_delay_ms: 5000,
    max_delay_ms: 10000,
    daily_cap: 500,
    retry_on_failure: true,
    max_retries: 3,
  }),
  highlight: Object.freeze({
    enabled: true,
    colors: Object.freeze({
      first: '#22c55e',
      second: '#3b82f6',
      third: '#a855f7',
      out_of_network: '#6b7280',
    }),
    show_on: Object.freeze({
      post_authors: true,
      reposters: true,
      commenters: true,
      reactors: true,
      suggested: true,
    }),
  }),
  updated_at: 0,
}) as Readonly<Settings>;

/**
 * Fresh mutable copy of the defaults. Callers (e.g. DB seeding) receive their
 * own independent object so consumer mutations never leak into
 * {@link DEFAULT_SETTINGS}.
 */
export function createDefaultSettings(updatedAt: number = Date.now()): Settings {
  return {
    id: 'global',
    scan: { ...DEFAULT_SETTINGS.scan },
    highlight: {
      enabled: DEFAULT_SETTINGS.highlight.enabled,
      colors: { ...DEFAULT_SETTINGS.highlight.colors },
      show_on: { ...DEFAULT_SETTINGS.highlight.show_on },
    },
    updated_at: updatedAt,
  };
}

export function defaultScanState(dayBucket: string): ScanState {
  return {
    id: 'current',
    status: 'idle',
    auto_pause_reason: null,
    started_at: null,
    last_activity_at: null,
    scans_today: 0,
    day_bucket: dayBucket,
    current_prospect_id: null,
  };
}
