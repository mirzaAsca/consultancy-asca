/**
 * Pure DOM helpers that decide whether a matched `/in/` anchor is the header
 * actor of its container (post author / commenter) or an @-mention inside the
 * body copy. Extracted from `highlight.ts` so they can be unit tested in
 * jsdom without pulling in the content-script bootstrap side effects.
 */

import { findHighlightContainer, type ContainerKind } from './highlight-containers';

function slugFromHref(href: string): string | null {
  try {
    const url = new URL(href, 'https://www.linkedin.com/');
    if (!/linkedin\.com$/i.test(url.hostname.replace(/^www\./i, ''))) {
      return null;
    }
    const match = decodeURIComponent(url.pathname).match(/^\/in\/([^/]+)/i);
    if (!match) return null;
    const raw = match[1].trim();
    return raw ? raw.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isCommenterAnchor(
  anchor: HTMLAnchorElement,
  container: HTMLElement,
): boolean {
  const first = container.querySelector<HTMLAnchorElement>('a[href*="/in/"]');
  if (!first) return false;
  const firstSlug = slugFromHref(first.getAttribute('href') || first.href || '');
  const anchorSlug = slugFromHref(anchor.getAttribute('href') || anchor.href || '');
  return !!firstSlug && firstSlug === anchorSlug;
}

/**
 * For post-authors containers, only the actual author should be highlighted.
 * @-mentions inside the post body sit inside <p> runs of text, while the
 * actor header is its own <div>/<span> strip — so the first /in/ anchor not
 * nested in a <p> is the author. Mentions fail this check and are handled
 * separately (reclassified to `mentions`).
 */
export function isPostAuthorAnchor(
  anchor: HTMLAnchorElement,
  container: HTMLElement,
): boolean {
  const anchorSlug = slugFromHref(anchor.getAttribute('href') || anchor.href || '');
  if (!anchorSlug) return false;
  if (anchor.closest('p')) return false;
  const candidates = container.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');
  for (const candidate of Array.from(candidates)) {
    if (candidate.closest('p')) continue;
    const slug = slugFromHref(candidate.getAttribute('href') || candidate.href || '');
    if (!slug) continue;
    return slug === anchorSlug;
  }
  return false;
}

/**
 * Resolve the effective kind for an anchor — applies the same mention
 * reclassification `scanAndHighlight` uses at render time. Returning
 * `'unknown'` means no known container (the anchor is a stray / nav link).
 */
export function inferAnchorKind(anchor: HTMLAnchorElement): ContainerKind {
  const container = findHighlightContainer(anchor);
  if (!container) return 'unknown';
  if (container.kind === 'post_authors' && !isPostAuthorAnchor(anchor, container.el)) {
    return 'mentions';
  }
  if (container.kind === 'commenters' && !isCommenterAnchor(anchor, container.el)) {
    return 'mentions';
  }
  return container.kind;
}
