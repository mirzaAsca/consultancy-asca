import type {
  Message,
  MessageResponse,
  MessageResponseMap,
} from './types';

const TAB_BROADCAST_URLS = [
  'https://www.linkedin.com/*',
  'https://linkedin.com/*',
] as const;

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
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        const lastError = chrome.runtime.lastError;
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
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
            void chrome.runtime.lastError;
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
  try {
    chrome.runtime.sendMessage(msg, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // popup/dashboard closed — ignore
  }

  if (shouldBroadcastToLinkedInTabs(msg)) {
    broadcastToLinkedInTabs(msg);
  }
}
