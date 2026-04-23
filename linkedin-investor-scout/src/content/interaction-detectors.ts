/**
 * Phase 5.3 + 5.6 — content-script detectors for manual LinkedIn
 * interactions. Complements the Mode A Connect-modal watcher in
 * `outreach-prefill.ts`. Together they cover the three write surfaces a
 * user actually exercises in a daily session:
 *
 *  - **profile_visit** (Phase 5.6) — dwell-gated visit to `/in/{slug}/`
 *    on a tracked prospect. Counts against the daily visit budget.
 *  - **connection_request_sent** — lives in `outreach-prefill.ts`
 *    (already landed).
 *  - **message_sent** (Phase 5.3) — send detector on
 *    `/messaging/thread/{id}/` full-thread pages.
 *
 * Mode A invariant: we observe, we never click Send or submit forms.
 *
 * Both detectors emit through `chrome.runtime.sendMessage` →
 * `OUTREACH_ACTION_RECORD`, which handles idempotency via the
 * `{prospect_id}:{kind}:{day}` key. Same-day duplicates collapse to the
 * existing row; cross-day same-prospect writes get their own row. Daily
 * budget bumps happen exactly once per sent row.
 */

import type {
  LinkedInRestrictionBannerPayload,
  OutreachActionRecordPayload,
  OutreachWithdrawDetectedPayload,
  ReactionToggledDetectedPayload,
  SlugMap,
  Settings,
} from '@/shared/types';
import { extractActivityUrnFromElement } from '@/shared/urn';
import {
  decideReactionVerdict,
  parseReactionState,
  type ReactionDetectorEvent,
  type ReactionKind,
} from '@/shared/reaction-toggled-detector';
import { DEFAULT_PROFILE_VISIT_DWELL_MS } from '@/shared/constants';
import {
  decideVisitVerdict,
  type ProfileVisitEvent,
} from '@/shared/profile-visit-detector';
import {
  DEFAULT_MESSAGE_SEND_WINDOW_MS,
  decideMessageVerdict,
  type MessageDetectorEvent,
} from '@/shared/message-sent-detector';
import {
  DEFAULT_WITHDRAWAL_WINDOW_MS,
  decideWithdrawalVerdict,
  type WithdrawalEvent,
} from '@/shared/withdrawal-detector';
import { matchRestrictionBanner } from '@/shared/restriction-banner-detector';
import { slugFromLinkedInPathname } from '@/shared/url';

/**
 * Per-URL guards so SPA-style route changes don't stack watchers on the
 * same profile / thread. The value is the slug or thread id we last
 * attached to — a different one means the user navigated, so we allow
 * re-attach.
 */
let visitWatcherSlug: string | null = null;
let messageWatcherThreadId: string | null = null;
let withdrawalWatcherAttachedPath: string | null = null;
let restrictionBannerWatcherStarted = false;
let restrictionBannerAlreadyReported = false;
/** Reaction buttons we've already attached a watcher to (avoid duplicates). */
const reactionWatcherAttached = new WeakSet<Element>();
/** Global feed-scan observer — runs once per content-script lifetime. */
let reactionFeedObserverStarted = false;

/** How long to keep a single reaction watcher alive after the baseline read. */
const REACTION_WATCH_WINDOW_MS = 45_000;

/** Wall-clock guard for the hidden-tab grace window (default 2s). */
const HIDDEN_GRACE_MS = 2_000;

/** Timeout for the message-sent watcher. 60s is plenty to observe a Send. */
const MESSAGE_SEND_WATCH_TIMEOUT_MS = 60_000;

/**
 * Bootstrap detectors for the current URL. Call once per route change.
 * `getSlugMap` / `getSettings` are passed in as accessors so the caller
 * (`highlight.ts`) keeps ownership of the cached values.
 */
export function startInteractionDetectorsForUrl(
  getSlugMap: () => SlugMap,
  getSettings: () => Settings | null,
): void {
  const pathname = location.pathname;
  const slug = slugFromLinkedInPathname(pathname);
  if (slug) {
    maybeStartProfileVisitDetector(slug, getSlugMap, getSettings);
  }
  const threadMatch = pathname.match(/^\/messaging\/thread\/([^/]+)\/?$/);
  if (threadMatch) {
    maybeStartMessageSentDetector(threadMatch[1], getSlugMap);
  }
  // Phase 5.6 — invitation-manager Sent tab. Both `/sent/` and `/sent` trail
  // forms are valid; match permissively.
  if (/^\/mynetwork\/invitation[-_]manager\/sent\/?$/i.test(pathname)) {
    maybeStartWithdrawalDetector(getSlugMap);
  } else {
    withdrawalWatcherAttachedPath = null;
  }
  // Phase 4.3 / 5.3 — restriction banner watcher runs once per content-script
  // lifetime; re-checking on route change is cheap but not required.
  startRestrictionBannerWatcher();
  // Phase 5.3 — reaction-toggled watcher runs on any page that could host a
  // feed card (home feed, profile detail, company pages, search). Attaching
  // once per content-script lifetime is cheap — the per-button guard
  // (`reactionWatcherAttached`) prevents duplicate observers.
  startReactionToggledWatcher(getSlugMap);
}

