/**
 * Feed highlighter — runs on every linkedin.com page.
 *
 * Observes the DOM for `a[href*="/in/"]` anchors, cross-references the slug
 * against the cached prospect map from the background worker, and visually
 * annotates matching containers (posts, reposts, comments, reactors, "People
 * you may know" sidebar) with a colored border + level badge.
 *
 * No network I/O, no LinkedIn automation — read-only DOM decoration only.
 */

import {
  addRuntimeMessageListener,
  getExtensionUrl,
  sendMessage,
} from '@/shared/messaging';
import type {
  FeedVisibleProfile,
  Message,
  ProspectHighlightSummary,
  Settings,
  SlugMap,
} from '@/shared/types';
import { canonicalizeLinkedInProfileUrl } from '@/shared/url';
import {
  badgeLabelForLevel,
  buildHighlightLevelCss,
  cssVarForLevel,
} from './highlight-levels';
import {
  findHighlightContainer,
  type ContainerKind,
} from './highlight-containers';
import {
  inferAnchorKind,
  isCommenterAnchor,
  isPostAuthorAnchor,
} from './highlight-mentions';
import {
  detectFeedModeFromUrl,
  extractFeedEventsFromDocument,
  FeedEventBatcher,
} from './feed-events';
import { prefillConnectModal } from './outreach-prefill';
import { runFeedCrawlSession } from './feed-crawler';
import { startInteractionDetectorsForUrl } from './interaction-detectors';
import { CONNECT_NOTE_CHAR_CAP } from '@/shared/constants';

// ——— Module state (content-script scope, one instance per tab) ———

const STYLE_ID = 'lis-highlight-style';
const MENU_ID = 'lis-action-menu';
const DATA_MATCH = 'lisMatch';
const DATA_SLUG = 'lisSlug';
const DATA_PROSPECT_ID = 'lisProspectId';
const DATA_BADGE_NAME = 'lisBadgeName';
const DATA_BADGE_ACTION = 'lisBadgeAction';
const DATA_BADGE_URL = 'lisBadgeUrl';
const DATA_KIND = 'lisKind';
const BADGE_CLASS = 'lis-badge';
const BADGE_PILL_CLASS = 'lis-badge-pill';
const BADGE_NAME_CLASS = 'lis-badge-name';
const BADGE_ACTION_CLASS = 'lis-badge-action';
const CONTAINER_ATTR = 'data-lis-match';

let slugMap: SlugMap = {};
let slugMapReady = false;
let settings: Settings | null = null;
let scheduled = false;
let rescanTimer: number | null = null;
let repositionScheduled = false;
const containerBadges = new Map<HTMLElement, HTMLElement>();
const feedEventBatcher = new FeedEventBatcher();
/**
 * Per-tab record of feed-event fingerprints observed during this session.
 * Shared with the manual Feed Crawl Session runner so it can count deltas
 * per mode without coupling to the batcher's internal dedupe state.
 */
const crawlSeenFingerprints = new Set<string>();
/** Running session id + cancellation flag the background can flip. */
let activeCrawlSessionId: string | null = null;
let activeCrawlCanceled = false;
const FEED_TEST_DEFAULT_MAX_PROFILES = 200;
/** Horizontal gap between a badge's right edge and the outer post card. */
const BADGE_GAP_PX = 16;
/** Vertical inset from the top of the reference container to the badge. */
const BADGE_TOP_OFFSET_PX = 4;
/** Minimum vertical breathing room between two stacked badges. */
const BADGE_COLLISION_GAP_PX = 8;
/** Viewport-left gutter preserved when a layout would push a badge off-screen. */
const BADGE_MIN_VISIBLE_LEFT_PX = 8;

/**
 * Selectors for the outer post/activity card. All badges on the same post
 * (author header, any commenters, any @-mentions in the body) share this
 * card's left edge as the anchor — so the badges stack in one clean column
 * to the LEFT of the entire feed item instead of each action. Falls back to
 * the matched container's own rect when no post card wraps it (e.g.
 * reactor dialogs, right-rail "People you may know" cards).
 */
const OUTER_FEED_CARD_SELECTOR = [
  'div[role="listitem"][componentkey*="FeedType_"]',
  'article',
  'div[data-urn*="urn:li:activity"]',
  'div.feed-shared-update-v2',
].join(', ');

// ——— Utilities ———

function log(event: string, data: Record<string, unknown> = {}): void {
  console.info('[investor-scout/highlight]', {
    event,
    url: location.href,
    ...data,
  });
}

function warn(event: string, data: Record<string, unknown> = {}): void {
  console.warn('[investor-scout/highlight]', {
    event,
    url: location.href,
    ...data,
  });
}

