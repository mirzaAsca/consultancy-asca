import type {
  KillSwitchThresholds,
  OutreachCaps,
  OutreachSettings,
  ScanState,
  Settings,
  TierThresholds,
} from './types';

export const DB_NAME = 'linkedin-investor-scout';
/**
 * v1 (scan/prospect MVP) → v2 (outreach engine: new Prospect fields,
 * + outreach_actions / daily_usage / message_templates / feed_events stores)
 * → v3 (Phase 5 reconciliation: interaction_events + correlation_tokens).
 * See `db.ts` upgrade() hook and `MASTER.md` §19 v1.1 amendment block.
 */
export const DB_VERSION = 4;
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
  mutuals_cap: 15,
  recency_max: 20,
  recency_half_life_days: 30,
  cooldown_days: 14,
  cooldown_penalty: -30,
  // Phase 3.3: freshly-unlocked 2nd-degree rows get a flat boost for the first
  // `recent_unlock_days` after the level transition. Keeps the queue honest
  // about acting on new reachability while the window is still warm.
  recent_unlock_boost: 25,
  recent_unlock_days: 7,
});

export const DEFAULT_PROFILE_VISIT_DWELL_MS = 8000;
export const DEFAULT_HEALTH_COOLDOWN_HOURS = 24;

/**
 * Phase 3.3 — when an invite is accepted (level transition → `1st`), schedule
 * the follow-up message as a draft due this many days out. 3 days is the
 * sweet spot: long enough that the acceptance notification has been seen and
 * the connection isn't cold, short enough that the context is still fresh.
 * Manual send only — the draft is surfaced in the outreach queue; the user
 * still copies + pastes into the LinkedIn composer per §19.2.
 */
export const FOLLOWUP_DRAFT_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Phase 1.3 — pre-invite warming dedupe.
 *
 * When `warm_visit_before_invite` is on, the recommender suppresses the
 * "warm" recommendation for any prospect we've visited in the last
 * `WARMING_VISIT_DEDUPE_MS`. Older visits are treated as stale signal — if a
 * 30-day-old visit didn't lead to an invite, the warming context is no
 * longer fresh enough for LinkedIn to weight the second visit, and we'd
 * rather burn one slot now than let the prospect rot in queue purgatory.
 *
 * 14 days mirrors the cooldown penalty in scoring (`SCORE_WEIGHTS.cooldown`)
 * — same horizon for "we touched this person recently."
 */
