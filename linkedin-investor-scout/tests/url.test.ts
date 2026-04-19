import { describe, expect, it } from 'vitest';
import {
  canonicalizeLinkedInProfileUrl,
  slugifyLinkedInProfileUrl,
  validateLinkedInInUrl,
} from '@/shared/url';

describe('canonicalizeLinkedInProfileUrl', () => {
  it('normalizes host to www and strips query/hash', () => {
    expect(
      canonicalizeLinkedInProfileUrl(
        'https://linkedin.com/in/john-doe?miniProfileUrn=abc#detail',
      ),
    ).toBe('https://www.linkedin.com/in/john-doe/');
  });

  it('accepts www host and trailing slash', () => {
    expect(canonicalizeLinkedInProfileUrl('www.linkedin.com/in/jane/')).toBe(
      'https://www.linkedin.com/in/jane/',
    );
  });

  it('accepts scheme-less linkedin.com', () => {
    expect(canonicalizeLinkedInProfileUrl('linkedin.com/in/bob')).toBe(
      'https://www.linkedin.com/in/bob/',
    );
  });

  it('strips overlay path after slug', () => {
    expect(
      canonicalizeLinkedInProfileUrl(
        'https://www.linkedin.com/in/john-doe/overlay/contact-info',
      ),
    ).toBe('https://www.linkedin.com/in/john-doe/');
  });

  it('returns null for non-profile URLs', () => {
    expect(canonicalizeLinkedInProfileUrl('https://www.linkedin.com/company/acme/')).toBeNull();
    expect(canonicalizeLinkedInProfileUrl('https://example.com/in/x/')).toBeNull();
  });

  it('returns null for empty or invalid', () => {
    expect(canonicalizeLinkedInProfileUrl('')).toBeNull();
    expect(canonicalizeLinkedInProfileUrl('   ')).toBeNull();
    expect(canonicalizeLinkedInProfileUrl('not a url')).toBeNull();
  });

  it('preserves unicode slug via percent-encoding', () => {
    const c = canonicalizeLinkedInProfileUrl('https://www.linkedin.com/in/josé-ruiz/');
    expect(c).toBe(`https://www.linkedin.com/in/${encodeURIComponent('josé-ruiz')}/`);
  });
});

describe('validateLinkedInInUrl', () => {
  it('matches canonicalizer', () => {
    expect(validateLinkedInInUrl('linkedin.com/in/x')).toBe(true);
    expect(validateLinkedInInUrl('https://evil.com/in/x')).toBe(false);
  });
});

describe('slugifyLinkedInProfileUrl', () => {
  it('returns slug only', () => {
    expect(slugifyLinkedInProfileUrl('https://www.linkedin.com/in/my-slug/')).toBe('my-slug');
  });
});
