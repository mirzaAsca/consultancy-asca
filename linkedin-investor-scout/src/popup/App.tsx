import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Download,
  FileUp,
  Filter,
  Inbox,
  Loader2,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Rss,
  Upload,
} from 'lucide-react';
import {
  summarizeCsvFile,
  type CsvImportSummary,
} from '@/shared/csv';
import { sendMessage } from '@/shared/messaging';
import type {
  ActivityKind,
  AutoPauseReason,
  DailySnapshot,
  FeedCrawlStatus,
  OutreachCaps,
  OutreachQueueCandidate,
  ProspectLevel,
  ProspectQuery,
  ProspectStats,
  ScanState,
  ScanStatus,
  ScanWorkerStatus,
  Settings,
} from '@/shared/types';

type PreviewState = {
  filename: string;
  summary: CsvImportSummary;
};

interface ScanConfigSnapshot {
  min_delay_ms: number;
  max_delay_ms: number;
  daily_cap: number;
}

type ToastState =
  | { kind: 'idle' }
  | { kind: 'error'; text: string }
  | { kind: 'success'; text: string };

const EMPTY_STATS: ProspectStats = {
  total: 0,
  by_level: { NONE: 0, '1st': 0, '2nd': 0, '3rd': 0 },
  by_scan_status: {
    pending: 0,
    in_progress: 0,
    done: 0,
    failed: 0,
    skipped: 0,
  },
};

const STATUS_DOT: Record<ScanWorkerStatus, { color: string; label: string }> = {
  idle: { color: 'bg-gray-500', label: 'Idle' },
  running: { color: 'bg-blue-500 animate-pulse', label: 'Scanning' },
  paused: { color: 'bg-yellow-500', label: 'Paused' },
  auto_paused: { color: 'bg-red-500', label: 'Auto-paused' },
};

const AUTO_PAUSE_COPY: Record<NonNullable<AutoPauseReason>, string> = {
  captcha: 'LinkedIn challenge / CAPTCHA detected. Solve it in a visible tab and resume.',
  rate_limit: 'Rate limit detected. Wait a while before resuming.',
  auth_wall: 'LinkedIn auth wall hit. Log back in, then resume.',
  health_breach:
    'Kill switch tripped — health thresholds breached. Review the Health tab; resume is blocked until the cooldown elapses.',
};

const FILTER_LEVEL_OPTIONS: Array<{ value: ProspectLevel; label: string }> = [
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '3rd', label: '3rd' },
  { value: 'NONE', label: 'Unscanned' },
];

const FILTER_STATUS_OPTIONS: Array<{ value: ScanStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'skipped', label: 'Skipped' },
];

const FILTER_ACTIVITY_OPTIONS: Array<{ kind: keyof ActivityKind; label: string }> = [
  { kind: 'connected', label: 'Connected' },
  { kind: 'commented', label: 'Commented' },
  { kind: 'messaged', label: 'Messaged' },
];

interface ExportFilterDraft {
  levels: Set<ProspectLevel>;
  scan_statuses: Set<ScanStatus>;
  activity: Set<keyof ActivityKind>;
}

const EMPTY_EXPORT_FILTER: ExportFilterDraft = {
  levels: new Set(),
  scan_statuses: new Set(),
  activity: new Set(),
};

