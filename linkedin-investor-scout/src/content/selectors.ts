/**
 * Centralized LinkedIn DOM selectors for the scan content script.
 *
 * Each field has 2–3 fallbacks tried in order. When LinkedIn ships a DOM
 * change, only this file needs updating. Fixtures in `tests/selectors.fixtures.html`
 * back these up with snapshot tests.
 *
 * Kept plain (no runtime imports) so it can be serialized/inlined into the
 * tab-injected scan function via `chrome.scripting.executeScript`.
 */

export interface ScanSelectorSet {
  /** Degree-badge element(s) next to the profile name in the top card. */
  distanceBadge: string[];
  /** Full profile name in the top card. */
  name: string[];
  /** Sub-headline text under the name. */
  headline: string[];
  /** Current experience company (top-card aggregation). */
  company: string[];
  /** Location under the avatar / top card. */
  location: string[];
  /** Presence of a "Connect" primary action → usually 2nd-degree heuristic. */
  connectButton: string[];
  /** Presence of a "Message" primary action → usually 1st-degree heuristic. */
  messageButton: string[];
  /** Presence of a "Follow" primary action (3rd / out-of-network fallback). */
  followButton: string[];
  /** Matches a "Profile unavailable" / 404 page. */
  profileUnavailable: string[];
}

export const LINKEDIN_SELECTORS: ScanSelectorSet = {
  distanceBadge: [
    '.pv-top-card--list-bullet .dist-value',
    'main span.dist-value',
    'main [data-test-distance-badge]',
    'main .artdeco-entity-lockup__degree',
  ],
  name: [
    'main h1.text-heading-xlarge',
    'main section.pv-top-card h1',
    'main h1.inline',
    'main h1',
  ],
  headline: [
    'main .text-body-medium.break-words',
    'main .pv-text-details__left-panel .text-body-medium',
    'main section.pv-top-card .text-body-medium',
  ],
  company: [
    'main [aria-label="Current company"] span[aria-hidden="true"]',
    'main section.pv-top-card button[aria-label^="Current company"] span',
    'main .pv-text-details__right-panel-item-link .inline-show-more-text',
    'main .pv-top-card--experience-list .pv-entity__secondary-title',
  ],
  location: [
    'main .text-body-small.inline.t-black--light.break-words',
    'main section.pv-top-card .pv-text-details__left-panel .text-body-small',
    'main section.pv-top-card .pv-top-card--list .text-body-small',
  ],
  connectButton: [
    'main button[aria-label^="Invite"][aria-label*="to connect"]',
    'main button.artdeco-button--primary[aria-label*="Connect"]',
  ],
  messageButton: [
    'main button[aria-label^="Message"]',
    'main a.message-anywhere-button',
  ],
  followButton: [
    'main button[aria-label^="Follow "][aria-label*="notifications" i]',
    'main button.artdeco-button--primary[aria-label^="Follow"]',
  ],
  profileUnavailable: [
    '.profile-unavailable',
    '.error-container .not-found',
    '[data-test-id="profile-unavailable"]',
  ],
};

/** Heuristic checks for auto-pause triggers. URL checks are done outside the DOM. */
export const SAFETY_URL_PATTERNS = {
  captcha: /\/checkpoint\/(challenge|lg)/i,
  rateLimit: /\/checkpoint\/(rate|limit)/i,
  authWall: /\/(login|authwall|checkpoint\/lg\/login)/i,
} as const;

export const SAFETY_TEXT_FRAGMENTS = {
  captcha: ['captcha', 'security verification', 'verify you are human'],
  rateLimit: [
    "we've restricted your account",
    'unusual activity',
    'unusual traffic',
    'try again later',
  ],
  authWall: ['sign in to linkedin', 'join linkedin', 'join now to see'],
} as const;
