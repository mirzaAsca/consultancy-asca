/**
 * Centralized LinkedIn DOM selectors for the scan content script.
 *
 * Each field has 2–3 fallbacks tried in order. When LinkedIn ships a DOM
 * change, only this file needs updating. Fixtures in `tests/selectors.fixtures.html`
 * back these up with snapshot tests.
 *
 * Kept plain (no runtime imports) so it can be serialized/inlined into the
 * tab-injected scan function via `chrome.scripting.executeScript`.
 */

export interface ScanSelectorSet {
  /** Degree-badge element(s) next to the profile name in the top card. */
  distanceBadge: string[];
  /** Full profile name in the top card. */
  name: string[];
  /** Sub-headline text under the name. */
  headline: string[];
  /** Current experience company (top-card aggregation). */
  company: string[];
  /** Location under the avatar / top card. */
  location: string[];
  /** Presence of a "Connect" primary action → usually 2nd-degree heuristic. */
  connectButton: string[];
  /** Presence of a "Message" primary action → usually 1st-degree heuristic. */
  messageButton: string[];
  /** Presence of a "Follow" primary action (3rd / out-of-network fallback). */
  followButton: string[];
  /** Matches a "Profile unavailable" / 404 page. */
  profileUnavailable: string[];
}

export const LINKEDIN_SELECTORS: ScanSelectorSet = {
  distanceBadge: [
    '.pv-top-card--list-bullet .dist-value',
    'main span.dist-value',
    'main [data-test-distance-badge]',
    'main .artdeco-entity-lockup__degree',
  ],
  name: [
    'main h1.text-heading-xlarge',
    'main section.pv-top-card h1',
    'main h1.inline',
    'main h1',
  ],
  headline: [
    'main .text-body-medium.break-words',
    'main .pv-text-details__left-panel .text-body-medium',
    'main section.pv-top-card .text-body-medium',
  ],
  company: [
    'main [aria-label="Current company"] span[aria-hidden="true"]',
    'main section.pv-top-card button[aria-label^="Current company"] span',
    'main .pv-text-details__right-panel-item-link .inline-show-more-text',
    'main .pv-top-card--experience-list .pv-entity__secondary-title',
  ],
  location: [
    'main .text-body-small.inline.t-black--light.break-words',
    'main section.pv-top-card .pv-text-details__left-panel .text-body-small',
    'main section.pv-top-card .pv-top-card--list .text-body-small',
  ],
  connectButton: [
    'main button[aria-label^="Invite"][aria-label*="to connect"]',
    'main button.artdeco-button--primary[aria-label*="Connect"]',
  ],
  messageButton: [
    'main button[aria-label^="Message"]',
    'main a.message-anywhere-button',
  ],
  followButton: [
    'main button[aria-label^="Follow "][aria-label*="notifications" i]',
    'main button.artdeco-button--primary[aria-label^="Follow"]',
  ],
  profileUnavailable: [
    '.profile-unavailable',
    '.error-container .not-found',
    '[data-test-id="profile-unavailable"]',
  ],
};

// ———————————————————————————————————————————————————————————
// v2 — Feed-event selector tuples (Phase 2.2 / DOM Reference acceptance).
// ———————————————————————————————————————————————————————————
//
// LinkedIn's 2026 React SDUI feed killed semantic class names — obfuscated
// hashes rotate every deploy. The acceptance criterion in EXTENSION_GROWTH_TODO
// is a three-layer strategy per field: `primary` (data-testid / componentkey /
// aria-label — survives obfuscation), `secondary` (structural role + URN),
// `fallback` (classical `feed-shared-*` for legacy rendered surfaces).
//
// Layers are consumed by `src/content/feed-events.ts` via
// `queryAllTiered(root, tuple)` — try primary, then secondary, then fallback.

export interface SelectorTuple {
  primary: string[];
  secondary: string[];
  fallback: string[];
}

