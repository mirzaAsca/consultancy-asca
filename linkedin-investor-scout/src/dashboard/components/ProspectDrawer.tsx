import { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import type { LogEntry, Prospect } from '@/shared/types';
import { formatAbsolute, formatRelativeTime } from '../helpers';
import { LevelBadge, ScanStatusBadge } from './Badges';

interface ProspectDrawerProps {
  prospectId: number | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ProspectDrawer({ prospectId, onClose, onChanged }: ProspectDrawerProps) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [rescanBusy, setRescanBusy] = useState(false);
  const notesTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (prospectId === null) {
      setProspect(null);
      setLogs([]);
      setNotesDraft('');
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [resProspect, resLogs] = await Promise.all([
          sendMessage({ type: 'PROSPECT_GET', payload: { id: prospectId } }),
          sendMessage({
            type: 'PROSPECT_LOG_QUERY',
            payload: { prospect_id: prospectId, limit: 100 },
          }),
        ]);
        if (cancelled) return;
        if (resProspect.ok) {
          setProspect(resProspect.data);
          setNotesDraft(resProspect.data?.notes ?? '');
        }
        if (resLogs.ok) setLogs(resLogs.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  const scheduleNotesSave = (next: string) => {
    if (!prospect) return;
    setNotesDraft(next);
    if (notesTimerRef.current !== null) {
      window.clearTimeout(notesTimerRef.current);
    }
    notesTimerRef.current = window.setTimeout(async () => {
      setSavingNotes(true);
      try {
        const res = await sendMessage({
          type: 'PROSPECT_UPDATE',
          payload: { id: prospect.id, patch: { notes: next } },
        });
        if (res.ok) {
          setProspect(res.data);
          onChanged();
        }
      } finally {
        setSavingNotes(false);
      }
    }, 600);
  };

  const toggleActivity = async (kind: 'connected' | 'commented' | 'messaged') => {
    if (!prospect) return;
    const next = !prospect.activity[kind];
    const res = await sendMessage({
      type: 'PROSPECT_UPDATE',
      payload: { id: prospect.id, patch: { activity: { [kind]: next } } },
    });
    if (res.ok) {
      setProspect(res.data);
      onChanged();
    }
  };

  const handleRescan = async () => {
    if (!prospect) return;
    setRescanBusy(true);
    try {
      await sendMessage({ type: 'PROSPECTS_RESCAN', payload: { ids: [prospect.id] } });
      onChanged();
      const res = await sendMessage({ type: 'PROSPECT_GET', payload: { id: prospect.id } });
      if (res.ok) setProspect(res.data);
    } finally {
      setRescanBusy(false);
    }
  };

  if (prospectId === null) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <aside
        className="scrollbar-dark flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-800 bg-bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-gray-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              Prospect
            </div>
            <div className="truncate text-sm font-semibold text-gray-100" title={prospect?.name ?? undefined}>
              {prospect?.name ?? prospect?.slug ?? `#${prospectId}`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-700 p-1 text-gray-400 hover:border-gray-500 hover:text-white"
            aria-label="Close drawer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        {loading || !prospect ? (
          <div className="flex flex-1 items-center justify-center p-8 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 space-y-4 p-4 text-xs">
            <section className="space-y-2 rounded-md border border-gray-800 bg-bg p-3">
              <div className="flex items-center justify-between">
                <LevelBadge level={prospect.level} />
                <ScanStatusBadge status={prospect.scan_status} />
              </div>
              <DetailRow label="Headline" value={prospect.headline} />
              <DetailRow label="Company" value={prospect.company} />
              <DetailRow label="Location" value={prospect.location} />
              <DetailRow
                label="Last scanned"
                value={
                  prospect.last_scanned
                    ? `${formatRelativeTime(prospect.last_scanned)} (${formatAbsolute(prospect.last_scanned)})`
                    : 'Never'
                }
              />
              {prospect.scan_error && (
                <DetailRow label="Last error" value={prospect.scan_error} accent="text-red-300" />
              )}
              <DetailRow label="URL" value={prospect.url} mono />
            </section>

            <section className="flex flex-wrap gap-2">
              <a
                href={prospect.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-bg px-2.5 py-1.5 text-[11px] font-medium text-gray-200 hover:border-blue-500 hover:text-white"
              >
                <ExternalLink className="h-3 w-3" />
                Open on LinkedIn
              </a>
              <button
                type="button"
                onClick={() => void handleRescan()}
                disabled={rescanBusy}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {rescanBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Rescan now
              </button>
            </section>

            <section>
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                Activity
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ActivityToggle
                  label="Connected"
                  on={prospect.activity.connected}
                  onClick={() => void toggleActivity('connected')}
                  when={prospect.activity.connected_at}
                />
                <ActivityToggle
                  label="Commented"
                  on={prospect.activity.commented}
                  onClick={() => void toggleActivity('commented')}
                  when={prospect.activity.commented_at}
                />
                <ActivityToggle
                  label="Messaged"
                  on={prospect.activity.messaged}
                  onClick={() => void toggleActivity('messaged')}
                  when={prospect.activity.messaged_at}
                />
              </div>
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
                <span>Notes</span>
                {savingNotes && (
                  <span className="flex items-center gap-1 normal-case tracking-normal text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </span>
                )}
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => scheduleNotesSave(e.target.value)}
                rows={4}
                placeholder="Personal notes (auto-saved)"
                className="w-full rounded-md border border-gray-800 bg-bg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-blue-500"
              />
            </section>

            <section>
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                Activity timeline ({logs.length})
              </div>
              {logs.length === 0 ? (
                <div className="rounded-md border border-gray-800 bg-bg p-3 text-center text-[11px] text-gray-500">
                  No events yet.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {logs.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-md border border-gray-800 bg-bg px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-gray-300">{e.event}</span>
                        <span className="text-[10px] text-gray-500" title={formatAbsolute(e.ts)}>
                          {formatRelativeTime(e.ts)}
                        </span>
                      </div>
                      {Object.keys(e.data).length > 0 && (
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[10px] text-gray-500">
                          {JSON.stringify(e.data, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function ActivityToggle({
  label,
  on,
  onClick,
  when,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  when: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-start rounded-md border px-2 py-1.5 text-left text-[11px] transition ' +
        (on
          ? 'border-emerald-700/60 bg-emerald-900/20 text-emerald-200 hover:border-emerald-500'
          : 'border-gray-800 bg-bg text-gray-400 hover:border-gray-600 hover:text-gray-200')
      }
    >
      <span className="font-medium">{label}</span>
      <span className="mt-0.5 text-[10px] text-gray-500">
        {on ? (when ? formatRelativeTime(when) : 'Marked') : 'Mark'}
      </span>
    </button>
  );
}

function DetailRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="min-w-[72px] shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span
        className={`flex-1 break-all ${accent ?? 'text-gray-200'} ${
          mono ? 'font-mono text-[10px]' : ''
        }`}
      >
        {value || <span className="text-gray-600">—</span>}
      </span>
    </div>
  );
}
