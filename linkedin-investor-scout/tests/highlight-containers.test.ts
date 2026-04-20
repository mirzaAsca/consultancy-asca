// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { findHighlightContainer } from '@/content/highlight-containers';

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

describe('highlight container matching', () => {
  it('classifies modern feed cards as post_authors', () => {
    load(`
      <div role="listitem" componentkey="expandedabcFeedType_MAIN_FEED_RELEVANCE" id="card">
        <a id="author" href="https://www.linkedin.com/in/alice/">Alice</a>
      </div>
    `);

    const out = findHighlightContainer(getAnchor('author'));
    expect(out?.kind).toBe('post_authors');
    expect(out?.el.id).toBe('card');
  });

  it('classifies reposter header anchors via nearby "reposted this" copy', () => {
    load(`
      <div role="listitem" componentkey="expandedxyzFeedType_MAIN_FEED_RELEVANCE" id="card">
        <div>
          <p><a id="reposter" href="https://www.linkedin.com/in/repost-person/">Reposter</a> reposted this</p>
        </div>
        <div>
          <a id="author" href="https://www.linkedin.com/in/original-author/">Original Author</a>
        </div>
      </div>
    `);

    const reposter = findHighlightContainer(getAnchor('reposter'));
    const author = findHighlightContainer(getAnchor('author'));

    expect(reposter?.kind).toBe('reposters');
    expect(reposter?.el.id).toBe('card');
    expect(author?.kind).toBe('post_authors');
    expect(author?.el.id).toBe('card');
  });

  it('classifies modern replaceable comments as commenters', () => {
    load(`
      <div componentkey="replaceableComment_urn:li:comment:123" id="comment-row">
        <a id="commenter" href="https://www.linkedin.com/in/commenter/">Commenter</a>
      </div>
    `);

    const out = findHighlightContainer(getAnchor('commenter'));
    expect(out?.kind).toBe('commenters');
    expect(out?.el.id).toBe('comment-row');
  });

  it('classifies reactors in dialogs as reactors', () => {
    load(`
      <div role="dialog">
        <ul>
          <li id="reactor-row">
            <a id="reactor" href="https://www.linkedin.com/in/reactor/">Reactor</a>
          </li>
        </ul>
      </div>
    `);

    const out = findHighlightContainer(getAnchor('reactor'));
    expect(out?.kind).toBe('reactors');
    expect(out?.el.id).toBe('reactor-row');
  });

  it('classifies right-rail aside cards as suggested', () => {
    load(`
      <aside>
        <ul>
          <li id="suggested-row">
            <a id="suggested" href="https://www.linkedin.com/in/suggested/">Suggested</a>
          </li>
        </ul>
      </aside>
    `);

    const out = findHighlightContainer(getAnchor('suggested'));
    expect(out?.kind).toBe('suggested');
    expect(out?.el.id).toBe('suggested-row');
  });

  it('reclassifies a "likes this" social-proof anchor as reactors on a post card', () => {
    load(`
      <div role="listitem" componentkey="expandedxyzFeedType_MAIN_FEED_RELEVANCE" id="card">
        <div>
          <p><a id="liker" href="https://www.linkedin.com/in/lucky-liker/">Lucky Liker</a> likes this</p>
        </div>
        <div>
          <a id="author" href="https://www.linkedin.com/in/original-author/">Original Author</a>
        </div>
      </div>
    `);

    const liker = findHighlightContainer(getAnchor('liker'));
    const author = findHighlightContainer(getAnchor('author'));
    expect(liker?.kind).toBe('reactors');
    expect(liker?.el.id).toBe('card');
    expect(author?.kind).toBe('post_authors');
  });

  it('reclassifies a bare "follow this Page" social-proof anchor as reposters', () => {
    load(`
      <div role="listitem" componentkey="expandedxyzFeedType_MAIN_FEED_RELEVANCE" id="card">
        <div>
          <p><a id="follower" href="https://www.linkedin.com/in/ad-follower/">Ad Follower</a> and someone else follow this Page</p>
        </div>
        <div><span>Promoted</span></div>
      </div>
    `);

    const follower = findHighlightContainer(getAnchor('follower'));
    expect(follower?.kind).toBe('reposters');
  });

  it('returns null when no known container exists', () => {
    load(`<a id="lonely" href="https://www.linkedin.com/in/lonely/">Lonely</a>`);
    const out = findHighlightContainer(getAnchor('lonely'));
    expect(out).toBeNull();
  });
});

