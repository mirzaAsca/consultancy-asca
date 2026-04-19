import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import type { LogEntry, LogLevel } from '@/shared/types';
import { formatAbsolute, formatRelativeTime, triggerJsonDownload } from '../helpers';

const LEVEL_OPTIONS: LogLevel[] = ['info', 'warn', 'error'];

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: 'text-sky-300 border-sky-700/50 bg-sky-900/20',
  warn: 'text-yellow-300 border-yellow-700/50 bg-yellow-900/20',
  error: 'text-red-300 border-red-700/50 bg-red-900/20',
};

export function LogsRoute() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set());
  const [eventDraft, setEventDraft] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setEventFilter(eventDraft), 250);
    return () => window.clearTimeout(id);
  }, [eventDraft]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage({
        type: 'LOGS_QUERY',
        payload: {
          levels: selectedLevels.size > 0 ? Array.from(selectedLevels) : undefined,
          event_contains: eventFilter || undefined,
          limit: 500,
        },
      });
      if (res.ok) setLogs(res.data);
    } finally {
      setLoading(false);
    }
  }, [selectedLevels, eventFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleLevel = (lvl: LogLevel) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    triggerJsonDownload(logs, `investor-scout-logs-${stamp}.json`);
  };

  const activeCount = selectedLevels.size + (eventFilter ? 1 : 0);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.event));
    return Array.from(set).sort();
  }, [logs]);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-gray-800 bg-bg-card/60 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Activity log</h1>
            <p className="text-[11px] text-gray-500">
              {logs.length.toLocaleString()} entries · {eventTypes.length} distinct events
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
            <button
              type="button"
              onClick={handleExport}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-bg px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:border-blue-500 hover:text-white disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-gray-800 bg-bg p-0.5">
            {LEVEL_OPTIONS.map((lvl) => {
              const active = selectedLevels.has(lvl);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => toggleLevel(lvl)}
                  className={
                    'rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition ' +
                    (active
                      ? LEVEL_STYLE[lvl] + ' border'
                      : 'text-gray-400 hover:text-gray-200')
                  }
                >
                  {lvl}
                </button>
              );
            })}
          </div>

          <div className="relative w-72">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              value={eventDraft}
              onChange={(e) => setEventDraft(e.target.value)}
              placeholder="Filter by event name…"
              className="w-full rounded-md border border-gray-800 bg-bg py-1.5 pl-7 pr-7 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500"
            />
            {eventDraft && (
              <button
                type="button"
                onClick={() => setEventDraft('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-gray-200"
                aria-label="Clear event filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedLevels(new Set());
                setEventDraft('');
                setEventFilter('');
              }}
              className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-bg px-2 py-1 text-[11px] text-gray-400 hover:border-gray-600 hover:text-gray-200"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </header>

      <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {loading && logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-gray-500">
            <div className="text-sm">No log entries.</div>
            <div className="text-[11px]">
              {activeCount > 0
                ? 'Try removing filters to see more events.'
                : 'Events will appear here once the scan runs.'}
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {logs.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-gray-800 bg-bg-card px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LEVEL_STYLE[entry.level]}`}
                    >
                      {entry.level}
                    </span>
                    <span className="font-mono text-gray-200">{entry.event}</span>
                    {entry.prospect_id !== null && (
                      <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                        prospect #{entry.prospect_id}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500" title={formatAbsolute(entry.ts)}>
                    {formatRelativeTime(entry.ts)}
                  </span>
                </div>
                {Object.keys(entry.data).length > 0 && (
                  <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words rounded bg-bg px-2 py-1 text-[10px] text-gray-400">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
