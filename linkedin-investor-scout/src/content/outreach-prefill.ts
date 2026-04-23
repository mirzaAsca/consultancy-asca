/**
 * Mode A prefill — open the LinkedIn Connect modal on the currently-loaded
 * profile page and type the rendered invite note into the textarea. User
 * still clicks "Send invitation" (MASTER §19.2 / `EXTENSION_GROWTH_TODO.md`
 * Phase 1.3 invariant). No submit, no click-through.
 *
 * Selector strategy follows `EXTENSION_GROWTH_TODO.md` DOM Reference,
 * `example2.html` / `example3-stage1.html` / `example3.html` — aria-label
 * hooks first, then obfuscated-class fallbacks.
 */

import type { CONNECT_NOTE_CHAR_CAP } from '@/shared/constants';
import type {
  OutreachPrefillConnectPayload,
  OutreachPrefillResult,
} from '@/shared/types';

/**
 * Scan the top card for the Connect CTA. Returns null when the button isn't
 * rendered (1st-degree profile, or an OOO profile where LinkedIn hides the
 * Connect action behind the "More" dropdown — we don't try to drill through
 * More at this time; surface a graceful failure instead).
 */
function findConnectCta(): HTMLAnchorElement | HTMLButtonElement | null {
  // Primary: `<a aria-label="Invite {Name} to connect" href="/preload/custom-invite/...">`
  const anchor = document.querySelector<HTMLAnchorElement>(
    'a[aria-label^="Invite "][aria-label$=" to connect"][href*="/preload/custom-invite/"]',
  );
  if (anchor) return anchor;

  // Secondary: some surfaces render a button instead of a link.
  const btn = document.querySelector<HTMLButtonElement>(
    'button[aria-label^="Invite "][aria-label$=" to connect"]',
  );
  if (btn) return btn;

  return null;
}

/**
 * Stage-1 prompt → click "Add a note" when LinkedIn renders the
 * "Add a note to your invitation?" prompt first (seen on Free tier and some
 * Premium paths).
 */
function clickAddANoteIfPromptVisible(): boolean {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  for (const d of dialogs) {
    const header = d.querySelector('h2, h1');
    const title = header?.textContent?.trim().toLowerCase() ?? '';
    if (title.startsWith('add a note to your invitation?')) {
      const addButton = Array.from(
        d.querySelectorAll<HTMLButtonElement>('button'),
      ).find(
        (b) => (b.textContent?.trim().toLowerCase() ?? '') === 'add a note',
      );
      if (addButton) {
        addButton.click();
        return true;
      }
    }
  }
  return false;
}

function findInviteTextarea(): HTMLTextAreaElement | HTMLElement | null {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label*="personal note"], textarea[name="message"]',
  );
  if (textarea) return textarea;

  // Newer modals render a contenteditable `[role="textbox"]` instead.
  const roleTextbox = document.querySelector<HTMLElement>(
    '[role="dialog"] [role="textbox"][aria-label*="personal note"]',
  );
  if (roleTextbox) return roleTextbox;

  return null;
}

function waitForSelector<T extends HTMLElement>(
  find: () => T | null,
  timeoutMs: number,
): Promise<T | null> {
  return new Promise((resolve) => {
    const hit = find();
    if (hit) {
      resolve(hit);
      return;
    }
    const start = Date.now();
    const observer = new MutationObserver(() => {
      const node = find();
      if (node) {
        observer.disconnect();
        resolve(node);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        observer.disconnect();
        resolve(null);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(find());
    }, timeoutMs);
  });
}

/**
 * React-safe value setter. LinkedIn's modal is React-rendered, so setting
 * `.value` directly does not inform React of the change — it would reset the
 * textarea as soon as the user focuses it. Use the native setter + bubble a
 * synthetic `input` event so React picks it up.
 */
function setNativeValue(
  element: HTMLTextAreaElement | HTMLInputElement,
  value: string,
): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setContentEditableValue(el: HTMLElement, value: string): void {
  el.focus();
  // Replace the entire body in one shot; LinkedIn wraps each paragraph in
  // `<p>` tags, so we emit one `<p>` per line and let the editor normalize.
  const html = value
    .split(/\r?\n/)
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
    .join('');
  el.innerHTML = html;
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Highlight the Send button so the user sees the target click surface. */
function highlightSendButton(): void {
  const send = document.querySelector<HTMLButtonElement>(
    '[role="dialog"] button[aria-label="Send invitation"]',
  );
  if (!send) return;
  send.style.transition = 'box-shadow 0.2s ease';
  send.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.55)';
  // Auto-clear the glow after 20s so we don't permanently annotate a button
  // the user might interact with on subsequent invites this session.
  window.setTimeout(() => {
    send.style.boxShadow = '';
  }, 20_000);
}

/**
 * Full Mode A prefill sequence. Resolves with the furthest stage we reached.
 * All failures are reported via `ok: false` by the caller; we do NOT click
 * Send under any code path.
 */
export async function prefillConnectModal(
  payload: OutreachPrefillConnectPayload,
  _cap: typeof CONNECT_NOTE_CHAR_CAP,
): Promise<
  | { ok: true; data: OutreachPrefillResult }
  | { ok: false; error: string }
> {
  const cta = findConnectCta();
  if (!cta) {
    return {
      ok: false,
      error:
        'Connect button not visible on this page. Scroll to the profile top card or use the More menu manually.',
    };
  }

  cta.click();

  // The modal opens either directly into Stage 2 (textarea) or through a
  // Stage 1 prompt ("Add a note to your invitation?"). Wait on either.
  await waitForAndClickAddNote(2500);

  const textarea = await waitForSelector<HTMLElement>(
    findInviteTextarea,
    6000,
  );
  if (!textarea) {
    return {
      ok: true,
      data: {
        stage: 'opened_modal',
        filled_body: null,
        draft_action_id: null,
      },
    };
  }

  const body = payload.rendered_body.trim();
  if (textarea instanceof HTMLTextAreaElement) {
    setNativeValue(textarea, body);
  } else {
    setContentEditableValue(textarea, body);
  }

  highlightSendButton();

  return {
    ok: true,
    data: {
      stage: 'awaiting_send',
      filled_body: body,
      draft_action_id: null,
    },
  };
}

async function waitForAndClickAddNote(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (clickAddANoteIfPromptVisible()) return true;
    // If the stage-2 textarea is already present, there's no prompt to click.
    if (findInviteTextarea()) return false;
    await sleep(80);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
