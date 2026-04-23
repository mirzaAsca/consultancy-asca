import type { Prospect } from './types';

/**
 * Placeholder variables accepted inside `{{double_brace}}` tokens in a
 * template body. Keep in sync with `EXTENSION_GROWTH_TODO.md` Phase 1.4.
 */
export const TEMPLATE_PLACEHOLDERS = [
  'first_name',
  'company',
  'mutual_context',
  'headline',
  'mutual_count',
  'recent_post_snippet',
] as const;

export type TemplatePlaceholder = (typeof TEMPLATE_PLACEHOLDERS)[number];

/**
 * Per-render context the caller resolves from a prospect row + (for
 * `recent_post_snippet`) the most recent `feed_event` body text. Values may be
 * null — the renderer substitutes an empty string and reports the placeholder
 * as "missing" so the UI can warn.
 */
export interface TemplateRenderContext {
  first_name: string | null;
  company: string | null;
  mutual_context: string | null;
  headline: string | null;
  mutual_count: number | null;
  recent_post_snippet: string | null;
}

export interface TemplateRenderResult {
  rendered: string;
  /** Placeholder names referenced in the body that resolved to an empty string. */
  missing: TemplatePlaceholder[];
  /** Placeholder-like tokens referenced in the body that are NOT supported. */
  unknown: string[];
}

/** `{{placeholder}}` with optional internal whitespace. */
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/**
 * Replace every `{{placeholder}}` in `body` with the context value.
 *
 * - Unknown placeholder names (not in {@link TEMPLATE_PLACEHOLDERS}) are left
 *   in place so the user sees them in the preview and can fix the typo.
 * - Known placeholders that resolve to `null`/empty render as an empty string
 *   and are returned in `missing` so the UI can warn.
 */
export function renderTemplate(
  body: string,
  context: TemplateRenderContext,
): TemplateRenderResult {
  const knownSet = new Set<string>(TEMPLATE_PLACEHOLDERS);
  const missingSet = new Set<TemplatePlaceholder>();
  const unknownSet = new Set<string>();

  const rendered = body.replace(PLACEHOLDER_RE, (match, rawName: string) => {
    const name = rawName.trim();
    if (!knownSet.has(name)) {
      unknownSet.add(name);
      return match;
    }
    const key = name as TemplatePlaceholder;
    const raw = context[key];
    const value = stringifyValue(raw);
    if (!value) missingSet.add(key);
    return value;
  });

  return {
    rendered,
    missing: Array.from(missingSet),
    unknown: Array.from(unknownSet),
  };
}

/** Extract the first word of the prospect's name — naive but sufficient for templates. */
export function firstNameFromProspect(prospect: Pick<Prospect, 'name' | 'slug'>): string | null {
  const name = prospect.name?.trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  // Fall back to the slug's first segment (before any dash) so a missing name
  // at least produces a vaguely human-looking token instead of `{{first_name}}`.
  if (prospect.slug) {
    const first = prospect.slug.split('-')[0];
    if (first) return capitalize(first);
  }
  return null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build a {@link TemplateRenderContext} from a prospect + optional feed-event
 * snippet. Callers that don't have a live prospect (Template editor preview)
 * can pass a hand-rolled context object directly.
 */
export function buildRenderContextFromProspect(
  prospect: Pick<Prospect, 'name' | 'slug' | 'company' | 'headline' | 'mutual_count'>,
  extras: {
    mutual_context?: string | null;
    recent_post_snippet?: string | null;
  } = {},
): TemplateRenderContext {
  return {
    first_name: firstNameFromProspect(prospect),
    company: prospect.company,
    mutual_context: extras.mutual_context ?? null,
    headline: prospect.headline,
    mutual_count: prospect.mutual_count,
    recent_post_snippet: extras.recent_post_snippet ?? null,
  };
}