// ——— Profile visit detector (Phase 5.6) ———

function maybeStartProfileVisitDetector(
  slug: string,
  getSlugMap: () => SlugMap,
  getSettings: () => Settings | null,
): void {
  if (visitWatcherSlug === slug) return;
  const map = getSlugMap();
  const summary = map[slug];
  if (!summary) return; // Not a tracked prospect — skip.

  visitWatcherSlug = slug;
  const settings = getSettings();
  const dwellMs =
    settings?.outreach?.profile_visit_dwell_ms ?? DEFAULT_PROFILE_VISIT_DWELL_MS;

  const events: ProfileVisitEvent[] = [];
  let settled = false;

  const settle = (): void => {
    if (settled) return;
    const verdict = decideVisitVerdict(events);
    if (verdict === 'pending') return;
    settled = true;
    cleanup();
    if (verdict === 'counts') {
      emit({
        prospect_id: summary.id,
        kind: 'profile_visit',
        state: 'sent',
        notes: 'auto-detected via dwell watcher',
      });
    }
  };

  const onBeforeUnload = (): void => {
    events.push({ kind: 'tab_closed', t: Date.now() });
    settle();
  };

  let hiddenSince: number | null = null;
  let hiddenGraceTimer: number | null = null;
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now();
      hiddenGraceTimer = window.setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          events.push({ kind: 'visibility_hidden', t: Date.now() });
          settle();
        }
      }, HIDDEN_GRACE_MS);
    } else {
      hiddenSince = null;
      if (hiddenGraceTimer !== null) {
        window.clearTimeout(hiddenGraceTimer);
        hiddenGraceTimer = null;
      }
    }
  };

  let dwellTimer: number | null = null;
  const topCardObserver = waitForProfileTopCard((t) => {
    events.push({ kind: 'top_card_rendered', t });
    dwellTimer = window.setTimeout(() => {
      events.push({ kind: 'dwell_elapsed', t: Date.now() });
      settle();
    }, dwellMs);
  });

  const routeChecker = window.setInterval(() => {
    const nowSlug = slugFromLinkedInPathname(location.pathname);
    if (nowSlug !== slug) {
      events.push({ kind: 'navigated_away', t: Date.now() });
      settle();
    }
  }, 1500);

  function cleanup(): void {
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('visibilitychange', onVisibility);
    if (dwellTimer !== null) window.clearTimeout(dwellTimer);
    if (hiddenGraceTimer !== null) window.clearTimeout(hiddenGraceTimer);
    topCardObserver?.disconnect();
    window.clearInterval(routeChecker);
    void hiddenSince; // referenced for debugging parity
  }

  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibility);
}

function waitForProfileTopCard(
  onSeen: (t: number) => void,
): MutationObserver | null {
  if (isTopCardPresent()) {
    onSeen(Date.now());
    return null;
  }
  const observer = new MutationObserver(() => {
    if (isTopCardPresent()) {
      observer.disconnect();
      onSeen(Date.now());
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  return observer;
}

function isTopCardPresent(): boolean {
  // Primary: the top card component key observed in `example2.html`.
  if (
    document.querySelector(
      'section[componentkey^="com.linkedin.sdui.profile.card.ref"][componentkey$="Topcard"]',
    )
  ) {
    return true;
  }
  // Fallback: legacy class name + the single-h1-per-profile invariant.
  if (document.querySelector('section.pv-top-card, section.artdeco-card h1')) {
    return true;
  }
  // Generic fallback — a single top-level <h1> is a strong signal the
  // top card has rendered on newer surfaces.
  return document.querySelector('main h1') !== null;
}

// ——— Message-sent detector (Phase 5.3, example5.html) ———

function maybeStartMessageSentDetector(
  threadId: string,
  getSlugMap: () => SlugMap,
): void {
  if (messageWatcherThreadId === threadId) return;
  messageWatcherThreadId = threadId;

  // Wait for the composer + first message to render before attaching.
  const loadObserver = new MutationObserver(() => {
    const composer = findComposer();
    const sendButton = findSendButton();
    if (composer && sendButton) {
      loadObserver.disconnect();
      attachMessageSentWatcher(composer, sendButton, getSlugMap);
    }
  });
  loadObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  // Immediate attempt — thread may already be hydrated.
  const composer = findComposer();
  const sendButton = findSendButton();
  if (composer && sendButton) {
    loadObserver.disconnect();
    attachMessageSentWatcher(composer, sendButton, getSlugMap);
  }
}

function findComposer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    'div.msg-form__contenteditable[role="textbox"], form.msg-form [contenteditable="true"][role="textbox"]',
  );
}

function findSendButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    'button.msg-form__send-button, form.msg-form button[type="submit"]',
  );
}