function slugFromHref(href: string): string | null {
  try {
    const url = new URL(href, location.origin);
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

function normalizeVisibleProfileName(anchor: HTMLAnchorElement): string | null {
  const candidates = [anchor.getAttribute('aria-label'), anchor.textContent];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed.slice(0, 200);
  }
  return null;
}

function findDisplayNameInContainer(
  container: HTMLElement,
  slug: string,
): string | null {
  const anchors = container.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');
  let best: string | null = null;
  for (const a of Array.from(anchors)) {
    const href = a.getAttribute('href') || a.href;
    if (slugFromHref(href) !== slug) continue;
    const text = a.textContent?.replace(/\s+/g, ' ').trim();
    if (!text || !/[A-Za-zÀ-ÿĀ-žА-я]/.test(text)) continue;
    const normalized = normalizeBadgeName(text);
    if (!normalized) continue;
    if (!best || normalized.length > best.length) best = normalized;
  }
  return best;
}

function normalizeBadgeName(raw: string | null | undefined): string | null {
  const trimmed = raw?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/^view\s+/i, '')
    .replace(/\s*profile$/i, '')
    .replace(/,\s*(?:1st|2nd|3rd|out of network).*$/i, '')
    .replace(
      /\s+(?:liked|likes|commented|reposted|finds this funny|celebrates this|supports this|loves this|is insightful|is curious).*$/i,
      '',
    )
    .trim();
  if (!normalized) return null;
  return normalized.slice(0, 80);
}

function collectNearbyActionContext(
  anchor: HTMLAnchorElement,
  container: HTMLElement,
): string {
  const snippets: string[] = [];
  const seen = new Set<string>();

  const collect = (raw: string | null | undefined): void => {
    const text = raw?.replace(/\s+/g, ' ').trim();
    if (!text || text.length > 220 || seen.has(text)) return;
    seen.add(text);
    snippets.push(text);
  };

  const nearestLine = anchor.closest<HTMLElement>('p, span, div');
  if (nearestLine) collect(nearestLine.textContent);

  let cursor: HTMLElement | null = anchor.parentElement;
  let hops = 0;
  while (cursor && cursor !== container && hops < 8) {
    collect(cursor.textContent);
    cursor = cursor.parentElement;
    hops += 1;
  }

  return snippets.join(' · ').slice(0, 600);
}

function inferActionLabelFromText(raw: string): string | null {
  const text = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (text.includes('finds this funny')) return 'reacted (funny)';
  if (text.includes('celebrates this')) return 'reacted (celebrate)';
  if (text.includes('supports this')) return 'reacted (support)';
  if (text.includes('loves this')) return 'reacted (love)';
  if (text.includes('is insightful')) return 'reacted (insightful)';
  if (text.includes('is curious')) return 'reacted (curious)';
  if (text.includes('likes this') || text.includes('liked this') || text.includes('reacted')) {
    return 'reacted (like)';
  }
  if (text.includes('commented')) return 'commented';
  if (text.includes('reposted')) return 'reposted';
  if (/\bfollow(?:s|ed|ing)?\s+this\s+page\b/i.test(text)) return 'followed';
  if (text.includes('followed')) return 'followed';

  return null;
}

function fallbackActionLabelForKind(kind: ContainerKind): string | null {
  switch (kind) {
    case 'commenters':
      return 'commented';
    case 'reactors':
      return 'reacted';
    case 'reposters':
      return 'reposted';
    case 'suggested':
      return 'suggested';
    case 'post_authors':
      return 'posted';
    case 'mentions':
      return 'mentioned';
    default:
      return null;
  }
}

interface BadgeMeta {
  displayName: string;
  actionLabel: string | null;
  profileUrl: string;
}

function buildBadgeMeta(
  anchor: HTMLAnchorElement,
  container: HTMLElement,
  kind: ContainerKind,
  summary: ProspectHighlightSummary,
  slug: string,
): BadgeMeta {
  const href = anchor.getAttribute('href') || anchor.href;
  const canonicalProfileUrl = href ? canonicalizeLinkedInProfileUrl(href) : null;
  const profileUrl =
    canonicalProfileUrl ||
    `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`;

  const displayName =
    normalizeBadgeName(summary.name) ||
    findDisplayNameInContainer(container, slug) ||
    normalizeBadgeName(normalizeVisibleProfileName(anchor)) ||
    slug;

  // Mentions sit in post/comment body copy — the surrounding sentence is the
  // post's text, not a social-proof header. Skip the text scan and use the
  // stable fallback so every mention reads as "mentioned".
  const actionLabel =
    kind === 'mentions'
      ? fallbackActionLabelForKind(kind)
      : inferActionLabelFromText(collectNearbyActionContext(anchor, container)) ||
        fallbackActionLabelForKind(kind);

  return {
    displayName,
    actionLabel,
    profileUrl,
  };
}

