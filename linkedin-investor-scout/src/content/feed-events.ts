/**
 * Feed-event extraction (v2 Phase 2.2).
 *
 * Walks a feed DOM snapshot, finds every prospect `/in/{slug}` anchor inside
 * a feed card or comment list, classifies the event kind, pulls the stable
 * URN off the nearest container via hydration-data scan, and emits
 * `FeedEventInsert` rows. Bulk-upserts are sent to the background service
 * worker via `FEED_EVENTS_UPSERT_BULK` with a **500 ms debounce** and a
 * **max batch of 50** — see EXTENSION_GROWTH_TODO Phase 2.2 and MASTER §19.5.
 *
 * Dedupe is the caller's job: fingerprint collisions get bumped by
 * `upsertFeedEventsBulk` in the background. This module only produces events.
 */

import { sendMessage } from '@/shared/messaging';
import { computeFeedEventFingerprint } from '@/shared/scoring';
import type {
  FeedEventInsert,
  FeedEventKind,
  FeedMode,
  FeedPostKind,
  ProspectHighlightSummary,
  SlugMap,
} from '@/shared/types';
import {
  buildCommentPermalink,
  buildPostPermalink,
  classifyPostKindFromUrn,
  extractUrnsFromHydration,
} from '@/shared/urn';
import { FEED_EVENT_SELECTORS, queryFirstTiered } from './selectors';

/** Max rows per background message — matches TODO Phase 2.2. */
export const FEED_EVENTS_MAX_BATCH = 50;
/** Debounce window for non-overflow batches — matches TODO Phase 2.2. */
export const FEED_EVENTS_DEBOUNCE_MS = 500;

// ———————————————————————————————————————————————————————————
// Pure extraction (DOM-only, no messaging) — testable against fixtures.
// ———————————————————————————————————————————————————————————

interface ExtractContext {
  slugMap: SlugMap;
  feedMode: FeedMode;
  /** `Date.now()` at pass start — frozen for deterministic fingerprints. */
  now: number;
}

function slugFromHref(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (!/linkedin\.com$/i.test(url.hostname.replace(/^www\./i, ''))) return null;
    const match = decodeURIComponent(url.pathname).match(/^\/in\/([^/]+)/i);
    if (!match) return null;
    const raw = match[1].trim();
    return raw ? raw.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * LinkedIn renders cards inside `<LazyColumn>` sentinels — until the column
 * finishes hydrating, its children's actor anchor can be absent. Skip any
 * card still inside an un-completed lazy column.
 */
function isInsideUnhydratedLazyColumn(card: Element): boolean {
  const lazy = card.closest('[data-component-type="LazyColumn"]');
  if (!lazy) return false;
  // Heuristic: a hydrated LazyColumn has at least one listitem descendant
  // besides skeletons. If the card IS the only listitem and the lazy column
  // has a `data-loading="true"` attribute, treat as unhydrated.
  const loading = lazy.getAttribute('data-loading');
  return loading === 'true';
}

/** Classify the event kind by inspecting social-proof copy in/around the anchor. */
function classifyEventKind(
  anchor: HTMLAnchorElement,
  card: HTMLElement,
  isCommentRow: boolean,
  isAuthorAnchor: boolean,
): FeedEventKind {
  if (isCommentRow) return 'comment';

  // Collect short header-strip text near the anchor (not the post body).
  const candidates: HTMLElement[] = [];
  let cursor: HTMLElement | null = anchor.parentElement;
  let hops = 0;
  while (cursor && cursor !== card && hops < 8) {
    const tag = cursor.tagName;
    if (tag === 'P' || tag === 'SPAN' || tag === 'DIV' || tag === 'H2' || tag === 'H3') {
      candidates.push(cursor);
    }
    cursor = cursor.parentElement;
    hops += 1;
  }

  for (const el of candidates) {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text || text.length > 280) continue;
    if (/\breposted\b/.test(text)) return 'repost';
    if (/\bcommented\s+on\s+this\b/.test(text)) return 'comment';
    if (
      /\blike[sd]?\s+this\b/.test(text) ||
      /\breacted\s+to\s+this\b/.test(text) ||
      /\b(?:celebrates?|supports?|loves?)\s+this\b/.test(text) ||
      /\bfinds\s+this\s+funny\b/.test(text) ||
      /\bis\s+(?:insightful|curious)\b/.test(text)
    ) {
      return 'reaction';
    }
  }

  if (isAuthorAnchor) return 'post';
  return 'mention';
}

