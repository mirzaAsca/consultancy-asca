import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCw,
  Send,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import type {
  OutreachActionKind,
  OutreachDueFilter,
  OutreachQueueCandidate,
  OutreachQueuePage,
  ProspectLevel,
  ProspectLifecycleStatus,
  ProspectTier,
} from '@/shared/types';
import { CONNECT_NOTE_CHAR_CAP } from '@/shared/constants';
import {
  buildRenderContextFromProspect,
  renderTemplate,
} from '@/shared/templates';
import { LevelBadge } from '../components/Badges';
import { formatRelativeTime } from '../helpers';
import { useDashboardStore } from '../store';

const ACTION_LABEL: Record<OutreachActionKind, string> = {
  profile_visit: 'Visit profile',
  connection_request_sent: 'Send invite',
  message_sent: 'Send DM',
  followup_message_sent: 'Follow up',
};

const TIER_OPTIONS: ProspectTier[] = ['S', 'A', 'B', 'C'];
const LEVEL_OPTIONS: ProspectLevel[] = ['2nd', '3rd', 'OUT_OF_NETWORK'];
const ACTION_OPTIONS: OutreachActionKind[] = [
  'profile_visit',
  'connection_request_sent',
  'message_sent',
  'followup_message_sent',
];

// `do_not_contact` is always filtered out by the recommender, so we don't
// offer it as a chip — its inclusion would only ever yield an empty list.
const LIFECYCLE_OPTIONS: ProspectLifecycleStatus[] = [
  'new',
  'ready_for_visit',
  'ready_for_connect',
  'request_sent',
  'connected',
  'followup_due',
];

const LIFECYCLE_LABEL: Record<ProspectLifecycleStatus, string> = {
  new: 'New',
  ready_for_visit: 'Ready for visit',
  ready_for_connect: 'Ready for connect',
  request_sent: 'Request sent',
  connected: 'Connected',
  followup_due: 'Follow-up due',
  do_not_contact: 'Do not contact',
};

const TIER_STYLE: Record<Exclude<ProspectTier, null>, string> = {
  S: 'border-amber-500/50 bg-amber-900/30 text-amber-200',
  A: 'border-emerald-500/50 bg-emerald-900/25 text-emerald-200',
  B: 'border-blue-500/50 bg-blue-900/25 text-blue-200',
  C: 'border-gray-600/60 bg-gray-800/40 text-gray-300',
  skip: 'border-gray-700 bg-gray-900/60 text-gray-500',
};