/**
 * Accept any anchor that is actually rendered — non-zero box, not
 * display:none/visibility:hidden/opacity:0. We intentionally do **not**
 * require the anchor to intersect the current viewport rectangle: LinkedIn's
 * feed is a tall virtual-scrolled document, and a strict viewport filter
 * leaves the user with only 1–2 unique slugs at any given scroll position
 * (which is nowhere near the 4 needed to seed all color levels). Collecting
 * every rendered profile on the page lets the test-seed flow always find
 * enough unique targets, and lets the diversity picker sample post authors,
 * commenters, reactors, mentions, etc. from everything LinkedIn has already
 * mounted into the DOM.
 */
function isElementRendered(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  if (Number(style.opacity) === 0) return false;
  return true;
}

/**
 * Diversity-first ordering for seeding test labels: include at least one of
 * every observed role before falling back to extras. `post_authors` first so
 * a feed with exactly 4 profiles still covers the primary actor.
 */
const DIVERSITY_KIND_ORDER: ContainerKind[] = [
  'post_authors',
  'commenters',
  'reposters',
  'reactors',
  'mentions',
  'suggested',
  'unknown',
];

function collectVisibleFeedProfiles(maxProfiles: number): FeedVisibleProfile[] {
  const seenSlugs = new Set<string>();
  const buckets = new Map<ContainerKind, FeedVisibleProfile[]>();
  const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');

  for (const anchor of Array.from(anchors)) {
    if (!isElementRendered(anchor)) continue;

    const href = anchor.href || anchor.getAttribute('href');
    if (!href) continue;
    const canonical = canonicalizeLinkedInProfileUrl(href);
    if (!canonical) continue;

    const slug = slugFromHref(canonical);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const kind = inferAnchorKind(anchor);
    const profile: FeedVisibleProfile = {
      url: canonical,
      slug,
      name: normalizeVisibleProfileName(anchor),
    };
    const bucket = buckets.get(kind);
    if (bucket) bucket.push(profile);
    else buckets.set(kind, [profile]);
  }

  // Round-robin across kinds in priority order. Drains one from each non-empty
  // bucket per pass so a handful of roles always precede a long tail from any
  // single role (e.g. 40 sidebar suggestions).
  const out: FeedVisibleProfile[] = [];
  let drained = true;
  while (drained && out.length < maxProfiles) {
    drained = false;
    for (const kind of DIVERSITY_KIND_ORDER) {
      if (out.length >= maxProfiles) break;
      const bucket = buckets.get(kind);
      if (!bucket || bucket.length === 0) continue;
      out.push(bucket.shift() as FeedVisibleProfile);
      drained = true;
    }
  }
  return out;
}

function isKindEnabled(kind: ContainerKind): boolean {
  if (!settings?.highlight?.enabled) return false;
  if (kind === 'unknown') return false;
  return settings.highlight.show_on[kind] === true;
}

// ——— CSS injection (driven by user-configurable colors) ———

function buildStylesheet(): string {
  const levelCss = buildHighlightLevelCss(CONTAINER_ATTR, settings?.highlight?.colors);
  return `
    ${levelCss}
    [${CONTAINER_ATTR}] {
      position: relative;
      border-radius: 8px;
      transition: box-shadow .2s ease;
    }

    .${BADGE_CLASS} {
      position: absolute;
      top: 0;
      left: 0;
      transform: translateX(-100%);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      gap: 6px;
      user-select: none;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      white-space: nowrap;
      pointer-events: auto;
    }

    .${BADGE_ACTION_CLASS} {
      color: var(--lis-badge-bg, var(--lis-color-3rd));
      font-size: 11px;
      font-weight: 600;
      opacity: .9;
      white-space: nowrap;
      text-transform: lowercase;
    }

    .${BADGE_NAME_CLASS} {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .02em;
      color: #ffffff;
      background: var(--lis-badge-bg, var(--lis-color-3rd));
      text-decoration: none;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 1px 2px rgba(0,0,0,.2);
    }
    .${BADGE_NAME_CLASS}:hover { filter: brightness(1.1); }

    .${BADGE_PILL_CLASS} {
      all: unset;
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .02em;
      color: #ffffff;
      background: var(--lis-badge-bg, var(--lis-color-3rd));
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,.2);
    }
    .${BADGE_PILL_CLASS}:hover { filter: brightness(1.1); }

    #${MENU_ID} {
      position: absolute;
      z-index: 2147483647;
      background: #1B1C21;
      color: #E5E7EB;
      border: 1px solid #2D2F36;
      border-radius: 8px;
      min-width: 220px;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px;
      padding: 4px;
    }
    #${MENU_ID} .lis-menu-header {
      padding: 8px 10px;
      border-bottom: 1px solid #2D2F36;
      margin-bottom: 4px;
    }
    #${MENU_ID} .lis-menu-header-name {
      font-weight: 600;
      color: #fff;
    }
    #${MENU_ID} .lis-menu-header-sub {
      color: #9CA3AF;
      font-size: 11px;
      margin-top: 2px;
    }
    #${MENU_ID} button {
      all: unset;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 6px;
      cursor: pointer;
      width: calc(100% - 20px);
      color: #E5E7EB;
      font-size: 12px;
    }
    #${MENU_ID} button:hover { background: #2A2C33; }
    #${MENU_ID} button[data-kind="view"] { color: #93C5FD; }
    #${MENU_ID} button[data-kind="dashboard"] { color: #A5B4FC; }
    #${MENU_ID} button[data-kind="connected"] { color: #86EFAC; }
    #${MENU_ID} button[data-kind="commented"] { color: #FCD34D; }
    #${MENU_ID} button[data-kind="messaged"] { color: #F0ABFC; }
  `;
}

