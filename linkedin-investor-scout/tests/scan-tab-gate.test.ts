import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/db', () => ({}));
vi.mock('@/shared/messaging', () => ({ broadcast: vi.fn() }));
vi.mock('@/shared/templates', () => ({
  buildRenderContextFromProspect: vi.fn(),
  renderTemplate: vi.fn(),
}));
vi.mock('@/shared/prospect-scoring', () => ({
  recomputeAndPersistProspect: vi.fn(),
}));
vi.mock('@/shared/acceptance-watcher', () => ({
  detectAcceptanceOnLevelChange: vi.fn(),
}));
vi.mock('@/shared/health', () => ({
  computeHealthSnapshot: vi.fn(),
  computeResumeCooldown: vi.fn(),
}));
vi.mock('@/shared/outreach-queue', () => ({
  buildIdempotencyKey: vi.fn(),
}));
vi.mock('@/content/scan', () => ({
  DEFAULT_SCAN_ARGS: {},
  scanProfilePageInTab: vi.fn(),
}));

import { hasOpenUserLinkedInTab } from '@/background/scan-worker';

describe('hasOpenUserLinkedInTab', () => {
  let tabsQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tabsQuery = vi.fn();
    vi.stubGlobal('chrome', {
      tabs: { query: tabsQuery },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when no LinkedIn tabs are open', async () => {
    tabsQuery.mockResolvedValue([]);
    expect(await hasOpenUserLinkedInTab()).toBe(false);
  });

  it('returns true when a non-owned LinkedIn tab is open', async () => {
    tabsQuery.mockResolvedValue([{ id: 42 } as chrome.tabs.Tab]);
    expect(await hasOpenUserLinkedInTab()).toBe(true);
  });

  it('queries against both linkedin.com host variants', async () => {
    tabsQuery.mockResolvedValue([]);
    await hasOpenUserLinkedInTab();
    expect(tabsQuery).toHaveBeenCalledWith({
      url: ['https://www.linkedin.com/*', 'https://linkedin.com/*'],
    });
  });

  it('treats a tab without an id as user-owned (cannot be a worker tab)', async () => {
    tabsQuery.mockResolvedValue([{} as chrome.tabs.Tab]);
    expect(await hasOpenUserLinkedInTab()).toBe(true);
  });
});
