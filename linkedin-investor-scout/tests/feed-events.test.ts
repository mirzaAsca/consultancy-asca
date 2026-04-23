// @vitest-environment jsdom

import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { extractFeedEventsFromDocument } from '@/content/feed-events';
import type { SlugMap } from '@/shared/types';

const REPO_ROOT = path.resolve(__dirname, '..');

function loadFixture(file: string): void {
  const html = fs.readFileSync(path.join(REPO_ROOT, file), 'utf-8');
  document.body.innerHTML = html;
}

function makeSlugMap(
  entries: Array<[string, Partial<SlugMap[string]>]>,
): SlugMap {
  const out: SlugMap = {};
  let idCounter = 1000;
  for (const [slug, summary] of entries) {
    out[slug] = {
      id: idCounter++,
      level: summary.level ?? '2nd',
      name: summary.name ?? null,
      headline: summary.headline ?? null,
      company: summary.company ?? null,
      ...summary,
    };
  }
  return out;
}

describe('extractFeedEventsFromDocument — example8 (reactor + author)', () => {
  beforeEach(() => {
    loadFixture('example8.html');
  });

  it('emits exactly one event per matched prospect in a card', () => {
    const slugMap = makeSlugMap([
      ['nikhilnainani', { level: '2nd', name: 'Nikhil Nainani' }],
      ['sundeepm', { level: '3rd', name: 'Sunny Madra' }],
    ]);
    const events = extractFeedEventsFromDocument(document, {
      slugMap,
      feedMode: 'top',
      now: 1_700_000_000_000,
    });
    expect(events.length).toBe(2);

    const bySlug = Object.fromEntries(events.map((e) => [e.slug, e]));
    // "Nikhil Nainani ... likes this" — header-strip social proof.
    expect(bySlug.nikhilnainani.event_kind).toBe('reaction');
    // Sunny Madra — aria-labelled control-menu target = post author.
    expect(bySlug.sundeepm.event_kind).toBe('post');
  });

  it('copies the feed mode and timestamps onto each emitted event', () => {
    const slugMap = makeSlugMap([['sundeepm', { level: '3rd' }]]);
    const now = 1_700_000_000_000;
    const [event] = extractFeedEventsFromDocument(document, {
      slugMap,
      feedMode: 'recent',
      now,
    });
    expect(event.feed_mode).toBe('recent');
    expect(event.first_seen_at).toBe(now);
    expect(event.last_seen_at).toBe(now);
    expect(event.seen_count).toBe(1);
    expect(event.task_status).toBe('new');
  });

  it('skips prospects not present in the slug map', () => {
    const slugMap = makeSlugMap([]);
    const events = extractFeedEventsFromDocument(document, {
      slugMap,
      feedMode: 'top',
      now: 1,
    });
    expect(events).toEqual([]);
  });
});

describe('extractFeedEventsFromDocument — example9 (single author, no URN)', () => {
  beforeEach(() => {
    loadFixture('example9.html');
  });

  it('classifies the author anchor as a post even when no raw URN is present', () => {
    const slugMap = makeSlugMap([
      ['alex-turnbull-1ab9992', { level: '2nd', name: 'Alex Turnbull' }],
    ]);
    const events = extractFeedEventsFromDocument(document, {
      slugMap,
      feedMode: 'top',
      now: 1,
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const post = events.find((e) => e.slug === 'alex-turnbull-1ab9992');
    expect(post).toBeDefined();
    expect(post?.event_kind).toBe('post');
    // example9 is pure React SDUI — componentkey hash only, no raw URN.
    expect(post?.activity_urn).toBeNull();
    expect(post?.post_url).toBeNull();
  });
});

describe('extractFeedEventsFromDocument — fingerprint dedupe', () => {
  beforeEach(() => {
    loadFixture('example8.html');
  });

  it('produces stable fingerprints when called twice on the same DOM', () => {
    const slugMap = makeSlugMap([
      ['nikhilnainani', { level: '2nd' }],
      ['sundeepm', { level: '3rd' }],
    ]);
    const ctx = { slugMap, feedMode: 'top' as const, now: 42 };
    const first = extractFeedEventsFromDocument(document, ctx);
    const second = extractFeedEventsFromDocument(document, ctx);
    expect(first.map((e) => e.event_fingerprint).sort()).toEqual(
      second.map((e) => e.event_fingerprint).sort(),
    );
  });
});