function injectOrUpdateStylesheet(): void {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = buildStylesheet();
}

// ——— Highlight application ———

function clearContainer(el: HTMLElement): void {
  el.removeAttribute(CONTAINER_ATTR);
  delete el.dataset[DATA_MATCH];
  delete el.dataset[DATA_SLUG];
  delete el.dataset[DATA_PROSPECT_ID];
  delete el.dataset[DATA_BADGE_NAME];
  delete el.dataset[DATA_BADGE_ACTION];
  delete el.dataset[DATA_BADGE_URL];
  delete el.dataset[DATA_KIND];
  const badge = containerBadges.get(el);
  if (badge) {
    badge.remove();
    containerBadges.delete(el);
  }
}

interface BadgePlacement {
  badge: HTMLElement;
  top: number;
  left: number;        // value written to `style.left`
  visibleLeft: number; // rendered left edge (accounts for translateX(-100%))
  visibleRight: number;
  height: number;
}

function findOuterFeedCard(container: HTMLElement): HTMLElement | null {
  // For any element inside a post card (including mention anchors nested
  // deep in the body), return the card. `closest` walks up from the element.
  if (container.matches?.(OUTER_FEED_CARD_SELECTOR)) return container;
  return container.closest<HTMLElement>(OUTER_FEED_CARD_SELECTOR);
}

function computeBadgePlacement(
  container: HTMLElement,
  badge: HTMLElement,
): BadgePlacement | null {
  const containerRect = container.getBoundingClientRect();
  if (containerRect.width <= 0 && containerRect.height <= 0) return null;

  // Horizontal reference: the outermost post card shared by everything
  // inside it. This is what produces a single clean left column per post
  // regardless of which action (author / commenter / reactor / mention)
  // triggered the highlight. When no post card wraps the container (reactor
  // dialogs, right-rail suggestions), fall back to the container itself.
  const anchorCard = findOuterFeedCard(container);
  const anchorRect = anchorCard
    ? anchorCard.getBoundingClientRect()
    : containerRect;

  const badgeW = badge.offsetWidth || 180;
  const badgeH = badge.offsetHeight || 20;

  // Badges use `transform: translateX(-100%)` globally (set in the shared
  // `.lis-badge` stylesheet), so `style.left` is the RIGHT edge of the
  // rendered rectangle.
  const idealStyleLeft = anchorRect.left + window.scrollX - BADGE_GAP_PX;
  // Vertical: align with the specific action inside the post, not the post's
  // top — so the commenter badge lines up with the comment row, the mention
  // badge lines up with the mention line, and the post-author badge lines up
  // with the post card's top.
  const top = containerRect.top + window.scrollY + BADGE_TOP_OFFSET_PX;

  // Clamp so the visible rect never goes under 8px from the viewport left.
  const styleLeft = Math.max(
    idealStyleLeft,
    window.scrollX + BADGE_MIN_VISIBLE_LEFT_PX + badgeW,
  );

  return {
    badge,
    top,
    left: styleLeft,
    visibleLeft: styleLeft - badgeW,
    visibleRight: styleLeft,
    height: badgeH,
  };
}

/**
 * Place all badges with pairwise vertical-collision avoidance. Posts, their
 * comments, and in-body mentions often share the same left margin (LinkedIn
 * centers content to a fixed column), so naive `rect.top - offset`
 * positioning produces stacked badges that overlap each other and the post
 * itself. Sort by desired top and push any badge whose visible rect would
 * intersect a previously-placed badge below it.
 */
function repositionAllBadges(): void {
  // Prune badges whose containers left the DOM (SPA navigation, feed reflow).
  for (const [container, badge] of Array.from(containerBadges.entries())) {
    if (!container.isConnected) {
      badge.remove();
      containerBadges.delete(container);
    }
  }

  const placements: BadgePlacement[] = [];
  for (const [container, badge] of containerBadges.entries()) {
    const placement = computeBadgePlacement(container, badge);
    if (!placement) {
      badge.style.display = 'none';
      continue;
    }
    badge.style.display = '';
    placements.push(placement);
  }

  // Sort by desired top; resolve collisions greedily against already-placed badges.
  placements.sort((a, b) => a.top - b.top);
  const placed: BadgePlacement[] = [];
  for (const p of placements) {
    let resolvedTop = p.top;
    for (const q of placed) {
      // No horizontal overlap → can't collide.
      if (p.visibleRight <= q.visibleLeft || p.visibleLeft >= q.visibleRight) continue;
      const qBottom = q.top + q.height;
      if (resolvedTop < qBottom + BADGE_COLLISION_GAP_PX) {
        resolvedTop = qBottom + BADGE_COLLISION_GAP_PX;
      }
    }
    p.top = resolvedTop;
    p.badge.style.top = `${resolvedTop}px`;
    p.badge.style.left = `${p.left}px`;
    placed.push(p);
  }
}