function findMessageList(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    'ul.msg-s-message-list-content, ul[role="list"].msg-s-message-list-content',
  );
}

function attachMessageSentWatcher(
  composer: HTMLElement,
  sendButton: HTMLButtonElement,
  getSlugMap: () => SlugMap,
): void {
  const events: MessageDetectorEvent[] = [];
  let settled = false;

  const settle = (verdict: 'sent' | 'canceled' | 'unknown'): void => {
    if (settled) return;
    settled = true;
    cleanup();
    if (verdict === 'sent') {
      const recipient = resolveThreadRecipient(getSlugMap());
      if (recipient) {
        emit({
          prospect_id: recipient.id,
          kind: 'message_sent',
          state: 'sent',
          notes: 'auto-detected via messaging-thread watcher',
        });
      }
    }
  };

  const recompute = (): void => {
    const v = decideMessageVerdict(events, DEFAULT_MESSAGE_SEND_WINDOW_MS);
    if (v === 'pending') return;
    settle(v);
  };

  const onSendClick = (): void => {
    events.push({ kind: 'send_clicked', t: Date.now() });
    recompute();
  };
  sendButton.addEventListener('click', onSendClick, true);

  const messageList = findMessageList();
  const listObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of Array.from(m.addedNodes)) {
        if (n instanceof HTMLElement && n.matches?.('li.msg-s-event-listitem')) {
          events.push({ kind: 'bubble_appended', t: Date.now() });
          recompute();
          return;
        }
      }
    }
  });
  if (messageList) {
    listObserver.observe(messageList, { childList: true, subtree: true });
  }

  const composerObserver = new MutationObserver(() => {
    const html = composer.innerHTML.trim();
    // LinkedIn resets the composer to `<p><br></p>` after a successful send.
    if (html === '' || html === '<p><br></p>' || html === '<p><br/></p>') {
      events.push({ kind: 'composer_cleared', t: Date.now() });
      recompute();
    }
  });
  composerObserver.observe(composer, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  const attrObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'disabled' && sendButton.disabled) {
        events.push({ kind: 'send_disabled', t: Date.now() });
        recompute();
      }
    }
  });
  attrObserver.observe(sendButton, { attributes: true });

  const timeoutHandle = window.setTimeout(() => {
    events.push({ kind: 'timeout', t: Date.now() });
    recompute();
  }, MESSAGE_SEND_WATCH_TIMEOUT_MS);

  function cleanup(): void {
    sendButton.removeEventListener('click', onSendClick, true);
    listObserver.disconnect();
    composerObserver.disconnect();
    attrObserver.disconnect();
    window.clearTimeout(timeoutHandle);
  }
}

/**
 * Find the recipient prospect by scanning `/in/{slug}` anchors in the
 * thread header / conversation area. Returns null for group threads
 * (more than one matching prospect) — we don't have enough signal to
 * attribute the send and would rather skip than mis-attribute.
 */
function resolveThreadRecipient(
  map: SlugMap,
): { id: number; slug: string } | null {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]'),
  );
  const seen = new Map<string, number>();
  for (const a of anchors) {
    let path: string;
    try {
      path = new URL(a.href, location.origin).pathname;
    } catch {
      continue;
    }
    const slug = slugFromLinkedInPathname(path);
    if (!slug) continue;
    const summary = map[slug];
    if (!summary) continue;
    seen.set(slug, summary.id);
    if (seen.size > 1) return null; // Group thread or ambiguous.
  }
  if (seen.size !== 1) return null;
  const [[slug, id]] = seen;
  return { id, slug };
}

