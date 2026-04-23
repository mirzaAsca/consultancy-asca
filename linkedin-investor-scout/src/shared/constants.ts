import type {
  OutreachCaps,
  OutreachSettings,
  ScanState,
  Settings,
  TierThresholds,
} from './types';

export const DB_NAME = 'linkedin-investor-scout';
/**
 * v1 (scan/prospect MVP) → v2 (outreach engine: new Prospect fields,
 * + outreach_actions / daily_usage / message_templates / feed_events stores).
 * See `db.ts` upgrade() hook and `MASTER.md` §19 v1.1 amendment block.
 */
export const DB_VERSION = 2;
export const ACTIVITY_LOG_MAX_ENTRIES = 2000;

// ——— v2 outreach defaults (Phase 0 / MASTER v1.1 §19) ———

/** Matches the 15–30/day manual baseline on clean Premium; conservative. */
export const DEFAULT_OUTREACH_CAPS: Readonly<OutreachCaps> = Object.freeze({
  daily_invites: 15,
  daily_visits: 40,
  daily_messages: 10,
  weekly_invites: 80,
  shared_bucket: true,
});

export const DEFAULT_TIER_THRESHOLDS: Readonly<TierThresholds> = Object.freeze({
  S: 140,
  A: 100,
  B: 60,
  C: 30,
});

/**
 * Score weights exposed as named constants so scoring tests and the
 * Settings UI share a single source of truth.
 */
export const SCORE_WEIGHTS = Object.freeze({
  level_2nd: 100,
  level_3rd: 20,
  level_out_of_network: 5,
  mutuals_cap: 15,
  recency_max: 20,
  recency_half_life_days: 30,
  cooldown_days: 14,
  cooldown_penalty: -30,
});

export const DEFAULT_PROFILE_VISIT_DWELL_MS = 8000;
export const DEFAULT_HEALTH_COOLDOWN_HOURS = 24;

/**
 * Max rendered length of a Mode A connect-note before LinkedIn rejects it.
 * 300 = Premium tier ceiling observed on the live Connect modal fixture
 * (`example3.html`). Free tier is 200 — validate at runtime since LinkedIn
 * can change either.
 */
export const CONNECT_NOTE_CHAR_CAP = 300;

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
      mentions: true,
      suggested: true,
    }),
  }),
  outreach: Object.freeze({
    caps: DEFAULT_OUTREACH_CAPS,
    tier_thresholds: DEFAULT_TIER_THRESHOLDS,
    warm_visit_before_invite: true,
    profile_visit_dwell_ms: DEFAULT_PROFILE_VISIT_DWELL_MS,
    health_cooldown_hours: DEFAULT_HEALTH_COOLDOWN_HOURS,
    keywords: Object.freeze([]) as unknown as OutreachSettings['keywords'],
    firms: Object.freeze([]) as unknown as OutreachSettings['firms'],
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
    outreach: {
      caps: { ...DEFAULT_SETTINGS.outreach.caps },
      tier_thresholds: { ...DEFAULT_SETTINGS.outreach.tier_thresholds },
      warm_visit_before_invite: DEFAULT_SETTINGS.outreach.warm_visit_before_invite,
      profile_visit_dwell_ms: DEFAULT_SETTINGS.outreach.profile_visit_dwell_ms,
      health_cooldown_hours: DEFAULT_SETTINGS.outreach.health_cooldown_hours,
      keywords: [],
      firms: [],
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