export const FEED_EVENT_SELECTORS = {
  /** Root of the main feed list (`mainFeed`) on the feed page. */
  feedListRoot: {
    primary: ['div[data-testid="mainFeed"][role="list"]'],
    secondary: ['div[role="list"][data-testid*="Feed"]'],
    fallback: ['main[role="main"]'],
  },
  /** One feed-card ("post") container. */
  feedCard: {
    primary: [
      'div[data-testid*="FeedType_MAIN_FEED"]',
      'div[componentkey*="FeedType_MAIN_FEED"]',
    ],
    secondary: ['div[role="listitem"][componentkey*="FeedType_"]'],
    fallback: [
      'article[data-urn*="urn:li:activity"]',
      'div[data-urn*="urn:li:activity"]',
      'div.feed-shared-update-v2',
    ],
  },
  /** Comment-list root within a feed card. */
  commentList: {
    primary: [
      'div[data-testid*="-commentList"][data-testid*="FeedType_MAIN_FEED"]',
      'div[data-testid*="-commentList"]',
    ],
    secondary: ['div[componentkey*="commentList"]'],
    fallback: ['section.comments-comments-list', 'div.comments-comments-list'],
  },
  /** One comment row within a comment list. */
  commentItem: {
    primary: [
      'div[componentkey^="replaceableComment_"]',
      'div[componentkey*="replaceableComment_"]',
    ],
    secondary: ['div[data-testid*="-commentList"] > div'],
    fallback: [
      'article.comments-comment-item',
      'article.comments-comment-entity',
      'div.comments-comment-item',
    ],
  },
  /** Post author identity hook — aria-label pattern is our most stable anchor. */
  postAuthorAnchor: {
    primary: ['button[aria-label^="Open control menu for post by "]'],
    secondary: [
      'button[aria-label^="Hide post by "]',
      'button[aria-label^="Follow "][aria-label*="post"]',
    ],
    fallback: ['a.app-aware-link[href*="/in/"]'],
  },
  /** Social-proof header — "X likes this", "X commented on this", etc. */
  socialProofHeader: {
    primary: ['p[componentkey]'],
    secondary: ['div[componentkey="post-social-proof"]'],
    fallback: ['span.update-components-header__text-view'],
  },
  /** Lazy-scroll sentinel — don't emit events for un-finished cards. */
  lazyColumn: {
    primary: ['[data-component-type="LazyColumn"]'],
    secondary: ['[data-testid="feed-lazy-column"]'],
    fallback: [],
  },
} as const satisfies Record<string, SelectorTuple>;

/**
 * Query all three tiers in order and return the first matching element
 * within `root`. Returns `null` if nothing matches at any tier.
 */
export function queryFirstTiered(
  root: ParentNode,
  tuple: SelectorTuple,
): Element | null {
  for (const layer of [tuple.primary, tuple.secondary, tuple.fallback]) {
    for (const sel of layer) {
      try {
        const hit = root.querySelector(sel);
        if (hit) return hit;
      } catch {
        // Invalid selector for this DOM — skip.
      }
    }
  }
  return null;
}

/**
 * Collect every match across all tiers, deduped. Order: primary → secondary
 * → fallback. Duplicate DOM nodes are filtered — primary wins over fallback
 * for the same element.
 */
export function queryAllTiered(
  root: ParentNode,
  tuple: SelectorTuple,
): Element[] {
  const seen = new Set<Element>();
  const out: Element[] = [];
  for (const layer of [tuple.primary, tuple.secondary, tuple.fallback]) {
    for (const sel of layer) {
      try {
        for (const el of Array.from(root.querySelectorAll(sel))) {
          if (seen.has(el)) continue;
          seen.add(el);
          out.push(el);
        }
      } catch {
        // Invalid selector for this DOM — skip.
      }
    }
  }
  return out;
}

/** Heuristic checks for auto-pause triggers. URL checks are done outside the DOM. */
export const SAFETY_URL_PATTERNS = {
  captcha: /\/checkpoint\/(challenge|lg)/i,
  rateLimit: /\/checkpoint\/(rate|limit)/i,
  authWall: /\/(login|authwall|checkpoint\/lg\/login)/i,
} as const;

export const SAFETY_TEXT_FRAGMENTS = {
  captcha: ['captcha', 'security verification', 'verify you are human'],
  rateLimit: [
    "we've restricted your account",
    'unusual activity',
    'unusual traffic',
    'try again later',
  ],
  authWall: ['sign in to linkedin', 'join linkedin', 'join now to see'],
} as const;
