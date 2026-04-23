/** Connection degree from scan (NONE = not yet scanned). */
export type ProspectLevel = 'NONE' | '1st' | '2nd' | '3rd' | 'OUT_OF_NETWORK';

export type ScanStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'failed'
  | 'skipped';

/**
 * v2 — where the prospect is in the outreach pipeline.
 * Independent of `scan_status` (which tracks DOM-scan progress).
 */
export type ProspectLifecycleStatus =
  | 'new'
  | 'ready_for_visit'
  | 'ready_for_connect'
  | 'request_sent'
  | 'connected'
  | 'followup_due'
  | 'do_not_contact';

/** v2 — scoring-engine tier bucket. `null` = not yet scored. */
export type ProspectTier = 'S' | 'A' | 'B' | 'C' | 'skip';

/**
 * v2 — outreach action taxonomy (Mode A only; message surfaces are
 * clipboard-copy helpers, no automated Message/DM submission).
 */
export type OutreachActionKind =
  | 'profile_visit'
  | 'connection_request_sent'
  | 'message_sent'
  | 'followup_message_sent';

/** v2 — state machine for a queued outreach action. */
export type OutreachActionState =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn'
  | 'needs_review';

/** v2 — score-input breakdown persisted alongside the total so callers can audit. */
export interface ProspectScoreBreakdown {
  level: number;
  keyword: number;
  firm: number;
  mutuals: number;
  recency: number;
  cooldown: number;
  /** Phase 3.3 — flat boost for 2nd-degree rows within the unlock window. */
  recent_unlock: number;
  total: number;
}

export interface Prospect {
  id: number;
  url: string;
  slug: string;
  level: ProspectLevel;
  name: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  scan_status: ScanStatus;
  scan_error: string | null;
  scan_attempts: number;
  last_scanned: number | null;
  activity: {
    connected: boolean;
    connected_at: number | null;
    commented: boolean;
    commented_at: number | null;
    messaged: boolean;
    messaged_at: number | null;
  };
  notes: string;
  created_at: number;
  updated_at: number;
  // ——— v2 fields (nullable; backfilled during v1→v2 upgrade) ———
  lifecycle_status: ProspectLifecycleStatus;
  priority_score: number | null;
  score_breakdown: ProspectScoreBreakdown | null;
  tier: ProspectTier | null;
  mutual_count: number | null;
  next_action: OutreachActionKind | null;
  next_action_due_at: number | null;
  last_level_change_at: number | null;
  last_outreach_at: number | null;
}

/** Row insert shape (IndexedDB auto-increment assigns `id`). */
export type ProspectInsert = Omit<Prospect, 'id'>;

/** v2 — user-maintained keyword seed entry (Settings). */
export interface OutreachKeyword {
  /** Case-insensitive substring; matched against prospect headline. */
  term: string;
  /** Scoring weight (0..40). */
  weight: number;
  /** Strong matches drive +40, soft matches +15 by convention. */
  kind: 'strong' | 'soft';
}

/** v2 — user-maintained firm seed entry (Settings). */
export interface OutreachFirm {
  /** Case-insensitive substring; matched against prospect company. */
  name: string;
  /** Scoring weight (0..40). */
  weight: number;
  tier: 'top' | 'mid' | 'boutique';
}

/**
 * v2 — unified daily / weekly budget caps. Invites and visits share a single
 * risk bucket when `shared_bucket = true` (default).
 */
export interface OutreachCaps {
  daily_invites: number;
  daily_visits: number;
  daily_messages: number;
  weekly_invites: number;
  shared_bucket: boolean;
}

/** v2 — scoring tier thresholds (inclusive lower bounds). */
export interface TierThresholds {
  S: number;
  A: number;
  B: number;
  C: number;
}

/** v2 — all outreach-engine settings under a single namespace. */
export interface OutreachSettings {
  caps: OutreachCaps;
  tier_thresholds: TierThresholds;
  /** Queue a 24–72h pre-invite profile_visit before a connection_request_sent. */
  warm_visit_before_invite: boolean;
  /** Min dwell on a profile tab before a `profile_visited` interaction counts. */
  profile_visit_dwell_ms: number;
  /** Health-breach kill switch cooldown before manual resume is allowed. */
  health_cooldown_hours: number;
  /** Phase 4.3 — kill-switch thresholds (editable at runtime via Settings). */
  kill_switch_thresholds: KillSwitchThresholds;
  /** User-maintained keyword list consumed by the scoring engine. */
  keywords: OutreachKeyword[];
  /** User-maintained firm whitelist consumed by the scoring engine. */
  firms: OutreachFirm[];
}