// ——— Invite withdrawal detector (Phase 5.6, example7.html) ———

/**
 * Attach a single delegated capture-phase click listener on the invitation-
 * manager Sent tab. Each Withdraw button is an `<a aria-label="Withdraw
 * invitation sent to {NAME}">` nested in a row that also carries the target
 * profile's `/in/{slug}/` link. On click we snapshot the row's slug and then
 * watch for the row to unmount (LinkedIn removes it from the DOM on a
 * successful withdrawal) or for an undo toast.
 */
function maybeStartWithdrawalDetector(getSlugMap: () => SlugMap): void {
  const path = location.pathname;
  if (withdrawalWatcherAttachedPath === path) return;
  withdrawalWatcherAttachedPath = path;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>(
        'a[aria-label^="Withdraw invitation sent to "]',
      );
      if (!anchor) return;
      // Walk up to the invite row — the nearest `<li>` / `<article>` /
      // `[componentkey]` container is the row LinkedIn removes on success.
      const row =
        anchor.closest<HTMLElement>('li, article, [componentkey], [data-testid]') ??
        anchor.parentElement;
      if (!row) return;
      const slug = findSlugInside(row);
      if (!slug) return;
      const summary = getSlugMap()[slug];
      if (!summary) return;
      const clickedAt = Date.now();
      watchWithdrawalOutcome({
        row,
        slug,
        prospect_id: summary.id,
        clickedAt,
      });
    },
    true,
  );
}

function findSlugInside(row: HTMLElement): string | null {
  const anchors = Array.from(
    row.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]'),
  );
  for (const a of anchors) {
    try {
      const path = new URL(a.href, location.origin).pathname;
      const slug = slugFromLinkedInPathname(path);
      if (slug) return slug;
    } catch {
      continue;
    }
  }
  return null;
}

interface WithdrawalWatchArgs {
  row: HTMLElement;
  slug: string;
  prospect_id: number;
  clickedAt: number;
}

function watchWithdrawalOutcome(args: WithdrawalWatchArgs): void {
  const events: WithdrawalEvent[] = [
    { kind: 'withdraw_clicked', t: args.clickedAt },
  ];
  let settled = false;

  const settle = (): void => {
    if (settled) return;
    const verdict = decideWithdrawalVerdict(events);
    if (verdict === 'pending') return;
    settled = true;
    cleanup();
    if (verdict === 'withdrawn') {
      emitWithdrawal({
        prospect_id: args.prospect_id,
        slug: args.slug,
        withdrawn_at: args.clickedAt,
      });
    }
  };

  const rowObserver = new MutationObserver(() => {
    if (!document.contains(args.row)) {
      events.push({ kind: 'row_removed', t: Date.now() });
      settle();
    }
  });
  // Observe the row's parent chain — LinkedIn may remove the row itself or
  // its wrapper, so we watch the list container.
  const watchTarget =
    args.row.parentElement ?? args.row.closest('ul, main') ?? document.body;
  rowObserver.observe(watchTarget, { childList: true, subtree: true });

  const toastObserver = new MutationObserver(() => {
    // LinkedIn undo toast: an `[role="alert"]` or `.artdeco-toast-item` with
    // "Withdrew" in its text. We treat its appearance as a confirmation and
    // attach a one-shot Undo click listener to flip the verdict.
    const toast = document.querySelector<HTMLElement>(
      '[role="alert"], .artdeco-toast-item',
    );
    if (!toast) return;
    const text = toast.textContent?.toLowerCase() ?? '';
    if (text.includes('withdr') || text.includes('invitation')) {
      events.push({ kind: 'toast_seen', t: Date.now() });
      const undo = toast.querySelector<HTMLButtonElement>(
        'button[aria-label*="Undo" i], button',
      );
      if (undo) {
        undo.addEventListener(
          'click',
          () => {
            events.push({ kind: 'undo_clicked', t: Date.now() });
            settle();
          },
          { once: true, capture: true },
        );
      }
      settle();
    }
  });
  toastObserver.observe(document.body, { childList: true, subtree: true });

  const timeoutHandle = window.setTimeout(() => {
    events.push({ kind: 'timeout', t: Date.now() });
    settle();
  }, DEFAULT_WITHDRAWAL_WINDOW_MS + 1_500);

  function cleanup(): void {
    rowObserver.disconnect();
    toastObserver.disconnect();
    window.clearTimeout(timeoutHandle);
  }
}

// ——— Restriction banner detector (Phase 4.3 / 5.3) ———

