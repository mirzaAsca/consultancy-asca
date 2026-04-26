import { describe, expect, it } from 'vitest';
import { nextLifecycleAfterOutreachSent } from '@/shared/lifecycle';
import type {
  OutreachActionKind,
  ProspectLifecycleStatus,
} from '@/shared/types';

describe('nextLifecycleAfterOutreachSent', () => {
  describe('do_not_contact is sacred', () => {
    const kinds: OutreachActionKind[] = [
      'profile_visit',
      'connection_request_sent',
      'message_sent',
      'followup_message_sent',
    ];
    for (const kind of kinds) {
      it(`returns null for do_not_contact + ${kind}`, () => {
        expect(
          nextLifecycleAfterOutreachSent({
            currentStatus: 'do_not_contact',
            kind,
          }),
        ).toBeNull();
      });
    }
  });

  describe('profile_visit', () => {
    it('advances new → ready_for_connect', () => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: 'new',
          kind: 'profile_visit',
        }),
      ).toBe('ready_for_connect');
    });

    it('advances ready_for_visit → ready_for_connect', () => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: 'ready_for_visit',
          kind: 'profile_visit',
        }),
      ).toBe('ready_for_connect');
    });

    it.each<ProspectLifecycleStatus>([
      'ready_for_connect',
      'request_sent',
      'connected',
      'followup_due',
    ])('does not regress from %s', (status) => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: status,
          kind: 'profile_visit',
        }),
      ).toBeNull();
    });
  });

  describe('connection_request_sent', () => {
    it.each<ProspectLifecycleStatus>([
      'new',
      'ready_for_visit',
      'ready_for_connect',
    ])('advances %s → request_sent', (status) => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: status,
          kind: 'connection_request_sent',
        }),
      ).toBe('request_sent');
    });

    it.each<ProspectLifecycleStatus>([
      'request_sent',
      'connected',
      'followup_due',
    ])('does not regress from %s', (status) => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: status,
          kind: 'connection_request_sent',
        }),
      ).toBeNull();
    });
  });

  describe('message_sent / followup_message_sent', () => {
    it.each<ProspectLifecycleStatus>([
      'new',
      'ready_for_visit',
      'ready_for_connect',
      'request_sent',
      'connected',
      'followup_due',
    ])('returns null from %s for message_sent', (status) => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: status,
          kind: 'message_sent',
        }),
      ).toBeNull();
    });

    it.each<ProspectLifecycleStatus>([
      'new',
      'connected',
      'followup_due',
    ])('returns null from %s for followup_message_sent', (status) => {
      expect(
        nextLifecycleAfterOutreachSent({
          currentStatus: status,
          kind: 'followup_message_sent',
        }),
      ).toBeNull();
    });
  });
});