export interface Settings {
  id: 'global';
  scan: {
    min_delay_ms: number;
    max_delay_ms: number;
    daily_cap: number;
    retry_on_failure: boolean;
    max_retries: number;
  };
  highlight: {
    enabled: boolean;
    colors: {
      first: string;
      second: string;
      third: string;
      out_of_network: string;
    };
    show_on: {
      post_authors: boolean;
      reposters: boolean;
      commenters: boolean;
      reactors: boolean;
      mentions: boolean;
      suggested: boolean;
    };
  };
  /** v2 — outreach engine config. Backfilled from defaults for v1 installs. */
  outreach: OutreachSettings;
  updated_at: number;
}

export type ScanWorkerStatus = 'idle' | 'running' | 'paused' | 'auto_paused';

export type AutoPauseReason =
  | 'captcha'
  | 'rate_limit'
  | 'auth_wall'
  | 'health_breach'
  | null;

export interface ScanState {
  id: 'current';
  status: ScanWorkerStatus;
  auto_pause_reason: AutoPauseReason;
  started_at: number | null;
  last_activity_at: number | null;
  scans_today: number;
  day_bucket: string;
  current_prospect_id: number | null;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  event: string;
  prospect_id: number | null;
  data: Record<string, unknown>;
}

export type LogEntryInsert = Omit<LogEntry, 'id'>;

/**
 * Deep-partial patch shape for {@link Settings}. Mirrors the nesting exactly
 * so callers can pass `{ scan: { daily_cap: 100 } }` without having to
 * supply every sibling field.
 */
export interface SettingsPatch {
  scan?: Partial<Settings['scan']>;
  highlight?: {
    enabled?: Settings['highlight']['enabled'];
    colors?: Partial<Settings['highlight']['colors']>;
    show_on?: Partial<Settings['highlight']['show_on']>;
  };
  outreach?: {
    caps?: Partial<OutreachCaps>;
    tier_thresholds?: Partial<TierThresholds>;
    warm_visit_before_invite?: boolean;
    profile_visit_dwell_ms?: number;
    health_cooldown_hours?: number;
    kill_switch_thresholds?: Partial<KillSwitchThresholds>;
    /** Full replace — caller owns the list. */
    keywords?: OutreachKeyword[];
    /** Full replace — caller owns the list. */
    firms?: OutreachFirm[];
  };
  updated_at?: number;
}

// ——— Stats snapshot shown in popup / dashboard ———

export interface ProspectStats {
  total: number;
  by_level: Record<ProspectLevel, number>;
  by_scan_status: Record<ScanStatus, number>;
}

// ——— Typed message bus (popup/dashboard/content ↔ background) ———

export interface CsvCommitPayload {
  filename: string;
  urls: string[];
  invalid_count?: number;
  invalid_samples?: string[];
}

export type ProspectSortField =
  | 'created_at'
  | 'updated_at'
  | 'name'
  | 'company'
  | 'level'
  | 'scan_status'
  | 'last_scanned';

export type SortDirection = 'asc' | 'desc';

/** Filter + pagination payload for the dashboard prospect table. */
export interface ProspectQuery {
  /** Case-insensitive substring match against slug/name/company/headline. */
  search?: string;
  /** If set, rows must have one of the given levels. */
  levels?: ProspectLevel[];
  /** If set, rows must have one of the given scan statuses. */
  scan_statuses?: ScanStatus[];
  /** Activity flags — each optional; when true, the row must have the flag. */
  activity?: {
    connected?: boolean;
    commented?: boolean;
    messaged?: boolean;
  };
  sort_field?: ProspectSortField;
  sort_direction?: SortDirection;
  page?: number;
  page_size?: number;
}

export interface ProspectPage {
  rows: Prospect[];
  total: number;
  page: number;
  page_size: number;
}

/** Patch shape accepted by `PROSPECT_UPDATE` — fields editable from the dashboard. */
export interface ProspectPatch {
  notes?: string;
  activity?: Partial<Prospect['activity']>;
}

export interface ActivityKind {
  connected?: boolean;
  commented?: boolean;
  messaged?: boolean;
}

export interface LogQuery {
  levels?: LogLevel[];
  /** Substring match against `event` field. */
  event_contains?: string;
  /** Only entries related to this prospect (if set). */
  prospect_id?: number | null;
  limit?: number;
}

/**
 * Slim prospect summary returned by `SLUGS_QUERY`. The highlight content
 * script only needs fields used for matching + rendering (id for deep links,
 * level for color coding, name/company/headline for tooltip context).
 */
