import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addRuntimeMessageListener,
  broadcast,
  getExtensionUrl,
  sendMessage,
  sendMessageToRuntime,
} from '@/shared/messaging';
import type { Message } from '@/shared/types';

const TAB_BROADCAST_URLS = [
  'https://www.linkedin.com/*',
  'https://linkedin.com/*',
];

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('broadcast', () => {
  let runtimeSendMessage: ReturnType<typeof vi.fn>;
  let tabsQuery: ReturnType<typeof vi.fn>;
  let tabsSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    runtimeSendMessage = vi.fn((_msg: Message, cb?: () => void) => cb?.());
    tabsQuery = vi.fn(async () => [
      { id: 11 } as chrome.tabs.Tab,
      { id: 12 } as chrome.tabs.Tab,
      {} as chrome.tabs.Tab,
    ]);
    tabsSendMessage = vi.fn(
      (_tabId: number, _msg: Message, cb?: () => void) => cb?.(),
    );

    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension-id',
        getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
        sendMessage: runtimeSendMessage,
        lastError: undefined,
      },
      tabs: {
        query: tabsQuery,
        sendMessage: tabsSendMessage,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('fans out PROSPECTS_UPDATED to LinkedIn tabs', async () => {
    const msg: Message = {
      type: 'PROSPECTS_UPDATED',
      payload: { changed_ids: [] },
    };

    broadcast(msg);
    await flushMicrotasks();

    expect(runtimeSendMessage).toHaveBeenCalledOnce();
    expect(tabsQuery).toHaveBeenCalledWith({ url: TAB_BROADCAST_URLS });
    expect(tabsSendMessage).toHaveBeenCalledTimes(2);
    expect(tabsSendMessage).toHaveBeenNthCalledWith(
      1,
      11,
      msg,
      expect.any(Function),
    );
    expect(tabsSendMessage).toHaveBeenNthCalledWith(
      2,
      12,
      msg,
      expect.any(Function),
    );
  });

  it('does not fan out SCAN_STATE_CHANGED to tabs', async () => {
    const msg: Message = {
      type: 'SCAN_STATE_CHANGED',
      payload: {
        id: 'current',
        status: 'idle',
        auto_pause_reason: null,
        started_at: null,
        last_activity_at: null,
        scans_today: 0,
        day_bucket: '2026-04-20',
        current_prospect_id: null,
      },
    };

    broadcast(msg);
    await flushMicrotasks();

    expect(runtimeSendMessage).toHaveBeenCalledOnce();
    expect(tabsQuery).not.toHaveBeenCalled();
    expect(tabsSendMessage).not.toHaveBeenCalled();
  });

  it('does not send or fan out when runtime is unavailable', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: runtimeSendMessage,
        lastError: undefined,
      },
      tabs: {
        query: tabsQuery,
        sendMessage: tabsSendMessage,
      },
    });

    broadcast({
      type: 'PROSPECTS_UPDATED',
      payload: { changed_ids: [] },
    });
    sendMessageToRuntime({
      type: 'PROSPECTS_UPDATED',
      payload: { changed_ids: [] },
    });
    await flushMicrotasks();

    expect(runtimeSendMessage).not.toHaveBeenCalled();
    expect(tabsQuery).not.toHaveBeenCalled();
    expect(tabsSendMessage).not.toHaveBeenCalled();
  });

  it('returns a typed error when sendMessage runs without runtime context', async () => {
    vi.unstubAllGlobals();

    const res = await sendMessage({ type: 'STATS_QUERY' });

    expect(res).toEqual({
      ok: false,
      error: 'extension context unavailable',
    });
  });

  it('drops invalid extension URLs', () => {
    expect(getExtensionUrl('src/dashboard/index.html')).toBe(
      'chrome-extension://test-extension-id/src/dashboard/index.html',
    );

    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension-id',
        getURL: () => 'chrome-extension://invalid/',
      },
    });

    expect(getExtensionUrl('src/dashboard/index.html')).toBeNull();
  });

  it('adds and removes runtime message listeners when context is valid', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension-id',
        onMessage: { addListener, removeListener },
      },
    });
    const listener = vi.fn();

    const remove = addRuntimeMessageListener(listener);
    remove();

    expect(addListener).toHaveBeenCalledWith(listener);
    expect(removeListener).toHaveBeenCalledWith(listener);
  });
});
