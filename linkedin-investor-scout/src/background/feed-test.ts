import type {
  FeedVisibleProfile,
  ProspectInsert,
  ProspectLevel,
} from '@/shared/types';
import { defaultProspectV2Fields } from '@/shared/db';
import {
  canonicalizeLinkedInProfileUrl,
  slugFromCanonicalProfileUrl,
} from '@/shared/url';

export const FEED_TEST_MAX_PROFILES = 200;
export const FEED_TEST_LEVELS: ProspectLevel[] = [
  '1st',
  '2nd',
  '3rd',
  'OUT_OF_NETWORK',
];
export const FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS = FEED_TEST_LEVELS.length;

function normalizeOptionalText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 200) : null;
}

function defaultActivity(): ProspectInsert['activity'] {
  return {
    connected: false,
    connected_at: null,
    commented: false,
    commented_at: null,
    messaged: false,
    messaged_at: null,
  };
}

export function isLinkedInFeedTabUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'linkedin.com') return false;
    const path = url.pathname.toLowerCase().replace(/\/+$/, '');
    return path === '/feed';
  } catch {
    return false;
  }
}

function randomIndex(length: number, random: () => number): number {
  if (length <= 1) return 0;
  const sample = random();
  if (!Number.isFinite(sample)) return 0;
  const normalized = Math.min(0.999_999_999_999, Math.max(0, sample));
  return Math.floor(normalized * length);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1, random);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickRandomLevel(random: () => number): ProspectLevel {
  const idx = randomIndex(FEED_TEST_LEVELS.length, random);
  return FEED_TEST_LEVELS[idx] ?? 'OUT_OF_NETWORK';
}

function assignRandomLevels(
  count: number,
  random: () => number,
): ProspectLevel[] {
  const out: ProspectLevel[] = [];
  if (count <= 0) return out;

  if (count >= FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS) {
    out.push(...shuffle(FEED_TEST_LEVELS, random));
  }

  while (out.length < count) {
    out.push(pickRandomLevel(random));
  }
  return out;
}

export function canCoverAllFeedTestLevels(profileCount: number): boolean {
  return profileCount >= FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS;
}

export function buildFeedTestRows(
  profiles: FeedVisibleProfile[],
  options: { now?: number; random?: () => number } = {},
): ProspectInsert[] {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const deduped: Array<{ url: string; slug: string; name: string | null }> = [];
  const seen = new Set<string>();

  for (const profile of profiles) {
    const canonical = canonicalizeLinkedInProfileUrl(profile.url);
    if (!canonical) continue;
    const slug = slugFromCanonicalProfileUrl(canonical)?.toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    deduped.push({
      url: canonical,
      slug,
      name: normalizeOptionalText(profile.name),
    });
  }

  const levels = assignRandomLevels(deduped.length, random);
  return deduped.map((row, idx) => ({
    ...row,
    level: levels[idx] ?? 'OUT_OF_NETWORK',
    headline: null,
    company: null,
    location: null,
    scan_status: 'done',
    scan_error: null,
    scan_attempts: 0,
    last_scanned: now,
    activity: defaultActivity(),
    notes: '',
    created_at: now,
    updated_at: now,
    ...defaultProspectV2Fields(),
  }));
}
