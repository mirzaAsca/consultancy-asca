import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { sendMessage } from '@/shared/messaging';
import type {
  ActivityKind,
  Prospect,
  ProspectLevel,
  ProspectPage,
  ProspectSortField,
  ScanStatus,
  SortDirection,
} from '@/shared/types';
import { useDashboardStore } from '../store';
import {
  ActivityDots,
  LevelBadge,
  ScanStatusBadge,
} from '../components/Badges';
import { ProspectDrawer } from '../components/ProspectDrawer';
import { formatRelativeTime, triggerCsvDownload } from '../helpers';

const LEVEL_OPTIONS: ProspectLevel[] = [
  '1st',
  '2nd',
  '3rd',
  'OUT_OF_NETWORK',
  'NONE',
];

const STATUS_OPTIONS: ScanStatus[] = [
  'pending',
  'in_progress',
  'done',
  'failed',
  'skipped',
];

const ACTIVITY_OPTIONS: Array<{ kind: keyof ActivityKind; label: string }> = [
  { kind: 'connected', label: 'Connected' },
  { kind: 'commented', label: 'Commented' },
  { kind: 'messaged', label: 'Messaged' },
];

const LEVEL_DISPLAY: Record<ProspectLevel, string> = {
  '1st': '1st',
  '2nd': '2nd',
  '3rd': '3rd',
  OUT_OF_NETWORK: 'OOO',
  NONE: 'Unscanned',
};

const STATUS_DISPLAY: Record<ScanStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
};

const ROW_HEIGHT = 44;
const RESCAN_ALL_PAGE_SIZE = Number.MAX_SAFE_INTEGER;
const DEFAULT_SORT_DIRECTION: Record<ProspectSortField, SortDirection> = {
  created_at: 'desc',
  updated_at: 'desc',
  name: 'asc',
  company: 'asc',
  level: 'asc',
  scan_status: 'asc',
  last_scanned: 'desc',
};