export interface ProspectHighlightSummary {
  id: number;
  level: ProspectLevel;
  name: string | null;
  headline: string | null;
  company: string | null;
}

/** Slug → summary map payload sent to the feed highlighter. */
export type SlugMap = Record<string, ProspectHighlightSummary>;

/**
 * Lightweight `/in/` profile shape collected from the currently visible feed.
 * Used by the random color-label seeding flow for manual UI testing.
 */
export interface FeedVisibleProfile {
  url: string;
  slug: string;
  name: string | null;
}

export interface FeedVisibleProfilesResult {
  profiles: FeedVisibleProfile[];
  truncated: boolean;
}

export type Message =
  // popup / dashboard → background
  | { type: 'CSV_COMMIT'; payload: CsvCommitPayload }
  | { type: 'STATS_QUERY' }
  | { type: 'SCAN_STATE_QUERY' }
  | { type: 'SCAN_START' }
  | { type: 'SCAN_PAUSE' }
  | { type: 'SCAN_RESUME' }
  | { type: 'PROSPECTS_LIST'; payload: ProspectQuery }
  | { type: 'PROSPECT_GET'; payload: { id: number } }
  | { type: 'PROSPECT_UPDATE'; payload: { id: number; patch: ProspectPatch } }
  | { type: 'PROSPECTS_BULK_ACTIVITY'; payload: { ids: number[]; activity: ActivityKind } }
  | { type: 'PROSPECTS_RESCAN'; payload: { ids: number[] } }
  | { type: 'PROSPECTS_DELETE'; payload: { ids: number[] } }
  | { type: 'PROSPECT_LOG_QUERY'; payload: { prospect_id: number; limit?: number } }
  | { type: 'SETTINGS_QUERY' }
  | { type: 'SETTINGS_UPDATE'; payload: SettingsPatch }
  | { type: 'LOGS_QUERY'; payload: LogQuery }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'EXPORT_CSV'; payload: { filter: ProspectQuery | null } }
  | { type: 'FEED_TEST_SEED_RANDOM_LEVELS' }
  // content (highlight) → background
  | { type: 'SLUGS_QUERY' }
  | {
      type: 'FEED_EVENTS_UPSERT_BULK';
      payload: { events: FeedEventInsert[] };
    }
  | { type: 'FEED_EVENTS_QUERY'; payload: FeedEventQuery }
  | {
      type: 'FEED_EVENT_UPDATE';
      payload: { id: number; task_status: FeedTaskStatus };
    }
  | {
      type: 'FEED_EVENTS_BULK_UPDATE';
      payload: { ids: number[]; task_status: FeedTaskStatus };
    }
  | { type: 'DAILY_SNAPSHOT_QUERY' }
  | { type: 'HEALTH_SNAPSHOT_QUERY' }
  | { type: 'ANALYTICS_SNAPSHOT_QUERY' }
  | { type: 'TEMPLATES_LIST'; payload?: { kind?: MessageTemplateKind } }
  | { type: 'TEMPLATE_UPSERT'; payload: TemplateUpsertPayload }
  | { type: 'TEMPLATE_ARCHIVE'; payload: { id: number; archived: boolean } }
  | { type: 'OUTREACH_QUEUE_QUERY'; payload?: OutreachQueueFilter }
  | { type: 'OUTREACH_ACTION_RECORD'; payload: OutreachActionRecordPayload }
  | {
      type: 'OUTREACH_SKIP_TODAY';
      payload: { prospect_id: number; skip: boolean };
    }
  | {
      type: 'OUTREACH_PREFILL_CONNECT';
      payload: OutreachPrefillConnectPayload;
    }
  // Phase 5.6 — invite withdrawal detector (content → background)
  | {
      type: 'OUTREACH_WITHDRAW_DETECTED';
      payload: OutreachWithdrawDetectedPayload;
    }
  // Phase 4.3 / 5.3 — LinkedIn restriction-banner detector (content → background)
  | {
      type: 'LINKEDIN_RESTRICTION_BANNER';
      payload: LinkedInRestrictionBannerPayload;
    }
  // Phase 3.1/3.2 — Feed Crawl Session (manual)
  | { type: 'FEED_CRAWL_SESSION_START' }
  | { type: 'FEED_CRAWL_SESSION_STOP' }
  | { type: 'FEED_CRAWL_SESSION_STATUS' }
  // background → content (highlight) direct tab message
  | { type: 'FEED_TEST_COLLECT_VISIBLE_PROFILES'; payload?: { max_profiles?: number } }
  | {
      type: 'OUTREACH_PREFILL_CONNECT_IN_TAB';
      payload: OutreachPrefillConnectPayload;
    }
  | { type: 'FEED_CRAWL_RUN_IN_TAB'; payload: { session_id: string } }
  | { type: 'FEED_CRAWL_CANCEL_IN_TAB'; payload: { session_id: string } }
  // background → all listeners (broadcast)
  | { type: 'PROSPECTS_UPDATED'; payload: { changed_ids: number[] } }
  | { type: 'SCAN_STATE_CHANGED'; payload: ScanState }
  | { type: 'SETTINGS_CHANGED'; payload: Settings }
  | { type: 'FEED_EVENTS_UPDATED'; payload: { new_count: number } }
  | { type: 'FEED_CRAWL_SESSION_CHANGED'; payload: FeedCrawlStatus };