function exportFilterToQuery(draft: ExportFilterDraft): ProspectQuery | null {
  const levels = Array.from(draft.levels);
  const scan_statuses = Array.from(draft.scan_statuses);
  const activity = Array.from(draft.activity);
  if (levels.length === 0 && scan_statuses.length === 0 && activity.length === 0) {
    return null;
  }
  const activityObj: ProspectQuery['activity'] = {};
  activity.forEach((k) => {
    activityObj[k] = true;
  });
  return {
    levels: levels.length > 0 ? levels : undefined,
    scan_statuses: scan_statuses.length > 0 ? scan_statuses : undefined,
    activity: activity.length > 0 ? activityObj : undefined,
    page: 0,
    page_size: Number.MAX_SAFE_INTEGER,
  };
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildExportFilename(suffix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  return `investor-scout-${suffix}-${stamp}.csv`;
}

function scanConfigFromSettings(settings: Settings): ScanConfigSnapshot {
  return {
    min_delay_ms: settings.scan.min_delay_ms,
    max_delay_ms: settings.scan.max_delay_ms,
    daily_cap: settings.scan.daily_cap,
  };
}

function formatEta(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

type PopupDashboardRoute =
  | 'prospects'
  | 'outreach_queue'
  | 'engagement_tasks'
  | 'settings'
  | 'logs';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<ProspectStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfigSnapshot | null>(null);
  const [outreachCaps, setOutreachCaps] = useState<OutreachCaps | null>(null);
  const [dailySnapshot, setDailySnapshot] = useState<DailySnapshot | null>(null);
  const [nextBest, setNextBest] = useState<OutreachQueueCandidate | null>(null);
  const [lastUploadAt, setLastUploadAt] = useState<number | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ kind: 'idle' });
  const [exportBusy, setExportBusy] = useState(false);
  const [feedTestBusy, setFeedTestBusy] = useState(false);
  const [feedTestCleanupBusy, setFeedTestCleanupBusy] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [feedCrawlStatus, setFeedCrawlStatus] = useState<FeedCrawlStatus | null>(
    null,
  );
  const [feedCrawlBusy, setFeedCrawlBusy] = useState(false);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await sendMessage({ type: 'STATS_QUERY' });
      if (res.ok) {
        setStats(res.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshScanState = useCallback(async () => {
    const res = await sendMessage({ type: 'SCAN_STATE_QUERY' });
    if (res.ok) setScanState(res.data);
  }, []);

  const refreshSettings = useCallback(async () => {
    const res = await sendMessage({ type: 'SETTINGS_QUERY' });
    if (res.ok) {
      setScanConfig(scanConfigFromSettings(res.data));
      setOutreachCaps(res.data.outreach.caps);
    }
  }, []);

  const refreshDailySnapshot = useCallback(async () => {
    const res = await sendMessage({ type: 'DAILY_SNAPSHOT_QUERY' });
    if (res.ok) setDailySnapshot(res.data);
  }, []);

  const refreshNextBest = useCallback(async () => {
    const res = await sendMessage({
      type: 'OUTREACH_QUEUE_QUERY',
      payload: { limit: 1 },
    });
    if (res.ok) setNextBest(res.data.next_best);
  }, []);

  const refreshFeedCrawlStatus = useCallback(async () => {
    const res = await sendMessage({ type: 'FEED_CRAWL_SESSION_STATUS' });
    if (res.ok) setFeedCrawlStatus(res.data);
  }, []);

  const refreshLastUpload = useCallback(async () => {
    const res = await sendMessage({
      type: 'LOGS_QUERY',
      payload: { event_contains: 'csv_imported', limit: 25 },
    });
    if (!res.ok) return;
    const row = res.data.find((entry) => entry.event === 'csv_imported');
    setLastUploadAt(row?.ts ?? null);
  }, []);

  useEffect(() => {
    void refreshStats();
    void refreshScanState();
    void refreshSettings();
    void refreshLastUpload();
    void refreshDailySnapshot();
    void refreshNextBest();
    void refreshFeedCrawlStatus();
    const listener = (msg: { type?: string; payload?: unknown }) => {
      if (msg?.type === 'PROSPECTS_UPDATED') {
        void refreshStats();
        void refreshNextBest();
      }
      if (msg?.type === 'SCAN_STATE_CHANGED' && msg.payload) {
        setScanState(msg.payload as ScanState);
        // Updates to scan_status touch the status counts as well.
        void refreshStats();
      }
      if (msg?.type === 'SETTINGS_CHANGED' && msg.payload) {
        const settings = msg.payload as Settings;
        setScanConfig(scanConfigFromSettings(settings));
        setOutreachCaps(settings.outreach.caps);
        void refreshNextBest();
      }
      if (msg?.type === 'FEED_EVENTS_UPDATED') {
        void refreshDailySnapshot();
        void refreshNextBest();
      }
      if (msg?.type === 'FEED_CRAWL_SESSION_CHANGED' && msg.payload) {
        setFeedCrawlStatus(msg.payload as FeedCrawlStatus);
        void refreshDailySnapshot();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [
    refreshDailySnapshot,
    refreshFeedCrawlStatus,
    refreshLastUpload,
    refreshNextBest,
    refreshSettings,
    refreshScanState,
    refreshStats,
  ]);

  useEffect(() => {
    if (toast.kind === 'idle') return;
    const t = setTimeout(() => setToast({ kind: 'idle' }), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setToast({ kind: 'error', text: 'Please select a .csv file.' });
      return;
    }

    setParsing(true);
    try {
      const summary = await summarizeCsvFile(file);
      setPreview({ filename: file.name, summary });
    } catch (error) {
      console.error('[investor-scout] CSV parse failed', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
      setToast({
        kind: 'error',
        text: 'Failed to parse CSV. Check the file format.',
      });
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    if (preview.summary.valid === 0) {
      setToast({ kind: 'error', text: 'No valid URLs to import.' });
      return;
    }

    setCommitting(true);
    try {
      const res = await sendMessage({
        type: 'CSV_COMMIT',
        payload: {
          filename: preview.filename,
          urls: preview.summary.urls,
          invalid_count: preview.summary.invalid,
          invalid_samples: preview.summary.invalid_samples,
        },
      });
      if (res.ok) {
        setToast({
          kind: 'success',
          text: `Imported ${res.data.inserted.toLocaleString()} prospects.`,
        });
        setPreview(null);
        await refreshStats();
        await refreshLastUpload();
      } else {
        setToast({ kind: 'error', text: res.error });
      }
    } finally {
      setCommitting(false);
    }
  };

  const openDashboard = useCallback(
    (route: PopupDashboardRoute = 'prospects', params?: Record<string, string>) => {
      const search = new URLSearchParams(params ?? {});
      const hash = `#/${route}${search.toString() ? `?${search.toString()}` : ''}`;
      const url = chrome.runtime.getURL(`src/dashboard/index.html${hash}`);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [],
  );

  const runExport = useCallback(
    async (filter: ProspectQuery | null, suffix: string) => {
      if (exportBusy) return;
      setExportBusy(true);
      try {
        const res = await sendMessage({
          type: 'EXPORT_CSV',
          payload: { filter },
        });
        if (!res.ok) {
          setToast({ kind: 'error', text: res.error });
          return;
        }
        if (res.data.row_count === 0) {
          setToast({ kind: 'error', text: 'No rows match — nothing to export.' });
          return;
        }
        downloadCsv(res.data.csv, buildExportFilename(suffix));
        setToast({
          kind: 'success',
          text: `Exported ${res.data.row_count.toLocaleString()} rows.`,
        });
      } catch (error) {
        console.error('[investor-scout] export failed', {
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
        });
        setToast({ kind: 'error', text: 'Export failed.' });
      } finally {
        setExportBusy(false);
      }
    },
    [exportBusy],
  );

  const handleExportAll = () => {
    void runExport(null, 'all');
  };

  const handleOpenFilterModal = () => {
    if (stats.total === 0) {
      setToast({ kind: 'error', text: 'No prospects to export yet.' });
      return;
    }
    setFilterModalOpen(true);
  };

  const handleExportFiltered = async (draft: ExportFilterDraft) => {
    const query = exportFilterToQuery(draft);
    if (!query) {
      setToast({
        kind: 'error',
        text: 'Pick at least one filter, or use Export all.',
      });
      return;
    }
    setFilterModalOpen(false);
    await runExport(query, 'filtered');
  };

  const openPicker = () => fileInputRef.current?.click();

  const handleFeedTestSeed = useCallback(async () => {
    if (feedTestBusy) return;
    setFeedTestBusy(true);
    try {
      const res = await sendMessage({ type: 'FEED_TEST_SEED_RANDOM_LEVELS' });
      if (!res.ok) {
        setToast({ kind: 'error', text: res.error });
        return;
      }
      setToast({
        kind: 'success',
        text: `Seeded ${res.data.seeded.toLocaleString()} visible prospects with random levels.`,
      });
      await refreshStats();
    } catch (error) {
      console.error('[investor-scout] feed test seed failed', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
      setToast({ kind: 'error', text: 'Failed to seed random feed labels.' });
    } finally {
      setFeedTestBusy(false);
    }
  }, [feedTestBusy, refreshStats]);

  const handleFeedCrawlStart = useCallback(async () => {
    if (feedCrawlBusy || feedCrawlStatus?.running) return;
    setFeedCrawlBusy(true);
    try {
      const res = await sendMessage({ type: 'FEED_CRAWL_SESSION_START' });
      if (!res.ok) {
        setToast({ kind: 'error', text: res.error });
        return;
      }
      setFeedCrawlStatus(res.data);
      setToast({
        kind: 'success',
        text: 'Feed Crawl Session started. Let LinkedIn render in the active tab.',
      });
    } finally {
      setFeedCrawlBusy(false);
    }
  }, [feedCrawlBusy, feedCrawlStatus?.running]);

  const handleFeedCrawlStop = useCallback(async () => {
    if (feedCrawlBusy) return;
    setFeedCrawlBusy(true);
    try {
      const res = await sendMessage({ type: 'FEED_CRAWL_SESSION_STOP' });
      if (res.ok) setFeedCrawlStatus(res.data);
      else setToast({ kind: 'error', text: res.error });
    } finally {
      setFeedCrawlBusy(false);
    }
  }, [feedCrawlBusy]);

  const handleFeedTestCleanup = useCallback(async () => {
    if (feedTestCleanupBusy) return;
    setFeedTestCleanupBusy(true);
    try {
      const res = await sendMessage({ type: 'CLEAR_ALL_DATA' });
      if (!res.ok) {
        setToast({ kind: 'error', text: res.error });
        return;
      }
      setToast({
        kind: 'success',
        text: 'Cleared local test data. Re-import your CSV when ready.',
      });
      await Promise.all([refreshStats(), refreshScanState(), refreshLastUpload()]);
    } catch (error) {
      console.error('[investor-scout] feed test cleanup failed', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
      setToast({ kind: 'error', text: 'Failed to clear local test data.' });
    } finally {
      setFeedTestCleanupBusy(false);
    }
  }, [feedTestCleanupBusy, refreshLastUpload, refreshScanState, refreshStats]);

  const willReplace = useMemo(() => stats.total > 0, [stats.total]);

  const scanStatus: ScanWorkerStatus = scanState?.status ?? 'idle';
  const dot = STATUS_DOT[scanStatus];

  const scanned = stats.by_scan_status.done + stats.by_scan_status.failed;
  const total = stats.total;
  const pending = stats.by_scan_status.pending + stats.by_scan_status.in_progress;
  const progressPct = total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;

  const handleScanAction = async (action: 'SCAN_START' | 'SCAN_PAUSE' | 'SCAN_RESUME') => {
    if (scanBusy) return;
    setScanBusy(true);
    try {
      const res = await sendMessage({ type: action });
      if (res.ok) {
        setScanState(res.data);
      } else {
        setToast({ kind: 'error', text: res.error });
      }
    } finally {
      setScanBusy(false);
    }
  };

  const canStart = scanStatus === 'idle' && pending > 0;
  const canPause = scanStatus === 'running';
  const canResume = scanStatus === 'paused' || scanStatus === 'auto_paused';
  const feedTestBlockedByRunningScan = scanStatus === 'running';
  const lastUploadLabel = lastUploadAt ? new Date(lastUploadAt).toLocaleString() : '—';
  const dayCounterLabel = scanState
    ? scanConfig
      ? `${scanState.scans_today}/${scanConfig.daily_cap} today`
      : `${scanState.scans_today} today`
    : '—';
  const etaLabel = useMemo(() => {
    if (scanStatus !== 'running' || pending <= 0 || !scanConfig) {
      return 'ETA —';
    }
    const avgDelayMs = Math.round((scanConfig.min_delay_ms + scanConfig.max_delay_ms) / 2);
    return `ETA ${formatEta(pending * avgDelayMs)}`;
  }, [pending, scanConfig, scanStatus]);

  return (
    <div className="flex h-full w-full flex-col bg-bg text-gray-100">
      <header className="flex items-center gap-2 border-b border-gray-800 bg-bg-card px-4 py-3">
        <span
          className={`inline-block h-2 w-2 rounded-full ${dot.color}`}
          aria-label={`Status: ${dot.label}`}
          title={dot.label}
        />
        <Radar className="h-4 w-4 text-blue-400" />
        <h1 className="text-sm font-semibold tracking-wide">
          LinkedIn Investor Scout
        </h1>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-500">
          {dot.label}
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="rounded-md border border-gray-800 bg-bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Prospects loaded
              </div>
              <div className="text-xl font-semibold text-gray-100">
                {statsLoading ? '—' : stats.total.toLocaleString()}
              </div>
              <div className="mt-1 text-[10px] text-gray-500" title={lastUploadLabel}>
                Last upload: {lastUploadLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshStats()}
              className="rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-blue-500 hover:text-white"
              title="Refresh"
              aria-label="Refresh stats"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button
            type="button"
            onClick={openPicker}
            disabled={parsing || committing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {parsing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Parsing CSV…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload new CSV
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="mt-2 text-[10px] leading-snug text-gray-500">
            Single column, no header. Up to 50,000 LinkedIn <code className="text-gray-400">/in/</code> URLs.
          </p>
        </section>

        {scanState?.status === 'auto_paused' && scanState.auto_pause_reason && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-[11px] text-red-100"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">Scan auto-paused</div>
              <p className="mt-0.5 text-red-200/80">
                {AUTO_PAUSE_COPY[scanState.auto_pause_reason]}
              </p>
              <button
                type="button"
                onClick={() => void handleScanAction('SCAN_RESUME')}
                disabled={scanBusy}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-400/60 bg-red-800/40 px-2 py-1 text-[11px] font-medium text-red-100 hover:bg-red-700/50 disabled:opacity-60"
              >
                {scanBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Resume scan
              </button>
            </div>
          </div>
        )}

        <DailyGlanceSection caps={outreachCaps} snapshot={dailySnapshot} />

        <NextBestTargetRow
          candidate={nextBest}
          onOpen={() => openDashboard('outreach_queue')}
        />

        <section className="rounded-md border border-gray-800 bg-bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
            <span>Scan</span>
            <span>
              {scanned.toLocaleString()} / {total.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-blue-500 transition-[width]"
              style={{ width: `${progressPct}%` }}
              aria-label={`Progress ${progressPct}%`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
            <span>
              {pending.toLocaleString()} pending · {stats.by_scan_status.failed.toLocaleString()} failed
            </span>
            <span>{dayCounterLabel}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
            <span>{etaLabel}</span>
            <span />
          </div>
          <div className="mt-3 flex gap-2">
            {canStart && (
              <ScanButton
                onClick={() => void handleScanAction('SCAN_START')}
                disabled={scanBusy}
                tone="primary"
                icon={<Play className="h-3.5 w-3.5" />}
                label="Start scan"
              />
            )}
            {canPause && (
              <ScanButton
                onClick={() => void handleScanAction('SCAN_PAUSE')}
                disabled={scanBusy}
                tone="muted"
                icon={<Pause className="h-3.5 w-3.5" />}
                label="Pause scan"
              />
            )}
            {canResume && (
              <ScanButton
                onClick={() => void handleScanAction('SCAN_RESUME')}
                disabled={scanBusy}
                tone="primary"
                icon={<Play className="h-3.5 w-3.5" />}
                label="Resume scan"
              />
            )}
            {!canStart && !canPause && !canResume && (
              <div className="flex-1 rounded-md border border-gray-800 bg-bg px-2 py-1.5 text-center text-[11px] text-gray-500">
                {total === 0
                  ? 'Upload a CSV to begin scanning.'
                  : 'All prospects scanned.'}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
            By connection level
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile
              label="1st"
              value={stats.by_level['1st']}
              color="bg-level-first"
              onClick={() => openDashboard('prospects', { level: '1st' })}
            />
            <StatTile
              label="2nd"
              value={stats.by_level['2nd']}
              color="bg-level-second"
              onClick={() => openDashboard('prospects', { level: '2nd' })}
            />
            <StatTile
              label="3rd"
              value={stats.by_level['3rd']}
              color="bg-level-third"
              onClick={() => openDashboard('prospects', { level: '3rd' })}
            />
          </div>
        </section>

        <section>
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
            Scan status
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatusRow label="Pending" value={stats.by_scan_status.pending} />
            <StatusRow label="Done" value={stats.by_scan_status.done} />
            <StatusRow label="Failed" value={stats.by_scan_status.failed} />
            <StatusRow label="In progress" value={stats.by_scan_status.in_progress} />
          </div>
        </section>

        <section className="mt-auto">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
            Quick actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportAll}
              disabled={exportBusy || stats.total === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Download a CSV of every prospect"
            >
              {exportBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export (all)
            </button>
            <button
              type="button"
              onClick={handleOpenFilterModal}
              disabled={exportBusy || stats.total === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Pick filters then download the matching rows"
            >
              <Filter className="h-3.5 w-3.5" />
              Export (filtered…)
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleFeedTestSeed()}
            disabled={feedTestBusy || feedTestBlockedByRunningScan}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title={
              feedTestBlockedByRunningScan
                ? 'Pause the active scan before running feed label test'
                : 'Replace local list with currently visible feed profiles and random levels'
            }
          >
            {feedTestBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Test Feed Labels (Random)
          </button>
          {feedTestBlockedByRunningScan && (
            <p className="mt-1 text-[10px] text-amber-300/80">
              Pause the active scan before running feed label tests.
            </p>
          )}
          <p className="mt-1 text-[10px] text-amber-300/80">
            Testing mode replaces local prospect list.
          </p>
          <p className="mt-1 text-[10px] text-gray-500">
            Requires an active <code className="text-gray-400">linkedin.com/feed</code> tab with at least 4 unique <code className="text-gray-400">/in/</code> profiles rendered on the page (viewport or off-screen).
          </p>
          <FeedCrawlSessionRow
            status={feedCrawlStatus}
            busy={feedCrawlBusy}
            scanRunning={scanStatus === 'running'}
            onStart={() => void handleFeedCrawlStart()}
            onStop={() => void handleFeedCrawlStop()}
          />
          <button
            type="button"
            onClick={() => void handleFeedTestCleanup()}
            disabled={feedTestCleanupBusy || stats.total === 0}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Clear local test data (prospects, scan state, logs)"
          >
            {feedTestCleanupBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            Clear test data
          </button>
          <p className="mt-1 text-[10px] text-gray-500">
            Local cleanup only. No LinkedIn clicks or messages are performed.
          </p>
          <button
            type="button"
            onClick={() => openDashboard('prospects')}
            className="mt-2 w-full rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white"
          >
            Open dashboard
          </button>
          <button
            type="button"
            onClick={() => openDashboard('logs')}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            View logs
          </button>
        </section>
      </main>

      <footer className="border-t border-gray-800 px-4 py-2 text-[10px] text-gray-500">
        v{chrome.runtime?.getManifest?.().version ?? '1.0.0'}
      </footer>

      {toast.kind !== 'idle' && (
        <div
          role="status"
          className={`absolute inset-x-3 bottom-10 rounded-md border px-3 py-2 text-xs shadow-lg ${
            toast.kind === 'error'
              ? 'border-red-700 bg-red-900/80 text-red-100'
              : 'border-green-700 bg-green-900/80 text-green-100'
          }`}
        >
          {toast.text}
        </div>
      )}

      {preview && (
        <PreviewModal
          filename={preview.filename}
          summary={preview.summary}
          willReplace={willReplace}
          existingCount={stats.total}
          committing={committing}
          onCancel={() => (committing ? undefined : setPreview(null))}
          onConfirm={() => void handleCommit()}
        />
      )}

      {filterModalOpen && (
        <ExportFilterModal
          busy={exportBusy}
          onCancel={() => (exportBusy ? undefined : setFilterModalOpen(false))}
          onConfirm={(draft) => void handleExportFiltered(draft)}
        />
      )}
    </div>
  );
}

function ScanButton({
  onClick,
  disabled,
  tone,
  icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  tone: 'primary' | 'muted';
  icon: ReactNode;
  label: string;
}) {
  const base =
    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const classes =
    tone === 'primary'
      ? `${base} bg-blue-600 text-white hover:bg-blue-500`
      : `${base} border border-gray-700 bg-bg text-gray-200 hover:border-gray-500 hover:text-white`;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {icon}
      {label}
    </button>
  );
}

function StatTile({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  const className =
    'rounded-md border border-gray-800 bg-bg-card p-2 text-center transition ' +
    (onClick
      ? 'cursor-pointer hover:border-blue-500 hover:text-white'
      : '');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={className}
      title={onClick ? `Open ${label} prospects in dashboard` : undefined}
    >
      <div className="mx-auto mb-1 flex items-center justify-center gap-1">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
        <span className="text-[9px] font-medium leading-tight tracking-wide text-gray-400">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold text-gray-100">
        {value.toLocaleString()}
      </div>
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-800 bg-bg-card px-2 py-1.5">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-100">{value.toLocaleString()}</span>
    </div>
  );
}

/**
 * Phase 4.1 popup quick-glance row. Surfaces today's invite/visit/message
 * budget usage + inbox-unread count so the user can read the day's status
 * without opening the dashboard. Warns when any budget has < 20% remaining.
 */
function DailyGlanceSection({
  caps,
  snapshot,
}: {
  caps: OutreachCaps | null;
  snapshot: DailySnapshot | null;
}) {
  const invitesUsed = snapshot?.usage.invites_sent ?? 0;
  const visitsUsed = snapshot?.usage.visits ?? 0;
  const messagesUsed = snapshot?.usage.messages_sent ?? 0;
  const eventsToday = snapshot?.usage.feed_events_captured ?? 0;
  const inboxNew = snapshot?.inbox_new_count ?? 0;
  const acceptsToday = snapshot?.accepts_today ?? 0;
  const pendingInvites = snapshot?.pending_invites ?? 0;

  const invitesCap = caps?.daily_invites ?? 0;
  const visitsCap = caps?.daily_visits ?? 0;
  const messagesCap = caps?.daily_messages ?? 0;

  const anyLow =
    isLowBudget(invitesUsed, invitesCap) ||
    isLowBudget(visitsUsed, visitsCap) ||
    isLowBudget(messagesUsed, messagesCap);

  return (
    <section className="rounded-md border border-gray-800 bg-bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
        <span>Today</span>
        {snapshot && (
          <span className="font-mono text-[10px] text-gray-600">
            {snapshot.day_bucket}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <BudgetTile label="Invites" used={invitesUsed} cap={invitesCap} />
        <BudgetTile label="Visits" used={visitsUsed} cap={visitsCap} />
        <BudgetTile label="Messages" used={messagesUsed} cap={messagesCap} />
        <InboxTile eventsToday={eventsToday} inboxNew={inboxNew} />
      </div>
      <div className="mt-2 flex items-center justify-between rounded-md border border-gray-800 bg-bg px-2 py-1 text-[10px] text-gray-400">
        <span>
          <span className="text-emerald-300">{acceptsToday.toLocaleString()}</span>{' '}
          accepts today
        </span>
        <span>
          <span className="text-blue-300">{pendingInvites.toLocaleString()}</span>{' '}
          pending invites
        </span>
      </div>
      {anyLow && (
        <div className="mt-2 text-[10px] text-amber-300">
          Less than 20% of a daily budget remains — slow down or pause new outreach.
        </div>
      )}
    </section>
  );
}

function isLowBudget(used: number, cap: number): boolean {
  if (cap <= 0) return false;
  const remaining = Math.max(0, cap - used);
  return remaining / cap < 0.2;
}

function BudgetTile({
  label,
  used,
  cap,
}: {
  label: string;
  used: number;
  cap: number;
}) {
  const low = isLowBudget(used, cap);
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <div className="rounded-md border border-gray-800 bg-bg px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-gray-400">{label}</span>
        <span
          className={
            low
              ? 'font-medium text-amber-300'
              : 'font-medium text-gray-100'
          }
        >
          {used.toLocaleString()}
          {cap > 0 ? `/${cap.toLocaleString()}` : ''}
        </span>
      </div>
      {cap > 0 && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full ${low ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

const RECOMMENDED_ACTION_LABEL: Record<
  OutreachQueueCandidate['recommended_action'],
  string
> = {
  profile_visit: 'Warming visit',
  connection_request_sent: 'Send invite',
  message_sent: 'Send DM',
  followup_message_sent: 'Follow up',
};

/**
 * Phase 1.3 popup "Next Best Target" row — surfaces the top-of-queue
 * prospect that still fits today's caps. Click opens the Outreach Queue
 * dashboard tab (Mode A prefill lives there so the user has the full
 * template preview before sending).
 */
function NextBestTargetRow({
  candidate,
  onOpen,
}: {
  candidate: OutreachQueueCandidate | null;
  onOpen: () => void;
}) {
  if (!candidate) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-800 bg-bg-card px-3 py-2 text-left text-[11px] text-gray-400 hover:border-gray-600"
      >
        <span>
          <span className="block text-[10px] uppercase tracking-wide text-gray-500">
            Next best target
          </span>
          <span className="text-gray-500">
            Queue clear — nothing fits today's caps.
          </span>
        </span>
        <span className="text-gray-500">Open queue →</span>
      </button>
    );
  }
  const displayName = candidate.name ?? candidate.slug;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-md border border-blue-700/50 bg-blue-950/40 px-3 py-2 text-left hover:border-blue-400"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-blue-300">
          Next best target
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-[12px] font-medium text-gray-100">
            {displayName}
          </span>
          {candidate.tier && (
            <span className="rounded-sm border border-blue-500/40 bg-blue-900/50 px-1 text-[9px] font-semibold text-blue-100">
              {candidate.tier}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-gray-400">
          {RECOMMENDED_ACTION_LABEL[candidate.recommended_action]} ·{' '}
          {candidate.recommended_reason}
        </div>
      </div>
      <span className="text-[11px] text-blue-300">Open →</span>
    </button>
  );
}

/**
 * Phase 3.1 / 3.2 — manual Feed Crawl Session controls. Sits in the Quick
 * Actions strip beneath the label-seeding tools. While a session runs, the
 * button flips to "Stop session" and the status line shows the live session
 * start time; on idle it shows the last completed session summary (events
 * captured, mode breakdown, stop reason).
 */
function FeedCrawlSessionRow({
  status,
  busy,
  scanRunning,
  onStart,
  onStop,
}: {
  status: FeedCrawlStatus | null;
  busy: boolean;
  scanRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const running = status?.running ?? false;
  const last = status?.last_result ?? null;
  const disabled = busy || (!running && scanRunning);
  const onClick = running ? onStop : onStart;

  let summary: string;
  if (running) {
    const since = status?.started_at
      ? new Date(status.started_at).toLocaleTimeString()
      : '—';
    summary = `Session running since ${since}. Stay on the tab.`;
  } else if (last) {
    const top = last.modes.find((m) => m.mode === 'top');
    const recent = last.modes.find((m) => m.mode === 'recent');
    const duration = Math.max(1, Math.round(last.duration_ms / 1000));
    summary = `Last session: ${last.total_events_captured} new events (top ${
      top?.events_captured ?? 0
    }, recent ${recent?.events_captured ?? 0}, overlap ${
      last.overlap_count
    }) · ${duration}s · ${last.stop_reason.replace(/_/g, ' ')}`;
  } else {
    summary =
      'Walks the active LinkedIn feed in Top then Recent to harvest new events.';
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-700 bg-bg-card px-3 py-2 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title={
          scanRunning && !running
            ? 'Pause the profile scanner before running a Feed Crawl Session'
            : running
              ? 'Stop the running Feed Crawl Session'
              : 'Run a manual crawl pass across Top and Recent feed modes'
        }
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : running ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Rss className="h-3.5 w-3.5" />
        )}
        {running ? 'Stop feed crawl session' : 'Run feed crawl session'}
      </button>
      <p className="mt-1 text-[10px] leading-snug text-gray-500">{summary}</p>
      {scanRunning && !running && (
        <p className="mt-0.5 text-[10px] text-amber-300/80">
          Pause the profile scan first — they share the active LinkedIn tab.
        </p>
      )}
    </>
  );
}

function InboxTile({
  eventsToday,
  inboxNew,
}: {
  eventsToday: number;
  inboxNew: number;
}) {
  const hot = inboxNew > 0;
  return (
    <div className="rounded-md border border-gray-800 bg-bg px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-gray-400">
          <Inbox className="h-3 w-3" />
          Inbox
        </span>
        <span
          className={
            hot
              ? 'font-medium text-blue-300'
              : 'font-medium text-gray-100'
          }
        >
          {inboxNew.toLocaleString()} new
        </span>
      </div>
      <div className="mt-1 text-[10px] text-gray-500">
        {eventsToday.toLocaleString()} events captured today
      </div>
    </div>
  );
}

function PreviewModal({
  filename,
  summary,
  willReplace,
  existingCount,
  committing,
  onCancel,
  onConfirm,
}: {
  filename: string;
  summary: CsvImportSummary;
  willReplace: boolean;
  existingCount: number;
  committing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="max-h-full w-full overflow-y-auto border-t border-gray-700 bg-bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold">Review import</h2>
        </div>
        <p className="mb-3 truncate text-[11px] text-gray-400" title={filename}>
          {filename}
        </p>

        <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <SummaryRow label="Total rows" value={summary.total} />
          <SummaryRow label="Valid" value={summary.valid} accent="text-green-400" />
          <SummaryRow label="Invalid" value={summary.invalid} accent={summary.invalid > 0 ? 'text-yellow-400' : undefined} />
          <SummaryRow label="Duplicates" value={summary.duplicates} />
        </dl>

        <div
          className={`mb-3 rounded-md border px-3 py-2 text-[11px] ${
            willReplace
              ? 'border-yellow-700 bg-yellow-900/30 text-yellow-100'
              : 'border-gray-700 bg-bg text-gray-300'
          }`}
        >
          {willReplace ? (
            <>
              Will replace the current list of{' '}
              <strong>{existingCount.toLocaleString()}</strong> prospect
              {existingCount === 1 ? '' : 's'}.
            </>
          ) : (
            <>No existing list — this will be the first import.</>
          )}
        </div>

        {summary.invalid > 0 && summary.invalid_samples.length > 0 && (
          <details className="mb-3 text-[11px] text-gray-400">
            <summary className="cursor-pointer text-gray-300 hover:text-white">
              View invalid samples ({summary.invalid_samples.length})
            </summary>
            <ul className="mt-2 space-y-1 rounded-md border border-gray-800 bg-bg p-2 font-mono text-[10px] text-gray-400">
              {summary.invalid_samples.map((raw, i) => (
                <li key={`${i}-${raw}`} className="truncate" title={raw}>
                  {raw}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={committing}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={committing || summary.valid === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {committing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {willReplace ? 'Replace & import' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-800 bg-bg px-2 py-1.5">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${accent ?? 'text-gray-100'}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function ExportFilterModal({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (draft: ExportFilterDraft) => void;
}) {
  const [draft, setDraft] = useState<ExportFilterDraft>(() => ({
    levels: new Set(EMPTY_EXPORT_FILTER.levels),
    scan_statuses: new Set(EMPTY_EXPORT_FILTER.scan_statuses),
    activity: new Set(EMPTY_EXPORT_FILTER.activity),
  }));

  const toggleLevel = (value: ProspectLevel) => {
    setDraft((d) => {
      const next = new Set(d.levels);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...d, levels: next };
    });
  };
  const toggleStatus = (value: ScanStatus) => {
    setDraft((d) => {
      const next = new Set(d.scan_statuses);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...d, scan_statuses: next };
    });
  };
  const toggleActivity = (value: keyof ActivityKind) => {
    setDraft((d) => {
      const next = new Set(d.activity);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...d, activity: next };
    });
  };

  const pickedCount =
    draft.levels.size + draft.scan_statuses.size + draft.activity.size;

  return (
    <div className="absolute inset-0 z-10 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="max-h-full w-full overflow-y-auto border-t border-gray-700 bg-bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold">Export filtered CSV</h2>
        </div>
        <p className="mb-3 text-[11px] text-gray-400">
          Pick one or more filters. Rows matching any selection in each group are included.
        </p>

        <FilterGroup label="Connection level">
          {FILTER_LEVEL_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              selected={draft.levels.has(opt.value)}
              onClick={() => toggleLevel(opt.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Scan status">
          {FILTER_STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              selected={draft.scan_statuses.has(opt.value)}
              onClick={() => toggleStatus(opt.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Activity">
          {FILTER_ACTIVITY_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.kind}
              label={opt.label}
              selected={draft.activity.has(opt.kind)}
              onClick={() => toggleActivity(opt.kind)}
            />
          ))}
        </FilterGroup>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            disabled={busy || pickedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <Download className="h-3.5 w-3.5" />
            Export {pickedCount > 0 ? `(${pickedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition ' +
        (selected
          ? 'border-blue-500/70 bg-blue-900/40 text-blue-100'
          : 'border-gray-700 bg-bg text-gray-300 hover:border-gray-500 hover:text-white')
      }
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
