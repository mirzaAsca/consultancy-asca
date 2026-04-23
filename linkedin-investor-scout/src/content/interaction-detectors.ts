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
  OutreachActionRecordPayload,
  SlugMap,
  Settings,
} from '@/shared/types';
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
import { slugFromLinkedInPathname } from '@/shared/url';

/**
 * Per-URL guards so SPA-style route changes don't stack watchers on the
 * same profile / thread. The value is the slug or thread id we last
 * attached to — a different one means the user navigated, so we allow
 * re-attach.
 */
let visitWatcherSlug: string | null = null;
let messageWatcherThreadId: string | null = null;

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

/** Test hook: reset module-level guards so the detectors re-bootstrap. */
export function __resetInteractionDetectorsForTesting(): void {
  visitWatcherSlug = null;
  messageWatcherThreadId = null;
}