function scheduleReposition(): void {
  if (repositionScheduled) return;
  repositionScheduled = true;
  requestAnimationFrame(() => {
    repositionScheduled = false;
    repositionAllBadges();
  });
}

function applyHighlight(
  container: HTMLElement,
  summary: ProspectHighlightSummary,
  slug: string,
  badgeMeta: BadgeMeta,
  kind: ContainerKind,
): void {
  const levelAttr = summary.level === 'NONE' ? 'NONE' : summary.level;
  const previous = container.getAttribute(CONTAINER_ATTR);
  if (
    previous === levelAttr &&
    container.dataset[DATA_SLUG] === slug &&
    (container.dataset[DATA_BADGE_NAME] ?? '') === badgeMeta.displayName &&
    (container.dataset[DATA_BADGE_ACTION] ?? '') === (badgeMeta.actionLabel ?? '') &&
    (container.dataset[DATA_BADGE_URL] ?? '') === badgeMeta.profileUrl &&
    (container.dataset[DATA_KIND] ?? '') === kind &&
    containerBadges.has(container)
  ) {
    return;
  }

  container.setAttribute(CONTAINER_ATTR, levelAttr);
  container.dataset[DATA_SLUG] = slug;
  container.dataset[DATA_PROSPECT_ID] = String(summary.id);
  container.dataset[DATA_BADGE_NAME] = badgeMeta.displayName;
  container.dataset[DATA_BADGE_ACTION] = badgeMeta.actionLabel ?? '';
  container.dataset[DATA_BADGE_URL] = badgeMeta.profileUrl;
  container.dataset[DATA_KIND] = kind;

  let badge = containerBadges.get(container);
  if (!badge || !badge.isConnected) {
    badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    document.body.appendChild(badge);
    containerBadges.set(container, badge);
  }

  let nameLink = badge.querySelector<HTMLAnchorElement>(`:scope > .${BADGE_NAME_CLASS}`);
  let action = badge.querySelector<HTMLElement>(`:scope > .${BADGE_ACTION_CLASS}`);
  let pill = badge.querySelector<HTMLButtonElement>(`:scope > .${BADGE_PILL_CLASS}`);

  if (!nameLink || !action || !pill) {
    badge.replaceChildren();

    nameLink = document.createElement('a');
    nameLink.className = BADGE_NAME_CLASS;
    nameLink.target = '_blank';
    nameLink.rel = 'noopener noreferrer';
    nameLink.addEventListener('click', (ev) => {
      ev.stopPropagation();
    });

    action = document.createElement('span');
    action.className = BADGE_ACTION_CLASS;

    pill = document.createElement('button');
    pill.type = 'button';
    pill.className = BADGE_PILL_CLASS;
    pill.addEventListener('click', onBadgeClick);

    badge.appendChild(nameLink);
    badge.appendChild(action);
    badge.appendChild(pill);
  }

  badge.style.setProperty('--lis-badge-bg', cssVarForLevel(summary.level));

  nameLink.textContent = badgeMeta.displayName;
  nameLink.href = badgeMeta.profileUrl;

  if (badgeMeta.actionLabel) {
    action.textContent = badgeMeta.actionLabel;
    action.style.display = '';
  } else {
    action.textContent = '';
    action.style.display = 'none';
  }

  pill.textContent = badgeLabelForLevel(summary.level);
  pill.setAttribute('data-lis-prospect-id', String(summary.id));
  pill.setAttribute('data-lis-slug', slug);

  badge.title = [badgeMeta.displayName, badgeMeta.actionLabel, summary.company, summary.headline]
    .filter(Boolean)
    .join(' · ');

  // Defer placement to the centralized collision-aware pass so newly added
  // badges don't overlap existing ones in the same left margin column.
  scheduleReposition();
}

function onBadgeClick(ev: MouseEvent): void {
  ev.preventDefault();
  ev.stopPropagation();
  const badge = ev.currentTarget as HTMLElement;
  const prospectId = Number(badge.getAttribute('data-lis-prospect-id'));
  const slug = badge.getAttribute('data-lis-slug') ?? '';
  const summary = slug ? slugMap[slug.toLowerCase()] : undefined;
  if (!Number.isFinite(prospectId) || prospectId <= 0) return;
  openActionMenu(badge, prospectId, slug, summary);
}