export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Maps a message `type` to the shape of its successful `data` response. */
export interface MessageResponseMap {
  CSV_COMMIT: { inserted: number };
  STATS_QUERY: ProspectStats;
  SCAN_STATE_QUERY: ScanState;
  SCAN_START: ScanState;
  SCAN_PAUSE: ScanState;
  SCAN_RESUME: ScanState;
  PROSPECTS_LIST: ProspectPage;
  PROSPECT_GET: Prospect | null;
  PROSPECT_UPDATE: Prospect;
  PROSPECTS_BULK_ACTIVITY: { updated: number };
  PROSPECTS_RESCAN: { updated: number };
  PROSPECTS_DELETE: { deleted: number };
  PROSPECT_LOG_QUERY: LogEntry[];
  SETTINGS_QUERY: Settings;
  SETTINGS_UPDATE: Settings;
  LOGS_QUERY: LogEntry[];
  CLEAR_ALL_DATA: { cleared: true };
  EXPORT_CSV: { csv: string; row_count: number };
  FEED_TEST_SEED_RANDOM_LEVELS: { seeded: number; collected: number; tab_id: number };
  SLUGS_QUERY: SlugMap;
  FEED_EVENTS_UPSERT_BULK: { inserted: number; updated: number };
  FEED_EVENTS_QUERY: FeedEventPage;
  FEED_EVENT_UPDATE: FeedEvent;
  FEED_EVENTS_BULK_UPDATE: { updated: number };
  DAILY_SNAPSHOT_QUERY: DailySnapshot;
  HEALTH_SNAPSHOT_QUERY: HealthSnapshot;
  ANALYTICS_SNAPSHOT_QUERY: AnalyticsSnapshot;
  TEMPLATES_LIST: MessageTemplate[];
  TEMPLATE_UPSERT: MessageTemplate;
  TEMPLATE_ARCHIVE: MessageTemplate;
  OUTREACH_QUEUE_QUERY: OutreachQueuePage;
  OUTREACH_ACTION_RECORD: OutreachAction;
  OUTREACH_SKIP_TODAY: { prospect_id: number; skipped: boolean };
  OUTREACH_PREFILL_CONNECT: OutreachPrefillResult;
  OUTREACH_PREFILL_CONNECT_IN_TAB: OutreachPrefillResult;
  OUTREACH_WITHDRAW_DETECTED: OutreachWithdrawResult;
  LINKEDIN_RESTRICTION_BANNER: LinkedInRestrictionBannerResult;
  FEED_TEST_COLLECT_VISIBLE_PROFILES: FeedVisibleProfilesResult;
  FEED_CRAWL_SESSION_START: FeedCrawlStatus;
  FEED_CRAWL_SESSION_STOP: FeedCrawlStatus;
  FEED_CRAWL_SESSION_STATUS: FeedCrawlStatus;
  FEED_CRAWL_RUN_IN_TAB: FeedCrawlSessionResult;
  FEED_CRAWL_CANCEL_IN_TAB: { canceled: boolean };
  PROSPECTS_UPDATED: void;
  SCAN_STATE_CHANGED: void;
  SETTINGS_CHANGED: void;
  FEED_EVENTS_UPDATED: void;
  FEED_CRAWL_SESSION_CHANGED: void;
}

/**
 * Shape returned by the in-page scan function (executed in the hidden tab).
 * Any of the three `detected_*` flags trigger an `auto_paused` transition in
 * the background worker; otherwise `data` becomes the parsed profile snapshot.
 */
export interface ScanPageResult {
  ok: boolean;
  data: {
    level: ProspectLevel;
    name: string | null;
    headline: string | null;
    company: string | null;
    location: string | null;
    detected_captcha: boolean;
    detected_rate_limit: boolean;
    detected_auth_wall: boolean;
    profile_unavailable: boolean;
  } | null;
  error: string | null;
}

