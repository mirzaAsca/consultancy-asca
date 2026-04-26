import type {
  Message,
  MessageResponse,
  MessageResponseMap,
} from './types';

type RuntimeMessageListener = Parameters<
  typeof chrome.runtime.onMessage.addListener
>[0];

const TAB_BROADCAST_URLS = [
  'https://www.linkedin.com/*',
  'https://linkedin.com/*',
] as const;

function getRuntime(): typeof chrome.runtime | null {
  try {
    if (typeof chrome === 'undefined') return null;
    return chrome.runtime ?? null;
  } catch {
    return null;
  }
}

export function isRuntimeAvailable(): boolean {
  const runtime = getRuntime();
  if (!runtime) return false;
  try {
    return typeof runtime.id === 'string' && runtime.id.length > 0;
  } catch {
    return false;
  }
}

export function getExtensionUrl(path: string): string | null {
  if (!isRuntimeAvailable()) return null;
  try {
    const url = chrome.runtime.getURL(path);
    return url && !url.startsWith('chrome-extension://invalid/')
      ? url
      : null;
  } catch {
    return null;
  }
}

export function getExtensionVersion(fallback = '1.0.0'): string {
  if (!isRuntimeAvailable()) return fallback;
  try {
    return chrome.runtime.getManifest?.().version ?? fallback;
  } catch {
    return fallback;
  }
}

export function addRuntimeMessageListener(
  listener: RuntimeMessageListener,
): () => void {
  if (!isRuntimeAvailable()) return () => {};
  try {
    chrome.runtime.onMessage.addListener(listener);
  } catch {
    return () => {};
  }
  return () => {
    if (!isRuntimeAvailable()) return;
    try {
      chrome.runtime.onMessage.removeListener(listener);
    } catch {
      // Extension context may have been invalidated while this page stayed open.
    }
  };
}

export function sendMessageToRuntime(msg: Message): void {
  if (!isRuntimeAvailable()) return;
  try {
    chrome.runtime.sendMessage(msg, () => {
      try {
        void chrome.runtime.lastError;
      } catch {
        // Extension context may have been invalidated before the callback ran.
      }
    });
  } catch {
    // Stale content scripts can outlive a reloaded extension.
  }
}

/**
 * Typed wrapper around `chrome.runtime.sendMessage`.
 *
 * Example:
 *   const res = await sendMessage({ type: 'STATS_QUERY' });
 *   if (res.ok) console.log(res.data.total);
 */
export function sendMessage<M extends Message>(
  msg: M,
): Promise<MessageResponse<MessageResponseMap[M['type']]>> {
  return new Promise((resolve) => {
    if (!isRuntimeAvailable()) {
      resolve({ ok: false, error: 'extension context unavailable' });
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        let lastError: chrome.runtime.LastError | undefined;
        try {
          lastError = chrome.runtime.lastError;
        } catch {
          resolve({ ok: false, error: 'extension context unavailable' });
          return;
        }
        if (lastError) {
          resolve({ ok: false, error: lastError.message ?? 'runtime error' });
          return;
        }
        if (!response) {
          resolve({ ok: false, error: 'no response' });
          return;
        }
        resolve(response as MessageResponse<MessageResponseMap[M['type']]>);
      });
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'sendMessage failed',
      });
    }
  });
}

export type MessageHandler = (
  msg: Message,
  sender: chrome.runtime.MessageSender,
) => Promise<MessageResponse<unknown>>;

/**
 * Register a single async message router. Returns `true` from the listener to
 * keep the port open for the async `sendResponse` (Chrome MV3 requirement).
 */
export function registerMessageRouter(handler: MessageHandler): void {
  if (!isRuntimeAvailable()) return;
  addRuntimeMessageListener((msg, sender, sendResponse) => {
    (async () => {
      try {
        const response = await handler(msg as Message, sender);
        sendResponse(response);
      } catch (error) {
        console.error('[investor-scout] message handler error', {
          type: (msg as Message | undefined)?.type,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'handler error',
        });
      }
    })();
    return true;
  });
}

function shouldBroadcastToLinkedInTabs(msg: Message): boolean {
  return msg.type === 'PROSPECTS_UPDATED' || msg.type === 'SETTINGS_CHANGED';
}

function broadcastToLinkedInTabs(msg: Message): void {
  void chrome.tabs
    .query({ url: [...TAB_BROADCAST_URLS] })
    .then((tabs) => {
      for (const tab of tabs) {
        if (typeof tab.id !== 'number') continue;
        try {
          chrome.tabs.sendMessage(tab.id, msg, () => {
            try {
              void chrome.runtime.lastError;
            } catch {
              // Extension context may have been invalidated before callback.
            }
          });
        } catch {
          // Tab may have navigated away between query/send — ignore.
        }
      }
    })
    .catch(() => {
      // Ignore tab query failures in fire-and-forget broadcasts.
    });
}

/**
 * Broadcast a message to all listeners (popup, dashboard, content scripts).
 * Background-initiated; ignores errors from disconnected ports (normal when
 * the popup is closed).
 */
export function broadcast(msg: Message): void {
  sendMessageToRuntime(msg);

  if (isRuntimeAvailable() && shouldBroadcastToLinkedInTabs(msg)) {
    broadcastToLinkedInTabs(msg);
  }
}
