import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import type { Settings, SettingsPatch } from '@/shared/types';

const CLEAR_PHRASE = 'CLEAR';

export function SettingsRoute() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [clearingDraft, setClearingDraft] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearedMsg, setClearedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await sendMessage({ type: 'SETTINGS_QUERY' });
    if (res.ok) setSettings(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: SettingsPatch) => {
    setSaving(true);
    try {
      const res = await sendMessage({ type: 'SETTINGS_UPDATE', payload: patch });
      if (res.ok) {
        setSettings(res.data);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await sendMessage({ type: 'CLEAR_ALL_DATA' });
      if (res.ok) {
        setClearedMsg('All data cleared.');
        setClearingDraft('');
      }
    } finally {
      setClearing(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const scan = settings.scan;
  const hi = settings.highlight;

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-[11px] text-gray-500">
            Tune pacing, highlight colors, and where the extension shows badges.
          </p>
        </div>
        {saving && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {!saving && savedAt && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </header>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-100">Scan pacing</h2>
        <div className="space-y-4 text-xs">
          <SliderRow
            label="Minimum delay"
            unit="ms"
            min={1000}
            max={30000}
            step={500}
            value={scan.min_delay_ms}
            onChange={(v) =>
              void save({
                scan: {
                  min_delay_ms: v,
                  max_delay_ms: Math.max(v, scan.max_delay_ms),
                },
              })
            }
            help="Lower bound of the jitter window between profile loads."
          />
          <SliderRow
            label="Maximum delay"
            unit="ms"
            min={1000}
            max={60000}
            step={500}
            value={scan.max_delay_ms}
            onChange={(v) =>
              void save({
                scan: {
                  max_delay_ms: v,
                  min_delay_ms: Math.min(v, scan.min_delay_ms),
                },
              })
            }
            help="Upper bound. Wider ranges look more human but slow throughput."
          />
          <div className="flex items-center gap-3">
            <label className="w-36 text-gray-400">Daily cap</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={scan.daily_cap}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                void save({ scan: { daily_cap: Math.max(1, v) } });
              }}
              className="w-28 rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
            />
            <span className="text-[11px] text-gray-500">
              profiles / local day
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-36 text-gray-400">Retry on failure</label>
            <Toggle
              on={scan.retry_on_failure}
              onChange={(v) => void save({ scan: { retry_on_failure: v } })}
            />
            <span className="text-[11px] text-gray-500">
              Re-queue transient failures up to {scan.max_retries} times.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-36 text-gray-400">Max retries</label>
            <input
              type="number"
              min={0}
              max={10}
              value={scan.max_retries}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                void save({ scan: { max_retries: Math.max(0, v) } });
              }}
              className="w-20 rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">Feed highlighter</h2>
          <Toggle
            on={hi.enabled}
            onChange={(v) => void save({ highlight: { enabled: v } })}
          />
        </div>
        <div className="space-y-4 text-xs">
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
              Colors
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColorRow
                label="1st degree"
                value={hi.colors.first}
                onChange={(v) => void save({ highlight: { colors: { first: v } } })}
              />
              <ColorRow
                label="2nd degree"
                value={hi.colors.second}
                onChange={(v) => void save({ highlight: { colors: { second: v } } })}
              />
              <ColorRow
                label="3rd degree"
                value={hi.colors.third}
                onChange={(v) => void save({ highlight: { colors: { third: v } } })}
              />
              <ColorRow
                label="Out of network"
                value={hi.colors.out_of_network}
                onChange={(v) =>
                  void save({ highlight: { colors: { out_of_network: v } } })
                }
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">
              Show highlights on
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CheckRow
                label="Post authors"
                checked={hi.show_on.post_authors}
                onChange={(v) =>
                  void save({ highlight: { show_on: { post_authors: v } } })
                }
              />
              <CheckRow
                label="Reposters"
                checked={hi.show_on.reposters}
                onChange={(v) =>
                  void save({ highlight: { show_on: { reposters: v } } })
                }
              />
              <CheckRow
                label="Commenters"
                checked={hi.show_on.commenters}
                onChange={(v) =>
                  void save({ highlight: { show_on: { commenters: v } } })
                }
              />
              <CheckRow
                label="Reactors"
                checked={hi.show_on.reactors}
                onChange={(v) =>
                  void save({ highlight: { show_on: { reactors: v } } })
                }
              />
              <CheckRow
                label="People you may know"
                checked={hi.show_on.suggested}
                onChange={(v) =>
                  void save({ highlight: { show_on: { suggested: v } } })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-red-900/60 bg-red-950/20 p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-red-200">Data</h2>
        </div>
        <p className="mb-3 text-[11px] text-red-200/70">
          Permanently delete all prospects, scan state, and the activity log.
          Settings are kept. Type <code className="rounded bg-black/40 px-1">{CLEAR_PHRASE}</code> to confirm.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={clearingDraft}
            onChange={(e) => {
              setClearingDraft(e.target.value);
              setClearedMsg(null);
            }}
            placeholder={CLEAR_PHRASE}
            className="w-32 rounded-md border border-red-900/60 bg-bg px-2 py-1 text-xs text-red-100 placeholder-red-300/40 focus:border-red-500"
          />
          <button
            type="button"
            disabled={clearingDraft !== CLEAR_PHRASE || clearing}
            onClick={() => void handleClearAll()}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing && <Loader2 className="h-3 w-3 animate-spin" />}
            Clear all data
          </button>
          {clearedMsg && (
            <span className="text-[11px] text-emerald-300">{clearedMsg}</span>
          )}
        </div>
      </section>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-36 text-gray-400">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500"
      />
      <span className="w-24 text-right text-gray-200">
        {value.toLocaleString()} {unit}
      </span>
      {help && <span className="hidden max-w-xs text-[10px] text-gray-500 lg:inline">{help}</span>}
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={
        'relative inline-flex h-5 w-9 items-center rounded-full transition ' +
        (on ? 'bg-blue-600' : 'bg-gray-700')
      }
      aria-pressed={on}
    >
      <span
        className={
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ' +
          (on ? 'translate-x-5' : 'translate-x-1')
        }
      />
    </button>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-800 bg-bg px-2 py-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-gray-700 bg-transparent"
        aria-label={`${label} color`}
      />
      <span className="flex-1 text-xs text-gray-200">{label}</span>
      <code className="text-[10px] text-gray-500">{value}</code>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-800 bg-bg px-2 py-1.5 text-xs hover:border-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 accent-blue-500"
      />
      <span className="text-gray-200">{label}</span>
    </label>
  );
}
