import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import type {
  OutreachFirm,
  OutreachKeyword,
  Settings,
  SettingsPatch,
} from '@/shared/types';

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
                label="Mentions (@ tags in post/comment body)"
                checked={hi.show_on.mentions}
                onChange={(v) =>
                  void save({ highlight: { show_on: { mentions: v } } })
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

      <OutreachCapsSection settings={settings} save={save} />

      <TierThresholdsSection settings={settings} save={save} />

      <HealthSection settings={settings} save={save} />

      <KeywordsSection settings={settings} save={save} />

      <FirmsSection settings={settings} save={save} />

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

// —————————————————————————————————————————————————————————————
// v2 outreach settings sections (Phase 1.2)
// —————————————————————————————————————————————————————————————

type SaveFn = (patch: SettingsPatch) => Promise<void>;

function OutreachCapsSection({
  settings,
  save,
}: {
  settings: Settings;
  save: SaveFn;
}) {
  const caps = settings.outreach.caps;
  const warmVisit = settings.outreach.warm_visit_before_invite;
  return (
    <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-100">Outreach caps</h2>
      <p className="mb-3 text-[11px] text-gray-500">
        Daily / weekly budget for Mode A outreach. Invites and visits share one
        risk bucket when shared bucket is on.
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <NumberField
          label="Daily invites"
          value={caps.daily_invites}
          min={0}
          max={100}
          onChange={(v) => void save({ outreach: { caps: { daily_invites: v } } })}
          help="Conservative default 15."
        />
        <NumberField
          label="Daily visits"
          value={caps.daily_visits}
          min={0}
          max={500}
          onChange={(v) => void save({ outreach: { caps: { daily_visits: v } } })}
          help="Includes pre-invite warming visits."
        />
        <NumberField
          label="Daily messages"
          value={caps.daily_messages}
          min={0}
          max={100}
          onChange={(v) => void save({ outreach: { caps: { daily_messages: v } } })}
          help="Manual-send only; cap is for draft surfacing."
        />
        <NumberField
          label="Weekly invites"
          value={caps.weekly_invites}
          min={0}
          max={500}
          onChange={(v) => void save({ outreach: { caps: { weekly_invites: v } } })}
          help="Ceiling, not target. Default 80."
        />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <label className="w-36 text-xs text-gray-400">Shared bucket</label>
          <Toggle
            on={caps.shared_bucket}
            onChange={(v) =>
              void save({ outreach: { caps: { shared_bucket: v } } })
            }
          />
          <span className="text-[11px] text-gray-500">
            Invites count against the visit budget too.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="w-36 text-xs text-gray-400">Warm visit before invite</label>
          <Toggle
            on={warmVisit}
            onChange={(v) =>
              void save({ outreach: { warm_visit_before_invite: v } })
            }
          />
          <span className="text-[11px] text-gray-500">
            Auto-queue a profile visit 24–72h before a connect request.
          </span>
        </div>
      </div>
    </section>
  );
}

function TierThresholdsSection({
  settings,
  save,
}: {
  settings: Settings;
  save: SaveFn;
}) {
  const t = settings.outreach.tier_thresholds;
  return (
    <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-100">Tier thresholds</h2>
      <p className="mb-3 text-[11px] text-gray-500">
        Inclusive lower bound on the scoring total. Editing any threshold triggers
        a full rescore of every prospect.
      </p>
      <div className="grid grid-cols-4 gap-3 text-xs">
        <NumberField
          label="S ≥"
          value={t.S}
          min={0}
          max={500}
          onChange={(v) =>
            void save({ outreach: { tier_thresholds: { S: v } } })
          }
        />
        <NumberField
          label="A ≥"
          value={t.A}
          min={0}
          max={500}
          onChange={(v) =>
            void save({ outreach: { tier_thresholds: { A: v } } })
          }
        />
        <NumberField
          label="B ≥"
          value={t.B}
          min={0}
          max={500}
          onChange={(v) =>
            void save({ outreach: { tier_thresholds: { B: v } } })
          }
        />
        <NumberField
          label="C ≥"
          value={t.C}
          min={0}
          max={500}
          onChange={(v) =>
            void save({ outreach: { tier_thresholds: { C: v } } })
          }
        />
      </div>
    </section>
  );
}

function HealthSection({
  settings,
  save,
}: {
  settings: Settings;
  save: SaveFn;
}) {
  const cooldownHours = settings.outreach.health_cooldown_hours;
  const ks = settings.outreach.kill_switch_thresholds;
  return (
    <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-100">
        Health & kill switch
      </h2>
      <p className="mb-3 text-[11px] text-gray-500">
        Phase 4.3 — when any of these thresholds trips, the scan auto-pauses
        with a <code className="rounded bg-black/30 px-1 text-[10px]">health_breach</code>{' '}
        reason. Manual resume is blocked until the cooldown elapses.
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <NumberField
          label="Cooldown (hours)"
          value={cooldownHours}
          min={0}
          max={168}
          onChange={(v) =>
            void save({ outreach: { health_cooldown_hours: v } })
          }
          help="0–168. How long resume stays blocked after a breach."
        />
        <FractionField
          label="Accept rate floor"
          value={ks.accept_rate_floor}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) =>
            void save({
              outreach: { kill_switch_thresholds: { accept_rate_floor: v } },
            })
          }
          help="Trip if 7d accept rate falls below this (0..1)."
        />
        <NumberField
          label="Min invites (7d)"
          value={ks.invites_sent_min}
          min={0}
          max={500}
          onChange={(v) =>
            void save({
              outreach: { kill_switch_thresholds: { invites_sent_min: v } },
            })
          }
          help="Sample size before accept-rate floor is meaningful."
        />
        <NumberField
          label="Safety window (hours)"
          value={ks.safety_window_hours}
          min={1}
          max={168}
          onChange={(v) =>
            void save({
              outreach: { kill_switch_thresholds: { safety_window_hours: v } },
            })
          }
          help="Rolling window for pile-up detection."
        />
        <NumberField
          label="Max safety triggers"
          value={ks.safety_trigger_max}
          min={1}
          max={20}
          onChange={(v) =>
            void save({
              outreach: { kill_switch_thresholds: { safety_trigger_max: v } },
            })
          }
          help="Captcha/rate-limit/auth-wall count inside the window before breach."
        />
      </div>
    </section>
  );
}

