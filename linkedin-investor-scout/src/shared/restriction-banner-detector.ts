/**
 * Phase 4.3 / 5.3 hook — pure pattern-matching for the LinkedIn
 * "We've restricted your account" / "unusual activity" warning banners.
 *
 * The content-side watcher (in `src/content/interaction-detectors.ts`) runs a
 * MutationObserver on any `linkedin.com/*` page and invokes this function
 * against candidate text nodes. On a positive match it messages the background
 * to trip the kill switch with reason `restriction_banner`.
 *
 * The detector is deliberately conservative — a single false positive will
 * auto-pause the whole engine, which is recoverable but annoying. We require
 * both a strong primary phrase AND a warning-context hint (or a clearly
 * unambiguous restriction phrase) before flagging.
 */

export interface RestrictionBannerMatch {
  /** The phrase that triggered the match (short excerpt). */
  phrase: string;
  /** Kind of signal — coarse bucket so the activity log can count them. */
  kind: 'account_restricted' | 'unusual_activity' | 'temporary_restriction';
}

/**
 * Primary phrases — any of these alone is sufficient. These are LinkedIn's
 * own warning copy; they do not appear in normal browsing.
 */
const UNAMBIGUOUS_PATTERNS: Array<{
  kind: RestrictionBannerMatch['kind'];
  pattern: RegExp;
}> = [
  {
    kind: 'account_restricted',
    pattern: /\bwe[' ]ve restricted your account\b/i,
  },
  {
    kind: 'account_restricted',
    pattern: /\byour account (?:has been|is currently) restricted\b/i,
  },
  {
    kind: 'temporary_restriction',
    pattern: /\byou['’]ve been temporarily restricted\b/i,
  },
  {
    kind: 'temporary_restriction',
    pattern: /\byour activity has been temporarily restricted\b/i,
  },
];

/**
 * "Unusual activity" is also used in benign password-reminder copy, so we
 * only flag when it co-occurs with a restriction hint.
 */
const UNUSUAL_ACTIVITY_PATTERN = /\bunusual activity\b/i;
const RESTRICTION_HINT_PATTERN =
  /\b(?:restrict(?:ed|ion)?|suspend(?:ed|sion)?|blocked|temporarily|limited)\b/i;

/**
 * Match a text blob against the restriction-banner heuristics. Returns `null`
 * when nothing matched. Callers should normalize whitespace before passing in
 * (collapse newlines / multiple spaces to a single space) so phrases that
 * span DOM nodes still hit.
 */
export function matchRestrictionBanner(
  text: string,
): RestrictionBannerMatch | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return null;

  for (const { kind, pattern } of UNAMBIGUOUS_PATTERNS) {
    const hit = normalized.match(pattern);
    if (hit) {
      return { kind, phrase: hit[0] };
    }
  }

  if (
    UNUSUAL_ACTIVITY_PATTERN.test(normalized) &&
    RESTRICTION_HINT_PATTERN.test(normalized)
  ) {
    const excerpt = normalized.match(UNUSUAL_ACTIVITY_PATTERN)?.[0] ?? 'unusual activity';
    return { kind: 'unusual_activity', phrase: excerpt };
  }

  return null;
}
