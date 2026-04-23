import { describe, expect, it } from 'vitest';
import { matchRestrictionBanner } from '@/shared/restriction-banner-detector';

describe('matchRestrictionBanner', () => {
  it('returns null for empty / whitespace input', () => {
    expect(matchRestrictionBanner('')).toBeNull();
    expect(matchRestrictionBanner('   \n\t ')).toBeNull();
  });

  it('returns null for benign feed copy', () => {
    expect(matchRestrictionBanner('People you may know')).toBeNull();
    expect(
      matchRestrictionBanner(
        'See who has viewed your posts this week, including unusual spikes in views.',
      ),
    ).toBeNull();
  });

  it('matches the primary "We\'ve restricted your account" phrase', () => {
    const hit = matchRestrictionBanner(
      "We've restricted your account for violating the User Agreement.",
    );
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('account_restricted');
  });

  it('matches the "your account has been restricted" phrase', () => {
    const hit = matchRestrictionBanner(
      'Your account has been restricted. Please verify your identity.',
    );
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('account_restricted');
  });

  it('matches the "temporarily restricted" phrase', () => {
    const hit = matchRestrictionBanner(
      "You've been temporarily restricted from sending invitations.",
    );
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('temporary_restriction');
  });

  it('matches unusual activity only when a restriction hint is present', () => {
    // Bare "unusual activity" without a restriction hint is benign copy.
    expect(
      matchRestrictionBanner('We noticed some unusual activity in your feed.'),
    ).toBeNull();

    // With a restriction hint, it flags.
    const hit = matchRestrictionBanner(
      "We've noticed some unusual activity and temporarily limited your account.",
    );
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('unusual_activity');
  });

  it('collapses whitespace across DOM nodes before matching', () => {
    const text = "We've\n\n  restricted\n your\taccount.";
    const hit = matchRestrictionBanner(text);
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('account_restricted');
  });

  it('returns a phrase excerpt for audit logging', () => {
    const hit = matchRestrictionBanner(
      "Notice: We've restricted your account until further review.",
    );
    expect(hit?.phrase.toLowerCase()).toContain('restricted your account');
  });
});