/**
 * Determine whether an anchor is the card's primary author link. Strategy:
 * match by name against the `aria-label="Open control menu for post by X"`
 * button on the same card (stable hook across SDUI churn per TODO DOM Ref).
 */
function isPostAuthorAnchor(anchor: HTMLAnchorElement, card: Element): boolean {
  const controlBtn = card.querySelector<HTMLElement>(
    'button[aria-label^="Open control menu for post by "], button[aria-label^="Hide post by "]',
  );
  if (!controlBtn) return false;
  const label = controlBtn.getAttribute('aria-label') ?? '';
  const name = label
    .replace(/^Open control menu for post by /i, '')
    .replace(/^Hide post by /i, '')
    .trim()
    .toLowerCase();
  if (!name) return false;
  const anchorName = (anchor.textContent ?? '').trim().toLowerCase();
  if (anchorName && anchorName.includes(name)) return true;
  const aria = (anchor.getAttribute('aria-label') ?? '').toLowerCase();
  return aria.includes(name);
}

/**
 * Walk the document and produce `FeedEventInsert` rows for every matched
 * prospect anchor. Pure — no messaging, no state. Safe for tests.
 */
export function extractFeedEventsFromDocument(
  root: ParentNode,
  ctx: ExtractContext,
): FeedEventInsert[] {
  const origin =
    typeof location !== 'undefined' ? location.origin : 'https://www.linkedin.com';
  const out: FeedEventInsert[] = [];
  const seenFingerprints = new Set<string>();

  // Primary scope: feed cards. Comments are nested inside these and handled
  // per-anchor by walking upward.
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>(
      [
        ...FEED_EVENT_SELECTORS.feedCard.primary,
        ...FEED_EVENT_SELECTORS.feedCard.secondary,
        ...FEED_EVENT_SELECTORS.feedCard.fallback,
      ].join(','),
    ),
  );

  // Dedupe cards whose selectors overlap (primary+fallback can both match).
  const uniqueCards: HTMLElement[] = [];
  const cardSeen = new Set<HTMLElement>();
  for (const c of cards) {
    if (cardSeen.has(c)) continue;
    // Skip cards nested inside another already-selected card.
    let nested = false;
    for (const already of uniqueCards) {
      if (already !== c && already.contains(c)) {
        nested = true;
        break;
      }
    }
    if (nested) continue;
    cardSeen.add(c);
    uniqueCards.push(c);
  }

  for (const card of uniqueCards) {
    if (isInsideUnhydratedLazyColumn(card)) continue;

    const cardHtml = card.outerHTML ?? '';
    const cardUrns = extractUrnsFromHydration(cardHtml);
    // Pick the most specific post URN we can find. Prefer activity; then ugc,
    // group, share. Fall back to the first-seen of any kind.
    const activityUrn =
      cardUrns.activity[0] ??
      cardUrns.ugcPost[0] ??
      cardUrns.groupPost[0] ??
      cardUrns.share[0] ??
      null;
    const postKind: FeedPostKind | null = classifyPostKindFromUrn(activityUrn);
    const postUrl = buildPostPermalink(
      activityUrn && activityUrn.startsWith('urn:li:activity:') ? activityUrn : null,
    );

    const commentListRoot = queryFirstTiered(card, FEED_EVENT_SELECTORS.commentList);
    const anchors = card.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');

    for (const anchor of Array.from(anchors)) {
      const href = anchor.getAttribute('href');
      if (!href) continue;
      const slug = slugFromHref(href, origin);
      if (!slug) continue;
      const summary: ProspectHighlightSummary | undefined = ctx.slugMap[slug];
      if (!summary) continue;

      // Is this anchor inside the comment section?
      const isCommentRow = Boolean(
        commentListRoot && commentListRoot.contains(anchor),
      );
      const isAuthor = isPostAuthorAnchor(anchor, card);
      const kind = classifyEventKind(anchor, card, isCommentRow, isAuthor);

      let commentUrn: string | null = null;
      let commentUrl: string | null = null;
      if (kind === 'comment') {
        // Find the comment row wrapping this anchor, then pull its URN.
        const commentRow =
          anchor.closest<HTMLElement>(
            [
              ...FEED_EVENT_SELECTORS.commentItem.primary,
              ...FEED_EVENT_SELECTORS.commentItem.secondary,
              ...FEED_EVENT_SELECTORS.commentItem.fallback,
            ].join(','),
          ) ?? null;
        if (commentRow) {
          const commentUrns = extractUrnsFromHydration(commentRow.outerHTML ?? '');
          commentUrn = commentUrns.comment[0] ?? null;
          commentUrl = buildCommentPermalink(activityUrn, commentUrn);
        }
      }

      const fingerprint = computeFeedEventFingerprint({
        prospect_id: summary.id,
        event_kind: kind,
        activity_urn: activityUrn,
        comment_urn: commentUrn,
      });
      if (seenFingerprints.has(fingerprint)) continue;
      seenFingerprints.add(fingerprint);

      const insert: FeedEventInsert = {
        prospect_id: summary.id,
        slug,
        event_kind: kind,
        post_kind: postKind,
        post_url: postUrl,
        comment_url: commentUrl,
        activity_urn: activityUrn,
        comment_urn: commentUrn,
        feed_mode: ctx.feedMode,
        event_fingerprint: fingerprint,
        first_seen_at: ctx.now,
        last_seen_at: ctx.now,
        seen_count: 1,
        task_status: 'new',
      };
      out.push(insert);
    }
  }

  return out;
}