/**
 * Runs on any `linkedin.com/*` page. On initial mount + every mutation, scan
 * high-level text containers (role="alert", artdeco-toast, banner-like
 * divs) for LinkedIn's "account restricted" / "unusual activity" copy. On a
 * positive match, emit the payload to the background which trips the kill
 * switch. Only one report per page-load (`restrictionBannerAlreadyReported`).
 */
function startRestrictionBannerWatcher(): void {
  if (restrictionBannerWatcherStarted) return;
  restrictionBannerWatcherStarted = true;

  const check = (): void => {
    if (restrictionBannerAlreadyReported) return;
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          '[role="alert"]',
          '.artdeco-toast-item',
          '.artdeco-notice',
          'main[role="main"] h1',
          'main[role="main"] h2',
          'section[aria-labelledby]',
        ].join(', '),
      ),
    );
    for (const el of candidates) {
      const text = el.textContent ?? '';
      if (text.length === 0 || text.length > 5_000) continue;
      const hit = matchRestrictionBanner(text);
      if (hit) {
        restrictionBannerAlreadyReported = true;
        emitRestrictionBanner({
          kind: hit.kind,
          phrase: hit.phrase,
          page_url: location.href,
        });
        return;
      }
    }
  };

  // Initial check — restriction pages render the banner before our content
  // script loads on many surfaces.
  check();

  const observer = new MutationObserver(() => {
    if (restrictionBannerAlreadyReported) {
      observer.disconnect();
      return;
    }
    check();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// ——— Reaction-toggled detector (Phase 5.3, example9.html) ———

/**
 * Walk the document for reaction buttons and attach per-button watchers.
 * Each button's aria-label follows `"Reaction button state: {kind}"` so we
 * observe the attribute and fire when the kind transitions. We only emit
 * for reactions on posts whose author (or reposter) is a tracked prospect
 * — unrelated posts are ignored.
 */
function startReactionToggledWatcher(getSlugMap: () => SlugMap): void {
  if (reactionFeedObserverStarted) return;
  reactionFeedObserverStarted = true;

  const scan = (): void => {
    const buttons = document.querySelectorAll<HTMLElement>(
      'button[aria-label^="Reaction button state:" i]',
    );
    for (const btn of Array.from(buttons)) {
      maybeAttachReactionWatcher(btn, getSlugMap);
    }
  };

  // Initial scan — the feed may already have rendered several cards.
  scan();

  // Re-scan on DOM mutations. LinkedIn lazy-loads cards as the user scrolls,
  // so fresh reaction buttons appear continuously.
  const observer = new MutationObserver(() => {
    scan();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function maybeAttachReactionWatcher(
  btn: HTMLElement,
  getSlugMap: () => SlugMap,
): void {
  if (reactionWatcherAttached.has(btn)) return;

  // Resolve the prospect this post is attributed to — if the card's author
  // isn't in the SlugMap, there's nothing to record.
  const card = findFeedCardContainer(btn);
  if (!card) return;
  const slug = findAuthorSlugForCard(card);
  if (!slug) return;
  const summary = getSlugMap()[slug];
  if (!summary) return;

  reactionWatcherAttached.add(btn);

  const events: ReactionDetectorEvent[] = [];
  let settled = false;

  const baseline = parseReactionState(btn.getAttribute('aria-label'));
  if (baseline) {
    events.push({ kind: 'state_observed', state: baseline, t: Date.now() });
  }

  const settle = (): void => {
    if (settled) return;
    const verdict = decideReactionVerdict(events);
    if (verdict === 'pending') return;
    settled = true;
    cleanup();
    if (verdict === 'no_change') return;
    const latest = latestObservedState(events);
    const activityUrn = extractActivityUrnFromElement(card);
    const reactionKind =
      verdict === 'reacted' && latest && latest !== 'no_reaction'
        ? (latest as Exclude<ReactionKind, 'no_reaction'>)
        : null;
    emitReactionToggled({
      prospect_id: summary.id,
      slug,
      direction: verdict === 'reacted' ? 'reacted' : 'unreacted',
      reaction_kind: reactionKind,
      activity_urn: activityUrn,
      page_url: location.href,
      detected_at: Date.now(),
    });
  };

  const attrObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName !== 'aria-label') continue;
      const next = parseReactionState(btn.getAttribute('aria-label'));
      if (!next) continue;
      const last = latestObservedState(events);
      if (last === next) continue;
      events.push({ kind: 'state_observed', state: next, t: Date.now() });
      settle();
    }
  });
  attrObserver.observe(btn, { attributes: true, attributeFilter: ['aria-label'] });

  const timeoutHandle = window.setTimeout(() => {
    events.push({ kind: 'timeout', t: Date.now() });
    settle();
  }, REACTION_WATCH_WINDOW_MS);

  function cleanup(): void {
    attrObserver.disconnect();
    window.clearTimeout(timeoutHandle);
  }
}

function latestObservedState(
  events: ReadonlyArray<ReactionDetectorEvent>,
): ReactionKind | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'state_observed') return e.state;
  }
  return null;
}

