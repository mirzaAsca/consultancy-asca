/**
 * LinkedIn URN parsing helpers (v2 Phase 2.2).
 *
 * LinkedIn's modern React SDUI feed hides activity identifiers behind
 * obfuscated `componentkey` hashes — the raw URNs survive only inside
 * hydration-data JSON payloads shipped in <script> blocks and a handful of
 * stable DOM attributes (hrefs, data-testids). This module centralizes the
 * URN shapes and permalink construction so `content/highlight.ts` and
 * contract tests never hand-roll regexes.
 *
 * Observed URN shapes (MASTER v1.1 §19.5, EXTENSION_GROWTH_TODO DOM Reference):
 *   urn:li:activity:7451889312482283521
 *   urn:li:ugcPost:7451886104967839744
 *   urn:li:groupPost:3990648-7445075414298894336
 *   urn:li:share:7450000000000000000
 *   urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)
 */

import type { FeedPostKind } from './types';

const ACTIVITY_RE = /urn:li:activity:(\d+)/g;
const UGC_POST_RE = /urn:li:ugcPost:(\d+)/g;
const GROUP_POST_RE = /urn:li:groupPost:(\d+-\d+)/g;
const SHARE_RE = /urn:li:share:(\d+)/g;
const COMMENT_RE = /urn:li:comment:\(urn:li:activity:(\d+),(\d+)\)/g;

export interface ExtractedUrns {
  /** All `urn:li:activity:*` instances, deduped, insertion-order. */
  activity: string[];
  /** All `urn:li:ugcPost:*`. */
  ugcPost: string[];
  /** All `urn:li:groupPost:*`. */
  groupPost: string[];
  /** All `urn:li:share:*`. */
  share: string[];
  /** All `urn:li:comment:(urn:li:activity:X,Y)` comment URNs. */
  comment: string[];
}

function pushUnique(list: string[], seen: Set<string>, value: string): void {
  if (seen.has(value)) return;
  seen.add(value);
  list.push(value);
}

/**
 * Scan arbitrary HTML (or any string blob) for LinkedIn URN patterns and
 * return them bucketed by kind. URL-encoded instances (`urn%3Ali%3Aactivity%3A…`)
 * are normalized before scanning so hrefs like `?commentUrn=urn%3Ali%3Acomment…`
 * are caught without a second pass.
 *
 * Pure — no DOM access, safe to call from unit tests (jsdom) and from the
 * content script against `document.documentElement.outerHTML`.
 */
export function extractUrnsFromHydration(input: string): ExtractedUrns {
  const out: ExtractedUrns = {
    activity: [],
    ugcPost: [],
    groupPost: [],
    share: [],
    comment: [],
  };
  if (!input) return out;

  // Normalize URL-encoded URNs. `%3A`/`%28`/`%29`/`%2C` only appear in anchor
  // hrefs / query params, not in hydration JSON, so the extra replacements
  // are effectively zero-cost on the hot path.
  const hasEncoded = /%(?:3A|28|29|2C)/i.test(input);
  const normalized = hasEncoded
    ? input
        .replace(/%3A/gi, ':')
        .replace(/%28/gi, '(')
        .replace(/%29/gi, ')')
        .replace(/%2C/gi, ',')
    : input;

  const seen = {
    activity: new Set<string>(),
    ugcPost: new Set<string>(),
    groupPost: new Set<string>(),
    share: new Set<string>(),
    comment: new Set<string>(),
  };

  for (const match of normalized.matchAll(COMMENT_RE)) {
    const urn = `urn:li:comment:(urn:li:activity:${match[1]},${match[2]})`;
    pushUnique(out.comment, seen.comment, urn);
    pushUnique(out.activity, seen.activity, `urn:li:activity:${match[1]}`);
  }
  for (const match of normalized.matchAll(ACTIVITY_RE)) {
    pushUnique(out.activity, seen.activity, `urn:li:activity:${match[1]}`);
  }
  for (const match of normalized.matchAll(UGC_POST_RE)) {
    pushUnique(out.ugcPost, seen.ugcPost, `urn:li:ugcPost:${match[1]}`);
  }
  for (const match of normalized.matchAll(GROUP_POST_RE)) {
    pushUnique(out.groupPost, seen.groupPost, `urn:li:groupPost:${match[1]}`);
  }
  for (const match of normalized.matchAll(SHARE_RE)) {
    pushUnique(out.share, seen.share, `urn:li:share:${match[1]}`);
  }

  return out;
}

/** Classify a post URN by its prefix. Returns `null` for comment URNs. */
export function classifyPostKindFromUrn(urn: string | null | undefined): FeedPostKind | null {
  if (!urn) return null;
  if (urn.startsWith('urn:li:activity:')) return 'activity';
  if (urn.startsWith('urn:li:ugcPost:')) return 'ugcPost';
  if (urn.startsWith('urn:li:groupPost:')) return 'groupPost';
  if (urn.startsWith('urn:li:share:')) return 'share';
  return null;
}

/**
 * Canonical post permalink from an activity URN. Pattern verified against
 * `example1.html` (MASTER v1.1 §19.5 and TODO DOM Reference).
 */
export function buildPostPermalink(activityUrn: string | null | undefined): string | null {
  if (!activityUrn) return null;
  // Only activity URNs route cleanly through `/feed/update/`; ugcPost/share
  // have their own permalink surface but are less predictable — fall back.
  if (!activityUrn.startsWith('urn:li:activity:')) return null;
  return `https://www.linkedin.com/feed/update/${activityUrn}/`;
}

/**
 * Canonical comment permalink — stacks the comment URN as a query param on
 * the owning post's permalink. The `commentUrn` shape is
 * `urn:li:comment:(urn:li:activity:X,Y)`; we extract `X` and use it as the
 * post activity URN if no separate `activityUrn` is provided.
 */
export function buildCommentPermalink(
  activityUrn: string | null | undefined,
  commentUrn: string | null | undefined,
): string | null {
  if (!commentUrn) return null;
  let parentActivity = activityUrn ?? null;
  if (!parentActivity) {
    const m = commentUrn.match(/urn:li:comment:\(urn:li:activity:(\d+),\d+\)/);
    if (m) parentActivity = `urn:li:activity:${m[1]}`;
  }
  const base = buildPostPermalink(parentActivity);
  if (!base) return null;
  return `${base}?commentUrn=${encodeURIComponent(commentUrn)}`;
}

/**
 * Best-guess activity URN from a feed-card DOM element by scanning its
 * outer HTML. Usage: pass the nearest post-listitem to pull out its URN
 * without duplicating regexes at the call site.
 */
export function extractActivityUrnFromElement(el: Element | null): string | null {
  if (!el) return null;
  const html = (el as HTMLElement).outerHTML ?? '';
  const urns = extractUrnsFromHydration(html);
  return urns.activity[0] ?? null;
}

/** Extract the first comment URN within `el` (for a comment listitem). */
export function extractCommentUrnFromElement(el: Element | null): string | null {
  if (!el) return null;
  const html = (el as HTMLElement).outerHTML ?? '';
  const urns = extractUrnsFromHydration(html);
  return urns.comment[0] ?? null;
}