/** Derive feed mode from the URL query string (`?sortBy=RELEVANCE` → top, `…LAST_MODIFIED` → recent). */
export function detectFeedModeFromUrl(href: string): FeedMode {
  try {
    const url = new URL(href, 'https://www.linkedin.com');
    if (!/\/feed\/?$/.test(url.pathname)) return 'unknown';
    const sort = (url.searchParams.get('sortBy') ?? '').toUpperCase();
    if (sort === 'LAST_MODIFIED' || sort === 'RECENT') return 'recent';
    if (sort === 'RELEVANCE' || sort === 'TOP' || sort === '') return 'top';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// ———————————————————————————————————————————————————————————
// Debounced + chunked bulk sender (runtime-only; not used by tests).
// ———————————————————————————————————————————————————————————

/**
 * Queue + flush feed events with the TODO-mandated cadence:
 *   - coalesce pending events in-memory
 *   - flush every `FEED_EVENTS_DEBOUNCE_MS` OR when the buffer reaches
 *     `FEED_EVENTS_MAX_BATCH` (immediate flush + timer reset on overflow)
 *
 * Overflow batches are chunked at the batch boundary to keep the
 * `chrome.runtime` message payload small.
 */
export class FeedEventBatcher {
  private buffer: FeedEventInsert[] = [];
  private timer: number | null = null;
  private seenFingerprints = new Set<string>();

  enqueue(events: FeedEventInsert[]): void {
    if (events.length === 0) return;
    for (const ev of events) {
      // In-process dedupe across scroll passes: same fingerprint within a
      // single tab session is skipped before it even hits the message bus.
      // Background DB still bumps `seen_count` on re-encounter via a fresh
      // fingerprint seen after memory clears (e.g. service-worker restart).
      if (this.seenFingerprints.has(ev.event_fingerprint)) continue;
      this.seenFingerprints.add(ev.event_fingerprint);
      this.buffer.push(ev);
    }

    // Overflow → flush immediately + restart debounce window.
    while (this.buffer.length >= FEED_EVENTS_MAX_BATCH) {
      const chunk = this.buffer.splice(0, FEED_EVENTS_MAX_BATCH);
      void this.send(chunk);
    }

    if (this.timer !== null) return;
    this.timer = (globalThis as typeof globalThis).setTimeout(() => {
      this.timer = null;
      if (this.buffer.length === 0) return;
      const chunk = this.buffer.splice(0, this.buffer.length);
      void this.send(chunk);
    }, FEED_EVENTS_DEBOUNCE_MS) as unknown as number;
  }

  /** Force-flush; returns a promise that resolves when the in-flight send settles. */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      (globalThis as typeof globalThis).clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;
    const chunk = this.buffer.splice(0, this.buffer.length);
    await this.send(chunk);
  }

  /** Drop all in-memory fingerprint memory — e.g. on a prospect map refresh. */
  resetSeen(): void {
    this.seenFingerprints.clear();
  }

  private async send(events: FeedEventInsert[]): Promise<void> {
    if (events.length === 0) return;
    try {
      await sendMessage({ type: 'FEED_EVENTS_UPSERT_BULK', payload: { events } });
    } catch (error) {
      // Silent-fail by design — the content script must never break
      // navigation when the background worker is momentarily unreachable
      // (e.g. SW restart). Events are dropped, not retried; duplicates
      // collapse to the same fingerprint on the next scan pass anyway.
      if (typeof console !== 'undefined') {
        console.warn('[investor-scout/feed-events] bulk upsert failed', {
          count: events.length,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  }
}
