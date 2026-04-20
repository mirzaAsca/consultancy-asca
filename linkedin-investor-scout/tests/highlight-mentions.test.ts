// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  inferAnchorKind,
  isCommenterAnchor,
  isPostAuthorAnchor,
} from '@/content/highlight-mentions';

function load(html: string): void {
  document.body.innerHTML = html;
}

function getAnchor(id: string): HTMLAnchorElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLAnchorElement)) {
    throw new Error(`Missing anchor #${id}`);
  }
  return el;
}

describe('mention reclassification', () => {
  it('treats an @-mention inside post body as mentions (not post_authors)', () => {
    load(`
      <div role="listitem" componentkey="expandedabcFeedType_MAIN_FEED_RELEVANCE">
        <div>
          <a id="author" href="https://www.linkedin.com/in/benjamin-plesser/">Benjamin Plesser</a>
        </div>
        <div>
          <p>
            <a id="mention" href="https://www.linkedin.com/in/lenny-rachitsky/">Lenny Rachitsky</a>
            offers kind comfort that you can AI reskill
          </p>
        </div>
      </div>
    `);

    expect(inferAnchorKind(getAnchor('author'))).toBe('post_authors');
    expect(inferAnchorKind(getAnchor('mention'))).toBe('mentions');
  });

  it('treats an @-mention inside a comment body as mentions (not commenters)', () => {
    load(`
      <div componentkey="replaceableComment_urn:li:comment:42">
        <a id="commenter" href="https://www.linkedin.com/in/a-commenter/">A Commenter</a>
        <p>
          nice work
          <a id="mention" href="https://www.linkedin.com/in/mentioned-person/">Mentioned Person</a>
        </p>
      </div>
    `);

    expect(inferAnchorKind(getAnchor('commenter'))).toBe('commenters');
    expect(inferAnchorKind(getAnchor('mention'))).toBe('mentions');
  });

  it('leaves social-proof reactors alone (no mention reclassification for likers)', () => {
    load(`
      <div role="listitem" componentkey="expandedFeedType_MAIN_FEED_RELEVANCE">
        <div>
          <p><a id="liker" href="https://www.linkedin.com/in/someone/">Someone</a> likes this</p>
        </div>
        <div><a id="author" href="https://www.linkedin.com/in/og/">OG</a></div>
      </div>
    `);

    expect(inferAnchorKind(getAnchor('liker'))).toBe('reactors');
    expect(inferAnchorKind(getAnchor('author'))).toBe('post_authors');
  });

  it('returns unknown for anchors with no known container', () => {
    load(`<a id="lonely" href="https://www.linkedin.com/in/lonely/">Lonely</a>`);
    expect(inferAnchorKind(getAnchor('lonely'))).toBe('unknown');
  });

  it('isPostAuthorAnchor rejects mentions in <p>, accepts header anchor', () => {
    load(`
      <div id="card">
        <div><a id="author" href="https://www.linkedin.com/in/alice/">Alice</a></div>
        <p><a id="mention" href="https://www.linkedin.com/in/bob/">Bob</a></p>
      </div>
    `);
    const card = document.getElementById('card') as HTMLElement;
    expect(isPostAuthorAnchor(getAnchor('author'), card)).toBe(true);
    expect(isPostAuthorAnchor(getAnchor('mention'), card)).toBe(false);
  });

  it('isCommenterAnchor matches only the first /in/ anchor in the row', () => {
    load(`
      <div id="row">
        <a id="commenter" href="https://www.linkedin.com/in/commenter/">Commenter</a>
        <a id="mention" href="https://www.linkedin.com/in/mention/">Mention</a>
      </div>
    `);
    const row = document.getElementById('row') as HTMLElement;
    expect(isCommenterAnchor(getAnchor('commenter'), row)).toBe(true);
    expect(isCommenterAnchor(getAnchor('mention'), row)).toBe(false);
  });
});