// ———————————————————————————————————————————————————————————
// v2 — outreach_actions store
// ———————————————————————————————————————————————————————————

/**
 * v2 — one queued or completed outreach step against a prospect.
 * State machine: draft → approved → sent → (accepted | declined | expired | withdrawn)
 * `needs_review` is a sidelane for ambiguous detections that want user confirm.
 */
export interface OutreachAction {
  id: number;
  prospect_id: number;
  kind: OutreachActionKind;
  state: OutreachActionState;
  /**
   * Stable idempotency key. Format:
   * `{prospect_id}:{kind}:{yyyy-mm-dd}:{short_hash}` — prevents double-sends
   * across service-worker restarts / detector races.
   */
  idempotency_key: string;
  /** Template that produced the rendered body (if any). */
  template_id: number | null;
  template_version: number | null;
  /** Snapshot of the rendered note/message at queue time (audit trail). */
  rendered_body: string | null;
  /** Optional correlation to a feed event that seeded this action. */
  source_feed_event_id: number | null;
  created_at: number;
  approved_at: number | null;
  sent_at: number | null;
  resolved_at: number | null;
  notes: string | null;
}

export type OutreachActionInsert = Omit<OutreachAction, 'id'>;

// ———————————————————————————————————————————————————————————
// v2 — feed_events store
// ———————————————————————————————————————————————————————————

export type FeedEventKind =
  | 'post'
  | 'comment'
  | 'repost'
  | 'reaction'
  | 'mention'
  | 'tagged';

/** v2 — URN prefix classifier for filtering group-only traffic, etc. */
export type FeedPostKind = 'activity' | 'ugcPost' | 'groupPost' | 'share';

export type FeedMode = 'top' | 'recent' | 'unknown';

// ———————————————————————————————————————————————————————————
// v2 — Phase 3.1 / 3.2 — Manual Feed Crawl Session
// ———————————————————————————————————————————————————————————

/**
 * Why a manual-triggered crawl ended. `completed` means both modes ran to
 * their natural stop (no-new-events-for-N-scrolls or max-scroll-cap).
 */
export type FeedCrawlStopReason =
  | 'completed'
  | 'max_scrolls'
  | 'no_new_events'
  | 'user_interaction'
  | 'canceled'
  | 'navigation_failed'
  | 'error';

/** Per-mode (`top` / `recent`) metrics captured during one pass. */
export interface FeedCrawlModeMetrics {
  mode: 'top' | 'recent';
  scroll_steps: number;
  events_captured: number;
  started_at: number;
  ended_at: number;
  stop_reason: FeedCrawlStopReason;
}

/** Aggregate result for a full two-mode crawl session. */
export interface FeedCrawlSessionResult {
  session_id: string;
  tab_id: number;
  started_at: number;
  ended_at: number;
  duration_ms: number;
  total_events_captured: number;
  /**
   * Count of events that appeared in *both* modes (same event_fingerprint) —
   * overlap indicator per Phase 3.2 telemetry.
   */
  overlap_count: number;
  modes: FeedCrawlModeMetrics[];
  stop_reason: FeedCrawlStopReason;
}

/**
 * Lightweight status snapshot for the popup. Either the session is running
 * (then `result` is null + `started_at` is set) or it's idle (then `result`
 * carries the most recent completed session, if any).
 */
export interface FeedCrawlStatus {
  running: boolean;
  tab_id: number | null;
  session_id: string | null;
  started_at: number | null;
  last_result: FeedCrawlSessionResult | null;
}


export type FeedTaskStatus = 'new' | 'queued' | 'done' | 'ignored';

export interface FeedEvent {
  id: number;
  prospect_id: number;
  slug: string;
  event_kind: FeedEventKind;
  post_kind: FeedPostKind | null;
  /** Canonical post permalink, when resolvable. */
  post_url: string | null;
  /** Canonical comment permalink, when event_kind === 'comment'. */
  comment_url: string | null;
  /** Raw activity URN (e.g. `urn:li:activity:7451...`). */
  activity_urn: string | null;
  /** Raw comment URN (`urn:li:comment:(urn:li:activity:X,Y)`). */
  comment_urn: string | null;
  feed_mode: FeedMode;
  /** sha1-based dedupe key. See `shared/scoring.ts#computeFeedEventFingerprint`. */
  event_fingerprint: string;
  first_seen_at: number;
  last_seen_at: number;
  seen_count: number;
  task_status: FeedTaskStatus;
}

export type FeedEventInsert = Omit<FeedEvent, 'id'>;