// ——— Inline action menu ———

function closeActionMenu(): void {
  document.getElementById(MENU_ID)?.remove();
  document.removeEventListener('click', onOutsideMenuClick, true);
  window.removeEventListener('scroll', closeActionMenu, true);
  window.removeEventListener('resize', closeActionMenu, true);
}

function onOutsideMenuClick(ev: MouseEvent): void {
  const menu = document.getElementById(MENU_ID);
  if (!menu) return;
  if (menu.contains(ev.target as Node)) return;
  closeActionMenu();
}

function openActionMenu(
  anchor: HTMLElement,
  prospectId: number,
  slug: string,
  summary: ProspectHighlightSummary | undefined,
): void {
  closeActionMenu();
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = MENU_ID;

  const header = document.createElement('div');
  header.className = 'lis-menu-header';
  const hName = document.createElement('div');
  hName.className = 'lis-menu-header-name';
  hName.textContent = summary?.name || slug || 'Prospect';
  const hSub = document.createElement('div');
  hSub.className = 'lis-menu-header-sub';
  hSub.textContent =
    [summary?.company, summary?.headline].filter(Boolean).join(' · ') ||
    `linkedin.com/in/${slug}`;
  header.appendChild(hName);
  header.appendChild(hSub);
  menu.appendChild(header);

  const items: Array<{ kind: string; label: string; run: () => void }> = [
    {
      kind: 'view',
      label: 'Open profile in new tab',
      run: () => {
        window.open(
          `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      kind: 'dashboard',
      label: 'Open in dashboard',
      run: () => {
        const dashboardUrl = getExtensionUrl(
          `src/dashboard/index.html#/prospects?id=${prospectId}`,
        );
        if (!dashboardUrl) {
          warn('dashboard_open_failed', {
            prospectId,
            error: 'extension context unavailable',
          });
          return;
        }
        window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
      },
    },
    {
      kind: 'connected',
      label: 'Mark as connected',
      run: () => {
        void markActivity(prospectId, { connected: true });
      },
    },
    {
      kind: 'commented',
      label: 'Mark as commented',
      run: () => {
        void markActivity(prospectId, { commented: true });
      },
    },
    {
      kind: 'messaged',
      label: 'Mark as messaged',
      run: () => {
        void markActivity(prospectId, { messaged: true });
      },
    },
  ];

  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-kind', item.kind);
    btn.textContent = item.label;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.run();
      closeActionMenu();
    });
    menu.appendChild(btn);
  }

  // Position absolutely under the badge, accounting for scroll.
  menu.style.top = `${window.scrollY + rect.bottom + 6}px`;
  menu.style.left = `${Math.max(8, window.scrollX + rect.right - 220)}px`;
  document.body.appendChild(menu);

  // Defer outside-click binding to the next tick so the triggering click
  // doesn't immediately dismiss the menu.
  window.setTimeout(() => {
    document.addEventListener('click', onOutsideMenuClick, true);
    window.addEventListener('scroll', closeActionMenu, true);
    window.addEventListener('resize', closeActionMenu, true);
  }, 0);
}

async function markActivity(
  prospectId: number,
  activity: { connected?: boolean; commented?: boolean; messaged?: boolean },
): Promise<void> {
  const res = await sendMessage({
    type: 'PROSPECTS_BULK_ACTIVITY',
    payload: { ids: [prospectId], activity },
  });
  if (!res.ok) {
    warn('activity_mark_failed', { prospectId, error: res.error });
    return;
  }
  log('activity_marked', { prospectId, activity });
}

// ——— Scanning pass ———

function getMarkedContainers(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.hasAttribute(CONTAINER_ATTR)) {
    out.push(root);
  }
  out.push(...Array.from(root.querySelectorAll<HTMLElement>(`[${CONTAINER_ATTR}]`)));
  return out;
}

