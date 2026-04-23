import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCommentPermalink,
  buildPostPermalink,
  classifyPostKindFromUrn,
  extractUrnsFromHydration,
} from '@/shared/urn';

const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLE1 = fs.readFileSync(path.join(REPO_ROOT, 'example1.html'), 'utf-8');

describe('extractUrnsFromHydration', () => {
  it('returns empty buckets for empty input', () => {
    const out = extractUrnsFromHydration('');
    expect(out).toEqual({
      activity: [],
      ugcPost: [],
      groupPost: [],
      share: [],
      comment: [],
    });
  });

  it('extracts each URN kind from a synthetic blob', () => {
    const html = `
      <div data-urn="urn:li:activity:7451889312482283521"></div>
      <script>{"post":"urn:li:ugcPost:7451886104967839744"}</script>
      <a href="/feed/update/urn:li:groupPost:3990648-7445075414298894336/"></a>
      <meta content="urn:li:share:7400000000000000001" />
      <span data-comment="urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)"></span>
    `;
    const out = extractUrnsFromHydration(html);
    expect(out.activity).toEqual(['urn:li:activity:7451889312482283521']);
    expect(out.ugcPost).toEqual(['urn:li:ugcPost:7451886104967839744']);
    expect(out.groupPost).toEqual(['urn:li:groupPost:3990648-7445075414298894336']);
    expect(out.share).toEqual(['urn:li:share:7400000000000000001']);
    expect(out.comment).toEqual([
      'urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)',
    ]);
  });

  it('deduplicates repeated URN occurrences', () => {
    const html = `
      urn:li:activity:1 urn:li:activity:1 urn:li:activity:2
      urn:li:activity:2 urn:li:activity:1
    `;
    const out = extractUrnsFromHydration(html);
    expect(out.activity).toEqual(['urn:li:activity:1', 'urn:li:activity:2']);
  });

  it('normalizes URL-encoded URNs in hrefs', () => {
    const html = `
      <a href="/messaging?profileUrn=urn%3Ali%3Afsd_profile%3AACoAA">x</a>
      <a href="/feed?activityUrn=urn%3Ali%3Aactivity%3A7451889312482283521">y</a>
      <a href="/c?commentUrn=urn%3Ali%3Acomment%3A%28urn%3Ali%3Aactivity%3A7451889312482283521%2C7451891984450940928%29">z</a>
    `;
    const out = extractUrnsFromHydration(html);
    expect(out.activity).toContain('urn:li:activity:7451889312482283521');
    expect(out.comment).toContain(
      'urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)',
    );
  });

  it('recovers the activity URN implied by a comment URN', () => {
    const out = extractUrnsFromHydration(
      'urn:li:comment:(urn:li:activity:999999,888888)',
    );
    expect(out.activity).toContain('urn:li:activity:999999');
    expect(out.comment).toEqual([
      'urn:li:comment:(urn:li:activity:999999,888888)',
    ]);
  });

  it('extracts canonical URNs from the live-captured example1.html fixture', () => {
    const out = extractUrnsFromHydration(EXAMPLE1);
    // Confirmed via `grep -oE 'urn:li:…'` against the raw fixture.
    expect(out.activity).toEqual(
      expect.arrayContaining([
        'urn:li:activity:7447673295082078208',
        'urn:li:activity:7448815175010476032',
        'urn:li:activity:7451889312482283521',
        'urn:li:activity:7451965164867829760',
      ]),
    );
    expect(out.ugcPost).toContain('urn:li:ugcPost:7451886104967839744');
    expect(out.groupPost).toContain('urn:li:groupPost:3990648-7445075414298894336');
    expect(out.comment.length).toBeGreaterThanOrEqual(4);
    expect(out.comment).toEqual(
      expect.arrayContaining([
        'urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)',
      ]),
    );
  });

  it('ignores non-matching li: URNs (urn:li:application, urn:li:fsd_profile)', () => {
    const html =
      'urn:li:application:x urn:li:fsd_profile:ACoAA urn:li:fs_objectUrn:whatever';
    const out = extractUrnsFromHydration(html);
    expect(out.activity).toEqual([]);
    expect(out.ugcPost).toEqual([]);
    expect(out.groupPost).toEqual([]);
    expect(out.share).toEqual([]);
    expect(out.comment).toEqual([]);
  });
});

describe('classifyPostKindFromUrn', () => {
  it.each([
    ['urn:li:activity:123', 'activity'],
    ['urn:li:ugcPost:456', 'ugcPost'],
    ['urn:li:groupPost:1-2', 'groupPost'],
    ['urn:li:share:789', 'share'],
  ] as const)('maps %s → %s', (urn, kind) => {
    expect(classifyPostKindFromUrn(urn)).toBe(kind);
  });

  it('returns null for comment URNs and nullish input', () => {
    expect(
      classifyPostKindFromUrn('urn:li:comment:(urn:li:activity:1,2)'),
    ).toBeNull();
    expect(classifyPostKindFromUrn(null)).toBeNull();
    expect(classifyPostKindFromUrn(undefined)).toBeNull();
  });
});

describe('buildPostPermalink', () => {
  it('builds the canonical /feed/update/ URL for an activity URN', () => {
    expect(buildPostPermalink('urn:li:activity:7451889312482283521')).toBe(
      'https://www.linkedin.com/feed/update/urn:li:activity:7451889312482283521/',
    );
  });

  it('returns null for non-activity URNs (ugcPost, share, group)', () => {
    expect(buildPostPermalink('urn:li:ugcPost:123')).toBeNull();
    expect(buildPostPermalink('urn:li:share:123')).toBeNull();
    expect(buildPostPermalink(null)).toBeNull();
  });
});

describe('buildCommentPermalink', () => {
  it('nests the comment URN as a query param on the post permalink', () => {
    const out = buildCommentPermalink(
      'urn:li:activity:7451889312482283521',
      'urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)',
    );
    expect(out).toBe(
      'https://www.linkedin.com/feed/update/urn:li:activity:7451889312482283521/' +
        '?commentUrn=urn%3Ali%3Acomment%3A(urn%3Ali%3Aactivity%3A7451889312482283521%2C7451891984450940928)',
    );
  });

  it('recovers the parent activity URN from the comment URN when not supplied', () => {
    const out = buildCommentPermalink(
      null,
      'urn:li:comment:(urn:li:activity:999,777)',
    );
    expect(out).toMatch(
      /^https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:activity:999\/\?commentUrn=/,
    );
  });

  it('returns null when nothing is resolvable', () => {
    expect(buildCommentPermalink(null, null)).toBeNull();
  });
});
