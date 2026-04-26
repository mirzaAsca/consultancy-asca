import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { addRuntimeMessageListener, sendMessage } from '@/shared/messaging';
import type {
  FeedAutoTrackSource,
  FeedEventKind,
  FeedEventPage,
  FeedEventRow,
  FeedTaskStatus,
  InteractionEvent,
} from '@/shared/types';
import { formatRelativeTime } from '../helpers';
import { LevelBadge } from '../components/Badges';
import { useDashboardStore } from '../store';

async function trackOpenFromInbox(
  taskId: number,
  prospectId: number,
  action: 'reacted' | 'commented',
): Promise<void> {
  try {
    await sendMessage({
      type: 'INTERACTION_TOKEN_OPEN',
      payload: {
        task_id: taskId,
        prospect_id: prospectId,
        action_expected: action,
      },
    });
  } catch {
    // Best-effort: token write failure should not block the link open.
  }
}

const STATUS_OPTIONS: FeedTaskStatus[] = ['new', 'queued', 'done', 'ignored'];
const KIND_OPTIONS: FeedEventKind[] = [
  'post',
  'comment',
  'repost',
  'reaction',
  'mention',
  'tagged',
];

const STATUS_DISPLAY: Record<FeedTaskStatus, string> = {
  new: 'New',
  queued: 'Queued',
  done: 'Done',
  ignored: 'Ignored',
};

const KIND_DISPLAY: Record<FeedEventKind, string> = {
  post: 'Post',
  comment: 'Comment',
  repost: 'Repost',
  reaction: 'Reaction',
  mention: 'Mention',
  tagged: 'Tagged',
};

const STATUS_STYLE: Record<FeedTaskStatus, string> = {
  new: 'text-blue-300 border-blue-600/50 bg-blue-900/30',
  queued: 'text-amber-300 border-amber-700/50 bg-amber-900/25',
  done: 'text-emerald-300 border-emerald-700/50 bg-emerald-900/20',
  ignored: 'text-gray-400 border-gray-700 bg-gray-800/40',
};

const DEFAULT_LIMIT = 500;

/** Phase 5.5 — undo window for auto-tracked flips. After this the Undo
 * button stops rendering; the row's previous_task_status is still stored
 * so a future "undo history" view could re-surface it. */
const AUTO_TRACK_UNDO_WINDOW_MS = 10 * 60 * 1000;

const AUTO_TRACK_SOURCE_LABEL: Record<FeedAutoTrackSource, string> = {
  reaction: 'reaction',
  unreaction: 'un-reacted',
  comment: 'comment',
  manual_undo: 'manual',
};

