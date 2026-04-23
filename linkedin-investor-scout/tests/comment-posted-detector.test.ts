import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMMENT_POST_WINDOW_MS,
  decideCommentVerdict,
  type CommentDetectorEvent,
} from '@/shared/comment-posted-detector';

const T0 = 1_800_000_000_000;

describe('decideCommentVerdict', () => {
  it('returns pending when nothing has been observed', () => {
    expect(decideCommentVerdict([])).toBe('pending');
  });

  it('returns pending after submit with no confirmations yet', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
    ];
    expect(decideCommentVerdict(events)).toBe('pending');
  });

  it('returns posted when both composer_cleared and new_comment_appended land in window', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
      { kind: 'composer_cleared', t: T0 + 200 },
      { kind: 'new_comment_appended', t: T0 + 800 },
    ];
    expect(decideCommentVerdict(events)).toBe('posted');
  });

  it('returns unknown when only one confirmation lands before timeout', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
      { kind: 'composer_cleared', t: T0 + 500 },
      { kind: 'timeout', t: T0 + 60_000 },
    ];
    expect(decideCommentVerdict(events)).toBe('unknown');
  });

  it('returns canceled when timeout fires with no submit ever observed', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'timeout', t: T0 + 60_000 },
    ];
    expect(decideCommentVerdict(events)).toBe('canceled');
  });

  it('returns unknown when an error toast fires after submit', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
      { kind: 'error_toast', t: T0 + 300 },
    ];
    expect(decideCommentVerdict(events)).toBe('unknown');
  });

  it('ignores confirmation signals that arrive before submit_clicked', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'composer_cleared', t: T0 },
      { kind: 'new_comment_appended', t: T0 + 100 },
      { kind: 'submit_clicked', t: T0 + 200 },
      { kind: 'timeout', t: T0 + 60_000 },
    ];
    // Pre-submit confirmations are ignored — verdict is `unknown` because
    // no post-submit signals landed inside the window.
    expect(decideCommentVerdict(events)).toBe('unknown');
  });

  it('ignores confirmations that arrive outside the post window', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
      { kind: 'composer_cleared', t: T0 + DEFAULT_COMMENT_POST_WINDOW_MS + 1 },
      { kind: 'new_comment_appended', t: T0 + DEFAULT_COMMENT_POST_WINDOW_MS + 500 },
      { kind: 'timeout', t: T0 + 60_000 },
    ];
    expect(decideCommentVerdict(events)).toBe('unknown');
  });

  it('honors a custom window override', () => {
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
      { kind: 'composer_cleared', t: T0 + 1_500 },
      { kind: 'new_comment_appended', t: T0 + 1_800 },
    ];
    expect(decideCommentVerdict(events, 1_000)).toBe('pending');
    expect(decideCommentVerdict(events, 2_000)).toBe('posted');
  });

  it('finalizes incrementally as soon as 2 confirmations are in', () => {
    // No timeout — the early-exit path inside the loop should still land
    // `posted` once both signals cross the threshold.
    const events: CommentDetectorEvent[] = [
      { kind: 'submit_clicked', t: T0 },
      { kind: 'composer_cleared', t: T0 + 100 },
      { kind: 'new_comment_appended', t: T0 + 200 },
    ];
    expect(decideCommentVerdict(events)).toBe('posted');
  });
});