/** Filter + pagination payload for the Engagement Tasks dashboard table. */
export interface FeedEventQuery {
  /** Case-insensitive substring match against prospect slug/name/company. */
  search?: string;
  /** If set, rows must have one of the given event kinds. */
  event_kinds?: FeedEventKind[];
  /** If set, rows must have one of the given task statuses. */
  task_statuses?: FeedTaskStatus[];
  /** Only rows for this prospect (drawer / deep-link use). */
  prospect_id?: number;
  /** Hard limit before pagination slicing. Defaults to 500. */
  limit?: number;
}

/** Feed event enriched with denormalized prospect info for table rendering. */
export interface FeedEventRow extends FeedEvent {
  prospect_name: string | null;
  prospect_level: ProspectLevel;
  prospect_headline: string | null;
  prospect_company: string | null;
}

export interface FeedEventPage {
  rows: FeedEventRow[];
  total: number;
  /** Count of `task_status = 'new'` across the entire store (for badge). */
  new_count: number;
}

// ———————————————————————————————————————————————————————————
// v2 — message_templates store
// ———————————————————————————————————————————————————————————

export type MessageTemplateKind = 'connect_note' | 'first_message' | 'followup';

export interface MessageTemplate {
  id: number;
  kind: MessageTemplateKind;
  /** Monotonic version within `kind` (A/B infra deferred to v2.1). */
  version: number;
  /** Optional human-readable label; defaults to `"{kind} v{version}"`. */
  name: string;
  /** Raw template body with `{{placeholder}}` tokens. */
  body: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export type MessageTemplateInsert = Omit<MessageTemplate, 'id'>;

/**
 * Payload for the `TEMPLATE_UPSERT` message.
 *
 * - Omit `id` → create a new template row (background assigns id + version).
 * - Include `id` → patch the named fields on that row (name/body/archived);
 *   `kind` and `version` are immutable once written.
 */
export interface TemplateUpsertPayload {
  id?: number;
  kind: MessageTemplateKind;
  name?: string;
  body: string;
  archived?: boolean;
}

// ———————————————————————————————————————————————————————————
// v2 — daily_usage store (budget counters, keyed by local day bucket)
// ———————————————————————————————————————————————————————————

export interface DailyUsage {
  /** Local `YYYY-MM-DD` bucket; primary key. */
  day_bucket: string;
  invites_sent: number;
  visits: number;
  messages_sent: number;
  followups_sent: number;
  feed_events_captured: number;
  updated_at: number;
}

/**
 * Popup daily quick-glance snapshot (Phase 4.1). Bundles today's outreach
 * counters with the inbox-unread count so the popup needs a single round-trip.
 */
export interface DailySnapshot {
  day_bucket: string;
  usage: DailyUsage;
  /** Count of `feed_events.task_status = 'new'` across all prospects. */
  inbox_new_count: number;
  /**
   * Phase 4.1 — outreach_actions that transitioned to `accepted` inside
   * today's local day bucket. Populated by the acceptance watcher
   * (Phase 3.3) when a prospect's level flips to `1st` after we sent them
   * an invite.
   */
  accepts_today: number;
  /**
   * Phase 4.1 — live `connection_request_sent` rows waiting on resolution.
   * Drives the "Pending invites" pill in the popup daily glance.
   */
  pending_invites: number;
}

// ———————————————————————————————————————————————————————————
// v2 — Outreach Queue (Phase 1.3, Mode A only)
// ———————————————————————————————————————————————————————————

/**
 * A single candidate row surfaced in the dashboard Outreach Queue and
 * popup "Next Best Target" CTA. Denormalized for easy table rendering; the
 * authoritative data lives on the `Prospect` + `OutreachAction` rows.
 */
export interface OutreachQueueCandidate {
  prospect_id: number;
  slug: string;
  url: string;
  name: string | null;
  headline: string | null;
  company: string | null;
  level: ProspectLevel;
  tier: ProspectTier | null;
  priority_score: number | null;
  lifecycle_status: ProspectLifecycleStatus;
  mutual_count: number | null;
  last_outreach_at: number | null;
  /** Action the queue recommends for this prospect at this moment. */
  recommended_action: OutreachActionKind;
  /** Short, display-only reason — e.g. "2nd · S tier" or "Warming visit". */
  recommended_reason: string;
  /** If true, an invite has been sent and we're waiting on acceptance. */
  has_pending_invite: boolean;
  /** If true, the user chose "Skip for today" within the current day bucket. */
  skipped_today: boolean;
}

export interface OutreachQueueFilter {
  /** Restrict to one or more tiers. Empty → all tiers. */
  tiers?: ProspectTier[];
  /** Restrict to one or more connection levels. Empty → 2nd/3rd/OUT_OF_NETWORK. */
  levels?: ProspectLevel[];
  /** Restrict to one or more recommended action kinds. Empty → all. */
  actions?: OutreachActionKind[];
  /**
   * Restrict to one or more lifecycle statuses. Empty / undefined → all
   * except `do_not_contact` (which the recommender already excludes).
   * Useful for isolating e.g. `followup_due` rows when chasing warm leads.
   */
  lifecycle_statuses?: ProspectLifecycleStatus[];
  /** If true, include rows the user marked "Skip for today". Default false. */
  include_skipped?: boolean;
  /** Hard limit on returned rows. Defaults to 200. */
  limit?: number;
}

/**
 * Snapshot returned by `OUTREACH_QUEUE_QUERY` — the queue rows themselves
 * plus enough context to render the header strip + budget chips without a
 * second round-trip.
 */
export interface OutreachQueuePage {
  rows: OutreachQueueCandidate[];
  /** Total candidates matching the filter (rows is capped at `limit`). */
  total: number;
  caps: OutreachCaps;
  usage: DailyUsage;
  day_bucket: string;
  /** Top-of-queue candidate that respects today's caps (for "Next Best"). */
  next_best: OutreachQueueCandidate | null;
}

/**
 * Payload for `OUTREACH_ACTION_RECORD` — creates (or upserts on idempotency
 * key) a row in `outreach_actions` in the given state. Used by the queue
 * "Mark request sent" / "Mark message sent" buttons and the detector path
 * once Phase 5.3 lands.
 */
export interface OutreachActionRecordPayload {
  prospect_id: number;
  kind: OutreachActionKind;
  state: OutreachActionState;
  template_id?: number | null;
  template_version?: number | null;
  rendered_body?: string | null;
  source_feed_event_id?: number | null;
  notes?: string | null;
  /** Optional override — defaults to `prospect:kind:yyyy-mm-dd`. */
  idempotency_key?: string;
}

/**
 * Payload for `OUTREACH_PREFILL_CONNECT` — background forwards this to the
 * active LinkedIn tab's content script, which finds the Connect button on the
 * loaded profile, opens the note modal, and types the rendered body. User
 * still clicks Send (Mode A invariant).
 */
export interface OutreachPrefillConnectPayload {
  prospect_id: number;
  slug: string;
  rendered_body: string;
  template_id?: number | null;
  template_version?: number | null;
}

export type OutreachPrefillStage =
  | 'found_button'
  | 'opened_modal'
  | 'filled_textarea'
  | 'awaiting_send';

export interface OutreachPrefillResult {
  stage: OutreachPrefillStage;
  /** Rendered body that was actually typed into the textarea. */
  filled_body: string | null;
  /** True if the content script wrote a draft row before returning. */
  draft_action_id: number | null;
}

/**
 * Phase 5.6 — emitted by the content-side withdrawal watcher when LinkedIn
 * confirms the invite row was withdrawn (row removed or toast shown within
 * the observation window). The prospect is resolved in-tab via the
 * SlugMap cache.
 */
export interface OutreachWithdrawDetectedPayload {
  prospect_id: number;
  slug: string;
  /** Epoch ms of the Withdraw click. */
  withdrawn_at: number;
}

export interface OutreachWithdrawResult {
  /** True when a live `connection_request_sent` row was found and flipped. */
  matched: boolean;
  /** ID of the outreach_action row that was flipped (if any). */
  action_id: number | null;
  /** Day bucket that received the budget credit (invites/visits). */
  credited_day_bucket: string | null;
}

/**
 * Phase 4.3 / 5.3 — emitted by the content-side restriction-banner watcher
 * when LinkedIn shows an account-restriction warning on any page. Background
 * trips the kill switch with `auto_pause_reason = 'health_breach'` and a
 * `restriction_banner` detail.
 */
export interface LinkedInRestrictionBannerPayload {
  kind: 'account_restricted' | 'unusual_activity' | 'temporary_restriction';
  /** Short excerpt of the matched phrase for activity-log auditability. */
  phrase: string;
  /** URL of the page where the banner was seen. */
  page_url: string;
}

export interface LinkedInRestrictionBannerResult {
  tripped: boolean;
}

/** Per-day skip flag (scoped to the local day bucket). */
export interface OutreachSkipMarker {
  prospect_id: number;
  day_bucket: string;
}

// ———————————————————————————————————————————————————————————
// v2 — Phase 4.3 health snapshot + kill-switch + resume cooldown
// ———————————————————————————————————————————————————————————

/** Phase 4.3 — kill-switch thresholds (mutable at runtime via Settings). */
export interface KillSwitchThresholds {
  /** Min acceptance rate over the last 7d before kill-switch fires. 0–1. */
  accept_rate_floor: number;
  /** Minimum invites sent in 7d before accept rate is meaningful. */
  invites_sent_min: number;
  /** Rolling window for safety-trigger pile-up detection, in hours. */
  safety_window_hours: number;
  /** Max safety triggers inside the rolling window before breach. */
  safety_trigger_max: number;
}

/** Phase 4.3 — 7-day rollup computed on demand from activity_log + daily_usage + outreach_actions. */
export interface HealthSnapshot {
  /** Local day bucket the snapshot was built against (inclusive "today"). */
  day_bucket: string;
  /** Rolling 7-day aggregates (today + previous 6 local days). */
  invites_sent_7d: number;
  accepts_7d: number;
  /** `accepts_7d / invites_sent_7d`. Null when invites_sent_7d === 0. */
  accept_rate_7d: number | null;
  visits_7d: number;
  messages_sent_7d: number;
  feed_events_captured_7d: number;
  /** Count of `scan_auto_paused` events in the last 7d, broken out by reason. */
  safety_triggers_7d: {
    captcha: number;
    rate_limit: number;
    auth_wall: number;
    health_breach: number;
    total: number;
  };
  /** Safety-trigger count inside the `safety_window_hours` rolling window (for live breach check). */
  safety_triggers_in_window: number;
  /** Per-day buckets (oldest → newest, length 7) for sparkline rendering. */
  daily: HealthDaily[];
  /** Current kill-switch state derived from the snapshot + thresholds. */
  breach: HealthBreach | null;
  /** Cooldown gate — null if resume is allowed right now. */
  cooldown: HealthCooldown | null;
  /** Thresholds applied to compute `breach` (snapshot of current settings). */
  thresholds: KillSwitchThresholds;
}

export interface HealthDaily {
  day_bucket: string;
  invites_sent: number;
  accepts: number;
  visits: number;
  messages_sent: number;
  feed_events_captured: number;
  safety_triggers: number;
}

export type HealthBreachReason =
  | 'accept_rate_floor'
  | 'safety_pileup'
  | 'restriction_banner';

export interface HealthBreach {
  reason: HealthBreachReason;
  detail: string;
}

export interface HealthCooldown {
  /** Epoch ms of the breach that started the cooldown. */
  since: number;
  /** Epoch ms before which manual resume is rejected. */
  until: number;
  /** Hours the user configured when the cooldown was started. */
  hours: number;
}

// ———————————————————————————————————————————————————————————
// v2 — Phase 4.2 weekly deep-dive analytics snapshot
// ———————————————————————————————————————————————————————————

/** Coarse firm-weight bucket used in cohort slices. */
export type FirmTierBucket = 'top' | 'mid' | 'boutique' | 'none';

export interface DailyActionsPoint {
  day_bucket: string;
  profile_visit: number;
  connection_request_sent: number;
  message_sent: number;
  followup_message_sent: number;
  feed_events_captured: number;
}

export interface WeeklyAcceptRatePoint {
  /** Monday of the week in local time, `YYYY-MM-DD`. */
  week_start: string;
  invites_sent: number;
  accepts: number;
  /** accepts / invites_sent. Null when invites_sent === 0. */
  accept_rate: number | null;
}

export interface EventToActionLatency {
  sample_size: number;
  median_ms: number | null;
  p90_ms: number | null;
}

export interface InboxRatio {
  captured: number;
  /** `queued` + `done` + `ignored`. */
  handled: number;
  new_count: number;
  /** handled / captured. Null when captured === 0. */
  handled_rate: number | null;
}

export interface AnalyticsCohortRow<K extends string> {
  key: K;
  invites_sent: number;
  accepts: number;
  accept_rate: number | null;
}

export interface AnalyticsTotals30d {
  invites_sent: number;
  accepts: number;
  messages_sent: number;
  profile_visits: number;
  feed_events_captured: number;
}

export interface AnalyticsSnapshot {
  generated_at: number;
  today_bucket: string;
  actions_30d: DailyActionsPoint[];
  accept_rate_12w: WeeklyAcceptRatePoint[];
  event_to_action: EventToActionLatency;
  inbox_ratio: InboxRatio;
  cohort_by_level: AnalyticsCohortRow<ProspectLevel>[];
  cohort_by_firm_tier: AnalyticsCohortRow<FirmTierBucket>[];
  cohort_by_event_kind: AnalyticsCohortRow<FeedEventKind | 'no_event'>[];
  totals_30d: AnalyticsTotals30d;
}
