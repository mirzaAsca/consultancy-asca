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

import { sendMessage } from '@/shared/messaging';
import type {
  Message,
  ProspectHighlightSummary,
  ProspectLevel,
  Settings,
  SlugMap,
} from '@/shared/types';

// ——— Module state (content-script scope, one instance per tab) ———

const STYLE_ID = 'lis-highlight-style';
const MENU_ID = 'lis-action-menu';
const DATA_MATCH = 'lisMatch';
const DATA_SLUG = 'lisSlug';
const DATA_PROSPECT_ID = 'lisProspectId';
const BADGE_CLASS = 'lis-badge';
const CONTAINER_ATTR = 'data-lis-match';

let slugMap: SlugMap = {};
let slugMapReady = false;
let settings: Settings | null = null;
let scheduled = false;
let rescanTimer: number | null = null;

/** Containers we currently know how to decorate, keyed by setting flag. */
type ContainerKind =
  | 'post_authors'
  | 'reposters'
  | 'commenters'
  | 'reactors'
  | 'suggested'
  // Generic fallback — anchor has no recognizable parent; we don't decorate.
  | 'unknown';

/** CSS selectors we climb to from an `/in/` anchor to find the container. */
const CONTAINER_SELECTORS: Record<Exclude<ContainerKind, 'unknown'>, string[]> = {
  post_authors: [
    // Main feed post card
    'article',
    'div[data-urn*="urn:li:activity"]',
    'div.feed-shared-update-v2',
    'div.update-components-actor',
  ],
  reposters: [
    'div.update-components-header',
    'div.feed-shared-mini-update-v2',
    'div.feed-shared-header',
  ],
  commenters: [
    'article.comments-comment-item',
    'article.comments-comment-entity',
    'div.comments-comment-item',
    'div.comments-post-meta',
  ],
  reactors: [
    'li.artdeco-list__item',
    'li.social-details-reactors-tab-body-list-item',
    'li.reusable-search__result-container',
  ],
  suggested: [
    'li.entity-result',
    'li.reusable-search__result-container',
    'li.pymk-list__item',
    'div.discover-entity-type-card',
  ],
};

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

/**
 * Climb from an anchor to the nearest container matching any selector in any
 * enabled kind. Returns both the kind (drives show_on toggle) and the element.
 * `closest()` naturally stops at the highest ancestor we tolerate, so a match
 * inside a comment that's *also* inside a post resolves to the comment first.
 */
function findContainer(
  anchor: HTMLElement,
): { kind: Exclude<ContainerKind, 'unknown'>; el: HTMLElement } | null {
  for (const kind of Object.keys(CONTAINER_SELECTORS) as Array<
    Exclude<ContainerKind, 'unknown'>
  >) {
    for (const sel of CONTAINER_SELECTORS[kind]) {
      try {
        const found = anchor.closest<HTMLElement>(sel);
        if (found) return { kind, el: found };
      } catch {
        // Invalid selector in a given page context — skip.
      }
    }
  }
  return null;
}

function isKindEnabled(kind: ContainerKind): boolean {
  if (!settings?.highlight?.enabled) return false;
  if (kind === 'unknown') return false;
  return settings.highlight.show_on[kind] === true;
}

function badgeLabel(level: ProspectLevel): string {
  switch (level) {
    case '1st':
      return '1st · TARGET';
    case '2nd':
      return '2nd · TARGET';
    case '3rd':
      return '3rd · TARGET';
    case 'OUT_OF_NETWORK':
      return 'OUT · TARGET';
    default:
      return '? · TARGET';
  }
}

function cssVarForLevel(level: ProspectLevel): string {
  switch (level) {
    case '1st':
      return 'var(--lis-color-1st)';
    case '2nd':
      return 'var(--lis-color-2nd)';
    case '3rd':
      return 'var(--lis-color-3rd)';
    default:
      return 'var(--lis-color-oon)';
  }
}

// ——— CSS injection (driven by user-configurable colors) ———