function findFeedCardContainer(el: Element): HTMLElement | null {
  // Primary: the SDUI feed-card wrapper observed in `example8.html` /
  // `example9.html`. Fall back to legacy `feed-shared-update-v2` and
  // `data-urn` anchors for older surfaces.
  return (
    el.closest<HTMLElement>(
      [
        'div[componentkey*="FeedType_"]',
        'div[data-testid*="FeedType_MAIN_FEED"]',
        'article[data-urn*="urn:li:activity"]',
        'div[data-urn*="urn:li:activity"]',
        'div.feed-shared-update-v2',
      ].join(', '),
    ) ?? null
  );
}

function findAuthorSlugForCard(card: HTMLElement): string | null {
  // The control-menu aria-label carries the author's name, but the
  // `/in/{slug}` anchor next to it is what we actually need. When the card
  // has multiple `/in/` anchors (mentions, tagged people), prefer one that
  // sits inside the same subtree as an `aria-label^="Open control menu for
  // post by"` element — that's the author / reposter per `example8.html`.
  const ctrl = card.querySelector<HTMLElement>(
    '[aria-label^="Open control menu for post by " i], [aria-label^="Hide post by " i]',
  );
  if (ctrl) {
    const scope = ctrl.closest('header, div');
    const anchor = scope?.querySelector<HTMLAnchorElement>('a[href*="/in/"]');
    if (anchor) {
      const slug = slugFromHref(anchor.href);
      if (slug) return slug;
    }
  }
  // Fallback: first `/in/` anchor within the card.
  const anchor = card.querySelector<HTMLAnchorElement>('a[href*="/in/"]');
  if (!anchor) return null;
  return slugFromHref(anchor.href);
}

function slugFromHref(href: string): string | null {
  try {
    const path = new URL(href, location.origin).pathname;
    return slugFromLinkedInPathname(path);
  } catch {
    return null;
  }
}

function emitReactionToggled(payload: ReactionToggledDetectedPayload): void {
  try {
    chrome.runtime.sendMessage(
      { type: 'REACTION_TOGGLED_DETECTED', payload },
      () => {
        void chrome.runtime.lastError;
      },
    );
  } catch (error) {
    console.warn('[investor-scout] reaction emit failed', {
      prospect_id: payload.prospect_id,
      error: error instanceof Error ? error.message : error,
    });
  }
}

// ——— Shared emitter ———

function emit(payload: OutreachActionRecordPayload): void {
  try {
    chrome.runtime.sendMessage(
      { type: 'OUTREACH_ACTION_RECORD', payload },
      () => {
        void chrome.runtime.lastError;
      },
    );
  } catch (error) {
    console.warn('[investor-scout] detector emit failed', {
      kind: payload.kind,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function emitWithdrawal(payload: OutreachWithdrawDetectedPayload): void {
  try {
    chrome.runtime.sendMessage(
      { type: 'OUTREACH_WITHDRAW_DETECTED', payload },
      () => {
        void chrome.runtime.lastError;
      },
    );
  } catch (error) {
    console.warn('[investor-scout] withdrawal emit failed', {
      prospect_id: payload.prospect_id,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function emitRestrictionBanner(payload: LinkedInRestrictionBannerPayload): void {
  try {
    chrome.runtime.sendMessage(
      { type: 'LINKEDIN_RESTRICTION_BANNER', payload },
      () => {
        void chrome.runtime.lastError;
      },
    );
  } catch (error) {
    console.warn('[investor-scout] restriction-banner emit failed', {
      kind: payload.kind,
      error: error instanceof Error ? error.message : error,
    });
  }
}

/** Test hook: reset module-level guards so the detectors re-bootstrap. */
export function __resetInteractionDetectorsForTesting(): void {
  visitWatcherSlug = null;
  messageWatcherThreadId = null;
  withdrawalWatcherAttachedPath = null;
  restrictionBannerWatcherStarted = false;
  restrictionBannerAlreadyReported = false;
  reactionFeedObserverStarted = false;
}
