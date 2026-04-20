/**
 * DOM container detection for feed highlighting.
 *
 * LinkedIn classes churn frequently, so prefer structural markers (`role`,
 * `componentkey`, nearby copy hints) over brittle class names.
 */

export type ContainerKind =
  | 'post_authors'
  | 'reposters'
  | 'commenters'
  | 'reactors'
  | 'mentions'
  | 'suggested'
  | 'unknown';

type ResolvedKind = Exclude<ContainerKind, 'unknown' | 'mentions'>;

const CONTAINER_SELECTORS: Record<ResolvedKind, string[]> = {
  post_authors: [
    // LinkedIn 2026 feed cards (obfuscated class names).
    'div[role="listitem"][componentkey*="FeedType_"]',
    'div[role="listitem"]',
    // Legacy fallbacks.
    'article',
    'div[data-urn*="urn:li:activity"]',
    'div.feed-shared-update-v2',
    'div.update-components-actor',
  ],
  reposters: [
    // Legacy fallbacks.
    'div.update-components-header',
    'div.feed-shared-mini-update-v2',
    'div.feed-shared-header',
  ],
  commenters: [
    // LinkedIn 2026 comment rows.
    'div[componentkey^="replaceableComment_"]',
    'div[componentkey*="replaceableComment_"]',
    'div[data-testid*="-commentList"] > div',
    // Legacy fallbacks.
    'article.comments-comment-item',
    'article.comments-comment-entity',
    'div.comments-comment-item',
    'div.comments-post-meta',
  ],
  reactors: [
    // Reactors overlays are commonly rendered in dialogs.
    'div[role="dialog"] li',
    // Legacy fallbacks.
    'li.artdeco-list__item',
    'li.social-details-reactors-tab-body-list-item',
    'li.reusable-search__result-container',
  ],
  suggested: [
    // Current right-rail / recommendation patterns.
    'aside li',
    'aside [componentkey*="discover"]',
    '[data-testid*="discover"] li',
    '[aria-label*="People you may know" i] li',
    // Legacy fallbacks.
    'li.entity-result',
    'li.reusable-search__result-container',
    'li.pymk-list__item',
    'div.discover-entity-type-card',
  ],
};

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findClosest(anchor: HTMLElement, selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    try {
      const found = anchor.closest<HTMLElement>(sel);
      if (found) return found;
    } catch {
      // Skip invalid selectors in unexpected DOM contexts.
    }
  }
  return null;
}

type SocialProofKind = Extract<ResolvedKind, 'reposters' | 'reactors' | 'commenters'>;

function classifySocialProofText(text: string): SocialProofKind | null {
  if (!text) return null;
  if (/\breposted\b/i.test(text)) return 'reposters';
  if (/\bfollow(?:s|ed|ing)?\s+this\s+page\b/i.test(text)) return 'reposters';
  if (/\bcommented\s+on\s+this\b/i.test(text)) return 'commenters';
  if (
    /\blike[sd]?\s+this\b/i.test(text) ||
    /\breacted\s+to\s+this\b/i.test(text) ||
    /\b(?:celebrates?|supports?|loves?)\s+this\b/i.test(text) ||
    /\bfinds\s+this\s+funny\b/i.test(text) ||
    /\bis\s+insightful\b/i.test(text) ||
    /\bis\s+curious\b/i.test(text)
  ) {
    return 'reactors';
  }
  return null;
}

function detectSocialProofKind(
  anchor: HTMLElement,
  container: HTMLElement,
): SocialProofKind | null {
  const candidates = new Set<HTMLElement>();
  const nearestParagraph = anchor.closest<HTMLElement>('p');
  if (nearestParagraph) candidates.add(nearestParagraph);

  let cursor: HTMLElement | null = anchor;
  let hops = 0;
  while (cursor && cursor !== container && hops < 10) {
    const tag = cursor.tagName;
    if (tag === 'P' || tag === 'DIV' || tag === 'SPAN' || tag === 'SECTION') {
      candidates.add(cursor);
    }
    cursor = cursor.parentElement;
    hops += 1;
  }

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate.textContent);
    // Social-proof copy is a short header strip; skip long post bodies.
    if (normalized.length === 0 || normalized.length > 280) continue;
    const kind = classifySocialProofText(normalized);
    if (kind) return kind;
  }
  return null;
}

export function findHighlightContainer(
  anchor: HTMLElement,
): { kind: ResolvedKind; el: HTMLElement } | null {
  const commentContainer = findClosest(anchor, CONTAINER_SELECTORS.commenters);
  if (commentContainer) return { kind: 'commenters', el: commentContainer };

  const reactorContainer = findClosest(anchor, CONTAINER_SELECTORS.reactors);
  if (reactorContainer) return { kind: 'reactors', el: reactorContainer };

  const suggestedContainer = findClosest(anchor, CONTAINER_SELECTORS.suggested);
  if (suggestedContainer) return { kind: 'suggested', el: suggestedContainer };

  const postContainer = findClosest(anchor, CONTAINER_SELECTORS.post_authors);
  if (postContainer) {
    const socialProofKind = detectSocialProofKind(anchor, postContainer);
    if (socialProofKind) {
      return { kind: socialProofKind, el: postContainer };
    }
    return { kind: 'post_authors', el: postContainer };
  }

  const legacyReposterContainer = findClosest(anchor, CONTAINER_SELECTORS.reposters);
  if (legacyReposterContainer) {
    return { kind: 'reposters', el: legacyReposterContainer };
  }

  return null;
}