export function EngagementTasksRoute() {
  const [page, setPage] = useState<FeedEventPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<Set<FeedTaskStatus>>(
    () => new Set<FeedTaskStatus>(['new']),
  );
  const [kinds, setKinds] = useState<Set<FeedEventKind>>(
    () => new Set<FeedEventKind>(),
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set<number>());
  const [autoTrackedOnly, setAutoTrackedOnly] = useState(false);
  const [needsReview, setNeedsReview] = useState<InteractionEvent[]>([]);
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const openProspectDrawer = useDashboardStore((s) => s.openDrawer);
  const setRoute = useDashboardStore((s) => s.setRoute);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchDraft), 250);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, reviewRes] = await Promise.all([
        sendMessage({
          type: 'FEED_EVENTS_QUERY',
          payload: {
            search: search || undefined,
            task_statuses: statuses.size > 0 ? Array.from(statuses) : undefined,
            event_kinds: kinds.size > 0 ? Array.from(kinds) : undefined,
            limit: DEFAULT_LIMIT,
          },
        }),
        sendMessage({ type: 'INTERACTIONS_NEEDS_REVIEW', payload: { limit: 50 } }),
      ]);
      if (eventsRes.ok) setPage(eventsRes.data);
      if (reviewRes.ok) setNeedsReview(reviewRes.data);
    } finally {
      setLoading(false);
    }
  }, [search, statuses, kinds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (msg: { type?: string }) => {
      if (
        msg?.type === 'FEED_EVENTS_UPDATED' ||
        msg?.type === 'PROSPECTS_UPDATED'
      ) {
        void refresh();
      }
    };
    return addRuntimeMessageListener(listener);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const allRows = page?.rows ?? [];
  const rows = useMemo(
    () =>
      autoTrackedOnly
        ? allRows.filter((r) => typeof r.auto_tracked_at === 'number' && r.auto_tracked_at !== null)
        : allRows,
    [allRows, autoTrackedOnly],
  );
  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const selectedCount = selected.size;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set<number>());

  const toggleStatus = (s: FeedTaskStatus) => {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    clearSelection();
  };

  const toggleKind = (k: FeedEventKind) => {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    clearSelection();
  };

  const resetFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatuses(new Set<FeedTaskStatus>());
    setKinds(new Set<FeedEventKind>());
    setAutoTrackedOnly(false);
    clearSelection();
  };

  const applyBulkStatus = async (next: FeedTaskStatus, label: string) => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'FEED_EVENTS_BULK_UPDATE',
        payload: { ids: selectedIds, task_status: next },
      });
      if (res.ok) {
        setToast(`${label} ${res.data.updated} task${res.data.updated === 1 ? '' : 's'}`);
        clearSelection();
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const setRowStatus = async (id: number, next: FeedTaskStatus, label: string) => {
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'FEED_EVENT_UPDATE',
        payload: { id, task_status: next },
      });
      if (res.ok) {
        setToast(label);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const undoAutoTrack = async (id: number) => {
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'FEED_EVENT_UNDO_AUTO_TRACK',
        payload: { id },
      });
      if (res.ok) {
        setToast(`Reverted to ${STATUS_DISPLAY[res.data.task_status]}`);
        await refresh();
      } else {
        setToast(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const openInProspects = (prospectId: number) => {
    setRoute('prospects');
    openProspectDrawer(prospectId);
  };

  const total = page?.total ?? 0;
  const newCount = page?.new_count ?? 0;
  const autoTrackedCount = useMemo(
    () => allRows.filter((r) => r.auto_tracked_at != null).length,
    [allRows],
  );
  const needsReviewCount = needsReview.length;
  const activeFilterCount =
    (search ? 1 : 0) + statuses.size + kinds.size + (autoTrackedOnly ? 1 : 0);


  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-gray-800 bg-bg-card/60 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Engagement tasks</h1>
            <p className="text-[11px] text-gray-500">
              {total.toLocaleString()} matching · {newCount.toLocaleString()} new overall
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-blue-500 hover:text-white"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search slug, name, company, headline…"
              className="w-full rounded-md border border-gray-800 bg-bg py-1.5 pl-7 pr-7 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500"
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => setSearchDraft('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-gray-200"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <FilterPill
            label="Status"
            options={STATUS_OPTIONS.map((v) => ({ value: v, label: STATUS_DISPLAY[v] }))}
            selected={Array.from(statuses)}
            onToggle={(v) => toggleStatus(v as FeedTaskStatus)}
          />
          <FilterPill
            label="Event"
            options={KIND_OPTIONS.map((v) => ({ value: v, label: KIND_DISPLAY[v] }))}
            selected={Array.from(kinds)}
            onToggle={(v) => toggleKind(v as FeedEventKind)}
          />

          <button
            type="button"
            onClick={() => {
              setAutoTrackedOnly((v) => !v);
              clearSelection();
            }}
            title="Show only rows auto-updated by reaction/comment detectors"
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
              autoTrackedOnly
                ? 'border-emerald-600/70 bg-emerald-900/30 text-emerald-100'
                : 'border-gray-800 bg-bg text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            Auto-tracked
            {autoTrackedCount > 0 && (
              <span className="ml-0.5 rounded bg-emerald-900/60 px-1 text-[10px] text-emerald-100">
                {autoTrackedCount}
              </span>
            )}
          </button>

          {needsReviewCount > 0 && (
            <button
              type="button"
              onClick={() => setShowNeedsReview((v) => !v)}
              title="Interaction events the reconciliation engine couldn't confidently match"
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                showNeedsReview
                  ? 'border-amber-600/70 bg-amber-900/30 text-amber-100'
                  : 'border-amber-800/50 bg-amber-950/30 text-amber-200 hover:border-amber-600'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              Needs review
              <span className="ml-0.5 rounded bg-amber-900/60 px-1 text-[10px] text-amber-100">
                {needsReviewCount}
              </span>
            </button>
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-bg px-2 py-1 text-[11px] text-gray-400 hover:border-gray-600 hover:text-gray-200"
            >
              <X className="h-3 w-3" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </header>

      {showNeedsReview && needsReviewCount > 0 && (
        <NeedsReviewPanel
          rows={needsReview}
          onClose={() => setShowNeedsReview(false)}
          onOpenProspect={openInProspects}
          onResolve={async (id, resolution) => {
            // Optimistic remove — the row leaves needs_review either way.
            setNeedsReview((prev) => prev.filter((r) => r.id !== id));
            try {
              await sendMessage({
                type: 'INTERACTION_REVIEW_RESOLVE',
                payload: { id, resolution },
              });
            } catch {
              void refresh();
            }
          }}
        />
      )}

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-blue-900/60 bg-blue-950/30 px-6 py-2 text-[11px] text-blue-100">
          <span className="font-semibold">{selectedCount} selected</span>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded px-1 text-blue-300 hover:text-white"
          >
            Clear
          </button>
          <div className="mx-2 h-3 w-px bg-blue-900" />
          <BulkButton
            onClick={() => void applyBulkStatus('queued', 'Queued')}
            busy={busy}
            icon={<Send className="h-3 w-3" />}
            label="Queue outreach"
          />
          <BulkButton
            onClick={() => void applyBulkStatus('done', 'Marked done')}
            busy={busy}
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="Mark done"
          />
          <BulkButton
            onClick={() => void applyBulkStatus('ignored', 'Ignored')}
            busy={busy}
            icon={<XCircle className="h-3 w-3" />}
            label="Ignore"
          />
          <BulkButton
            onClick={() => void applyBulkStatus('new', 'Reopened')}
            busy={busy}
            label="Reopen"
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid grid-cols-[32px_minmax(200px,2.2fr)_90px_minmax(140px,1.6fr)_80px_90px_110px_44px] items-center gap-2 border-b border-gray-800 bg-bg-card/40 px-4 py-1.5 text-[10px] uppercase tracking-wide text-gray-500">
          <div>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAllOnPage}
              aria-label="Select page"
              className="h-3 w-3 cursor-pointer accent-blue-500"
            />
          </div>
          <div>Investor</div>
          <div>Event</div>
          <div>Links</div>
          <div className="text-right tabular-nums">Seen</div>
          <div>Last seen</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto">
          {loading && rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              hasFilters={activeFilterCount > 0}
              hasAnyData={newCount > 0}
            />
          ) : (
            rows.map((row) => (
              <TaskRow
                key={row.id}
                row={row}
                checked={selected.has(row.id)}
                busy={busy}
                onToggleSelect={() => toggleRow(row.id)}
                onOpenProspect={() => openInProspects(row.prospect_id)}
                onMarkQueued={() => void setRowStatus(row.id, 'queued', 'Queued')}
                onMarkDone={() => void setRowStatus(row.id, 'done', 'Marked done')}
                onMarkIgnored={() => void setRowStatus(row.id, 'ignored', 'Ignored')}
                onReopen={() => void setRowStatus(row.id, 'new', 'Reopened')}
                onUndoAutoTrack={() => void undoAutoTrack(row.id)}
              />
            ))
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-40 rounded-md border border-emerald-700/60 bg-emerald-900/70 px-3 py-2 text-xs text-emerald-100 shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  row,
  checked,
  busy,
  onToggleSelect,
  onOpenProspect,
  onMarkQueued,
  onMarkDone,
  onMarkIgnored,
  onReopen,
  onUndoAutoTrack,
}: {
  row: FeedEventRow;
  checked: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onOpenProspect: () => void;
  onMarkQueued: () => void;
  onMarkDone: () => void;
  onMarkIgnored: () => void;
  onReopen: () => void;
  onUndoAutoTrack: () => void;
}) {
  const displayName = row.prospect_name || row.slug;
  const autoTrackedAt = row.auto_tracked_at ?? null;
  const autoTrackedSource = row.auto_tracked_source ?? null;
  const canUndo =
    autoTrackedAt !== null &&
    Date.now() - autoTrackedAt < AUTO_TRACK_UNDO_WINDOW_MS &&
    autoTrackedSource !== null &&
    autoTrackedSource !== 'manual_undo';
  return (
    <div className="grid h-12 grid-cols-[32px_minmax(200px,2.2fr)_90px_minmax(140px,1.6fr)_80px_90px_110px_44px] items-center gap-2 border-b border-gray-800/70 px-4 text-xs hover:bg-gray-800/40">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-3 w-3 cursor-pointer accent-blue-500"
          aria-label={`Select ${row.slug}`}
        />
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpenProspect}
          className="flex max-w-full items-center gap-2 text-left"
          title={`Open ${displayName} in Prospects`}
        >
          <LevelBadge level={row.prospect_level} />
          <span className="truncate font-medium text-gray-100 hover:text-blue-400">
            {displayName}
          </span>
        </button>
        {row.prospect_headline && (
          <div className="truncate text-[10px] text-gray-500" title={row.prospect_headline}>
            {row.prospect_headline}
          </div>
        )}
      </div>

      <div>
        <EventKindBadge kind={row.event_kind} />
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        {row.post_url ? (
          <a
            href={row.post_url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={() => {
              void trackOpenFromInbox(row.id, row.prospect_id, 'reacted');
            }}
            className="inline-flex items-center gap-1 truncate text-[11px] text-blue-300 hover:text-blue-200"
            title={row.post_url}
          >
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            Post
          </a>
        ) : (
          <span className="text-[11px] text-gray-600">No post link</span>
        )}
        {row.comment_url && (
          <a
            href={row.comment_url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={() => {
              void trackOpenFromInbox(row.id, row.prospect_id, 'commented');
            }}
            className="inline-flex items-center gap-1 truncate text-[11px] text-purple-300 hover:text-purple-200"
            title={row.comment_url}
          >
            <MessageSquare className="h-2.5 w-2.5 shrink-0" />
            Comment
          </a>
        )}
      </div>

      <div className="text-right font-mono text-[11px] text-gray-300">
        {row.seen_count}
      </div>

      <div
        className="text-gray-400"
        title={new Date(row.last_seen_at).toLocaleString()}
      >
        {formatRelativeTime(row.last_seen_at)}
      </div>

      <div className="flex flex-col items-start gap-0.5">
        <StatusBadge status={row.task_status} />
        {autoTrackedAt !== null && autoTrackedSource !== null && autoTrackedSource !== 'manual_undo' && (
          <span
            className="inline-flex items-center gap-0.5 rounded border border-emerald-700/50 bg-emerald-900/30 px-1 py-[1px] text-[9px] font-medium text-emerald-200"
            title={`Auto-tracked via ${AUTO_TRACK_SOURCE_LABEL[autoTrackedSource]} at ${new Date(autoTrackedAt).toLocaleString()}`}
          >
            <Sparkles className="h-2 w-2" />
            Auto · {formatRelativeTime(autoTrackedAt)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1">
        {canUndo && (
          <button
            type="button"
            onClick={onUndoAutoTrack}
            disabled={busy}
            title="Undo auto-track (reverts to previous status)"
            className="inline-flex items-center gap-0.5 rounded border border-gray-700 bg-bg px-1 py-0.5 text-[10px] text-gray-300 hover:border-emerald-500 hover:text-emerald-200 disabled:opacity-50"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Undo
          </button>
        )}
        <RowMenu
          status={row.task_status}
          busy={busy}
          onMarkQueued={onMarkQueued}
          onMarkDone={onMarkDone}
          onMarkIgnored={onMarkIgnored}
          onReopen={onReopen}
          onOpenProspect={onOpenProspect}
        />
      </div>
    </div>
  );
}

function NeedsReviewPanel({
  rows,
  onClose,
  onOpenProspect,
  onResolve,
}: {
  rows: InteractionEvent[];
  onClose: () => void;
  onOpenProspect: (prospectId: number) => void;
  onResolve: (id: number, resolution: 'matched' | 'unmatched') => void;
}) {
  return (
    <div className="border-b border-amber-900/50 bg-amber-950/20 px-6 py-3 text-xs text-amber-100">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" />
          Needs review — {rows.length} interaction{rows.length === 1 ? '' : 's'} with ambiguous match
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-amber-300 hover:text-white"
          aria-label="Close needs-review panel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1">
        {rows.slice(0, 20).map((ev) => (
          <div
            key={ev.id}
            className="flex w-full items-center justify-between gap-2 rounded border border-amber-900/40 bg-amber-950/30 px-2 py-1"
          >
            <button
              type="button"
              onClick={() => onOpenProspect(ev.prospect_id)}
              className="flex flex-1 items-center gap-2 text-left hover:text-white"
            >
              <span className="font-mono text-[10px] uppercase tracking-wide text-amber-300">
                {ev.interaction_type}
              </span>
              <span className="text-[11px] text-amber-100">prospect #{ev.prospect_id}</span>
              <span className="text-[10px] text-amber-400">conf: {ev.confidence}</span>
              <span className="ml-auto text-[10px] text-amber-300">
                {formatRelativeTime(ev.detected_at)}
              </span>
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onResolve(ev.id, 'matched')}
                title="Confirm — promote to matched"
                className="inline-flex items-center gap-0.5 rounded border border-emerald-800/60 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] text-emerald-200 hover:border-emerald-500 hover:text-white"
              >
                <CheckCircle2 className="h-3 w-3" />
                Confirm
              </button>
              <button
                type="button"
                onClick={() => onResolve(ev.id, 'unmatched')}
                title="Dismiss — mark as unmatched"
                className="inline-flex items-center gap-0.5 rounded border border-gray-700 bg-bg px-1.5 py-0.5 text-[10px] text-gray-300 hover:border-rose-500 hover:text-rose-200"
              >
                <XCircle className="h-3 w-3" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
        {rows.length > 20 && (
          <div className="pt-1 text-center text-[10px] text-amber-400">
            + {rows.length - 20} more — open Prospects → Logs for full audit
          </div>
        )}
      </div>
    </div>
  );
}

function EventKindBadge({ kind }: { kind: FeedEventKind }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-700 bg-gray-800/60 px-1.5 py-0.5 text-[10px] font-medium capitalize text-gray-200">
      {KIND_DISPLAY[kind]}
    </span>
  );
}

function StatusBadge({ status }: { status: FeedTaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_DISPLAY[status]}
    </span>
  );
}

function RowMenu({
  status,
  busy,
  onMarkQueued,
  onMarkDone,
  onMarkIgnored,
  onReopen,
  onOpenProspect,
}: {
  status: FeedTaskStatus;
  busy: boolean;
  onMarkQueued: () => void;
  onMarkDone: () => void;
  onMarkIgnored: () => void;
  onReopen: () => void;
  onOpenProspect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="rounded-md border border-gray-700 bg-bg px-1.5 py-0.5 text-[10px] text-gray-300 hover:border-blue-500 hover:text-white disabled:opacity-50"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-700 bg-bg-card p-1 shadow-xl">
          <MenuItem label="Open prospect" onClick={() => run(onOpenProspect)} />
          {status !== 'queued' && (
            <MenuItem label="Queue outreach" onClick={() => run(onMarkQueued)} />
          )}
          {status !== 'done' && (
            <MenuItem label="Mark done" onClick={() => run(onMarkDone)} />
          )}
          {status !== 'ignored' && (
            <MenuItem label="Ignore" onClick={() => run(onMarkIgnored)} />
          )}
          {status !== 'new' && (
            <MenuItem label="Reopen (mark new)" onClick={() => run(onReopen)} />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
    >
      {label}
    </button>
  );
}

function BulkButton({
  onClick,
  busy,
  icon,
  label,
}: {
  onClick: () => void;
  busy: boolean;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-blue-700/70 bg-blue-900/40 px-2 py-0.5 text-[11px] font-medium text-blue-100 transition hover:border-blue-400 hover:text-white disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function FilterPill({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ' +
          (selected.length > 0
            ? 'border-blue-500/70 bg-blue-900/30 text-blue-100'
            : 'border-gray-800 bg-bg text-gray-300 hover:border-gray-600')
        }
      >
        <Filter className="h-3 w-3" />
        {label}
        {selected.length > 0 && (
          <span className="ml-0.5 rounded bg-blue-700/70 px-1 text-[10px]">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-md border border-gray-700 bg-bg-card p-1 shadow-xl">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className={
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ' +
                  (isSelected
                    ? 'bg-blue-900/40 text-blue-100'
                    : 'text-gray-300 hover:bg-gray-800')
                }
              >
                <span
                  className={
                    'flex h-3 w-3 items-center justify-center rounded border ' +
                    (isSelected
                      ? 'border-blue-400 bg-blue-500/80 text-white'
                      : 'border-gray-600')
                  }
                >
                  {isSelected && <span className="text-[8px] leading-none">✓</span>}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  hasAnyData,
}: {
  hasFilters: boolean;
  hasAnyData: boolean;
}) {
  if (hasFilters) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-gray-500">
        <div className="text-sm">No engagement tasks match these filters.</div>
        <div className="text-[11px]">Adjust or clear filters above.</div>
      </div>
    );
  }
  if (!hasAnyData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-gray-500">
        <div className="text-sm">No engagement tasks yet.</div>
        <div className="max-w-md text-[11px]">
          Feed events surface here as the highlighter captures posts, comments,
          and reactions from your prospects. Browse your LinkedIn feed while the
          extension is loaded — tasks appear automatically.
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-500">
      No tasks on this page.
    </div>
  );
}
