import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, Loader2, Save } from 'lucide-react';
import { sendMessage } from '@/shared/messaging';
import {
  TEMPLATE_PLACEHOLDERS,
  renderTemplate,
  type TemplateCorpusLintResult,
  type TemplateRenderContext,
} from '@/shared/templates';
import { CONNECT_NOTE_CHAR_CAP } from '@/shared/constants';
import type { MessageTemplate, MessageTemplateKind } from '@/shared/types';

const KINDS: Array<{ id: MessageTemplateKind; label: string; help: string }> = [
  {
    id: 'connect_note',
    label: 'Connect note',
    help: 'Prefilled into the LinkedIn Connect modal textarea. User clicks Send.',
  },
  {
    id: 'first_message',
    label: 'First message',
    help: 'Clipboard-copy only — the extension never submits the composer.',
  },
  {
    id: 'followup',
    label: 'Follow-up',
    help: 'Clipboard-copy only. Used after an accept.',
  },
];

const DEFAULT_PREVIEW_CONTEXT: TemplateRenderContext = {
  first_name: 'Alex',
  company: 'Sequoia Capital',
  mutual_context: 'Mara and Jordan',
  headline: 'Partner at Sequoia · investing in early-stage infra',
  mutual_count: 3,
  recent_post_snippet: "your post on AI infra funding yesterday",
};