export function ProspectsRoute() {
  const query = useDashboardStore((s) => s.query);
  const setSearch = useDashboardStore((s) => s.setSearch);
  const toggleLevel = useDashboardStore((s) => s.toggleLevel);
  const toggleScanStatus = useDashboardStore((s) => s.toggleScanStatus);
  const toggleActivity = useDashboardStore((s) => s.toggleActivity);
  const setSort = useDashboardStore((s) => s.setSort);
  const setPage = useDashboardStore((s) => s.setPage);
  const resetFilters = useDashboardStore((s) => s.resetFilters);
  const selectedIds = useDashboardStore((s) => s.selectedIds);
  const setSelectedIds = useDashboardStore((s) => s.setSelectedIds);
  const toggleSelected = useDashboardStore((s) => s.toggleSelected);
  const clearSelection = useDashboardStore((s) => s.clearSelection);
  const drawerProspectId = useDashboardStore((s) => s.drawerProspectId);
  const openDrawer = useDashboardStore((s) => s.openDrawer);

  const [page, setPageData] = useState<ProspectPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(query.search ?? '');

  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage({ type: 'PROSPECTS_LIST', payload: query });
      if (res.ok) setPageData(res.data);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (msg: { type?: string }) => {
      if (msg?.type === 'PROSPECTS_UPDATED' || msg?.type === 'SCAN_STATE_CHANGED') {
        void refresh();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchDraft), 250);
    return () => window.clearTimeout(id);
  }, [searchDraft, setSearch]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const rows = page?.rows ?? [];

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const toggleSelectAllOnPage = () => {
    if (allSelected) {
      const next = new Set(selectedIds);
      rows.forEach((r) => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      rows.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const selectedCount = selectedIds.size;
  const selectedArr = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const sortField: ProspectSortField = query.sort_field ?? 'created_at';
  const sortDirection: SortDirection = query.sort_direction ?? 'desc';

  const handleBulkRescan = async () => {
    if (selectedCount === 0) return;
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'PROSPECTS_RESCAN',
        payload: { ids: selectedArr },
      });
      if (res.ok) {
        setToast(`Queued ${res.data.updated} for rescan`);
        clearSelection();
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBulkActivity = async (activity: ActivityKind) => {
    if (selectedCount === 0) return;
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'PROSPECTS_BULK_ACTIVITY',
        payload: { ids: selectedArr, activity },
      });
      if (res.ok) {
        setToast(`Updated ${res.data.updated} prospects`);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedCount} prospect${selectedCount === 1 ? '' : 's'}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'PROSPECTS_DELETE',
        payload: { ids: selectedArr },
      });
      if (res.ok) {
        setToast(`Deleted ${res.data.deleted} prospects`);
        clearSelection();
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRescanAll = async () => {
    setBusy(true);
    try {
      const listRes = await sendMessage({
        type: 'PROSPECTS_LIST',
        payload: {
          ...query,
          page: 0,
          page_size: RESCAN_ALL_PAGE_SIZE,
        },
      });
      if (!listRes.ok) {
        setToast(listRes.error);
        return;
      }
      const ids = listRes.data.rows.map((row) => row.id);
      if (ids.length === 0) {
        setToast('No matching rows to rescan');
        return;
      }
      const confirmed = window.confirm(
        `Queue ${ids.length.toLocaleString()} matching prospect${ids.length === 1 ? '' : 's'} for rescan?`,
      );
      if (!confirmed) return;
      const rescanRes = await sendMessage({
        type: 'PROSPECTS_RESCAN',
        payload: { ids },
      });
      if (rescanRes.ok) {
        clearSelection();
        setToast(`Queued ${rescanRes.data.updated.toLocaleString()} for rescan`);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSort = (field: ProspectSortField) => {
    if (sortField === field) {
      setSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSort(field, DEFAULT_SORT_DIRECTION[field]);
  };

  const handleRowRescan = async (id: number) => {
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'PROSPECTS_RESCAN',
        payload: { ids: [id] },
      });
      if (res.ok) {
        setToast(`Queued ${res.data.updated} for rescan`);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRowDelete = async (row: Prospect) => {
    const confirmed = window.confirm(
      `Delete ${row.name ?? row.slug}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'PROSPECTS_DELETE',
        payload: { ids: [row.id] },
      });
      if (res.ok) {
        if (drawerProspectId === row.id) {
          openDrawer(null);
        }
        const next = new Set(selectedIds);
        next.delete(row.id);
        setSelectedIds(next);
        setToast(`Deleted ${res.data.deleted} prospect`);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRowActivity = async (
    id: number,
    activity: ActivityKind,
  ) => {
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'PROSPECTS_BULK_ACTIVITY',
        payload: { ids: [id], activity },
      });
      if (res.ok) {
        setToast(`Updated ${res.data.updated} prospect`);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (useFilter: boolean) => {
    setBusy(true);
    try {
      const res = await sendMessage({
        type: 'EXPORT_CSV',
        payload: { filter: useFilter ? query : null },
      });
      if (res.ok) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        triggerCsvDownload(res.data.csv, `investor-scout-${stamp}.csv`);
        setToast(`Exported ${res.data.row_count} rows`);
      }
    } finally {
      setBusy(false);
    }
  };

  const activeFilterCount =
    (query.levels?.length ?? 0) +
    (query.scan_statuses?.length ?? 0) +
    Object.values(query.activity ?? {}).filter(Boolean).length +
    (query.search && query.search.length > 0 ? 1 : 0);

  const total = page?.total ?? 0;
  const pageSize = query.page_size ?? 50;
  const currentPage = query.page ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-gray-800 bg-bg-card/60 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Prospects</h1>
            <p className="text-[11px] text-gray-500">
              {total.toLocaleString()} matching · {rows.length.toLocaleString()} on this page
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRescanAll()}
              disabled={busy || total === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-bg px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:opacity-50"
              title="Queue all matching rows for rescan"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rescan all
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-blue-500 hover:text-white"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <ExportMenu onExport={(f) => void handleExport(f)} busy={busy} />
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

          <FilterGroup
            label="Level"
            options={LEVEL_OPTIONS.map((v) => ({ value: v, label: LEVEL_DISPLAY[v] }))}
            selected={query.levels ?? []}
            onToggle={(v) => toggleLevel(v as ProspectLevel)}
          />
          <FilterGroup
            label="Status"
            options={STATUS_OPTIONS.map((v) => ({ value: v, label: STATUS_DISPLAY[v] }))}
            selected={query.scan_statuses ?? []}
            onToggle={(v) => toggleScanStatus(v as ScanStatus)}
          />
          <FilterGroup
            label="Activity"
            options={ACTIVITY_OPTIONS.map((o) => ({ value: o.kind, label: o.label }))}
            selected={Object.entries(query.activity ?? {})
              .filter(([, v]) => v)
              .map(([k]) => k)}
            onToggle={(v) => toggleActivity(v as 'connected' | 'commented' | 'messaged')}
          />

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

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 border-b border-blue-900/60 bg-blue-950/30 px-6 py-2 text-[11px] text-blue-100">
          <span className="font-semibold">{selectedCount} selected</span>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded px-1 text-blue-300 hover:text-white"
          >
            Clear
          </button>
          <div className="mx-2 h-3 w-px bg-blue-900" />
          <BulkActionButton
            onClick={() => void handleBulkRescan()}
            busy={busy}
            icon={<RefreshCw className="h-3 w-3" />}
            label="Rescan"
          />
          <BulkActionButton
            onClick={() => void handleBulkActivity({ connected: true })}
            busy={busy}
            label="Mark connected"
          />
          <BulkActionButton
            onClick={() => void handleBulkActivity({ commented: true })}
            busy={busy}
            label="Mark commented"
          />
          <BulkActionButton
            onClick={() => void handleBulkActivity({ messaged: true })}
            busy={busy}
            label="Mark messaged"
          />
          <div className="ml-auto">
            <BulkActionButton
              onClick={() => void handleBulkDelete()}
              busy={busy}
              tone="danger"
              icon={<Trash2 className="h-3 w-3" />}
              label="Delete"
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid grid-cols-[32px_minmax(180px,2fr)_minmax(160px,2fr)_minmax(120px,1.5fr)_80px_96px_80px_100px_60px_44px] items-center gap-2 border-b border-gray-800 bg-bg-card/40 px-4 py-1.5 text-[10px] uppercase tracking-wide text-gray-500">
          <div>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAllOnPage}
              aria-label="Select page"
              className="h-3 w-3 cursor-pointer accent-blue-500"
            />
          </div>
          <SortHeader
            label="Name"
            field="name"
            activeField={sortField}
            direction={sortDirection}
            onToggle={handleSort}
          />
          <div>Headline</div>
          <SortHeader
            label="Company"
            field="company"
            activeField={sortField}
            direction={sortDirection}
            onToggle={handleSort}
          />
          <SortHeader
            label="Level"
            field="level"
            activeField={sortField}
            direction={sortDirection}
            onToggle={handleSort}
          />
          <SortHeader
            label="Status"
            field="scan_status"
            activeField={sortField}
            direction={sortDirection}
            onToggle={handleSort}
          />
          <div>Activity</div>
          <SortHeader
            label="Scanned"
            field="last_scanned"
            activeField={sortField}
            direction={sortDirection}
            onToggle={handleSort}
          />
          <div className="text-right">Notes</div>
          <div className="text-right">Actions</div>
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-dark min-h-0 flex-1 overflow-y-auto"
        >
          {loading && rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              hasFilters={activeFilterCount > 0}
              hasAnyData={total > 0 || (page?.total ?? 0) > 0}
            />
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((vr) => {
                const row = rows[vr.index];
                const checked = selectedIds.has(row.id);
                return (
                  <div
                    key={row.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: vr.size,
                      transform: `translateY(${vr.start}px)`,
                    }}
                  >
                    <Row
                      row={row}
                      busy={busy}
                      checked={checked}
                      onToggleSelect={() => toggleSelected(row.id)}
                      onOpen={() => openDrawer(row.id)}
                      onRescan={() => void handleRowRescan(row.id)}
                      onSetActivity={(activity) => void handleRowActivity(row.id, activity)}
                      onDelete={() => void handleRowDelete(row)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-gray-800 bg-bg-card/40 px-6 py-2 text-[11px] text-gray-400">
          <span>
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded-md border border-gray-800 px-2 py-1 text-gray-300 hover:border-gray-600 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-md border border-gray-800 px-2 py-1 text-gray-300 hover:border-gray-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </div>

      <ProspectDrawer
        prospectId={drawerProspectId}
        onClose={() => openDrawer(null)}
        onChanged={() => void refresh()}
      />

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

function Row({
  row,
  busy,
  checked,
  onToggleSelect,
  onOpen,
  onRescan,
  onSetActivity,
  onDelete,
}: {
  row: Prospect;
  busy: boolean;
  checked: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRescan: () => void;
  onSetActivity: (activity: ActivityKind) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="grid h-full grid-cols-[32px_minmax(180px,2fr)_minmax(160px,2fr)_minmax(120px,1.5fr)_80px_96px_80px_100px_60px_44px] items-center gap-2 border-b border-gray-800/70 px-4 text-xs hover:bg-gray-800/40"
    >
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
      <button
        type="button"
        onClick={onOpen}
        className="truncate text-left font-medium text-gray-100 hover:text-blue-400"
        title={row.name ?? row.slug}
      >
        {row.name || row.slug}
      </button>
      <div className="truncate text-gray-400" title={row.headline ?? ''}>
        {row.headline || <span className="text-gray-600">—</span>}
      </div>
      <div className="truncate text-gray-300" title={row.company ?? ''}>
        {row.company || <span className="text-gray-600">—</span>}
      </div>
      <div>
        <LevelBadge level={row.level} />
      </div>
      <div>
        <ScanStatusBadge status={row.scan_status} />
      </div>
      <div>
        <ActivityDots
          connected={row.activity.connected}
          commented={row.activity.commented}
          messaged={row.activity.messaged}
        />
      </div>
      <div className="text-gray-400" title={row.last_scanned ? new Date(row.last_scanned).toLocaleString() : ''}>
        {formatRelativeTime(row.last_scanned)}
      </div>
      <div className="truncate text-right text-gray-500" title={row.notes}>
        {row.notes ? `“${row.notes.slice(0, 24)}${row.notes.length > 24 ? '…' : ''}”` : ''}
      </div>
      <div className="flex justify-end">
        <RowActionsMenu
          busy={busy}
          row={row}
          onOpen={onOpen}
          onRescan={onRescan}
          onSetActivity={onSetActivity}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function SortHeader({
  label,
  field,
  activeField,
  direction,
  onToggle,
}: {
  label: string;
  field: ProspectSortField;
  activeField: ProspectSortField;
  direction: SortDirection;
  onToggle: (field: ProspectSortField) => void;
}) {
  const active = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={
        'inline-flex items-center gap-1 text-left uppercase tracking-wide transition ' +
        (active ? 'text-blue-300' : 'text-gray-500 hover:text-gray-200')
      }
      title={`Sort by ${label.toLowerCase()}`}
    >
      <span>{label}</span>
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      )}
    </button>
  );
}

function RowActionsMenu({
  busy,
  row,
  onOpen,
  onRescan,
  onSetActivity,
  onDelete,
}: {
  busy: boolean;
  row: Prospect;
  onOpen: () => void;
  onRescan: () => void;
  onSetActivity: (activity: ActivityKind) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [open]);

  const closeAndRun = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="rounded-md border border-gray-700 bg-bg p-1 text-gray-300 hover:border-blue-500 hover:text-white disabled:opacity-50"
        aria-label={`Actions for ${row.name ?? row.slug}`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-gray-700 bg-bg-card p-1 shadow-xl">
          <button
            type="button"
            onClick={() => closeAndRun(onOpen)}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            Open details
          </button>
          <button
            type="button"
            onClick={() => closeAndRun(onRescan)}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            Rescan
          </button>
          <button
            type="button"
            onClick={() => closeAndRun(() => onSetActivity({ connected: true }))}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            Mark connected
          </button>
          <button
            type="button"
            onClick={() => closeAndRun(() => onSetActivity({ commented: true }))}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            Mark commented
          </button>
          <button
            type="button"
            onClick={() => closeAndRun(() => onSetActivity({ messaged: true }))}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            Mark messaged
          </button>
          <button
            type="button"
            onClick={() => closeAndRun(onDelete)}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-red-300 hover:bg-red-900/40 hover:text-red-100"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function BulkActionButton({
  onClick,
  busy,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  busy: boolean;
  icon?: React.ReactNode;
  label: string;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ' +
        (tone === 'danger'
          ? 'border-red-800 bg-red-900/40 text-red-200 hover:border-red-600 hover:text-white'
          : 'border-blue-700/70 bg-blue-900/40 text-blue-100 hover:border-blue-400 hover:text-white')
      }
    >
      {icon}
      {label}
    </button>
  );
}

function FilterGroup({
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-md border border-gray-700 bg-bg-card p-1 shadow-xl">
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

function ExportMenu({
  onExport,
  busy,
}: {
  onExport: (filtered: boolean) => void;
  busy: boolean;
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
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-bg px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        Export CSV
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-gray-700 bg-bg-card p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onExport(false);
            }}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            All prospects
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onExport(true);
            }}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-gray-800"
          >
            Current filters
          </button>
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
        <div className="text-sm">No prospects match these filters.</div>
        <div className="text-[11px]">Adjust or clear filters above.</div>
      </div>
    );
  }
  if (!hasAnyData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-gray-500">
        <div className="text-sm">No prospects yet.</div>
        <div className="text-[11px]">Upload a CSV from the extension popup to get started.</div>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-500">
      No rows on this page.
    </div>
  );
}
