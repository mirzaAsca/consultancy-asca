import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  HeartPulse,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import type { HealthBreachReason, HealthSnapshot } from '@/shared/types';

type Tone = 'green' | 'yellow' | 'red';

const TONE_CLASSES: Record<Tone, { border: string; bg: string; text: string }> = {
  green: {
    border: 'border-emerald-700/60',
    bg: 'bg-emerald-900/20',
    text: 'text-emerald-300',
  },
  yellow: {
    border: 'border-amber-700/60',
    bg: 'bg-amber-900/20',
    text: 'text-amber-300',
  },
  red: {
    border: 'border-red-700/60',
    bg: 'bg-red-900/30',
    text: 'text-red-300',
  },
};

export function HealthRoute() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage({ type: 'HEALTH_SNAPSHOT_QUERY' });
      if (res.ok) setSnapshot(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (msg: { type?: string }) => {
      if (msg?.type === 'SCAN_STATE_CHANGED') {
        void refresh();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  useEffect(() => {
    if (!resumeSuccess) return;
    const id = window.setTimeout(() => setResumeSuccess(null), 3000);
    return () => window.clearTimeout(id);
  }, [resumeSuccess]);

  const resumeScan = async () => {
    setResuming(true);
    setResumeError(null);
    setResumeSuccess(null);
    try {
      const res = await sendMessage({ type: 'SCAN_RESUME' });
      if (res.ok) {
        setResumeSuccess('Scan resumed.');
        setConfirmText('');
        await refresh();
      } else {
        setResumeError(res.error);
      }
    } finally {
      setResuming(false);
    }
  };

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
        No health data yet.
      </div>
    );
  }

  const {
    accept_rate_7d,
    invites_sent_7d,
    accepts_7d,
    safety_triggers_in_window,
    safety_triggers_7d,
    daily,
    breach,
    cooldown,
    thresholds,
  } = snapshot;

  const acceptTone: Tone = acceptTileTone(snapshot);
  const safetyTone: Tone = safetyTileTone(snapshot);
  const cooldownTone: Tone = cooldown ? 'red' : 'green';

  // Typed-confirm gate: only required when a kill-switch breach is live
  // (snapshot.breach is set exclusively for the `health_breach` pause path)
  // AND the cooldown has elapsed. CAPTCHA / rate_limit / auth_wall pauses
  // don't appear in `breach`, so they keep resuming one-click per MASTER
  // §19.5 — the user can clear a LinkedIn challenge without friction.
  const requiresTypedConfirm = breach !== null && cooldown === null;
  const confirmSatisfied = !requiresTypedConfirm || confirmText.trim() === 'RESUME';
  const resumeDisabled = cooldown !== null || resuming || !confirmSatisfied;

  return (
    <div className="mx-auto max-w-4xl px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold">Health & safety</h1>
            <p className="text-[11px] text-gray-500">
              Rolling 7-day rollup of outreach, accepts, and LinkedIn safety
              triggers. Kill switch auto-pauses the scan when any threshold
              trips.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-blue-500 hover:text-white"
          aria-label="Refresh health"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {breach && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-xs text-red-100"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">
              Kill switch tripped: {prettyBreachReason(breach.reason)}
            </div>
            <p className="mt-0.5 text-red-200/80">{breach.detail}</p>
            {cooldown && (
              <p className="mt-0.5 text-[11px] text-red-200/80">
                Resume blocked until {new Date(cooldown.until).toLocaleString()}
                {' '}
                ({formatCountdown(cooldown.until - Date.now())} remaining).
              </p>
            )}
          </div>
        </div>
      )}

      <section className="mb-5 grid grid-cols-3 gap-3">
        <ThresholdTile
          label="Accept rate (7d)"
          tone={acceptTone}
          primary={
            accept_rate_7d === null
              ? 'n/a'
              : `${Math.round(accept_rate_7d * 100)}%`
          }
          secondary={`${accepts_7d}/${invites_sent_7d} · floor ${Math.round(thresholds.accept_rate_floor * 100)}%`}
        />
        <ThresholdTile
          label={`Safety triggers (last ${thresholds.safety_window_hours}h)`}
          tone={safetyTone}
          primary={String(safety_triggers_in_window)}
          secondary={`max ${thresholds.safety_trigger_max} before breach`}
        />
        <ThresholdTile
          label="Resume cooldown"
          tone={cooldownTone}
          primary={cooldown ? formatCountdown(cooldown.until - Date.now()) : 'Clear'}
          secondary={
            cooldown
              ? `until ${new Date(cooldown.until).toLocaleTimeString()}`
              : `${thresholds.safety_window_hours}h safety window`
          }
        />
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">
            Daily activity (last 7 days)
          </h2>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-gray-500">
            <LegendDot className="bg-blue-500" label="Invites" />
            <LegendDot className="bg-emerald-500" label="Accepts" />
            <LegendDot className="bg-red-500" label="Safety" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daily.map((d) => (
            <DailyTile key={d.day_bucket} day={d} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-gray-400">
          <SummaryCell label="Invites (7d)" value={snapshot.invites_sent_7d} />
          <SummaryCell label="Accepts (7d)" value={snapshot.accepts_7d} />
          <SummaryCell label="Visits (7d)" value={snapshot.visits_7d} />
          <SummaryCell
            label="Messages (7d)"
            value={snapshot.messages_sent_7d}
          />
        </div>
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-100">
          Safety trigger breakdown (7d)
        </h2>
        <div className="grid grid-cols-5 gap-2 text-[11px]">
          <BreakdownCell label="Captcha" value={safety_triggers_7d.captcha} />
          <BreakdownCell
            label="Rate limit"
            value={safety_triggers_7d.rate_limit}
          />
          <BreakdownCell label="Auth wall" value={safety_triggers_7d.auth_wall} />
          <BreakdownCell
            label="Health breach"
            value={safety_triggers_7d.health_breach}
          />
          <BreakdownCell
            label="Total"
            value={safety_triggers_7d.total}
            strong
          />
        </div>
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-100">
          Resume scan
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          Manual resume is disabled while the cooldown is active. Adjust
          thresholds in Settings if the kill switch is too sensitive.
        </p>
        {requiresTypedConfirm && (
          <div className="mb-3 rounded-md border border-amber-700/60 bg-amber-900/20 px-3 py-2 text-[11px] text-amber-200">
            <div className="mb-1 font-semibold text-amber-100">
              Cooldown elapsed — typed confirmation required.
            </div>
            <p className="mb-2 text-amber-200/80">
              Resuming after a kill-switch breach acknowledges that you've
              reviewed the safety triggers and accept-rate trend above. Type
              <code className="mx-1 rounded bg-black/30 px-1 text-amber-100">RESUME</code>
              to enable the button.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESUME"
              autoComplete="off"
              spellCheck={false}
              className="w-40 rounded border border-amber-700/60 bg-black/30 px-2 py-1 text-xs text-amber-100 placeholder:text-amber-200/40 focus:border-amber-400 focus:outline-none"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void resumeScan()}
            disabled={resumeDisabled}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resuming ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Resume scan
          </button>
          {resumeError && (
            <span className="inline-flex items-center gap-1 text-[11px] text-red-300">
              <AlertTriangle className="h-3 w-3" />
              {resumeError}
            </span>
          )}
          {resumeSuccess && (
            <span className="text-[11px] text-emerald-300">
              {resumeSuccess}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-100">
          Kill-switch thresholds (applied)
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          Read-only — edit these in{' '}
          <code className="rounded bg-black/30 px-1 text-[10px]">Settings</code>.
        </p>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <BreakdownCell
            label="Accept floor"
            value={`${Math.round(thresholds.accept_rate_floor * 100)}%`}
          />
          <BreakdownCell
            label="Min invites"
            value={thresholds.invites_sent_min}
          />
          <BreakdownCell
            label="Window (h)"
            value={thresholds.safety_window_hours}
          />
          <BreakdownCell
            label="Max triggers"
            value={thresholds.safety_trigger_max}
          />
        </div>
      </section>
    </div>
  );
}

function acceptTileTone(snapshot: HealthSnapshot): Tone {
  const { accept_rate_7d, invites_sent_7d, thresholds } = snapshot;
  if (invites_sent_7d < thresholds.invites_sent_min) return 'green';
  if (accept_rate_7d === null) return 'green';
  if (accept_rate_7d < thresholds.accept_rate_floor) return 'red';
  // Yellow if we're within 25% of the floor (matches the 75%-of-breach rule).
  if (accept_rate_7d < thresholds.accept_rate_floor * 1.25) return 'yellow';
  return 'green';
}

function safetyTileTone(snapshot: HealthSnapshot): Tone {
  const { safety_triggers_in_window, thresholds } = snapshot;
  if (safety_triggers_in_window >= thresholds.safety_trigger_max) return 'red';
  if (safety_triggers_in_window >= thresholds.safety_trigger_max * 0.75) {
    return 'yellow';
  }
  return 'green';
}

function prettyBreachReason(reason: HealthBreachReason): string {
  switch (reason) {
    case 'accept_rate_floor':
      return 'Accept rate below floor';
    case 'safety_pileup':
      return 'Safety-trigger pile-up';
    case 'restriction_banner':
      return 'LinkedIn restriction banner';
    default:
      return String(reason);
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function ThresholdTile({
  label,
  tone,
  primary,
  secondary,
}: {
  label: string;
  tone: Tone;
  primary: string;
  secondary: string;
}) {
  const c = TONE_CLASSES[tone];
  return (
    <div
      className={`rounded-md border ${c.border} ${c.bg} px-3 py-2`}
      aria-label={label}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'bg-emerald-500' : tone === 'yellow' ? 'bg-amber-400' : 'bg-red-500'}`}
        />
      </div>
      <div className={`mt-1 text-lg font-semibold ${c.text}`}>{primary}</div>
      <div className="text-[10px] text-gray-500">{secondary}</div>
    </div>
  );
}

function DailyTile({ day }: { day: HealthSnapshot['daily'][number] }) {
  // Normalize to the max of the three series we render so the visual scale
  // matches the ratio between invites and accepts for that day.
  const max = Math.max(
    day.invites_sent,
    day.accepts,
    day.safety_triggers,
    1,
  );
  const bar = (v: number) => `${Math.max(2, Math.round((v / max) * 36))}px`;
  const [, m, d] = day.day_bucket.split('-');
  return (
    <div className="rounded-md border border-gray-800 bg-bg px-2 py-2">
      <div className="mb-1 text-center text-[10px] font-mono text-gray-500">
        {m}/{d}
      </div>
      <div className="flex h-10 items-end justify-center gap-1">
        <div
          className="w-2 rounded-sm bg-blue-500"
          style={{ height: bar(day.invites_sent) }}
          title={`${day.invites_sent} invites`}
        />
        <div
          className="w-2 rounded-sm bg-emerald-500"
          style={{ height: bar(day.accepts) }}
          title={`${day.accepts} accepts`}
        />
        <div
          className="w-2 rounded-sm bg-red-500"
          style={{ height: bar(day.safety_triggers) }}
          title={`${day.safety_triggers} safety triggers`}
        />
      </div>
      <div className="mt-1 text-center text-[10px] text-gray-400">
        {day.invites_sent}·{day.accepts}
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

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-800 bg-bg px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-gray-100">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function BreakdownCell({
  label,
  value,
  strong,
}: {
  label: string;
  value: number | string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        'rounded-md border px-2 py-1.5 ' +
        (strong
          ? 'border-gray-700 bg-gray-800/60'
          : 'border-gray-800 bg-bg')
      }
    >
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div
        className={
          'text-sm ' +
          (strong ? 'font-semibold text-gray-50' : 'font-medium text-gray-200')
        }
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