export function TemplatesRoute() {
  const [kind, setKind] = useState<MessageTemplateKind>('connect_note');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorBody, setEditorBody] = useState('');
  const [editorName, setEditorName] = useState('');
  const [corpusLint, setCorpusLint] = useState<TemplateCorpusLintResult | null>(
    null,
  );
  const [corpusLinting, setCorpusLinting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await sendMessage({ type: 'TEMPLATES_LIST' });
    if (res.ok) {
      setTemplates(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(
    () => templates.filter((t) => t.kind === kind && !t.archived)[0] ?? null,
    [templates, kind],
  );

  const archivedForKind = useMemo(
    () => templates.filter((t) => t.kind === kind && t.archived),
    [templates, kind],
  );

  const maxVersionForKind = useMemo(
    () =>
      templates
        .filter((t) => t.kind === kind)
        .reduce((acc, t) => (t.version > acc ? t.version : acc), 0),
    [templates, kind],
  );

  // Keep editor in sync with the active template when switching kinds / reload.
  useEffect(() => {
    setEditorBody(active?.body ?? '');
    setEditorName(active?.name ?? '');
  }, [active?.id, active?.body, active?.name]);

  // Debounced corpus lint — re-run a sample render against scored-in-range
  // prospects so the user sees how many would render with blank placeholders.
  useEffect(() => {
    const body = editorBody;
    if (!body.trim()) {
      setCorpusLint(null);
      return;
    }
    let cancelled = false;
    setCorpusLinting(true);
    const t = setTimeout(async () => {
      const res = await sendMessage({
        type: 'TEMPLATE_LINT_CORPUS',
        payload: { body },
      });
      if (cancelled) return;
      setCorpusLinting(false);
      if (res.ok) setCorpusLint(res.data);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [editorBody]);

  const save = async () => {
    setSaving(true);
    setSavedAt(null);
    setError(null);
    try {
      const res = await sendMessage({
        type: 'TEMPLATE_UPSERT',
        payload: {
          id: active?.id,
          kind,
          name: editorName.trim() || undefined,
          body: editorBody,
        },
      });
      if (res.ok) {
        setSavedAt(Date.now());
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (id: number, archived: boolean) => {
    setSaving(true);
    try {
      const res = await sendMessage({
        type: 'TEMPLATE_ARCHIVE',
        payload: { id, archived },
      });
      if (res.ok) await load();
      else setError(res.error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const isConnectNote = kind === 'connect_note';
  const renderResult = renderTemplate(editorBody, DEFAULT_PREVIEW_CONTEXT);
  const renderedLength = renderResult.rendered.length;
  const overCap = isConnectNote && renderedLength > CONNECT_NOTE_CHAR_CAP;
  const activeKindMeta = KINDS.find((k) => k.id === kind)!;

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Message templates</h1>
          <p className="text-[11px] text-gray-500">
            One active template per type. Placeholders use{' '}
            <code className="rounded bg-black/40 px-1">{'{{name}}'}</code> syntax.
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

      <div className="mb-4 flex gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={
              'rounded-md px-3 py-1.5 text-xs font-medium transition ' +
              (kind === k.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700')
            }
          >
            {k.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-[11px] text-gray-500">{activeKindMeta.help}</p>

      {error && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-[11px] text-red-200">
          {error}
        </div>
      )}

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">
            {active ? `Editing v${active.version}` : 'New template'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !editorBody.trim()}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {active ? 'Save' : 'Create'}
            </button>
            {active && (
              <button
                type="button"
                onClick={() => void toggleArchive(active.id, true)}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                title="Archive the active template. The editor will fall back to a fresh v2 draft."
              >
                <Archive className="h-3 w-3" /> Archive
              </button>
            )}
          </div>
        </div>

        <label className="mb-3 block text-xs">
          <span className="mb-1 block text-gray-400">Name</span>
          <input
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
            placeholder={`${kind} v${active ? active.version : maxVersionForKind + 1}`}
            className="w-full rounded-md border border-gray-800 bg-bg px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
          />
        </label>

        <label className="mb-3 block text-xs">
          <span className="mb-1 block text-gray-400">Body</span>
          <textarea
            value={editorBody}
            onChange={(e) => setEditorBody(e.target.value)}
            rows={6}
            placeholder={
              isConnectNote
                ? 'Hi {{first_name}} — saw your recent post on {{headline}}. Would love to connect.'
                : 'Hey {{first_name}}, thanks for accepting…'
            }
            className="w-full resize-y rounded-md border border-gray-800 bg-bg px-2 py-2 font-mono text-[11px] leading-5 text-gray-100 focus:border-blue-500"
          />
        </label>

        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">
            Insert
          </span>
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                setEditorBody((prev) =>
                  prev.endsWith(' ') || prev.length === 0
                    ? `${prev}{{${p}}}`
                    : `${prev} {{${p}}}`,
                )
              }
              className="rounded border border-gray-800 bg-bg px-1.5 py-0.5 font-mono text-[10px] text-gray-400 hover:border-blue-500 hover:text-blue-300"
            >
              {`{{${p}}}`}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-md border border-gray-800 bg-bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">Preview</h2>
          <span
            className={
              'text-[11px] ' +
              (overCap
                ? 'text-red-400'
                : renderedLength > CONNECT_NOTE_CHAR_CAP * 0.9 && isConnectNote
                  ? 'text-yellow-400'
                  : 'text-gray-500')
            }
          >
            {renderedLength}
            {isConnectNote ? `/${CONNECT_NOTE_CHAR_CAP}` : ''} chars
          </span>
        </div>
        <pre className="whitespace-pre-wrap rounded-md border border-gray-800 bg-bg px-3 py-2 font-mono text-[11px] leading-5 text-gray-200">
          {renderResult.rendered || (
            <span className="italic text-gray-600">(empty)</span>
          )}
        </pre>
        {overCap && (
          <p className="mt-2 text-[11px] text-red-400">
            Rendered preview exceeds the {CONNECT_NOTE_CHAR_CAP}-char Connect
            note cap. LinkedIn will reject or truncate this.
          </p>
        )}
        {renderResult.missing.length > 0 && (
          <p className="mt-2 text-[11px] text-yellow-400">
            Missing context for: {renderResult.missing.join(', ')} (preview uses
            sample data — live render may leave these blank).
          </p>
        )}
        {renderResult.unknown.length > 0 && (
          <p className="mt-2 text-[11px] text-red-300">
            Unknown placeholder{renderResult.unknown.length > 1 ? 's' : ''}:{' '}
            {renderResult.unknown.map((u) => `{{${u}}}`).join(', ')}
          </p>
        )}
        <CorpusLintPanel result={corpusLint} loading={corpusLinting} />
      </section>

      {archivedForKind.length > 0 && (
        <section className="rounded-md border border-gray-800 bg-bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-100">
            Archived versions
          </h2>
          <div className="flex flex-col gap-2">
            {archivedForKind.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 rounded-md border border-gray-800 bg-bg px-3 py-2"
              >
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-200">
                    v{t.version} · {t.name}
                  </div>
                  <pre className="mt-1 max-h-24 overflow-hidden whitespace-pre-wrap font-mono text-[10px] text-gray-500">
                    {t.body}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleArchive(t.id, false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  title="Restore this version as the active template."
                >
                  <ArchiveRestore className="h-3 w-3" /> Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CorpusLintPanel({
  result,
  loading,
}: {
  result: TemplateCorpusLintResult | null;
  loading: boolean;
}) {
  if (loading && !result) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Linting against your
        prospect corpus…
      </p>
    );
  }
  if (!result) return null;
  if (result.sample_size === 0) {
    return (
      <p className="mt-3 text-[11px] text-gray-500">
        No scored-in-range prospects yet — corpus lint will activate once you
        have tiered rows.
      </p>
    );
  }
  const pct =
    result.missing_rate !== null
      ? Math.round(result.missing_rate * 100)
      : 0;
  const thresholdPct = Math.round(result.threshold * 100);
  const tone = result.threshold_exceeded
    ? 'border-red-900/60 bg-red-950/20 text-red-200'
    : pct > 0
      ? 'border-amber-900/60 bg-amber-950/20 text-amber-200'
      : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200/90';
  const topMissing = (Object.entries(result.per_placeholder) as Array<
    [string, number]
  >)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <div className={`mt-3 rounded-md border p-3 text-[11px] ${tone}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          Corpus lint · n={result.sample_size}
        </span>
        <span>
          {pct}% with blanks
          {result.threshold_exceeded ? ` (over ${thresholdPct}% threshold)` : ''}
        </span>
      </div>
      {result.empty_count > 0 && (
        <div className="mt-1">
          {result.empty_count} prospect
          {result.empty_count === 1 ? '' : 's'} render the template as fully
          empty.
        </div>
      )}
      {topMissing.length > 0 && (
        <div className="mt-1 text-current/80">
          Most-missing:{' '}
          {topMissing
            .map(([name, count]) => `{{${name}}} (${count})`)
            .join(' · ')}
        </div>
      )}
      {result.threshold_exceeded && (
        <div className="mt-1.5">
          Consider relaxing the placeholders or seeding more headline / company
          / mutuals data via scans.
        </div>
      )}
    </div>
  );
}