function FractionField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-gray-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (!Number.isFinite(raw)) return;
          onChange(clamp(raw, min, max));
        }}
        className="w-full rounded-md border border-gray-800 bg-bg px-2 py-1 text-gray-100 focus:border-blue-500"
      />
      {help && <span className="text-[10px] text-gray-500">{help}</span>}
    </label>
  );
}

function KeywordsSection({
  settings,
  save,
}: {
  settings: Settings;
  save: SaveFn;
}) {
  const keywords = settings.outreach.keywords;
  const [term, setTerm] = useState('');
  const [weight, setWeight] = useState(40);
  const [kind, setKind] = useState<OutreachKeyword['kind']>('strong');

  const add = () => {
    const clean = term.trim();
    if (!clean) return;
    const next: OutreachKeyword[] = [
      ...keywords,
      { term: clean, weight: clamp(weight, 0, 40), kind },
    ];
    void save({ outreach: { keywords: next } });
    setTerm('');
  };

  const updateAt = (index: number, patch: Partial<OutreachKeyword>) => {
    const next = keywords.map((k, i) => (i === index ? { ...k, ...patch } : k));
    void save({ outreach: { keywords: next } });
  };

  const removeAt = (index: number) => {
    const next = keywords.filter((_, i) => i !== index);
    void save({ outreach: { keywords: next } });
  };

  return (
    <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-100">
        Headline keywords
      </h2>
      <p className="mb-3 text-[11px] text-gray-500">
        Case-insensitive substring match against each prospect's headline.
        Strong matches typically score +40, soft matches +15. Editing the list
        triggers a full rescore.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-800 bg-bg px-2 py-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="e.g. Partner"
          className="min-w-[10rem] flex-1 rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
        />
        <select
          value={kind}
          onChange={(e) => {
            const k = e.target.value as OutreachKeyword['kind'];
            setKind(k);
            setWeight(k === 'strong' ? 40 : 15);
          }}
          className="rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
        >
          <option value="strong">strong</option>
          <option value="soft">soft</option>
        </select>
        <input
          type="number"
          min={0}
          max={40}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value) || 0)}
          className="w-16 rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
          aria-label="Weight"
        />
        <button
          type="button"
          onClick={add}
          disabled={!term.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {keywords.length === 0 ? (
        <p className="py-2 text-[11px] italic text-gray-500">
          No keywords yet. Add a few — partner, investor, principal, angel — so
          scoring can differentiate past connection level.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {keywords.map((kw, i) => (
            <div
              key={`${kw.term}-${i}`}
              className="flex items-center gap-2 rounded-md border border-gray-800 bg-bg px-2 py-1.5 text-xs"
            >
              <input
                value={kw.term}
                onChange={(e) => updateAt(i, { term: e.target.value })}
                className="min-w-[8rem] flex-1 rounded-md border border-gray-800 bg-bg-card px-2 py-1 text-gray-100 focus:border-blue-500"
              />
              <select
                value={kw.kind}
                onChange={(e) =>
                  updateAt(i, { kind: e.target.value as OutreachKeyword['kind'] })
                }
                className="rounded-md border border-gray-800 bg-bg-card px-1.5 py-1 text-gray-100 focus:border-blue-500"
              >
                <option value="strong">strong</option>
                <option value="soft">soft</option>
              </select>
              <input
                type="number"
                min={0}
                max={40}
                value={kw.weight}
                onChange={(e) =>
                  updateAt(i, { weight: clamp(Number(e.target.value) || 0, 0, 40) })
                }
                className="w-14 rounded-md border border-gray-800 bg-bg-card px-1.5 py-1 text-gray-100 focus:border-blue-500"
                aria-label="Weight"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded p-1 text-gray-500 hover:bg-red-900/40 hover:text-red-300"
                aria-label={`Remove ${kw.term}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FirmsSection({
  settings,
  save,
}: {
  settings: Settings;
  save: SaveFn;
}) {
  const firms = settings.outreach.firms;
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(40);
  const [tier, setTier] = useState<OutreachFirm['tier']>('top');

  const defaultWeightFor = (t: OutreachFirm['tier']) =>
    t === 'top' ? 40 : t === 'mid' ? 25 : 15;

  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    const next: OutreachFirm[] = [
      ...firms,
      { name: clean, weight: clamp(weight, 0, 40), tier },
    ];
    void save({ outreach: { firms: next } });
    setName('');
  };

  const updateAt = (index: number, patch: Partial<OutreachFirm>) => {
    const next = firms.map((f, i) => (i === index ? { ...f, ...patch } : f));
    void save({ outreach: { firms: next } });
  };

  const removeAt = (index: number) => {
    const next = firms.filter((_, i) => i !== index);
    void save({ outreach: { firms: next } });
  };

  return (
    <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-100">Firm whitelist</h2>
      <p className="mb-3 text-[11px] text-gray-500">
        Case-insensitive substring match against each prospect's company. Tier
        is a categorical label; weight is the scoring contribution (0–40).
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-800 bg-bg px-2 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="e.g. Sequoia"
          className="min-w-[10rem] flex-1 rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
        />
        <select
          value={tier}
          onChange={(e) => {
            const t = e.target.value as OutreachFirm['tier'];
            setTier(t);
            setWeight(defaultWeightFor(t));
          }}
          className="rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
        >
          <option value="top">top</option>
          <option value="mid">mid</option>
          <option value="boutique">boutique</option>
        </select>
        <input
          type="number"
          min={0}
          max={40}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value) || 0)}
          className="w-16 rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
          aria-label="Weight"
        />
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {firms.length === 0 ? (
        <p className="py-2 text-[11px] italic text-gray-500">
          No firms yet. Add top-tier VCs you want to prioritize.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {firms.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-gray-800 bg-bg px-2 py-1.5 text-xs"
            >
              <input
                value={f.name}
                onChange={(e) => updateAt(i, { name: e.target.value })}
                className="min-w-[8rem] flex-1 rounded-md border border-gray-800 bg-bg-card px-2 py-1 text-gray-100 focus:border-blue-500"
              />
              <select
                value={f.tier}
                onChange={(e) =>
                  updateAt(i, { tier: e.target.value as OutreachFirm['tier'] })
                }
                className="rounded-md border border-gray-800 bg-bg-card px-1.5 py-1 text-gray-100 focus:border-blue-500"
              >
                <option value="top">top</option>
                <option value="mid">mid</option>
                <option value="boutique">boutique</option>
              </select>
              <input
                type="number"
                min={0}
                max={40}
                value={f.weight}
                onChange={(e) =>
                  updateAt(i, { weight: clamp(Number(e.target.value) || 0, 0, 40) })
                }
                className="w-14 rounded-md border border-gray-800 bg-bg-card px-1.5 py-1 text-gray-100 focus:border-blue-500"
                aria-label="Weight"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded p-1 text-gray-500 hover:bg-red-900/40 hover:text-red-300"
                aria-label={`Remove ${f.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-gray-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (!Number.isFinite(raw)) return;
          onChange(clamp(Math.round(raw), min, max));
        }}
        className="w-full rounded-md border border-gray-800 bg-bg px-2 py-1 text-gray-100 focus:border-blue-500"
      />
      {help && <span className="text-[10px] text-gray-500">{help}</span>}
    </label>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
