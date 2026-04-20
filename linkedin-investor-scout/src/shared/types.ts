/** Connection degree from scan (NONE = not yet scanned). */
export type ProspectLevel = 'NONE' | '1st' | '2nd' | '3rd' | 'OUT_OF_NETWORK';

export type ScanStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'failed'
  | 'skipped';

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
}

/** Row insert shape (IndexedDB auto-increment assigns `id`). */
export type ProspectInsert = Omit<Prospect, 'id'>;

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
  updated_at: number;
}

export type ScanWorkerStatus = 'idle' | 'running' | 'paused' | 'auto_paused';

export type AutoPauseReason = 'captcha' | 'rate_limit' | 'auth_wall' | null;

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
  // background → content (highlight) direct tab message
  | { type: 'FEED_TEST_COLLECT_VISIBLE_PROFILES'; payload?: { max_profiles?: number } }
  // background → all listeners (broadcast)
  | { type: 'PROSPECTS_UPDATED'; payload: { changed_ids: number[] } }
  | { type: 'SCAN_STATE_CHANGED'; payload: ScanState }
  | { type: 'SETTINGS_CHANGED'; payload: Settings };

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
  FEED_TEST_COLLECT_VISIBLE_PROFILES: FeedVisibleProfilesResult;
  PROSPECTS_UPDATED: void;
  SCAN_STATE_CHANGED: void;
  SETTINGS_CHANGED: void;
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
