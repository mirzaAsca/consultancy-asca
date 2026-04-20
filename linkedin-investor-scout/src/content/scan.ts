import type { ProspectLevel, ScanPageResult } from '@/shared/types';
import {
  LINKEDIN_SELECTORS,
  SAFETY_TEXT_FRAGMENTS,
  SAFETY_URL_PATTERNS,
  type ScanSelectorSet,
} from './selectors';

/**
 * Arguments bundle passed through `chrome.scripting.executeScript({ args })`.
 * All values must be structured-clone-safe (RegExp / plain objects are fine).
 */
export interface ScanArgs {
  selectors: ScanSelectorSet;
  safetyUrlPatterns: {
    captcha: { source: string; flags: string };
    rateLimit: { source: string; flags: string };
    authWall: { source: string; flags: string };
  };
  safetyTextFragments: {
    captcha: readonly string[];
    rateLimit: readonly string[];
    authWall: readonly string[];
  };
  /** Max wait for the top card / degree badge to render (ms). */
  maxWaitMs: number;
}

export const DEFAULT_SCAN_ARGS: ScanArgs = {
  selectors: LINKEDIN_SELECTORS,
  safetyUrlPatterns: {
    captcha: {
      source: SAFETY_URL_PATTERNS.captcha.source,
      flags: SAFETY_URL_PATTERNS.captcha.flags,
    },
    rateLimit: {
      source: SAFETY_URL_PATTERNS.rateLimit.source,
      flags: SAFETY_URL_PATTERNS.rateLimit.flags,
    },
    authWall: {
      source: SAFETY_URL_PATTERNS.authWall.source,
      flags: SAFETY_URL_PATTERNS.authWall.flags,
    },
  },
  safetyTextFragments: SAFETY_TEXT_FRAGMENTS,
  maxWaitMs: 15000,
};

/**
 * Executed in the target LinkedIn profile tab via `chrome.scripting.executeScript`.
 *
 * IMPORTANT: this function is serialized and must remain self-contained. No
 * imports, no closures over module-level bindings — everything it needs is
 * either a browser global or passed via `args`.
 */
export async function scanProfilePageInTab(
  args: ScanArgs,
): Promise<ScanPageResult> {
  const {
    selectors,
    safetyUrlPatterns,
    safetyTextFragments,
    maxWaitMs,
  } = args;

  const href = window.location.href;
  const pageText = (document.body?.innerText || '').toLowerCase();
  const safetyCaptchaRe = new RegExp(
    safetyUrlPatterns.captcha.source,
    safetyUrlPatterns.captcha.flags,
  );
  const safetyRateLimitRe = new RegExp(
    safetyUrlPatterns.rateLimit.source,
    safetyUrlPatterns.rateLimit.flags,
  );
  const safetyAuthWallRe = new RegExp(
    safetyUrlPatterns.authWall.source,
    safetyUrlPatterns.authWall.flags,
  );

  const detected_captcha =
    safetyCaptchaRe.test(href) ||
    safetyTextFragments.captcha.some((f) => pageText.includes(f));
  const detected_rate_limit =
    safetyRateLimitRe.test(href) ||
    safetyTextFragments.rateLimit.some((f) => pageText.includes(f));
  const detected_auth_wall =
    safetyAuthWallRe.test(href) ||
    safetyTextFragments.authWall.some((f) => pageText.includes(f));

  if (detected_captcha || detected_rate_limit || detected_auth_wall) {
    return {
      ok: false,
      data: {
        level: 'NONE',
        name: null,
        headline: null,
        company: null,
        location: null,
        detected_captcha,
        detected_rate_limit,
        detected_auth_wall,
        profile_unavailable: false,
      },
      error: 'safety_trigger',
    };
  }

  const firstMatch = (list: string[]): Element | null => {
    for (const sel of list) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        // Invalid selector in one environment shouldn't break the rest.
      }
    }
    return null;
  };

  const textOf = (list: string[]): string | null => {
    const el = firstMatch(list);
    if (!el) return null;
    const raw = (el as HTMLElement).innerText || el.textContent || '';
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    return cleaned || null;
  };

  const waitForTopCard = (): Promise<void> =>
    new Promise<void>((resolve) => {
      if (firstMatch(selectors.distanceBadge) || firstMatch(selectors.name)) {
        resolve();
        return;
      }
      if (firstMatch(selectors.profileUnavailable)) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (
          firstMatch(selectors.distanceBadge) ||
          firstMatch(selectors.name) ||
          firstMatch(selectors.profileUnavailable)
        ) {
          observer.disconnect();
          resolve();
        }
      });
      const root = document.querySelector('main') ?? document.body;
      if (root) {
        observer.observe(root, { childList: true, subtree: true });
      }
      window.setTimeout(() => {
        observer.disconnect();
        resolve();
      }, maxWaitMs);
    });

  await waitForTopCard();

  if (firstMatch(selectors.profileUnavailable)) {
    return {
      ok: false,
      data: {
        level: 'NONE',
        name: null,
        headline: null,
        company: null,
        location: null,
        detected_captcha: false,
        detected_rate_limit: false,
        detected_auth_wall: false,
        profile_unavailable: true,
      },
      error: 'profile_unavailable',
    };
  }

  const badgeText = (textOf(selectors.distanceBadge) ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');

  let level: ProspectLevel = 'NONE';

  if (badgeText.includes('1st')) level = '1st';
  else if (badgeText.includes('2nd')) level = '2nd';
  else if (badgeText.includes('3rd')) level = '3rd';
  else {
    const hasConnect = !!firstMatch(selectors.connectButton);
    const hasMessage = !!firstMatch(selectors.messageButton);
    const hasFollow = !!firstMatch(selectors.followButton);
    if (hasMessage && !hasConnect) level = '1st';
    else if (hasConnect) level = '2nd';
    else if (hasFollow) level = 'OUT_OF_NETWORK';
    else level = 'OUT_OF_NETWORK';
  }

  const name = textOf(selectors.name);
  const headline = textOf(selectors.headline);
  const company = textOf(selectors.company);
  const location = textOf(selectors.location);

  return {
    ok: true,
    data: {
      level,
      name,
      headline,
      company,
      location,
      detected_captcha: false,
      detected_rate_limit: false,
      detected_auth_wall: false,
      profile_unavailable: false,
    },
    error: null,
  };
}