function buildStylesheet(): string {
  const c = settings?.highlight?.colors;
  const first = c?.first ?? '#22c55e';
  const second = c?.second ?? '#3b82f6';
  const third = c?.third ?? '#a855f7';
  const oon = c?.out_of_network ?? '#6b7280';
  return `
    :root {
      --lis-color-1st: ${first};
      --lis-color-2nd: ${second};
      --lis-color-3rd: ${third};
      --lis-color-oon: ${oon};
    }
    [${CONTAINER_ATTR}] {
      position: relative;
      border-radius: 8px;
      transition: box-shadow .2s ease;
    }
    [${CONTAINER_ATTR}="1st"] { box-shadow: 0 0 0 2px var(--lis-color-1st); }
    [${CONTAINER_ATTR}="2nd"] { box-shadow: 0 0 0 2px var(--lis-color-2nd); }
    [${CONTAINER_ATTR}="3rd"] { box-shadow: 0 0 0 2px var(--lis-color-3rd); }
    [${CONTAINER_ATTR}="OUT_OF_NETWORK"] { box-shadow: 0 0 0 2px var(--lis-color-oon); }
    [${CONTAINER_ATTR}="NONE"] { box-shadow: 0 0 0 2px var(--lis-color-oon); }

    .${BADGE_CLASS} {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .02em;
      color: #ffffff;
      background: var(--lis-badge-bg, var(--lis-color-oon));
      cursor: pointer;
      user-select: none;
      box-shadow: 0 1px 2px rgba(0,0,0,.2);
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    .${BADGE_CLASS}:hover { filter: brightness(1.1); }

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
  const badge = el.querySelector<HTMLElement>(`:scope > .${BADGE_CLASS}`);
  if (badge) badge.remove();
}

function applyHighlight(
  container: HTMLElement,
  summary: ProspectHighlightSummary,
  slug: string,
): void {
  const levelAttr = summary.level === 'NONE' ? 'NONE' : summary.level;
  const previous = container.getAttribute(CONTAINER_ATTR);
  if (
    previous === levelAttr &&
    container.dataset[DATA_SLUG] === slug &&
    container.querySelector(`:scope > .${BADGE_CLASS}`)
  ) {
    return;
  }

  container.setAttribute(CONTAINER_ATTR, levelAttr);
  container.dataset[DATA_SLUG] = slug;
  container.dataset[DATA_PROSPECT_ID] = String(summary.id);

  // Ensure absolute-positioned badge has a positioning context without
  // disturbing LinkedIn's own layout.
  const computed = getComputedStyle(container).position;
  if (computed === 'static') {
    container.style.position = 'relative';
  }

  let badge = container.querySelector<HTMLElement>(`:scope > .${BADGE_CLASS}`);
  if (!badge) {
    badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    badge.addEventListener('click', onBadgeClick);
    container.appendChild(badge);
  }
  badge.textContent = badgeLabel(summary.level);
  badge.style.setProperty('--lis-badge-bg', cssVarForLevel(summary.level));
  badge.setAttribute('data-lis-prospect-id', String(summary.id));
  badge.setAttribute('data-lis-slug', slug);
  badge.title = [summary.name, summary.company, summary.headline]
    .filter(Boolean)
    .join(' · ');
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
        const dashboardUrl = chrome.runtime.getURL(
          `src/dashboard/index.html#/prospects?id=${prospectId}`,
        );
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

function scanAndHighlight(root: ParentNode = document): void {
  if (!slugMapReady) return;
  if (!settings?.highlight?.enabled) {
    removeAllHighlights();
    return;
  }

  const anchors = root.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');
  if (anchors.length === 0) return;

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

    const container = findContainer(anchor);
    if (!container) continue;
    if (!isKindEnabled(container.kind)) continue;

    applyHighlight(container.el, summary, slug);
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

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.type) {
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
        return;
      }
    }
  });
  mainObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// ——— Bootstrap ———

async function bootstrap(): Promise<void> {
  try {
    injectOrUpdateStylesheet();
    await Promise.all([refreshSettings(), refreshSlugMap()]);
    startObservers();
    installRouteChangeHook(onRouteChanged);
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