export function OutreachQueueRoute() {
  const [page, setPage] = useState<OutreachQueuePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Set<ProspectTier>>(
    () => new Set<ProspectTier>(TIER_OPTIONS),
  );
  const [levels, setLevels] = useState<Set<ProspectLevel>>(
    () => new Set<ProspectLevel>(LEVEL_OPTIONS),
  );
  const [actions, setActions] = useState<Set<OutreachActionKind>>(
    () => new Set<OutreachActionKind>(),
  );
  const [lifecycles, setLifecycles] = useState<Set<ProspectLifecycleStatus>>(
    () => new Set<ProspectLifecycleStatus>(),
  );
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const [dueFilter, setDueFilter] = useState<OutreachDueFilter>('all');

  const openProspectDrawer = useDashboardStore((s) => s.openDrawer);
  const setRoute = useDashboardStore((s) => s.setRoute);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage({
        type: 'OUTREACH_QUEUE_QUERY',
        payload: {
          tiers: tiers.size > 0 ? Array.from(tiers) : undefined,
          levels: levels.size > 0 ? Array.from(levels) : undefined,
          actions: actions.size > 0 ? Array.from(actions) : undefined,
          lifecycle_statuses:
            lifecycles.size > 0 ? Array.from(lifecycles) : undefined,
          due_filter: dueFilter,
          include_skipped: includeSkipped,
          limit: 500,
        },
      });
      if (res.ok) setPage(res.data);
    } finally {
      setLoading(false);
    }
  }, [tiers, levels, actions, lifecycles, dueFilter, includeSkipped]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (msg: { type?: string }) => {
      if (
        msg?.type === 'PROSPECTS_UPDATED' ||
        msg?.type === 'FEED_EVENTS_UPDATED' ||
        msg?.type === 'SETTINGS_CHANGED'
      ) {
        void refresh();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const toggle = <T,>(setter: (fn: (prev: Set<T>) => Set<T>) => void) =>
    (value: T) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });

  const rows = page?.rows ?? [];
  const nextBest = page?.next_best ?? null;
  const caps = page?.caps ?? null;
  const usage = page?.usage ?? null;

  const activeFilterCount =
    (tiers.size !== TIER_OPTIONS.length ? 1 : 0) +
    (levels.size !== LEVEL_OPTIONS.length ? 1 : 0) +
    (actions.size > 0 ? 1 : 0) +
    (lifecycles.size > 0 ? 1 : 0) +
    (dueFilter !== 'all' ? 1 : 0) +
    (includeSkipped ? 1 : 0);

  const resetFilters = () => {
    setTiers(new Set(TIER_OPTIONS));
    setLevels(new Set(LEVEL_OPTIONS));
    setActions(new Set());
    setLifecycles(new Set());
    setDueFilter('all');
    setIncludeSkipped(false);
  };

  const handleOpenProfile = async (candidate: OutreachQueueCandidate) => {
    // Phase 5.2 — open a correlation window so the profile-visit detector
    // (Phase 5.6) can credit this click if the user dwells on the top card.
    // Fire-and-forget: a token write failure must never block the nav.
    void sendMessage({
      type: 'INTERACTION_TOKEN_OPEN',
      payload: {
        prospect_id: candidate.prospect_id,
        action_expected: 'profile_visited',
      },
    }).catch(() => {});
    // Opens in a new tab so the dashboard stays put — Mode A prefill uses the
    // *active* LinkedIn window, so this lets the user alt-tab and trigger the
    // prefill from there.
    window.open(candidate.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyTemplate = async (
    candidate: OutreachQueueCandidate,
    kind: 'connect_note' | 'first_message' | 'followup',
  ) => {
    try {
      const list = await sendMessage({
        type: 'TEMPLATES_LIST',
        payload: { kind },
      });
      if (!list.ok) {
        setToast('Could not load templates.');
        return;
      }
      const template = list.data.find((t) => !t.archived);
      if (!template) {
        setToast(`No active ${kind.replace('_', ' ')} template.`);
        return;
      }
      const prospectRes = await sendMessage({
        type: 'PROSPECT_GET',
        payload: { id: candidate.prospect_id },
      });
      if (!prospectRes.ok || !prospectRes.data) {
        setToast('Could not load prospect.');
        return;
      }
      const ctx = buildRenderContextFromProspect(prospectRes.data);
      const rendered = renderTemplate(template.body, ctx);
      await navigator.clipboard.writeText(rendered.rendered);
      setToast(
        rendered.missing.length > 0
          ? `Copied — ${rendered.missing.length} placeholder(s) missing.`
          : 'Copied to clipboard.',
      );
    } catch (error) {
      console.warn('[investor-scout/outreach-queue] copy failed', {
        error: error instanceof Error ? error.message : error,
      });
      setToast('Copy failed.');
    }
  };

  const handlePrefillConnect = async (candidate: OutreachQueueCandidate) => {
    setBusyId(candidate.prospect_id);
    // Phase 5.2 — open a correlation window for the invite-sent detector
    // before the modal opens, so the send-detected path can reconcile back to
    // this queue row. Idempotent writes on the action side already prevent
    // double-count; the token just raises reconciliation confidence.
    void sendMessage({
      type: 'INTERACTION_TOKEN_OPEN',
      payload: {
        prospect_id: candidate.prospect_id,
        action_expected: 'invite_sent',
      },
    }).catch(() => {});
    try {
      const list = await sendMessage({
        type: 'TEMPLATES_LIST',
        payload: { kind: 'connect_note' },
      });
      if (!list.ok) {
        setToast('Could not load templates.');
        return;
      }
      const template = list.data.find((t) => !t.archived);
      const prospectRes = await sendMessage({
        type: 'PROSPECT_GET',
        payload: { id: candidate.prospect_id },
      });
      if (!prospectRes.ok || !prospectRes.data) {
        setToast('Could not load prospect.');
        return;
      }
      const ctx = buildRenderContextFromProspect(prospectRes.data);
      const renderedBody = template
        ? renderTemplate(template.body, ctx).rendered.trim()
        : '';
      if (renderedBody.length > CONNECT_NOTE_CHAR_CAP) {
        setToast(
          `Note is ${renderedBody.length} chars (cap ${CONNECT_NOTE_CHAR_CAP}). Shorten the template.`,
        );
        return;
      }
      const res = await sendMessage({
        type: 'OUTREACH_PREFILL_CONNECT',
        payload: {
          prospect_id: candidate.prospect_id,
          slug: candidate.slug,
          rendered_body: renderedBody,
          template_id: template?.id ?? null,
          template_version: template?.version ?? null,
        },
      });
      if (!res.ok) {
        setToast(res.error);
        return;
      }
      setToast(
        res.data.stage === 'awaiting_send'
          ? 'Modal prefilled — click Send on LinkedIn.'
          : 'Opened Connect modal — add your note there.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkSent = async (
    candidate: OutreachQueueCandidate,
    kind: OutreachActionKind,
  ) => {
    setBusyId(candidate.prospect_id);
    try {
      // Phase 1.4 carry-over — stamp the active template id+version on the
      // recorded action so v2.1 A/B reporting can attribute sends without a
      // schema migration. Falls back to nulls when no template kind matches
      // (e.g. profile_visit / followup_message_sent today) or when the user
      // hasn't authored an active template yet — same legacy behavior.
      const templateKind: 'connect_note' | 'first_message' | null =
        kind === 'connection_request_sent'
          ? 'connect_note'
          : kind === 'message_sent'
            ? 'first_message'
            : null;
      let templateId: number | null = null;
      let templateVersion: number | null = null;
      if (templateKind) {
        const list = await sendMessage({
          type: 'TEMPLATES_LIST',
          payload: { kind: templateKind },
        });
        if (list.ok) {
          const active = list.data.find((t) => !t.archived);
          if (active) {
            templateId = active.id;
            templateVersion = active.version;
          }
        }
      }
      const res = await sendMessage({
        type: 'OUTREACH_ACTION_RECORD',
        payload: {
          prospect_id: candidate.prospect_id,
          kind,
          state: 'sent',
          template_id: templateId,
          template_version: templateVersion,
        },
      });
      if (res.ok) {
        setToast(`Recorded: ${ACTION_LABEL[kind]} → sent`);
        await refresh();
      } else {
        setToast(res.error);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSkip = async (
    candidate: OutreachQueueCandidate,
    skip: boolean,
  ) => {
    setBusyId(candidate.prospect_id);
    try {
      const res = await sendMessage({
        type: 'OUTREACH_SKIP_TODAY',
        payload: { prospect_id: candidate.prospect_id, skip },
      });
      if (res.ok) {
        setToast(skip ? 'Skipped for today.' : 'Unskipped.');
        await refresh();
      } else {
        setToast(res.error);
      }
    } finally {
      setBusyId(null);
    }
  };

  const openInProspects = (candidate: OutreachQueueCandidate) => {
    setRoute('prospects');
    openProspectDrawer(candidate.prospect_id);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-gray-800 bg-bg-card/60 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Outreach queue</h1>
            <p className="text-[11px] text-gray-500">
              Mode A only — the extension prefills the Connect modal; you click
              Send.
            </p>
          </div>
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterPill
            label="Tier"
            options={TIER_OPTIONS.map((v) => ({ value: v, label: v }))}
            selected={Array.from(tiers)}
            onToggle={(v) => toggle(setTiers)(v as ProspectTier)}
          />
          <FilterPill
            label="Level"
            options={LEVEL_OPTIONS.map((v) => ({
              value: v,
              label: v === 'OUT_OF_NETWORK' ? 'OOO' : v,
            }))}
            selected={Array.from(levels)}
            onToggle={(v) => toggle(setLevels)(v as ProspectLevel)}
          />
          <FilterPill
            label="Action"
            options={ACTION_OPTIONS.map((v) => ({
              value: v,
              label: ACTION_LABEL[v],
            }))}
            selected={Array.from(actions)}
            onToggle={(v) => toggle(setActions)(v as OutreachActionKind)}
          />
          <FilterPill
            label="Status"
            options={LIFECYCLE_OPTIONS.map((v) => ({
              value: v,
              label: LIFECYCLE_LABEL[v],
            }))}
            selected={Array.from(lifecycles)}
            onToggle={(v) =>
              toggle(setLifecycles)(v as ProspectLifecycleStatus)
            }
          />

          <DueFilterChip value={dueFilter} onChange={setDueFilter} />

          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-800 bg-bg px-2 py-1 text-[11px] text-gray-300 hover:border-gray-600">
            <input
              type="checkbox"
              className="h-3 w-3 accent-blue-500"
              checked={includeSkipped}
              onChange={(e) => setIncludeSkipped(e.target.checked)}
            />
            Include skipped
          </label>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-bg px-2 py-1 text-[11px] text-gray-400 hover:border-gray-600 hover:text-gray-200"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </header>

      <NextBestTargetCard
        candidate={nextBest}
        busy={busyId !== null}
        onOpenProfile={handleOpenProfile}
        onPrefillConnect={handlePrefillConnect}
        onCopyFirstMessage={(c) => handleCopyTemplate(c, 'first_message')}
        onOpenProspect={openInProspects}
      />

      <BudgetStrip caps={caps} usage={usage} dayBucket={page?.day_bucket ?? null} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid grid-cols-[minmax(220px,2.4fr)_80px_60px_minmax(120px,1fr)_100px_minmax(200px,1.4fr)] items-center gap-2 border-b border-gray-800 bg-bg-card/40 px-6 py-1.5 text-[10px] uppercase tracking-wide text-gray-500">
          <div>Investor</div>
          <div>Level</div>
          <div>Tier</div>
          <div>Recommended</div>
          <div>Last outreach</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto">
          {loading && rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState hasFilters={activeFilterCount > 0} />
          ) : (
            rows.map((row) => (
              <QueueRow
                key={row.prospect_id}
                row={row}
                busy={busyId === row.prospect_id}
                onOpenProfile={() => void handleOpenProfile(row)}
                onOpenProspect={() => openInProspects(row)}
                onPrefillConnect={() => void handlePrefillConnect(row)}
                onCopyConnectNote={() => void handleCopyTemplate(row, 'connect_note')}
                onCopyMessage={() =>
                  void handleCopyTemplate(row, 'first_message')
                }
                onMarkInviteSent={() =>
                  void handleMarkSent(row, 'connection_request_sent')
                }
                onMarkMessageSent={() =>
                  void handleMarkSent(row, 'message_sent')
                }
                onSkip={() => void handleSkip(row, !row.skipped_today)}
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

function NextBestTargetCard({
  candidate,
  busy,
  onOpenProfile,
  onPrefillConnect,
  onCopyFirstMessage,
  onOpenProspect,
}: {
  candidate: OutreachQueueCandidate | null;
  busy: boolean;
  onOpenProfile: (c: OutreachQueueCandidate) => void;
  onPrefillConnect: (c: OutreachQueueCandidate) => void;
  onCopyFirstMessage: (c: OutreachQueueCandidate) => void;
  onOpenProspect: (c: OutreachQueueCandidate) => void;
}) {
  if (!candidate) {
    return (
      <div className="border-b border-gray-800 bg-bg-card/30 px-6 py-4 text-[11px] text-gray-500">
        <div className="flex items-center gap-2 text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>No target fits today's caps.</span>
        </div>
        <p className="mt-1">
          Either the queue is empty, all live rows are pending invites, or the
          daily/weekly cap is already exhausted. Adjust filters above or wait
          until tomorrow's bucket rolls over.
        </p>
      </div>
    );
  }
  const displayName = candidate.name ?? candidate.slug;
  return (
    <div className="border-b border-gray-800 bg-blue-950/20 px-6 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-blue-300">
        <Sparkles className="h-3.5 w-3.5" />
        Next best target
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenProspect(candidate)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <LevelBadge level={candidate.level} />
          <TierChip tier={candidate.tier} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-gray-100 hover:text-blue-300">
              {displayName}
              <ChevronRight className="ml-1 inline h-3 w-3 text-gray-500" />
            </div>
            {candidate.headline && (
              <div className="truncate text-[11px] text-gray-500">
                {candidate.headline}
              </div>
            )}
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <PrimaryButton
            onClick={() => onOpenProfile(candidate)}
            icon={<ExternalLink className="h-3 w-3" />}
            label="Open profile"
          />
          {candidate.recommended_action === 'connection_request_sent' && (
            <PrimaryButton
              onClick={() => onPrefillConnect(candidate)}
              disabled={busy}
              icon={<Send className="h-3 w-3" />}
              label="Prefill Connect"
              tone="accent"
            />
          )}
          {(candidate.recommended_action === 'message_sent' ||
            candidate.recommended_action === 'followup_message_sent') && (
            <PrimaryButton
              onClick={() => onCopyFirstMessage(candidate)}
              icon={<Clipboard className="h-3 w-3" />}
              label="Copy DM"
              tone="accent"
            />
          )}
        </div>
      </div>
      <div className="mt-1 text-[10px] text-gray-500">
        {candidate.recommended_reason} · score{' '}
        {candidate.priority_score ?? '—'}
      </div>
    </div>
  );
}

function BudgetStrip({
  caps,
  usage,
  dayBucket,
}: {
  caps: OutreachQueuePage['caps'] | null;
  usage: OutreachQueuePage['usage'] | null;
  dayBucket: string | null;
}) {
  if (!caps || !usage) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 bg-bg-card/20 px-6 py-2 text-[11px] text-gray-400">
      <span className="font-mono text-[10px] text-gray-600">{dayBucket}</span>
      <BudgetChip label="Invites" used={usage.invites_sent} cap={caps.daily_invites} />
      <BudgetChip label="Visits" used={usage.visits} cap={caps.daily_visits} />
      <BudgetChip label="Messages" used={usage.messages_sent} cap={caps.daily_messages} />
      {caps.shared_bucket && (
        <span className="rounded border border-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
          shared
        </span>
      )}
    </div>
  );
}

function BudgetChip({ label, used, cap }: { label: string; used: number; cap: number }) {
  const low = cap > 0 && (cap - used) / cap < 0.2;
  const exhausted = cap > 0 && used >= cap;
  const tone = exhausted
    ? 'border-red-700/50 bg-red-900/30 text-red-200'
    : low
      ? 'border-amber-700/50 bg-amber-900/25 text-amber-200'
      : 'border-gray-700/60 bg-bg-card text-gray-300';
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${tone}`}>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="font-medium">
        {used.toLocaleString()}/{cap.toLocaleString()}
      </span>
    </span>
  );
}

function TierChip({ tier }: { tier: ProspectTier | null }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-md border border-gray-700 bg-gray-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
        —
      </span>
    );
  }
  return (
    <span
      className={
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ' +
        TIER_STYLE[tier]
      }
    >
      {tier}
    </span>
  );
}

function QueueRow({
  row,
  busy,
  onOpenProfile,
  onOpenProspect,
  onPrefillConnect,
  onCopyConnectNote,
  onCopyMessage,
  onMarkInviteSent,
  onMarkMessageSent,
  onSkip,
}: {
  row: OutreachQueueCandidate;
  busy: boolean;
  onOpenProfile: () => void;
  onOpenProspect: () => void;
  onPrefillConnect: () => void;
  onCopyConnectNote: () => void;
  onCopyMessage: () => void;
  onMarkInviteSent: () => void;
  onMarkMessageSent: () => void;
  onSkip: () => void;
}) {
  const displayName = row.name ?? row.slug;
  return (
    <div
      className={
        'grid min-h-14 grid-cols-[minmax(220px,2.4fr)_80px_60px_minmax(120px,1fr)_100px_minmax(200px,1.4fr)] items-center gap-2 border-b border-gray-800/70 px-6 py-2 text-xs ' +
        (row.skipped_today ? 'opacity-50' : 'hover:bg-gray-800/40')
      }
    >
      <button
        type="button"
        onClick={onOpenProspect}
        className="flex min-w-0 flex-col items-start gap-0.5 text-left"
        title={`Open ${displayName} in Prospects`}
      >
        <span className="truncate font-medium text-gray-100 hover:text-blue-300">
          {displayName}
        </span>
        {row.headline && (
          <span className="truncate text-[10px] text-gray-500">{row.headline}</span>
        )}
      </button>
      <LevelBadge level={row.level} />
      <TierChip tier={row.tier} />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-gray-200">
          {ACTION_LABEL[row.recommended_action]}
        </span>
        <span className="truncate text-[10px] text-gray-500">
          {row.recommended_reason}
        </span>
        {row.has_pending_invite && (
          <span className="text-[10px] text-amber-300">Invite pending</span>
        )}
      </div>
      <div className="text-[11px] text-gray-400">
        {row.last_outreach_at ? formatRelativeTime(row.last_outreach_at) : '—'}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <IconButton
          onClick={onOpenProfile}
          icon={<ExternalLink className="h-3 w-3" />}
          title="Open LinkedIn profile"
        />
        {row.recommended_action === 'connection_request_sent' && (
          <>
            <IconButton
              onClick={onPrefillConnect}
              disabled={busy}
              icon={<Send className="h-3 w-3" />}
              title="Prefill Connect modal (Mode A)"
              tone="accent"
            />
            <IconButton
              onClick={onCopyConnectNote}
              icon={<Clipboard className="h-3 w-3" />}
              title="Copy connect note"
            />
            <IconButton
              onClick={onMarkInviteSent}
              disabled={busy}
              icon={<Check className="h-3 w-3" />}
              title="Mark invite sent"
              tone="success"
            />
          </>
        )}
        {(row.recommended_action === 'message_sent' ||
          row.recommended_action === 'followup_message_sent') && (
          <>
            <IconButton
              onClick={onCopyMessage}
              icon={<Clipboard className="h-3 w-3" />}
              title="Copy message template"
            />
            <IconButton
              onClick={onMarkMessageSent}
              disabled={busy}
              icon={<Check className="h-3 w-3" />}
              title="Mark message sent"
              tone="success"
            />
          </>
        )}
        <IconButton
          onClick={onSkip}
          disabled={busy}
          icon={<SkipForward className="h-3 w-3" />}
          title={row.skipped_today ? 'Unskip' : 'Skip for today'}
        />
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  icon,
  title,
  tone = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  tone?: 'default' | 'accent' | 'success';
}) {
  const cls =
    tone === 'accent'
      ? 'border-blue-700/70 bg-blue-900/40 text-blue-100 hover:border-blue-400'
      : tone === 'success'
        ? 'border-emerald-700/60 bg-emerald-900/30 text-emerald-100 hover:border-emerald-400'
        : 'border-gray-700 bg-bg text-gray-300 hover:border-gray-500';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center rounded-md border px-1.5 py-1 text-[11px] disabled:opacity-50 ' +
        cls
      }
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  icon,
  label,
  tone = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  tone?: 'default' | 'accent';
}) {
  const cls =
    tone === 'accent'
      ? 'border-blue-500/70 bg-blue-600/80 text-white hover:bg-blue-500'
      : 'border-gray-700 bg-bg text-gray-200 hover:border-gray-500';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium disabled:opacity-50 ' +
        cls
      }
    >
      {icon}
      {label}
    </button>
  );
}

function DueFilterChip({
  value,
  onChange,
}: {
  value: OutreachDueFilter;
  onChange: (next: OutreachDueFilter) => void;
}) {
  const opts: Array<{ value: OutreachDueFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'due_today', label: 'Due today' },
    { value: 'overdue', label: 'Overdue' },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-gray-800 bg-bg text-[11px]">
      {opts.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={
              'px-2 py-1 transition ' +
              (i > 0 ? 'border-l border-gray-800 ' : '') +
              (active
                ? 'bg-blue-900/40 text-blue-100'
                : 'text-gray-300 hover:bg-bg-card hover:text-gray-100')
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
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

  const label_ = useMemo(
    () => (selected.length > 0 ? `${label} · ${selected.length}` : label),
    [label, selected.length],
  );

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
        {label_}
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

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-gray-500">
        <div className="text-sm">No candidates match these filters.</div>
        <div className="text-[11px]">Widen the tier or level filters above.</div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-gray-500">
      <div className="text-sm">Queue is clear.</div>
      <div className="max-w-md text-[11px]">
        Once prospects finish scanning and receive a tier/score, the queue
        prioritizes 2nd/3rd-degree S &amp; A tiers for warming + invites.
      </div>
    </div>
  );
}