export const WARMING_VISIT_DEDUPE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Phase 1.3 — minimum delay between a fresh warming visit and the follow-up
 * invite. Sending the invite seconds after a profile visit defeats the
 * warming signal LinkedIn weighs ("did this person look at me first?").
 *
 * 24h is the conservative lower bound; the user can always run the invite
 * manually before the gate elapses (the recommender just won't surface it).
 */
export const WARMING_VISIT_INVITE_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * MASTER §19.4 — S/A-tier rows whose `last_scanned` is older than this window
 * get flipped back to `pending` at scan-loop entry so the queue surfaces fresh
 * level / metadata signal for the highest-value targets. Lower-tier rows wait
 * for a manual rescan or full re-import.
 */
export const STALE_SA_TIER_REQUEUE_DAYS = 30;

/**
 * Phase 1.3 / FSM closure — LinkedIn invites that haven't been accepted within
 * this window are auto-flipped from `sent` → `expired` at scan-loop entry.
 * 180 days mirrors LinkedIn's documented invite-expiration window; rows past
 * the cutoff would never accept anyway, so closing the FSM keeps the outreach
 * queue + analytics honest. We do NOT credit the budget back: the slot was
 * physically consumed when the invite was sent six months ago and it already
 * counts in any `daily_usage` history that's still in scope (7d health window
 * is well inside the cutoff). Withdrawals get budget credit; expirations don't.
 */
export const INVITE_EXPIRATION_DAYS = 180;

/**
 * Phase 4.3 — kill-switch defaults. Values chosen to trip only on real trouble:
 *  - accept_rate_floor 15% mirrors the conservative baseline for LinkedIn
 *    outreach; below that the list is likely stale or templates are off.
 *  - invites_sent_min 20 avoids tripping on tiny sample sizes.
 *  - safety_window 24h / max 2 captures "LinkedIn keeps challenging us today"
 *    without reacting to a single captcha.
 */
export const DEFAULT_KILL_SWITCH_THRESHOLDS: Readonly<KillSwitchThresholds> =
  Object.freeze({
    accept_rate_floor: 0.15,
    invites_sent_min: 20,
    safety_window_hours: 24,
    safety_trigger_max: 2,
  });

/**
 * Max rendered length of a Mode A connect-note before LinkedIn rejects it.
 * 300 = Premium tier ceiling observed on the live Connect modal fixture
 * (`example3.html`). Free tier is 200 — validate at runtime since LinkedIn
 * can change either.
 */
export const CONNECT_NOTE_CHAR_CAP = 300;

/**
 * Phase 5.6 — default correlation window between an inbox "Open" click and a
 * matching detector firing in the opened tab. 45 min matches the user's
 * typical inbox → act rhythm; tokens older than this are GC'd on the next
 * write and the detector falls back to confidence = 'medium' with
 * reconciliation_status = 'unmatched' (organic interaction).
 */
export const CORRELATION_TOKEN_DEFAULT_WINDOW_MS = 45 * 60 * 1000;

// ——— v2 Phase 3.1 / 3.2 — Manual Feed Crawl Session ———

/**
 * Max scroll steps per mode pass. LinkedIn's feed lazy-loads ~6 cards per
 * viewport; 20 is enough to walk a few hundred cards without hammering.
 */
export const FEED_CRAWL_MAX_SCROLLS_PER_MODE = 20;

/**
 * Stop the pass once this many *consecutive* scroll cycles yield zero new
 * events — the feed has clearly run out of fresh prospect-authored cards.
 */
export const FEED_CRAWL_NO_NEW_EVENTS_STOP = 3;

/** Gentle scroll step bounds (px). Applied with ±20 % gaussian jitter. */
export const FEED_CRAWL_MIN_SCROLL_PX = 600;
export const FEED_CRAWL_MAX_SCROLL_PX = 1200;

/** Wait after each scroll so LinkedIn can hydrate the next batch of cards. */
export const FEED_CRAWL_MIN_WAIT_MS = 2000;
export const FEED_CRAWL_MAX_WAIT_MS = 5000;

/**
 * Max time we'll wait for the feed root to render after a mode-switch nav
 * before aborting the pass. Covers slow starts / offline states.
 */
export const FEED_CRAWL_FEED_READY_TIMEOUT_MS = 15_000;

/** Canonical URL per feed mode (§7.2 mode detection uses `?sortBy`). */
export const FEED_CRAWL_MODE_URL: Readonly<Record<'top' | 'recent', string>> =
  Object.freeze({
    top: 'https://www.linkedin.com/feed/',
    recent: 'https://www.linkedin.com/feed/?sortBy=LAST_MODIFIED',
  });

/**
 * Phase 3.1 — passive continuous harvester. Background-side scheduler that
 * runs a single-mode crawl pass against the user's active LinkedIn feed tab
 * while scan_state.status === 'running'. No `chrome.alarms`; uses setTimeout
 * polling so it stops cleanly when the scan pauses.
 */
/** Minimum user-idle window before a passive cycle is allowed to fire. */
export const PASSIVE_HARVEST_USER_IDLE_MS = 30_000;
/** Minimum gap between two passive cycles. */
export const PASSIVE_HARVEST_COOLDOWN_MS = 5 * 60_000;
/** How often the scheduler wakes up to evaluate firing conditions. */
export const PASSIVE_HARVEST_TICK_INTERVAL_MS = 60_000;

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
    kill_switch_thresholds: DEFAULT_KILL_SWITCH_THRESHOLDS,
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
      kill_switch_thresholds: {
        ...DEFAULT_SETTINGS.outreach.kill_switch_thresholds,
      },
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
