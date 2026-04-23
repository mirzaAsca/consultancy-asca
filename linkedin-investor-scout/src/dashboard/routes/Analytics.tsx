import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import { DEFAULT_KILL_SWITCH_THRESHOLDS } from '@/shared/constants';
import type {
  AnalyticsCohortRow,
  AnalyticsSnapshot,
  DailyActionsPoint,
  FeedEventKind,
  FirmTierBucket,
  ProspectLevel,
  WeeklyAcceptRatePoint,
} from '@/shared/types';

const LEVEL_LABEL: Record<ProspectLevel, string> = {
  '1st': '1st',
  '2nd': '2nd',
  '3rd': '3rd',
  OUT_OF_NETWORK: 'OOO',
  NONE: 'Unscanned',
};

const FIRM_TIER_LABEL: Record<FirmTierBucket, string> = {
  top: 'Top tier',
  mid: 'Mid tier',
  boutique: 'Boutique',
  none: 'No firm match',
};

const EVENT_KIND_LABEL: Record<FeedEventKind | 'no_event', string> = {
  post: 'Post',
  comment: 'Comment',
  repost: 'Repost',
  reaction: 'Reaction',
  mention: 'Mention',
  tagged: 'Tagged',
  no_event: 'No prior event',
};

export function AnalyticsRoute() {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage({ type: 'ANALYTICS_SNAPSHOT_QUERY' });
      if (res.ok) setSnapshot(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !snapshot) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-500">
        No analytics data yet.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold">Analytics</h1>
            <p className="text-[11px] text-gray-500">
              Rolling 30-day activity, 12-week accept-rate trend, and cohort
              slices. Data aggregated on demand from outreach_actions +
              feed_events + daily_usage.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-blue-500 hover:text-white"
          aria-label="Refresh analytics"
          title="Refresh"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </header>

      <section className="mb-5 grid grid-cols-5 gap-3">
        <TotalTile
          label="Invites (30d)"
          value={snapshot.totals_30d.invites_sent}
        />
        <TotalTile
          label="Accepts (30d)"
          value={snapshot.totals_30d.accepts}
          secondary={
            snapshot.totals_30d.invites_sent > 0
              ? `${Math.round(
                  (snapshot.totals_30d.accepts /
                    snapshot.totals_30d.invites_sent) *
                    100,
                )}% rate`
              : undefined
          }
        />
        <TotalTile
          label="Visits (30d)"
          value={snapshot.totals_30d.profile_visits}
        />
        <TotalTile
          label="Messages (30d)"
          value={snapshot.totals_30d.messages_sent}
        />
        <TotalTile
          label="Events (30d)"
          value={snapshot.totals_30d.feed_events_captured}
        />
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">
            Actions per day (last 30 days)
          </h2>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-gray-500">
            <LegendDot className="bg-blue-500" label="Invites" />
            <LegendDot className="bg-emerald-500" label="Visits" />
            <LegendDot className="bg-purple-500" label="Messages" />
            <LegendDot className="bg-amber-500" label="Follow-ups" />
          </div>
        </div>
        <ActionsChart points={snapshot.actions_30d} />
        <p className="mt-2 text-[10px] text-gray-600">
          Bars are stacked by kind. Empty days are zero-filled so the sparkline
          always spans 30 days.
        </p>
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">
            Accept rate by week (last 12 weeks)
          </h2>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
            <span>Bars: invites</span>
            <span className="text-gray-700">·</span>
            <span>Line: accept rate</span>
          </div>
        </div>
        <AcceptRateChart points={snapshot.accept_rate_12w} />
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-gray-800 bg-bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-100">
            Time from event → action
          </h2>
          <p className="mb-3 text-[11px] text-gray-500">
            Time between the first time we captured a feed signal on a prospect
            and our next outreach action against them (last 30 days).
          </p>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <SummaryCell
              label="Sample size"
              value={snapshot.event_to_action.sample_size}
            />
            <SummaryCell
              label="Median"
              value={formatDuration(snapshot.event_to_action.median_ms)}
            />
            <SummaryCell
              label="p90"
              value={formatDuration(snapshot.event_to_action.p90_ms)}
            />
          </div>
        </div>
        <div className="rounded-md border border-gray-800 bg-bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-100">
            Inbox handling (events captured vs handled)
          </h2>
          <p className="mb-3 text-[11px] text-gray-500">
            Captured = all rows in `feed_events`. Handled = anything not in
            `new` state (queued, done, or ignored).
          </p>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <SummaryCell
              label="Captured"
              value={snapshot.inbox_ratio.captured}
            />
            <SummaryCell
              label="Handled"
              value={
                snapshot.inbox_ratio.handled_rate === null
                  ? '—'
                  : `${snapshot.inbox_ratio.handled} (${Math.round(
                      snapshot.inbox_ratio.handled_rate * 100,
                    )}%)`
              }
            />
            <SummaryCell
              label="New (inbox)"
              value={snapshot.inbox_ratio.new_count}
            />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-100">
          Cohort: by connection level at outreach
        </h2>
        <CohortTable
          rows={snapshot.cohort_by_level}
          labelFor={(r) => LEVEL_LABEL[r.key]}
        />
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-100">
          Cohort: by firm tier
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          Tier derived from `score_breakdown.firm` — top ≥ 30, mid ≥ 15,
          boutique &gt; 0.
        </p>
        <CohortTable
          rows={snapshot.cohort_by_firm_tier}
          labelFor={(r) => FIRM_TIER_LABEL[r.key]}
        />
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-100">
          Cohort: by source feed event
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          Rows where the invite was sent after we saw the prospect in the
          feed. "No prior event" = invite sent without a captured feed signal.
        </p>
        <CohortTable
          rows={snapshot.cohort_by_event_kind}
          labelFor={(r) => EVENT_KIND_LABEL[r.key]}
        />
      </section>

      <CapRecommendations snapshot={snapshot} />
    </div>
  );
}