function captureFeedEvents(root: ParentNode): void {
  if (!slugMapReady) return;
  if (Object.keys(slugMap).length === 0) return;
  try {
    const events = extractFeedEventsFromDocument(root, {
      slugMap,
      feedMode: detectFeedModeFromUrl(location.href),
      now: Date.now(),
    });
    if (events.length > 0) {
      for (const ev of events) crawlSeenFingerprints.add(ev.event_fingerprint);
      feedEventBatcher.enqueue(events);
    }
  } catch (error) {
    warn('feed_events_extract_error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function scanAndHighlight(root: ParentNode = document): void {
  if (!slugMapReady) return;
  if (!settings?.highlight?.enabled) {
    removeAllHighlights();
    return;
  }

  // Piggyback on the highlight pass to harvest feed events into the v2
  // `feed_events` store. Pure DOM walk, already-warm anchors — marginal cost.
  captureFeedEvents(root);

  const anchors = root.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');
  const activeContainers = new Set<HTMLElement>();

  // Skip the currently-viewed profile's own top card (spec §8.1).
  const currentProfileSlug = slugFromHref(location.href);

  for (const anchor of Array.from(anchors)) {
    const href = anchor.getAttribute('href');
    if (!href) continue;
    const slug = slugFromHref(href);
    if (!slug) continue;

    const summary = slugMap[slug];
    if (!summary) continue;

    // Don't decorate the viewer's own profile top card while they're on it.
    if (
      currentProfileSlug === slug &&
      anchor.closest('main section.pv-top-card, main .pv-top-card')
    ) {
      continue;
    }

    const container = findHighlightContainer(anchor);
    if (!container) continue;

    // Reclassify @-mentions: a post-body or comment-body anchor that isn't
    // the author/commenter header becomes its own `mentions` decoration with
    // the anchor itself as the container (inline badge above the link).
    let kind: ContainerKind = container.kind;
    let el: HTMLElement = container.el;
    if (kind === 'post_authors' && !isPostAuthorAnchor(anchor, container.el)) {
      kind = 'mentions';
      el = anchor;
    } else if (kind === 'commenters' && !isCommenterAnchor(anchor, container.el)) {
      kind = 'mentions';
      el = anchor;
    }

    if (!isKindEnabled(kind)) continue;
    if (activeContainers.has(el)) continue;

    activeContainers.add(el);
    applyHighlight(
      el,
      summary,
      slug,
      buildBadgeMeta(anchor, el, kind, summary, slug),
      kind,
    );
  }

  // Clear stale decorations that no longer map to an on-page matched anchor.
  for (const marked of getMarkedContainers(root)) {
    if (!activeContainers.has(marked)) {
      clearContainer(marked);
    }
  }
}

function removeAllHighlights(): void {
  const marked = document.querySelectorAll<HTMLElement>(`[${CONTAINER_ATTR}]`);
  for (const el of Array.from(marked)) clearContainer(el);
  closeActionMenu();
}

/**
 * Coalesce many mutation events into a single scan per animation frame,
 * then yield to idle time before walking the DOM. LinkedIn's feed mutates
 * constantly — a naive listener can easily dominate the CPU.
 */
function scheduleScan(): void {
  if (scheduled) return;
  scheduled = true;
  const runner = (): void => {
    scheduled = false;
    try {
      scanAndHighlight();
    } catch (error) {
      warn('scan_error', { error: error instanceof Error ? error.message : error });
    }
  };
  const idle = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (typeof idle === 'function') {
    idle(runner, { timeout: 400 });
  } else {
    window.setTimeout(runner, 150);
  }
}

// ——— SPA route-change detection ———

/**
 * Patch history.pushState / replaceState + listen to popstate so we can
 * re-scan on soft navigations. LinkedIn is a single-page app for nearly
 * every interaction. We debounce with a short timer to let the new view
 * render before re-scanning.
 */
function installRouteChangeHook(onChange: () => void): void {
  const patch = (name: 'pushState' | 'replaceState'): void => {
    const original = history[name];
    history[name] = function patched(
      this: History,
      ...args: Parameters<History[typeof name]>
    ) {
      const result = original.apply(this, args);
      try {
        onChange();
      } catch {
        // Silent — callback errors must never break history API.
      }
      return result;
    } as History[typeof name];
  };
  patch('pushState');
  patch('replaceState');
  window.addEventListener('popstate', onChange);
}

function onRouteChanged(): void {
  if (rescanTimer !== null) window.clearTimeout(rescanTimer);
  rescanTimer = window.setTimeout(() => {
    rescanTimer = null;
    scheduleScan();
    // Phase 5.3 + 5.6: re-evaluate interaction detectors on every SPA
    // navigation — a profile or messaging thread may have just mounted.
    startInteractionDetectorsForUrl(() => slugMap, () => settings);
  }, 250);
}

// ——— Slug-map + settings lifecycle ———

async function refreshSlugMap(): Promise<void> {
  const res = await sendMessage({ type: 'SLUGS_QUERY' });
  if (!res.ok) {
    warn('slug_map_fetch_failed', { error: res.error });
    return;
  }
  slugMap = res.data ?? {};
  slugMapReady = true;
  // Prospect set changed — invalidate the in-tab dedupe memory so newly-
  // added prospects get their on-screen events captured on the next pass.
  feedEventBatcher.resetSeen();
  log('slug_map_loaded', { count: Object.keys(slugMap).length });
  scheduleScan();
}

async function refreshSettings(): Promise<void> {
  const res = await sendMessage({ type: 'SETTINGS_QUERY' });
  if (!res.ok) {
    warn('settings_fetch_failed', { error: res.error });
    return;
  }
  settings = res.data;
  injectOrUpdateStylesheet();
  scheduleScan();
}

function onSettingsChanged(next: Settings): void {
  settings = next;
  injectOrUpdateStylesheet();
  if (!next.highlight.enabled) {
    removeAllHighlights();
  } else {
    scheduleScan();
  }
}

// ——— Broadcast listener ———

addRuntimeMessageListener((msg: Message, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.type) {
    case 'FEED_TEST_COLLECT_VISIBLE_PROFILES': {
      const requested = Number(msg.payload?.max_profiles ?? FEED_TEST_DEFAULT_MAX_PROFILES);
      const maxProfiles = Number.isFinite(requested)
        ? Math.max(1, Math.min(FEED_TEST_DEFAULT_MAX_PROFILES, Math.trunc(requested)))
        : FEED_TEST_DEFAULT_MAX_PROFILES;
      const profiles = collectVisibleFeedProfiles(maxProfiles);
      sendResponse({
        ok: true,
        data: {
          profiles,
          truncated: profiles.length >= maxProfiles,
        },
      });
      return;
    }
    case 'OUTREACH_PREFILL_CONNECT_IN_TAB': {
      void prefillConnectModal(msg.payload, CONNECT_NOTE_CHAR_CAP).then(
        (res) => {
          try {
            sendResponse(res);
          } catch {
            /* channel already closed — ignore */
          }
        },
      );
      return true; // keep the message channel open for the async send
    }
    case 'FEED_CRAWL_RUN_IN_TAB': {
      const sessionId = msg.payload?.session_id ?? '';
      activeCrawlSessionId = sessionId;
      activeCrawlCanceled = false;
      void runFeedCrawlSession({
        session_id: sessionId,
        tab_id: -1,
        fingerprints: {
          snapshot: () => new Set(crawlSeenFingerprints),
          scanNow: () => scanAndHighlight(document),
        },
        isCanceled: () => activeCrawlCanceled,
        passive: msg.payload?.passive === true,
      })
        .then(async (result) => {
          // Flush any pending feed events before the background finalizes.
          try {
            await feedEventBatcher.flush();
          } catch {
            /* no-op — the event is already enqueued in-memory */
          }
          try {
            sendResponse({ ok: true, data: result });
          } catch {
            /* channel already closed — ignore */
          }
        })
        .catch((error) => {
          try {
            sendResponse({
              ok: false,
              error:
                error instanceof Error ? error.message : 'feed crawl failed',
            });
          } catch {
            /* channel already closed — ignore */
          }
        })
        .finally(() => {
          activeCrawlSessionId = null;
          activeCrawlCanceled = false;
        });
      return true; // keep the message channel open
    }
    case 'FEED_CRAWL_CANCEL_IN_TAB': {
      const sessionId = msg.payload?.session_id ?? '';
      const canceled =
        !!activeCrawlSessionId &&
        (!sessionId || sessionId === activeCrawlSessionId);
      if (canceled) activeCrawlCanceled = true;
      sendResponse({ ok: true, data: { canceled } });
      return;
    }
    case 'PROSPECTS_UPDATED':
      void refreshSlugMap();
      break;
    case 'SETTINGS_CHANGED':
      onSettingsChanged(msg.payload);
      break;
    default:
      break;
  }
});

// ——— Mutation observers (main DOM + body for modals) ———

function startObservers(): void {
  const mainObserver = new MutationObserver((mutations) => {
    // Ignore mutations that only touch our own injected nodes to avoid
    // infinite loops (badge insertion re-triggering the observer).
    for (const m of mutations) {
      for (const n of Array.from(m.addedNodes)) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.classList?.contains(BADGE_CLASS)) continue;
        if (n.id === MENU_ID || n.id === STYLE_ID) continue;
        scheduleScan();
        scheduleReposition();
        return;
      }
    }
  });
  mainObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Badges are portaled to <body>; keep them aligned with their source
  // containers as the user scrolls, resizes, or LinkedIn reflows layout.
  window.addEventListener('scroll', scheduleReposition, { passive: true, capture: true });
  window.addEventListener('resize', scheduleReposition, { passive: true });
}

// ——— Bootstrap ———

async function bootstrap(): Promise<void> {
  try {
    injectOrUpdateStylesheet();
    await Promise.all([refreshSettings(), refreshSlugMap()]);
    startObservers();
    installRouteChangeHook(onRouteChanged);
    // Phase 5.3 + 5.6: kick off detectors for the initial URL. Route-change
    // handler re-invokes on every SPA nav.
    startInteractionDetectorsForUrl(() => slugMap, () => settings);
    log('bootstrapped', {
      slugs: Object.keys(slugMap).length,
      enabled: settings?.highlight?.enabled ?? null,
    });
  } catch (error) {
    console.error('[investor-scout/highlight] bootstrap failed', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      url: location.href,
      timestamp: new Date().toISOString(),
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void bootstrap(), {
    once: true,
  });
} else {
  void bootstrap();
}

export {};
