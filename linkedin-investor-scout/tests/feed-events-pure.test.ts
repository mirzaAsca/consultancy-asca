import { describe, expect, it } from 'vitest';
import {
  detectFeedModeFromUrl,
  FEED_EVENTS_DEBOUNCE_MS,
  FEED_EVENTS_MAX_BATCH,
} from '@/content/feed-events';

// Pure-function tests (no DOM). Kept separate from the fixture-based tests
// so this file can run in the default node pool — the jsdom-env tests have
// a known slow-startup issue on some macOS/bun combos and are deferred to CI.

describe('detectFeedModeFromUrl', () => {
  it.each([
    ['https://www.linkedin.com/feed/', 'top'],
    ['https://www.linkedin.com/feed/?sortBy=RELEVANCE', 'top'],
    ['https://www.linkedin.com/feed/?sortBy=LAST_MODIFIED', 'recent'],
    ['https://www.linkedin.com/feed/?sortBy=RECENT', 'recent'],
    ['https://www.linkedin.com/feed?sortBy=weird', 'unknown'],
    ['https://www.linkedin.com/in/someone/', 'unknown'],
  ] as const)('maps %s → %s', (href, expected) => {
    expect(detectFeedModeFromUrl(href)).toBe(expected);
  });
});

describe('Phase 2.2 batch / debounce contract', () => {
  it('pins the TODO-specified cadence', () => {
    // The TODO and MASTER v1.1 §19.5 freeze these at 500ms / 50 events.
    expect(FEED_EVENTS_DEBOUNCE_MS).toBe(500);
    expect(FEED_EVENTS_MAX_BATCH).toBe(50);
  });
});