function CapRecommendations({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const rec = deriveCapRecommendation(snapshot);
  const tone =
    rec.severity === 'warn'
      ? 'border-amber-800 bg-amber-950/30'
      : rec.severity === 'good'
        ? 'border-emerald-800 bg-emerald-950/30'
        : 'border-gray-800 bg-bg-card';
  const Icon =
    rec.severity === 'warn'
      ? AlertTriangle
      : rec.severity === 'good'
        ? CheckCircle2
        : BarChart3;
  const iconTone =
    rec.severity === 'warn'
      ? 'text-amber-400'
      : rec.severity === 'good'
        ? 'text-emerald-400'
        : 'text-gray-400';
  return (
    <section className={`rounded-md border p-4 ${tone}`}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-100">
        <Icon className={`h-3.5 w-3.5 ${iconTone}`} />
        Cap recommendations
      </h2>
      <p className="mb-2 text-[12px] text-gray-200">{rec.headline}</p>
      {rec.details.length > 0 && (
        <ul className="mb-2 list-disc space-y-0.5 pl-5 text-[11px] text-gray-400">
          {rec.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-gray-500">
        Auto-cap escalation is intentionally disabled (v2 invariant). Adjust
        caps manually in{' '}
        <code className="rounded bg-black/30 px-1 text-[10px]">Settings</code>.
      </p>
    </section>
  );
}

function deriveCapRecommendation(snapshot: AnalyticsSnapshot): {
  severity: 'info' | 'warn' | 'good';
  headline: string;
  details: string[];
} {
  const floor = DEFAULT_KILL_SWITCH_THRESHOLDS.accept_rate_floor;
  const minSample = DEFAULT_KILL_SWITCH_THRESHOLDS.invites_sent_min;
  const weeks = snapshot.accept_rate_12w;
  // Rolling trailing 4-week window — short enough to react, long enough to
  // smooth a single bad week. Ignore weeks with no invites.
  const recent = weeks.slice(-4).filter((w) => w.invites_sent > 0);
  const totals = recent.reduce(
    (acc, w) => ({
      invites: acc.invites + w.invites_sent,
      accepts: acc.accepts + w.accepts,
    }),
    { invites: 0, accepts: 0 },
  );
  const details: string[] = [];
  if (totals.invites < minSample) {
    details.push(
      `Only ${totals.invites} invites in the last 4 weeks — need ≥${minSample} before the recommendation is reliable.`,
    );
    return {
      severity: 'info',
      headline:
        'Not enough recent invite volume to make a cap recommendation. Keep the current caps and revisit after a few more invites.',
      details,
    };
  }
  const rate = totals.accepts / totals.invites;
  const ratePct = (rate * 100).toFixed(1);
  const floorPct = (floor * 100).toFixed(0);
  details.push(
    `4-week accept rate: ${ratePct}% on ${totals.invites} invites (floor ${floorPct}%).`,
  );
  const safetyWeeks = recent.length;
  if (rate < floor) {
    return {
      severity: 'warn',
      headline:
        `Accept rate is below the kill-switch floor. Lower daily invite cap and revisit templates / target list before LinkedIn throttles you.`,
      details,
    };
  }
  if (rate < floor * 1.5) {
    return {
      severity: 'warn',
      headline:
        'Accept rate is close to the kill-switch floor. Hold caps steady; do not escalate.',
      details,
    };
  }
  // Healthy. Comment on headroom but never suggest an automatic escalation —
  // just say "you have room if you want it" and leave the choice to the user.
  return {
    severity: 'good',
    headline:
      `Accept rate is healthy across ${safetyWeeks} of the last 4 weeks. Current caps look sustainable — escalate manually only if you want more volume.`,
    details,
  };
}

function ActionsChart({ points }: { points: DailyActionsPoint[] }) {
  const max = Math.max(
    1,
    ...points.map(
      (p) =>
        p.profile_visit +
        p.connection_request_sent +
        p.message_sent +
        p.followup_message_sent,
    ),
  );
  return (
    <div className="flex h-32 items-end gap-[2px]">
      {points.map((p) => {
        const total =
          p.profile_visit +
          p.connection_request_sent +
          p.message_sent +
          p.followup_message_sent;
        const h = (v: number) => `${Math.round((v / max) * 100)}%`;
        const [, m, d] = p.day_bucket.split('-');
        return (
          <div
            key={p.day_bucket}
            className="group relative flex-1"
            title={`${m}/${d}: ${p.connection_request_sent} invites, ${p.profile_visit} visits, ${p.message_sent} msgs, ${p.followup_message_sent} follow-ups`}
          >
            <div className="flex h-32 w-full flex-col-reverse overflow-hidden rounded-sm bg-gray-900">
              <div className="bg-blue-500" style={{ height: h(p.connection_request_sent) }} />
              <div className="bg-emerald-500" style={{ height: h(p.profile_visit) }} />
              <div className="bg-purple-500" style={{ height: h(p.message_sent) }} />
              <div className="bg-amber-500" style={{ height: h(p.followup_message_sent) }} />
            </div>
            {total > 0 && (
              <div className="mt-0.5 text-center text-[8px] text-gray-500">
                {total}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AcceptRateChart({ points }: { points: WeeklyAcceptRatePoint[] }) {
  const maxInvites = Math.max(1, ...points.map((p) => p.invites_sent));
  return (
    <div className="space-y-1">
      <div className="flex h-24 items-end gap-1">
        {points.map((p) => {
          const barH = `${Math.round((p.invites_sent / maxInvites) * 100)}%`;
          const rateH =
            p.accept_rate === null
              ? null
              : `${Math.max(4, Math.round(p.accept_rate * 100))}%`;
          const [, m, d] = p.week_start.split('-');
          return (
            <div
              key={p.week_start}
              className="relative flex-1"
              title={`Week of ${m}/${d}: ${p.invites_sent} invites, ${p.accepts} accepts${
                p.accept_rate !== null
                  ? ` (${Math.round(p.accept_rate * 100)}%)`
                  : ''
              }`}
            >
              <div className="flex h-24 w-full flex-col-reverse overflow-hidden rounded-sm bg-gray-900">
                <div className="bg-blue-500/50" style={{ height: barH }} />
              </div>
              {rateH && (
                <div
                  className="absolute left-0 right-0 border-t border-emerald-400"
                  style={{ bottom: rateH }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 text-[9px] text-gray-600">
        {points.map((p) => {
          const [, m, d] = p.week_start.split('-');
          return (
            <div key={p.week_start} className="flex-1 text-center">
              {m}/{d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CohortTable<K extends string>({
  rows,
  labelFor,
}: {
  rows: AnalyticsCohortRow<K>[];
  labelFor: (row: AnalyticsCohortRow<K>) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-gray-500">
        No invites recorded yet for this slice.
      </p>
    );
  }
  const maxInvites = Math.max(1, ...rows.map((r) => r.invites_sent));
  return (
    <div className="divide-y divide-gray-800/70">
      {rows.map((row) => {
        const rate = row.accept_rate;
        const barW = `${Math.round((row.invites_sent / maxInvites) * 100)}%`;
        return (
          <div
            key={row.key}
            className="grid grid-cols-[1fr,auto,auto] items-center gap-3 py-2 text-[11px]"
          >
            <div>
              <div className="text-gray-200">{labelFor(row)}</div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-900">
                <div
                  className="h-full bg-blue-500/70"
                  style={{ width: barW }}
                />
              </div>
            </div>
            <div className="min-w-[60px] text-right text-gray-400">
              {row.accepts}/{row.invites_sent}
            </div>
            <div
              className={
                'min-w-[48px] text-right font-mono ' +
                (rate === null
                  ? 'text-gray-600'
                  : rate >= 0.2
                    ? 'text-emerald-300'
                    : rate >= 0.1
                      ? 'text-amber-300'
                      : 'text-red-300')
              }
            >
              {rate === null ? '—' : `${Math.round(rate * 100)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TotalTile({
  label,
  value,
  secondary,
}: {
  label: string;
  value: number;
  secondary?: string;
}) {
  return (
    <div className="rounded-md border border-gray-800 bg-bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-100">
        {value.toLocaleString()}
      </div>
      {secondary && (
        <div className="text-[10px] text-gray-500">{secondary}</div>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-gray-800 bg-bg px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-gray-100">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}
