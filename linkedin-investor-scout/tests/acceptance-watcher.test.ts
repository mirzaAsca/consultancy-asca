import { describe, expect, it } from 'vitest';
import { detectAcceptanceOnLevelChange } from '@/shared/acceptance-watcher';
import type {
  OutreachAction,
  OutreachActionKind,
  OutreachActionState,
  ProspectLifecycleStatus,
} from '@/shared/types';

const NOW = 1_800_000_000_000;

function makeAction(over: Partial<OutreachAction>): OutreachAction {
  return {
    id: over.id ?? 1,
    prospect_id: over.prospect_id ?? 1,
    kind: over.kind ?? ('connection_request_sent' as OutreachActionKind),
    state: over.state ?? ('sent' as OutreachActionState),
    idempotency_key: over.idempotency_key ?? `k-${over.id ?? 1}`,
    template_id: null,
    template_version: null,
    rendered_body: null,
    source_feed_event_id: null,
    created_at: over.created_at ?? NOW,
    approved_at: over.approved_at ?? null,
    sent_at: over.sent_at ?? null,
    resolved_at: over.resolved_at ?? null,
    notes: null,
  };
}

const baseLifecycle: ProspectLifecycleStatus = 'request_sent';

describe('detectAcceptanceOnLevelChange', () => {
  it('2nd → 1st with a live sent invite: credits the invite and returns connected lifecycle', () => {
    const sent = makeAction({ id: 10, state: 'sent', sent_at: NOW - 3600 });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [sent],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(true);
    expect(out.invite_to_accept?.id).toBe(10);
    expect(out.next_lifecycle_status).toBe('connected');
  });

  it('3rd → 1st with a live invite: also counts (LinkedIn can surface 1st after any pre-connected state)', () => {
    const sent = makeAction({ state: 'sent', sent_at: NOW });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '3rd',
      newLevel: '1st',
      history: [sent],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(true);
    expect(out.invite_to_accept).not.toBeNull();
  });

  it('3rd → 1st with a live invite (covers former OOO bucket post-collapse): counts', () => {
    const sent = makeAction({ state: 'sent', sent_at: NOW });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '3rd',
      newLevel: '1st',
      history: [sent],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(true);
    expect(out.invite_to_accept).not.toBeNull();
  });

  it('NONE → 1st (first scan): no invite to credit, but still flips lifecycle', () => {
    const out = detectAcceptanceOnLevelChange({
      oldLevel: 'NONE',
      newLevel: '1st',
      history: [],
      currentLifecycleStatus: 'new',
    });
    expect(out.accepted).toBe(false);
    expect(out.invite_to_accept).toBeNull();
    expect(out.next_lifecycle_status).toBe('connected');
  });

  it('2nd → 3rd (downgrade): no-op', () => {
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '3rd',
      history: [makeAction({ state: 'sent' })],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(false);
    expect(out.next_lifecycle_status).toBeNull();
  });

  it('same level: no-op', () => {
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '1st',
      newLevel: '1st',
      history: [],
      currentLifecycleStatus: 'connected',
    });
    expect(out.accepted).toBe(false);
    expect(out.next_lifecycle_status).toBeNull();
  });

  it('2nd → 1st with no live invite (organic accept): accepted=false but lifecycle flips', () => {
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(true);
    expect(out.invite_to_accept).toBeNull();
    expect(out.next_lifecycle_status).toBe('connected');
  });

  it('2nd → 1st with only a resolved (declined) prior invite: ignored — no live row to credit', () => {
    const declined = makeAction({
      state: 'declined',
      resolved_at: NOW - 1_000_000,
    });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [declined],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(true);
    expect(out.invite_to_accept).toBeNull();
  });

  it('multiple live invites: picks the most recent by sent_at', () => {
    const older = makeAction({ id: 1, state: 'sent', sent_at: NOW - 10_000 });
    const newer = makeAction({ id: 2, state: 'sent', sent_at: NOW - 100 });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [older, newer],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.invite_to_accept?.id).toBe(2);
  });

  it('live invite in `approved` state counts (detector miss fallback)', () => {
    const approved = makeAction({
      id: 5,
      state: 'approved',
      approved_at: NOW - 500,
      sent_at: null,
    });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [approved],
      currentLifecycleStatus: baseLifecycle,
    });
    expect(out.accepted).toBe(true);
    expect(out.invite_to_accept?.id).toBe(5);
  });

  it('do_not_contact prospects do not flip lifecycle even on acceptance', () => {
    const sent = makeAction({ state: 'sent' });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [sent],
      currentLifecycleStatus: 'do_not_contact',
    });
    // We still credit the invite for bookkeeping but leave the lifecycle alone.
    expect(out.invite_to_accept).not.toBeNull();
    expect(out.next_lifecycle_status).toBeNull();
  });

  it('non-connection_request_sent live actions are ignored (message_sent, profile_visit)', () => {
    const msg = makeAction({
      state: 'sent',
      kind: 'message_sent' as OutreachActionKind,
    });
    const visit = makeAction({
      state: 'sent',
      kind: 'profile_visit' as OutreachActionKind,
    });
    const out = detectAcceptanceOnLevelChange({
      oldLevel: '2nd',
      newLevel: '1st',
      history: [msg, visit],
      currentLifecycleStatus: baseLifecycle,
    });
    // Still flips lifecycle (level says connected) but no invite credit.
    expect(out.invite_to_accept).toBeNull();
    expect(out.next_lifecycle_status).toBe('connected');
  });
});
