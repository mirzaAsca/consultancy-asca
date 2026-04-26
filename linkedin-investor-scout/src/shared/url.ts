const CANONICAL_ORIGIN = 'https://www.linkedin.com';

/**
 * Returns true if the string can be normalized to a canonical `/in/` profile URL.
 */
export function validateLinkedInInUrl(input: string): boolean {
  return canonicalizeLinkedInProfileUrl(input) !== null;
}

/**
 * Phase 5.6 — extract a LinkedIn messaging thread id from a pathname.
 *
 * Covers the surfaces a Mode-A user actually lands on:
 *   - `/messaging/thread/{id}/`        — full-page thread (and pop-out window).
 *   - `/messaging/messageRoom/{id}/`   — older surface still rendered on some accounts.
 *
 * Returns `null` for `/messaging/compose/` (no thread id yet — different flow)
 * and for any non-messaging pathname. The id segment is returned verbatim;
 * LinkedIn's encoding (e.g. `2-MTM3MDcwOTM4XzE=`) is opaque and stable.
 */
export function extractMessagingThreadId(pathname: string): string | null {
  const decoded = safeDecodePathname(pathname);
  const match = decoded.match(/^\/messaging\/(?:thread|messageRoom)\/([^/]+)\/?$/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw) return null;
  return raw;
}

/**
 * Extract `/in/{slug}` slug from a pathname (handles `/in/slug/overlay/...`).
 */
export function slugFromLinkedInPathname(pathname: string): string | null {
  const decoded = safeDecodePathname(pathname);
  const match = decoded.match(/^\/in\/([^/]+)/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw) return null;
  return raw;
}

function safeDecodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/**
 * Alias: slug from any LinkedIn profile URL input (null if not a valid `/in/` URL).
 */
export function slugifyLinkedInProfileUrl(input: string): string | null {
  const canonical = canonicalizeLinkedInProfileUrl(input);
  if (!canonical) return null;
  return slugFromCanonicalProfileUrl(canonical);
}

/**
 * Slug from an already-canonical `https://www.linkedin.com/in/{slug}/` URL.
 */
export function slugFromCanonicalProfileUrl(canonicalUrl: string): string | null {
  try {
    const u = new URL(canonicalUrl);
    return slugFromLinkedInPathname(u.pathname);
  } catch {
    return null;
  }
}

/**
 * Normalize allowed LinkedIn profile URL variants to:
 * `https://www.linkedin.com/in/{slug}/`
 * Returns null if not a profile `/in/` URL on linkedin.com.
 */
export function canonicalizeLinkedInProfileUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let toParse = trimmed;
  if (!/^[a-z+]+:\/\//i.test(toParse)) {
    toParse = `https://${toParse}`;
  }

  let url: URL;
  try {
    url = new URL(toParse);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!isLinkedInProfileHost(host)) return null;

  const slug = slugFromLinkedInPathname(url.pathname);
  if (!slug || !isReasonableLinkedInSlug(slug)) return null;

  const pathSlug = encodeURIComponent(slug);
  return `${CANONICAL_ORIGIN}/in/${pathSlug}/`;
}

function isLinkedInProfileHost(host: string): boolean {
  return host === 'linkedin.com' || host.endsWith('.linkedin.com');
}

/**
 * LinkedIn slugs are mostly alphanumeric + hyphen; allow unicode for intl names.
 */
function isReasonableLinkedInSlug(slug: string): boolean {
  if (slug.length > 200) return false;
  if (/[/?#]/.test(slug)) return false;
  return true;
}
