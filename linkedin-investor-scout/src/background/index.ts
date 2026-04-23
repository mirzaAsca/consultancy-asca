import {
  buildProspectInsertsFromCanonicalUrls,
  prospectsToCsv,
} from '@/shared/csv';
import {
  addInteractionEvent,
  addMessageTemplate,
  addOutreachAction,
  appendActivityLog,
  consumeCorrelationToken,
  gcExpiredCorrelationTokens,
  listCorrelationTokensForProspect,
  listInteractionEvents,
  putCorrelationToken,
  bulkDeleteProspects,
  bulkRescanProspects,
  bulkSetActivity,
  bulkUpdateFeedEventTaskStatus,
  clearAllData,
  countAcceptedActionsForDay,
  countFeedEventsByTaskStatus,
  countPendingInvites,
  getActivityLogForProspect,
  getAllFeedEvents,
  getAllOutreachActions,
  getAllOutreachActionsByProspect,
  getAllProspects,
  getDailyUsage,
  getDailyUsageRange,
  getLastHealthBreachAt,
  getLiveConnectionRequestForProspect,
  getOutreachActionByIdempotencyKey,
  getProspectById,
  getProspectStats,
  getScanState,
  getSettings,
  getSkippedProspectIdsForDay,
  getSlugMap,
  getWeeklyInvitesUsed,
  incrementDailyUsage,
  listAcceptsSince,
  listFeedEventsForProspect,
  listInvitesSince,
  listMessageTemplates,
  listSafetyEventsSince,
  openScoutDb,
  OUTREACH_SKIP_EVENTS,
  putSettings,
  queryActivityLog,
  queryFeedEvents,
  queryProspects,
  replaceAllProspects,
  updateFeedEventTaskStatus,
  updateMessageTemplate,
  updateOutreachAction,
  updateProspect,
  updateProspectFromPatch,
  upsertFeedEventsBulk,
} from '@/shared/db';
import { CORRELATION_TOKEN_DEFAULT_WINDOW_MS } from '@/shared/constants';
import {
  buildInteractionFingerprint,
  computeReconciliationStatus,
  generateCorrelationTokenId,
  pickMatchingToken,
} from '@/shared/reconciliation';
import { computeAnalyticsSnapshot } from '@/shared/analytics';
import { computeHealthSnapshot } from '@/shared/health';
import {
  buildCandidates,
  buildIdempotencyKey,
  pickNextBest,
} from '@/shared/outreach-queue';
import {
  recomputeAllProspects,
  recomputeProspectsByIds,
} from '@/shared/prospect-scoring';
import { localDayBucket } from '@/shared/time';
import { broadcast, registerMessageRouter } from '@/shared/messaging';
import type {
  CorrelationToken,
  CsvCommitPayload,
  FeedCrawlSessionResult,
  FeedCrawlStatus,
  InteractionEvent,
  InteractionEventInsert,
  InteractionListQuery,
  InteractionTokenOpenPayload,
  InteractionType,
  LinkedInRestrictionBannerPayload,
  LinkedInRestrictionBannerResult,
  Message,
  MessageResponse,
  MessageResponseMap,
  MessageTemplate,
  OutreachAction,
  OutreachActionRecordPayload,
  OutreachPrefillConnectPayload,
  OutreachPrefillResult,
  OutreachQueueFilter,
  OutreachQueuePage,
  OutreachWithdrawDetectedPayload,
  OutreachWithdrawResult,
  CommentPostedDetectedPayload,
  CommentPostedDetectedResult,
  ReactionToggledDetectedPayload,
  ReactionToggledDetectedResult,
  ProspectQuery,
  Settings,
  TemplateUpsertPayload,
} from '@/shared/types';
import {
  pauseScan,
  resumeScan,
  runScanLoop,
  startScan,
  triggerHealthBreach,
} from './scan-worker';
import { registerLifecycleHooks, registerScanAlarms } from './startup';
import {
  FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS,
  FEED_TEST_MAX_PROFILES,
  buildFeedTestRows,
  canCoverAllFeedTestLevels,
  isLinkedInFeedTabUrl,
} from './feed-test';

async function getActiveTabInFocusedWindow(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab ?? null;
}

function sendMessageToTab<M extends Message>(
  tabId: number,
  msg: M,
): Promise<MessageResponse<MessageResponseMap[M['type']]>> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({ ok: false, error: lastError.message ?? 'tab message failed' });
          return;
        }
        if (!response) {
          resolve({ ok: false, error: 'no response from feed tab' });
          return;
        }
        resolve(response as MessageResponse<MessageResponseMap[M['type']]>);
      });
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : 'tab message failed',
      });
    }
  });
}

async function handleFeedTestSeedRandomLevels(): Promise<
  MessageResponse<{ seeded: number; collected: number; tab_id: number }>
> {
  const tab = await getActiveTabInFocusedWindow();
  if (!tab || typeof tab.id !== 'number' || !tab.url) {
    return {
      ok: false,
      error: 'Open a LinkedIn feed tab, then run Test Feed Labels (Random).',
    };
  }
  if (!isLinkedInFeedTabUrl(tab.url)) {
    return {
      ok: false,
      error: 'Active tab must be https://www.linkedin.com/feed/.',
    };
  }

  const collect = await sendMessageToTab(tab.id, {
    type: 'FEED_TEST_COLLECT_VISIBLE_PROFILES',
    payload: { max_profiles: FEED_TEST_MAX_PROFILES },
  });
  if (!collect.ok) {
    return {
      ok: false,
      error: `Could not read visible feed profiles: ${collect.error}`,
    };
  }

  const rows = buildFeedTestRows(collect.data.profiles ?? []);
  if (rows.length === 0) {
    return {
      ok: false,
      error: 'No visible /in/ profiles found on this feed view.',
    };
  }
  if (!canCoverAllFeedTestLevels(rows.length)) {
    return {
      ok: false,
      error: `Need at least ${FEED_TEST_MIN_PROFILES_FOR_ALL_LEVELS} unique /in/ profiles rendered on the page to seed all four levels. Scroll the feed (or expand a reactor/comment modal) so more profiles mount into the DOM, then try again.`,
    };
  }

  const scanState = await getScanState();
  if (scanState.status === 'running') {
    return {
      ok: false,
      error: 'Pause the active scan before running Test Feed Labels (Random).',
    };
  }

  await replaceAllProspects(rows);
  const ts = Date.now();
  await appendActivityLog({
    ts,
    level: 'info',
    event: 'feed_test_seeded_random_levels',
    prospect_id: null,
    data: {
      tab_id: tab.id,
      tab_url: tab.url,
      collected: collect.data.profiles.length,
      seeded: rows.length,
      truncated: collect.data.truncated,
      max_profiles: FEED_TEST_MAX_PROFILES,
    },
  });

  broadcast({
    type: 'PROSPECTS_UPDATED',
    payload: { changed_ids: [] },
  });

  return {
    ok: true,
    data: {
      seeded: rows.length,
      collected: collect.data.profiles.length,
      tab_id: tab.id,
    },
  };
}

async function handleCsvCommit(
  payload: CsvCommitPayload,
): Promise<MessageResponse<{ inserted: number }>> {
  const urls = Array.isArray(payload?.urls) ? payload.urls : [];
  const filename = payload?.filename ?? 'unknown.csv';
  const invalidCount = Math.max(0, Number(payload?.invalid_count ?? 0));
  const invalidSamples = Array.isArray(payload?.invalid_samples)
    ? payload.invalid_samples
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0)
        .slice(0, 5)
    : [];
  if (urls.length === 0) {
    return { ok: false, error: 'No URLs to import' };
  }

  const rows = buildProspectInsertsFromCanonicalUrls(urls);
  await replaceAllProspects(rows);

  const ts = Date.now();
  await appendActivityLog({
    ts,
    level: 'info',
    event: 'csv_imported',
    prospect_id: null,
    data: {
      filename,
      inserted: rows.length,
      received: urls.length,
      invalid: invalidCount,
    },
  });

  if (invalidCount > 0) {
    await appendActivityLog({
      ts,
      level: 'warn',
      event: 'csv_invalid_rows',
      prospect_id: null,
      data: {
        filename,
        invalid: invalidCount,
        sample_count: invalidSamples.length,
      },
    });
    for (const raw of invalidSamples) {
      await appendActivityLog({
        ts,
        level: 'warn',
        event: 'csv_invalid_row',
        prospect_id: null,
        data: { filename, raw },
      });
    }
  }

  console.info('[investor-scout] CSV imported', {
    filename,
    inserted: rows.length,
    timestamp: new Date(ts).toISOString(),
  });

  broadcast({
    type: 'PROSPECTS_UPDATED',
    // Full-list replacement — use empty array as "refresh all" sentinel.
    payload: { changed_ids: [] },
  });

  return { ok: true, data: { inserted: rows.length } };
}

// ——— Engagement Tasks badge (Phase 2.3) ———
// Shows count of `feed_events.task_status = 'new'` on the chrome.action icon.
// Debounced to at most one refresh per 2s per EXTENSION_GROWTH_TODO §2.3.
const BADGE_DEBOUNCE_MS = 2000;
const BADGE_BG_COLOR = '#3b82f6'; // matches 2nd-degree blue — highest-value level
let badgeRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let badgePending = false;

function formatBadgeText(count: number): string {
  if (count <= 0) return '';
  if (count > 999) return '999+';
  return String(count);
}

async function applyBadge(): Promise<void> {
  try {
    const count = await countFeedEventsByTaskStatus('new');
    const text = formatBadgeText(count);
    const action = chrome.action;
    if (!action?.setBadgeText) return;
    await action.setBadgeText({ text });
    if (text && action.setBadgeBackgroundColor) {
      await action.setBadgeBackgroundColor({ color: BADGE_BG_COLOR });
    }
    broadcast({ type: 'FEED_EVENTS_UPDATED', payload: { new_count: count } });
  } catch (error) {
    console.warn('[investor-scout] badge refresh failed', {
      error: error instanceof Error ? error.message : error,
    });
  }
}

/**
 * Schedule a badge refresh, coalescing multiple calls into at-most one refresh
 * every {@link BADGE_DEBOUNCE_MS}. The first call fires immediately, subsequent
 * calls within the window set a trailing flag so a single follow-up runs after
 * the window closes (standard throttle-with-trailing-edge).
 */
function scheduleBadgeRefresh(): void {
  if (badgeRefreshTimer) {
    badgePending = true;
    return;
  }
  void applyBadge();
  badgeRefreshTimer = setTimeout(() => {
    badgeRefreshTimer = null;
    if (badgePending) {
      badgePending = false;
      scheduleBadgeRefresh();
    }
  }, BADGE_DEBOUNCE_MS);
}

async function broadcastProspectsUpdated(changedIds: number[]): Promise<void> {
  const normalized = Array.from(
    new Set(changedIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  broadcast({
    type: 'PROSPECTS_UPDATED',
    payload: { changed_ids: normalized },
  });
}

/**
 * Does the patch touch any scoring-relevant outreach settings (keyword list,
 * firm list, or tier thresholds)? Used to decide whether `SETTINGS_UPDATE`
 * should trigger a full prospect rescore.
 */
function outreachScoringChanged(prev: Settings, next: Settings): boolean {
  return (
    JSON.stringify(prev.outreach.keywords) !==
      JSON.stringify(next.outreach.keywords) ||
    JSON.stringify(prev.outreach.firms) !==
      JSON.stringify(next.outreach.firms) ||
    JSON.stringify(prev.outreach.tier_thresholds) !==
      JSON.stringify(next.outreach.tier_thresholds)
  );
}

/**
 * Upsert a message template. With `id` — updates `name`/`body`/`archived` on
 * the existing row. Without — adds a new row and auto-assigns the next
 * version number for the given `kind`.
 */
async function handleTemplateUpsert(
  payload: TemplateUpsertPayload,
): Promise<MessageTemplate> {
  const now = Date.now();
  if (typeof payload.id === 'number') {
    const patch: Partial<Omit<MessageTemplate, 'id' | 'kind'>> = {
      body: payload.body,
    };
    if (typeof payload.name === 'string') patch.name = payload.name;
    if (typeof payload.archived === 'boolean') patch.archived = payload.archived;
    const next = await updateMessageTemplate(payload.id, patch);
    await appendActivityLog({
      ts: now,
      level: 'info',
      event: 'template_updated',
      prospect_id: null,
      data: { id: next.id, kind: next.kind, version: next.version },
    });
    return next;
  }
  const existing = await listMessageTemplates(payload.kind);
  const maxVersion = existing.reduce(
    (acc, t) => (t.version > acc ? t.version : acc),
    0,
  );
  const version = maxVersion + 1;
  const insertName =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : `${payload.kind} v${version}`;
  const id = await addMessageTemplate({
    kind: payload.kind,
    version,
    name: insertName,
    body: payload.body,
    archived: payload.archived ?? false,
    created_at: now,
    updated_at: now,
  });
  await appendActivityLog({
    ts: now,
    level: 'info',
    event: 'template_created',
    prospect_id: null,
    data: { id, kind: payload.kind, version },
  });
  return {
    id,
    kind: payload.kind,
    version,
    name: insertName,
    body: payload.body,
    archived: payload.archived ?? false,
    created_at: now,
    updated_at: now,
  };
}

// ——— Outreach Queue (Phase 1.3) ———

/**
 * Build the Outreach Queue snapshot: sorted candidates + today's budget
 * snapshot + the top-of-queue "Next Best Target" that still fits the caps.
 */
async function handleOutreachQueueQuery(
  filter: OutreachQueueFilter,
): Promise<OutreachQueuePage> {
  const now = Date.now();
  const bucket = localDayBucket(now);
  const [prospects, actionsByProspect, settings, usage, skipSet, weeklyInvites] =
    await Promise.all([
      getAllProspects(),
      getAllOutreachActionsByProspect(),
      getSettings(),
      getDailyUsage(bucket),
      getSkippedProspectIdsForDay(bucket),
      getWeeklyInvitesUsed(bucket),
    ]);

  const rows = buildCandidates(prospects, actionsByProspect, {
    filter,
    skippedProspectIds: skipSet,
    warm_visit_before_invite: settings.outreach.warm_visit_before_invite,
    now,
  });

  const limit = Math.max(1, filter.limit ?? 200);
  const page = rows.slice(0, limit);
  const nextBest = pickNextBest(rows, settings.outreach.caps, usage, weeklyInvites);

  return {
    rows: page,
    total: rows.length,
    caps: settings.outreach.caps,
    usage,
    day_bucket: bucket,
    next_best: nextBest,
  };
}

/**
 * Record an outreach_action. Idempotent against same-day duplicates via
 * `{prospect_id}:{kind}:{day_bucket}` key unless the caller overrides.
 * Bumps `daily_usage` + `prospect.last_outreach_at` on transition to `sent`.
 */
async function handleOutreachActionRecord(
  payload: OutreachActionRecordPayload,
): Promise<OutreachAction> {
  const now = Date.now();
  const bucket = localDayBucket(now);
  const key =
    payload.idempotency_key ??
    buildIdempotencyKey(payload.prospect_id, payload.kind, bucket);

  const existing = await getOutreachActionByIdempotencyKey(key);
  let action: OutreachAction;
  if (existing) {
    const wasSent = existing.state === 'sent';
    action = await updateOutreachAction(existing.id, {
      state: payload.state,
      template_id: payload.template_id ?? existing.template_id,
      template_version: payload.template_version ?? existing.template_version,
      rendered_body: payload.rendered_body ?? existing.rendered_body,
      source_feed_event_id:
        payload.source_feed_event_id ?? existing.source_feed_event_id,
      notes: payload.notes ?? existing.notes,
      approved_at:
        payload.state === 'approved' && existing.approved_at === null
          ? now
          : existing.approved_at,
      sent_at:
        payload.state === 'sent' && existing.sent_at === null
          ? now
          : existing.sent_at,
      resolved_at:
        payload.state === 'accepted' ||
        payload.state === 'declined' ||
        payload.state === 'expired' ||
        payload.state === 'withdrawn'
          ? now
          : existing.resolved_at,
    });
    if (!wasSent && action.state === 'sent') {
      await bumpDailyUsageForKind(bucket, action.kind);
      await stampProspectLastOutreachAt(action.prospect_id, now);
    }
  } else {
    const id = await addOutreachAction({
      prospect_id: payload.prospect_id,
      kind: payload.kind,
      state: payload.state,
      idempotency_key: key,
      template_id: payload.template_id ?? null,
      template_version: payload.template_version ?? null,
      rendered_body: payload.rendered_body ?? null,
      source_feed_event_id: payload.source_feed_event_id ?? null,
      created_at: now,
      approved_at:
        payload.state === 'approved' || payload.state === 'sent' ? now : null,
      sent_at: payload.state === 'sent' ? now : null,
      resolved_at:
        payload.state === 'accepted' ||
        payload.state === 'declined' ||
        payload.state === 'expired' ||
        payload.state === 'withdrawn'
          ? now
          : null,
      notes: payload.notes ?? null,
    });
    action = {
      id,
      prospect_id: payload.prospect_id,
      kind: payload.kind,
      state: payload.state,
      idempotency_key: key,
      template_id: payload.template_id ?? null,
      template_version: payload.template_version ?? null,
      rendered_body: payload.rendered_body ?? null,
      source_feed_event_id: payload.source_feed_event_id ?? null,
      created_at: now,
      approved_at:
        payload.state === 'approved' || payload.state === 'sent' ? now : null,
      sent_at: payload.state === 'sent' ? now : null,
      resolved_at: null,
      notes: payload.notes ?? null,
    };
    if (action.state === 'sent') {
      await bumpDailyUsageForKind(bucket, action.kind);
      await stampProspectLastOutreachAt(action.prospect_id, now);
    }
  }

  await appendActivityLog({
    ts: now,
    level: 'info',
    event: 'outreach_action_recorded',
    prospect_id: action.prospect_id,
    data: {
      kind: action.kind,
      state: action.state,
      idempotency_key: action.idempotency_key,
      template_id: action.template_id,
    },
  });
  // Phase 1.2 recompute trigger: outreach action completion refreshes the
  // cooldown penalty (`last_outreach_at` just moved) so score/tier stay
  // current. Failure here must not fail the action write.
  try {
    await recomputeProspectsByIds([action.prospect_id]);
  } catch (error) {
    console.warn('[investor-scout] recompute after outreach action failed', {
      prospectId: action.prospect_id,
      error: error instanceof Error ? error.message : error,
    });
  }
  void broadcastProspectsUpdated([action.prospect_id]);
  return action;
}

async function bumpDailyUsageForKind(
  bucket: string,
  kind: OutreachAction['kind'],
): Promise<void> {
  switch (kind) {
    case 'profile_visit':
      await incrementDailyUsage(bucket, { visits: 1 });
      return;
    case 'connection_request_sent':
      await incrementDailyUsage(bucket, {
        invites_sent: 1,
        // Shared bucket: an invite also consumes a visit slot. Settings is
        // the source of truth, but the default is `shared_bucket: true` — we
        // bump visits unconditionally and let the cap enforcement on read
        // sort it out if the user toggles shared off.
        visits: 1,
      });
      return;
    case 'message_sent':
      await incrementDailyUsage(bucket, { messages_sent: 1 });
      return;
    case 'followup_message_sent':
      await incrementDailyUsage(bucket, { followups_sent: 1, messages_sent: 1 });
      return;
  }
}

async function stampProspectLastOutreachAt(
  prospectId: number,
  ts: number,
): Promise<void> {
  try {
    await updateProspect(prospectId, { last_outreach_at: ts });
  } catch (error) {
    console.warn('[investor-scout] last_outreach_at stamp failed', {
      prospect_id: prospectId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

async function handleOutreachSkipToday(
  prospectId: number,
  skip: boolean,
): Promise<{ prospect_id: number; skipped: boolean }> {
  const now = Date.now();
  const bucket = localDayBucket(now);
  await appendActivityLog({
    ts: now,
    level: 'info',
    event: skip ? OUTREACH_SKIP_EVENTS.skip : OUTREACH_SKIP_EVENTS.unskip,
    prospect_id: prospectId,
    data: { day_bucket: bucket },
  });
  return { prospect_id: prospectId, skipped: skip };
}

/**
 * Phase 5.6 — a content-detected invite withdrawal lands here. Resolve the
 * most recent live `connection_request_sent` for the prospect, flip it to
 * `withdrawn`, and credit the budget back against the day the invite was
 * originally sent (so weekly totals stay accurate). Idempotent against
 * double-fires from the content observer — a row already in `withdrawn`
 * short-circuits.
 */
async function handleOutreachWithdrawDetected(
  payload: OutreachWithdrawDetectedPayload,
): Promise<OutreachWithdrawResult> {
  const live = await getLiveConnectionRequestForProspect(payload.prospect_id);
  if (!live) {
    await appendActivityLog({
      ts: Date.now(),
      level: 'warn',
      event: 'outreach_withdraw_unmatched',
      prospect_id: payload.prospect_id,
      data: { slug: payload.slug, withdrawn_at: payload.withdrawn_at },
    });
    return { matched: false, action_id: null, credited_day_bucket: null };
  }
  // Only `sent` rows consumed budget; earlier states never bumped daily_usage,
  // so we don't credit for them.
  const creditBucket =
    live.state === 'sent' && live.sent_at !== null
      ? localDayBucket(live.sent_at)
      : null;

  const now = Date.now();
  await updateOutreachAction(live.id, {
    state: 'withdrawn',
    resolved_at: now,
  });
  if (creditBucket) {
    // Shared bucket: an invite also consumed a visit slot. Mirror the
    // bump path in `bumpDailyUsageForKind` so the credit matches exactly.
    await incrementDailyUsage(creditBucket, {
      invites_sent: -1,
      visits: -1,
    });
  }
  await appendActivityLog({
    ts: now,
    level: 'info',
    event: 'outreach_withdrawn',
    prospect_id: payload.prospect_id,
    data: {
      action_id: live.id,
      slug: payload.slug,
      sent_at: live.sent_at,
      credited_day_bucket: creditBucket,
    },
  });
  try {
    await recordInteractionAndReconcile({
      prospect_id: payload.prospect_id,
      interaction_type: 'invite_withdrawn',
      activity_urn: null,
      target_url: null,
      detected_at: now,
      data: { action_id: live.id, sent_at: live.sent_at },
    });
  } catch (error) {
    console.warn('[investor-scout] withdrawal reconcile failed', { error });
  }
  // Cooldown penalty (last_outreach_at) now refers to a withdrawn row — keep
  // `last_outreach_at` as-is so the user doesn't burn a fresh cooldown when
  // re-inviting. Scoring will treat the cooldown as active per §1.2.
  try {
    await recomputeProspectsByIds([payload.prospect_id]);
  } catch (error) {
    console.warn('[investor-scout] recompute after withdrawal failed', {
      prospect_id: payload.prospect_id,
      error: error instanceof Error ? error.message : error,
    });
  }
  void broadcastProspectsUpdated([payload.prospect_id]);
  return {
    matched: true,
    action_id: live.id,
    credited_day_bucket: creditBucket,
  };
}

/**
 * Phase 4.3 / 5.3 — content script saw a LinkedIn restriction banner on the
 * current page. Trip the kill switch via the scan-worker helper; cooldown
 * gate in `resumeScan()` enforces the 24h recovery window.
 */
async function handleLinkedInRestrictionBanner(
  payload: LinkedInRestrictionBannerPayload,
): Promise<LinkedInRestrictionBannerResult> {
  await appendActivityLog({
    ts: Date.now(),
    level: 'warn',
    event: 'restriction_banner_seen',
    prospect_id: null,
    data: {
      kind: payload.kind,
      phrase: payload.phrase,
      page_url: payload.page_url,
    },
  });
  const state = await triggerHealthBreach(
    'restriction_banner',
    `${payload.kind}: ${payload.phrase}`,
  );
  const tripped =
    state.status === 'auto_paused' && state.auto_pause_reason === 'health_breach';
  return { tripped };
}

/**
 * Phase 5.4 — shared reconciliation path. Called by every detector handler
 * after it has resolved the prospect + (optionally) the activity URN. Writes
 * one interaction_events row, correlates it to the most recent live
 * correlation_token for this prospect + action (if any), consumes that
 * token, and returns whether the detection was auto-matched.
 */
async function recordInteractionAndReconcile(args: {
  prospect_id: number;
  interaction_type: InteractionType;
  activity_urn: string | null;
  target_url: string | null;
  detected_at: number;
  data?: Record<string, unknown>;
}): Promise<{
  interaction_id: number;
  matched: boolean;
  token: string | null;
  task_id: number | null;
}> {
  // GC first so a stale expired token can't falsely match.
  void gcExpiredCorrelationTokens(args.detected_at);
  const tokens = await listCorrelationTokensForProspect(args.prospect_id);
  const match = pickMatchingToken(
    tokens,
    args.prospect_id,
    args.interaction_type,
    args.detected_at,
  );
  const { status, confidence } = computeReconciliationStatus({
    tokenMatched: match !== null,
    urnResolved: args.activity_urn !== null,
  });
  const fingerprint = buildInteractionFingerprint({
    prospect_id: args.prospect_id,
    interaction_type: args.interaction_type,
    activity_urn: args.activity_urn,
    detected_at: args.detected_at,
  });
  const row: InteractionEventInsert = {
    prospect_id: args.prospect_id,
    interaction_type: args.interaction_type,
    fingerprint,
    activity_urn: args.activity_urn,
    target_url: args.target_url,
    detected_at: args.detected_at,
    confidence,
    reconciliation_status: status,
    source_task_id: match?.task_id ?? null,
    source_token: match?.token ?? null,
    data: args.data ?? {},
  };
  const id = await addInteractionEvent(row);
  if (match) {
    await consumeCorrelationToken(match.token);
  }
  return {
    interaction_id: id,
    matched: match !== null,
    token: match?.token ?? null,
    task_id: match?.task_id ?? null,
  };
}

async function handleInteractionTokenOpen(
  payload: InteractionTokenOpenPayload,
): Promise<{ token: string; expires_at: number }> {
  const now = Date.now();
  void gcExpiredCorrelationTokens(now);
  const windowMs = Math.max(
    60_000,
    payload.window_ms ?? CORRELATION_TOKEN_DEFAULT_WINDOW_MS,
  );
  const token: CorrelationToken = {
    token: generateCorrelationTokenId(now),
    task_id: payload.task_id ?? null,
    prospect_id: payload.prospect_id,
    action_expected: payload.action_expected,
    opened_at: now,
    expires_at: now + windowMs,
    consumed: false,
  };
  await putCorrelationToken(token);
  await appendActivityLog({
    ts: now,
    level: 'info',
    event: 'inbox_token_opened',
    prospect_id: payload.prospect_id,
    data: {
      token: token.token,
      task_id: token.task_id,
      action_expected: token.action_expected,
      expires_at: token.expires_at,
    },
  });
  // Also write a low-confidence `opened_from_inbox` interaction row so the
  // audit trail records the click regardless of whether a detector ever
  // correlates against the token.
  const fingerprint = buildInteractionFingerprint({
    prospect_id: payload.prospect_id,
    interaction_type: 'opened_from_inbox',
    activity_urn: null,
    detected_at: now,
  });
  await addInteractionEvent({
    prospect_id: payload.prospect_id,
    interaction_type: 'opened_from_inbox',
    fingerprint,
    activity_urn: null,
    target_url: null,
    detected_at: now,
    confidence: 'medium',
    reconciliation_status: 'matched',
    source_task_id: payload.task_id ?? null,
    source_token: token.token,
    data: { action_expected: payload.action_expected },
  });
  return { token: token.token, expires_at: token.expires_at };
}

async function handleInteractionsList(
  query: InteractionListQuery,
): Promise<InteractionEvent[]> {
  return listInteractionEvents(query);
}

/**
 * Phase 5.3 — content script saw the user react to (or un-react from) a
 * feed post whose author/reposter is a tracked prospect. We log the
 * engagement and, when the reaction targets a post we already have in
 * `feed_events` for this prospect, promote its `task_status` from `new`
 * to `done`. The user has engaged with the signal, so it falls out of
 * the unread engagement inbox. Un-reacts within the same observation
 * window reverse the inbox state change.
 *
 * No daily_usage bump: reactions are zero-friction and don't count
 * against the invite/visit/message budget. No outreach_actions row
 * either — reactions aren't outreach.
 */
async function handleReactionToggledDetected(
  payload: ReactionToggledDetectedPayload,
): Promise<ReactionToggledDetectedResult> {
  const now = Date.now();
  await appendActivityLog({
    ts: now,
    level: 'info',
    event:
      payload.direction === 'reacted'
        ? 'reaction_given_to_prospect_post'
        : 'reaction_removed_from_prospect_post',
    prospect_id: payload.prospect_id,
    data: {
      slug: payload.slug,
      reaction_kind: payload.reaction_kind,
      activity_urn: payload.activity_urn,
      page_url: payload.page_url,
      detected_at: payload.detected_at,
    },
  });

  try {
    await recordInteractionAndReconcile({
      prospect_id: payload.prospect_id,
      interaction_type: payload.direction === 'reacted' ? 'reacted' : 'unreacted',
      activity_urn: payload.activity_urn,
      target_url: payload.page_url,
      detected_at: now,
      data: { reaction_kind: payload.reaction_kind },
    });
  } catch (error) {
    console.warn('[investor-scout] reaction reconcile failed', { error });
  }

  // Correlate the reaction to a feed_events row. Prefer an exact URN match
  // when available; otherwise match on the most recent `new` row for the
  // prospect so we still clear the inbox in the common case where the
  // card's activity URN couldn't be resolved client-side.
  const rows = await listFeedEventsForProspect(payload.prospect_id);
  let targets: number[] = [];
  if (payload.activity_urn) {
    targets = rows
      .filter((r) => r.activity_urn === payload.activity_urn)
      .map((r) => r.id);
  }
  if (targets.length === 0) {
    const newestNew = rows.find((r) => r.task_status === 'new');
    if (newestNew) targets = [newestNew.id];
  }

  const nextStatus = payload.direction === 'reacted' ? 'done' : 'new';
  const updated = await bulkUpdateFeedEventTaskStatus(targets, nextStatus);
  if (updated > 0) {
    scheduleBadgeRefresh();
  }

  return {
    matched: updated > 0,
    updated_feed_event_ids: targets.slice(0, updated),
  };
}

/**
 * Phase 5.3 — organic comment-posted detector handler. When the user
 * posts a comment on a tracked prospect's feed card, log the activity
 * and promote a matching `feed_events` row from `new` to `done`. Like
 * the reaction handler: no daily_usage bump (comments don't consume
 * budget), no outreach_actions row (comments aren't outreach).
 */
async function handleCommentPostedDetected(
  payload: CommentPostedDetectedPayload,
): Promise<CommentPostedDetectedResult> {
  const now = Date.now();
  await appendActivityLog({
    ts: now,
    level: 'info',
    event: 'comment_posted_to_prospect_post',
    prospect_id: payload.prospect_id,
    data: {
      slug: payload.slug,
      activity_urn: payload.activity_urn,
      page_url: payload.page_url,
      detected_at: payload.detected_at,
    },
  });

  try {
    await recordInteractionAndReconcile({
      prospect_id: payload.prospect_id,
      interaction_type: 'commented',
      activity_urn: payload.activity_urn,
      target_url: payload.page_url,
      detected_at: now,
    });
  } catch (error) {
    console.warn('[investor-scout] comment reconcile failed', { error });
  }

  const rows = await listFeedEventsForProspect(payload.prospect_id);
  let targets: number[] = [];
  if (payload.activity_urn) {
    targets = rows
      .filter((r) => r.activity_urn === payload.activity_urn)
      .map((r) => r.id);
  }
  if (targets.length === 0) {
    const newestNew = rows.find((r) => r.task_status === 'new');
    if (newestNew) targets = [newestNew.id];
  }

  const updated = await bulkUpdateFeedEventTaskStatus(targets, 'done');
  if (updated > 0) {
    scheduleBadgeRefresh();
  }

  return {
    matched: updated > 0,
    updated_feed_event_ids: targets.slice(0, updated),
  };
}

async function getActiveLinkedInTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const tab = tabs[0];
  if (!tab || typeof tab.id !== 'number' || !tab.url) return null;
  if (!/^https:\/\/(?:www\.)?linkedin\.com\//i.test(tab.url)) return null;
  return tab;
}

/**
 * Mode A prefill — navigate the user's active LinkedIn tab to the target
 * profile (if it isn't there already), then ask the content script to open
 * the Connect modal and type the rendered body into the textarea. The user
 * still clicks Send (MASTER §19.2 Mode A invariant).
 */
async function handleOutreachPrefillConnect(
  payload: OutreachPrefillConnectPayload,
): Promise<MessageResponse<OutreachPrefillResult>> {
  const prospect = await getProspectById(payload.prospect_id);
  if (!prospect) {
    return { ok: false, error: `Prospect ${payload.prospect_id} not found` };
  }

  let tab = await getActiveLinkedInTab();
  if (!tab) {
    return {
      ok: false,
      error:
        'Open a LinkedIn tab in the active window, then try again (Mode A requires a live LinkedIn session).',
    };
  }

  // Navigate if we're not already on the prospect's profile.
  const onProfile =
    typeof tab.url === 'string' &&
    tab.url.toLowerCase().includes(`/in/${prospect.slug.toLowerCase()}`);
  if (!onProfile) {
    await chrome.tabs.update(tab.id!, { url: prospect.url });
    // Wait for the tab to finish loading before dispatching the prefill.
    await waitForTabComplete(tab.id!, 20_000);
    const refreshed = await chrome.tabs.get(tab.id!);
    tab = refreshed;
  }

  const res = await sendMessageToTab(tab.id!, {
    type: 'OUTREACH_PREFILL_CONNECT_IN_TAB',
    payload,
  });

  // Always draft an `outreach_actions` row (state = 'draft') so the user can
  // later confirm via "Mark request sent" even if the content script missed
  // the modal. The idempotency key dedupes across retries.
  await handleOutreachActionRecord({
    prospect_id: payload.prospect_id,
    kind: 'connection_request_sent',
    state: 'draft',
    template_id: payload.template_id ?? null,
    template_version: payload.template_version ?? null,
    rendered_body: payload.rendered_body,
  });

  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  return res;
}

function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);
    const listener = (
      updatedId: number,
      info: chrome.tabs.TabChangeInfo,
    ) => {
      if (updatedId !== tabId) return;
      if (info.status !== 'complete') return;
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ——— Phase 3.1 / 3.2 — Feed Crawl Session state (SW-memory; best-effort) ———
//
// MV3 service workers recycle freely, so we treat this as a soft snapshot —
// the source of truth for "what happened" is the activity_log. If the SW
// recycles mid-session the popup will fall back to showing `idle`.

interface FeedCrawlSessionState {
  running: boolean;
  tab_id: number | null;
  session_id: string | null;
  started_at: number | null;
  last_result: FeedCrawlSessionResult | null;
}

const feedCrawlState: FeedCrawlSessionState = {
  running: false,
  tab_id: null,
  session_id: null,
  started_at: null,
  last_result: null,
};

function snapshotFeedCrawlStatus(): FeedCrawlStatus {
  return {
    running: feedCrawlState.running,
    tab_id: feedCrawlState.tab_id,
    session_id: feedCrawlState.session_id,
    started_at: feedCrawlState.started_at,
    last_result: feedCrawlState.last_result,
  };
}

function broadcastFeedCrawlStatus(): void {
  broadcast({
    type: 'FEED_CRAWL_SESSION_CHANGED',
    payload: snapshotFeedCrawlStatus(),
  });
}

async function handleFeedCrawlSessionStart(): Promise<
  MessageResponse<FeedCrawlStatus>
> {
  if (feedCrawlState.running) {
    return {
      ok: false,
      error: 'A Feed Crawl Session is already running in this browser.',
    };
  }

  const tab = await getActiveTabInFocusedWindow();
  if (!tab || typeof tab.id !== 'number' || !tab.url) {
    return {
      ok: false,
      error:
        'Open the LinkedIn feed in the active tab, then start the session.',
    };
  }
  if (!isLinkedInFeedTabUrl(tab.url)) {
    return {
      ok: false,
      error:
        'Active tab must be https://www.linkedin.com/feed/ for a crawl session.',
    };
  }

  const scanState = await getScanState();
  if (scanState.status === 'running') {
    return {
      ok: false,
      error:
        'Pause the profile scanner before running a manual Feed Crawl Session (they would fight for the tab).',
    };
  }

  const sessionId = `crawl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  feedCrawlState.running = true;
  feedCrawlState.tab_id = tab.id;
  feedCrawlState.session_id = sessionId;
  feedCrawlState.started_at = startedAt;
  broadcastFeedCrawlStatus();

  await appendActivityLog({
    ts: startedAt,
    level: 'info',
    event: 'feed_crawl_session_start',
    prospect_id: null,
    data: { session_id: sessionId, tab_id: tab.id, tab_url: tab.url },
  });

  // Fire-and-forget the tab dispatch. The content script is responsible for
  // running the full two-mode pass and calling `sendResponse` on completion.
  void sendMessageToTab(tab.id, {
    type: 'FEED_CRAWL_RUN_IN_TAB',
    payload: { session_id: sessionId },
  }).then(async (res) => {
    const endedAt = Date.now();
    if (res.ok) {
      const result: FeedCrawlSessionResult = { ...res.data, tab_id: tab.id! };
      feedCrawlState.last_result = result;
      await appendActivityLog({
        ts: endedAt,
        level: 'info',
        event: 'feed_crawl_session_end',
        prospect_id: null,
        data: {
          session_id: sessionId,
          tab_id: tab.id,
          duration_ms: result.duration_ms,
          total_events_captured: result.total_events_captured,
          overlap_count: result.overlap_count,
          stop_reason: result.stop_reason,
          modes: result.modes.map((m) => ({
            mode: m.mode,
            scroll_steps: m.scroll_steps,
            events_captured: m.events_captured,
            stop_reason: m.stop_reason,
          })),
        },
      });
    } else {
      feedCrawlState.last_result = null;
      await appendActivityLog({
        ts: endedAt,
        level: 'warn',
        event: 'feed_crawl_session_failed',
        prospect_id: null,
        data: { session_id: sessionId, tab_id: tab.id, error: res.error },
      });
    }
    feedCrawlState.running = false;
    feedCrawlState.tab_id = null;
    feedCrawlState.session_id = null;
    feedCrawlState.started_at = null;
    broadcastFeedCrawlStatus();
  });

  return { ok: true, data: snapshotFeedCrawlStatus() };
}

async function handleFeedCrawlSessionStop(): Promise<
  MessageResponse<FeedCrawlStatus>
> {
  if (!feedCrawlState.running || feedCrawlState.tab_id == null) {
    return { ok: true, data: snapshotFeedCrawlStatus() };
  }
  const tabId = feedCrawlState.tab_id;
  const sessionId = feedCrawlState.session_id ?? '';
  const res = await sendMessageToTab(tabId, {
    type: 'FEED_CRAWL_CANCEL_IN_TAB',
    payload: { session_id: sessionId },
  });
  if (!res.ok) {
    // Force-clear the local flag — the content script is probably gone (tab
    // closed or navigated away). The activity log will still show the start.
    feedCrawlState.running = false;
    feedCrawlState.tab_id = null;
    feedCrawlState.session_id = null;
    feedCrawlState.started_at = null;
    broadcastFeedCrawlStatus();
  }
  return { ok: true, data: snapshotFeedCrawlStatus() };
}

async function exportProspectsCsv(
  filter: ProspectQuery | null,
): Promise<{ csv: string; row_count: number }> {
  if (!filter) {
    const rows = await getAllProspects();
    return { csv: prospectsToCsv(rows), row_count: rows.length };
  }
  const { rows } = await queryProspects({
    ...filter,
    page: 0,
    page_size: Number.MAX_SAFE_INTEGER,
  });
  return { csv: prospectsToCsv(rows), row_count: rows.length };
}

registerMessageRouter(async (msg) => {
  switch (msg.type) {
    case 'CSV_COMMIT':
      return handleCsvCommit(msg.payload);
    case 'STATS_QUERY': {
      const stats = await getProspectStats();
      return { ok: true, data: stats };
    }
    case 'SCAN_STATE_QUERY': {
      const state = await getScanState();
      return { ok: true, data: state };
    }
    case 'SCAN_START': {
      const state = await startScan();
      return { ok: true, data: state };
    }
    case 'SCAN_PAUSE': {
      const state = await pauseScan();
      return { ok: true, data: state };
    }
    case 'SCAN_RESUME': {
      const res = await resumeScan();
      if (!res.ok) {
        // Surface the cooldown on the error channel — popup / dashboard
        // read `error` directly; the cooldown object is logged for debugging.
        console.info('[investor-scout] resume blocked by kill-switch cooldown', {
          cooldown: res.cooldown,
        });
        return { ok: false, error: res.error };
      }
      return { ok: true, data: res.state };
    }
    case 'PROSPECTS_LIST': {
      const page = await queryProspects(msg.payload ?? {});
      return { ok: true, data: page };
    }
    case 'PROSPECT_GET': {
      const row = await getProspectById(msg.payload.id);
      return { ok: true, data: row ?? null };
    }
    case 'PROSPECT_UPDATE': {
      const next = await updateProspectFromPatch(
        msg.payload.id,
        msg.payload.patch,
      );
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'prospect_patched',
        prospect_id: next.id,
        data: { patch: msg.payload.patch },
      });
      void broadcastProspectsUpdated([next.id]);
      return { ok: true, data: next };
    }
    case 'PROSPECTS_BULK_ACTIVITY': {
      const updated = await bulkSetActivity(
        msg.payload.ids,
        msg.payload.activity,
      );
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'bulk_activity_update',
        prospect_id: null,
        data: { ids_count: msg.payload.ids.length, activity: msg.payload.activity, updated },
      });
      void broadcastProspectsUpdated(msg.payload.ids);
      return { ok: true, data: { updated } };
    }
    case 'PROSPECTS_RESCAN': {
      const updated = await bulkRescanProspects(msg.payload.ids);
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'bulk_rescan_queued',
        prospect_id: null,
        data: { ids_count: msg.payload.ids.length, updated },
      });
      void broadcastProspectsUpdated(msg.payload.ids);

      const state = await getScanState();
      if (state.status === 'running') {
        void runScanLoop();
      }
      return { ok: true, data: { updated } };
    }
    case 'PROSPECTS_DELETE': {
      const deleted = await bulkDeleteProspects(msg.payload.ids);
      await appendActivityLog({
        ts: Date.now(),
        level: 'warn',
        event: 'bulk_delete',
        prospect_id: null,
        data: { ids_count: msg.payload.ids.length, deleted },
      });
      void broadcastProspectsUpdated(msg.payload.ids);
      return { ok: true, data: { deleted } };
    }
    case 'PROSPECT_LOG_QUERY': {
      const entries = await getActivityLogForProspect(
        msg.payload.prospect_id,
        msg.payload.limit ?? 100,
      );
      return { ok: true, data: entries };
    }
    case 'SETTINGS_QUERY': {
      const settings = await getSettings();
      return { ok: true, data: settings };
    }
    case 'SETTINGS_UPDATE': {
      const prev = await getSettings();
      const next = await putSettings(msg.payload);
      broadcast({ type: 'SETTINGS_CHANGED', payload: next });
      // If the user edited the keyword/firm lists or tier thresholds, every
      // prospect's score needs refreshing (Phase 1.2 recompute trigger).
      if (outreachScoringChanged(prev, next)) {
        try {
          const result = await recomputeAllProspects({ settings: next });
          if (result.updated > 0) {
            await appendActivityLog({
              ts: Date.now(),
              level: 'info',
              event: 'prospects_rescored',
              prospect_id: null,
              data: { updated: result.updated, reason: 'settings_change' },
            });
            // Empty changed_ids = "refresh all" sentinel (same as CSV import).
            void broadcastProspectsUpdated([]);
          }
        } catch (error) {
          console.warn('[investor-scout] rescore after settings update failed', {
            error: error instanceof Error ? error.message : error,
          });
        }
      }
      return { ok: true, data: next };
    }
    case 'LOGS_QUERY': {
      const entries = await queryActivityLog(msg.payload ?? {});
      return { ok: true, data: entries };
    }
    case 'CLEAR_ALL_DATA': {
      await clearAllData();
      await appendActivityLog({
        ts: Date.now(),
        level: 'warn',
        event: 'data_cleared',
        prospect_id: null,
        data: {},
      });
      void broadcastProspectsUpdated([]);
      scheduleBadgeRefresh();
      return { ok: true, data: { cleared: true } };
    }
    case 'EXPORT_CSV': {
      const data = await exportProspectsCsv(msg.payload?.filter ?? null);
      return { ok: true, data };
    }
    case 'FEED_TEST_SEED_RANDOM_LEVELS':
      return handleFeedTestSeedRandomLevels();
    case 'SLUGS_QUERY': {
      const map = await getSlugMap();
      return { ok: true, data: map };
    }
    case 'FEED_EVENTS_UPSERT_BULK': {
      const events = msg.payload?.events ?? [];
      if (events.length === 0) {
        return { ok: true, data: { inserted: 0, updated: 0 } };
      }
      const result = await upsertFeedEventsBulk(events);
      if (result.inserted > 0) {
        await incrementDailyUsage(localDayBucket(Date.now()), {
          feed_events_captured: result.inserted,
        });
        scheduleBadgeRefresh();
      }
      // Activity recency is a scoring input — refresh scores for the prospects
      // whose feed rows moved (Phase 1.2 recompute trigger).
      const affectedIds = Array.from(
        new Set(
          events
            .map((e) => e.prospect_id)
            .filter((id): id is number => Number.isInteger(id) && id > 0),
        ),
      );
      if (affectedIds.length > 0) {
        try {
          const { changed_ids } = await recomputeProspectsByIds(affectedIds);
          if (changed_ids.length > 0) {
            void broadcastProspectsUpdated(changed_ids);
          }
        } catch (error) {
          console.warn(
            '[investor-scout] rescore after feed events failed',
            { error: error instanceof Error ? error.message : error },
          );
        }
      }
      return { ok: true, data: result };
    }
    case 'DAILY_SNAPSHOT_QUERY': {
      const bucket = localDayBucket(Date.now());
      const [usage, inboxNew, acceptsToday, pendingInvites] = await Promise.all([
        getDailyUsage(bucket),
        countFeedEventsByTaskStatus('new'),
        countAcceptedActionsForDay(bucket),
        countPendingInvites(),
      ]);
      return {
        ok: true,
        data: {
          day_bucket: bucket,
          usage,
          inbox_new_count: inboxNew,
          accepts_today: acceptsToday,
          pending_invites: pendingInvites,
        },
      };
    }
    case 'HEALTH_SNAPSHOT_QUERY': {
      const now = Date.now();
      const bucket = localDayBucket(now);
      const sevenDaysAgoMs = now - 7 * 86_400_000;
      const [
        settings,
        daily_usage,
        safety_events,
        accepts,
        invites,
        last_breach_at,
      ] = await Promise.all([
        getSettings(),
        getDailyUsageRange(bucket, 7),
        listSafetyEventsSince(sevenDaysAgoMs),
        listAcceptsSince(sevenDaysAgoMs),
        listInvitesSince(sevenDaysAgoMs),
        getLastHealthBreachAt(),
      ]);
      const snapshot = computeHealthSnapshot({
        now,
        today_bucket: bucket,
        daily_usage,
        safety_events,
        accepts,
        invites,
        thresholds: settings.outreach.kill_switch_thresholds,
        cooldown_hours: settings.outreach.health_cooldown_hours,
        last_breach_at,
      });
      return { ok: true, data: snapshot };
    }
    case 'ANALYTICS_SNAPSHOT_QUERY': {
      const now = Date.now();
      const bucket = localDayBucket(now);
      const [prospects, outreach_actions, feed_events, daily_usage] =
        await Promise.all([
          getAllProspects(),
          getAllOutreachActions(),
          getAllFeedEvents(),
          getDailyUsageRange(bucket, 30),
        ]);
      const snapshot = computeAnalyticsSnapshot({
        now,
        today_bucket: bucket,
        prospects: prospects.map((p) => ({
          id: p.id,
          level: p.level,
          firm_score: p.score_breakdown?.firm ?? null,
        })),
        outreach_actions,
        feed_events: feed_events.map((ev) => ({
          id: ev.id,
          prospect_id: ev.prospect_id,
          event_kind: ev.event_kind,
          first_seen_at: ev.first_seen_at,
          task_status: ev.task_status,
        })),
        daily_usage,
      });
      return { ok: true, data: snapshot };
    }
    case 'FEED_EVENTS_QUERY': {
      const page = await queryFeedEvents(msg.payload ?? {});
      return { ok: true, data: page };
    }
    case 'FEED_EVENT_UPDATE': {
      const next = await updateFeedEventTaskStatus(
        msg.payload.id,
        msg.payload.task_status,
      );
      scheduleBadgeRefresh();
      return { ok: true, data: next };
    }
    case 'FEED_EVENTS_BULK_UPDATE': {
      const updated = await bulkUpdateFeedEventTaskStatus(
        msg.payload.ids,
        msg.payload.task_status,
      );
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: 'feed_events_bulk_update',
        prospect_id: null,
        data: {
          ids_count: msg.payload.ids.length,
          task_status: msg.payload.task_status,
          updated,
        },
      });
      scheduleBadgeRefresh();
      return { ok: true, data: { updated } };
    }
    case 'TEMPLATES_LIST': {
      const rows = await listMessageTemplates(msg.payload?.kind);
      return { ok: true, data: rows };
    }
    case 'TEMPLATE_UPSERT': {
      const row = await handleTemplateUpsert(msg.payload);
      return { ok: true, data: row };
    }
    case 'TEMPLATE_ARCHIVE': {
      const row = await updateMessageTemplate(msg.payload.id, {
        archived: msg.payload.archived,
      });
      await appendActivityLog({
        ts: Date.now(),
        level: 'info',
        event: msg.payload.archived ? 'template_archived' : 'template_unarchived',
        prospect_id: null,
        data: { id: row.id, kind: row.kind, version: row.version },
      });
      return { ok: true, data: row };
    }
    case 'OUTREACH_QUEUE_QUERY': {
      const data = await handleOutreachQueueQuery(msg.payload ?? {});
      return { ok: true, data };
    }
    case 'OUTREACH_ACTION_RECORD': {
      const row = await handleOutreachActionRecord(msg.payload);
      return { ok: true, data: row };
    }
    case 'OUTREACH_SKIP_TODAY': {
      const data = await handleOutreachSkipToday(
        msg.payload.prospect_id,
        msg.payload.skip,
      );
      return { ok: true, data };
    }
    case 'OUTREACH_PREFILL_CONNECT':
      return handleOutreachPrefillConnect(msg.payload);
    case 'OUTREACH_WITHDRAW_DETECTED': {
      const data = await handleOutreachWithdrawDetected(msg.payload);
      return { ok: true, data };
    }
    case 'INTERACTION_TOKEN_OPEN': {
      const data = await handleInteractionTokenOpen(msg.payload);
      return { ok: true, data };
    }
    case 'INTERACTIONS_LIST': {
      const data = await handleInteractionsList(msg.payload ?? {});
      return { ok: true, data };
    }
    case 'LINKEDIN_RESTRICTION_BANNER': {
      const data = await handleLinkedInRestrictionBanner(msg.payload);
      return { ok: true, data };
    }
    case 'REACTION_TOGGLED_DETECTED': {
      const data = await handleReactionToggledDetected(msg.payload);
      return { ok: true, data };
    }
    case 'COMMENT_POSTED_DETECTED': {
      const data = await handleCommentPostedDetected(msg.payload);
      return { ok: true, data };
    }
    case 'FEED_CRAWL_SESSION_START':
      return handleFeedCrawlSessionStart();
    case 'FEED_CRAWL_SESSION_STOP':
      return handleFeedCrawlSessionStop();
    case 'FEED_CRAWL_SESSION_STATUS':
      return { ok: true, data: snapshotFeedCrawlStatus() };
    default:
      return { ok: false, error: `Unhandled message: ${(msg as Message).type}` };
  }
});

registerLifecycleHooks();
registerScanAlarms();

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await openScoutDb();
    await getSettings();
    await getScanState();
    scheduleBadgeRefresh();
  } catch (error) {
    console.error('[investor-scout] IndexedDB init failed:', {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
  }
});

// Seed the badge on every service-worker boot — MV3 workers recycle freely.
scheduleBadgeRefresh();

chrome.action?.onClicked?.addListener?.((tab) => {
  console.info('[investor-scout] action clicked', { tabId: tab.id });
});

self.addEventListener('error', (event) => {
  console.error('[investor-scout] service worker error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[investor-scout] unhandled rejection', {
    reason: (event as PromiseRejectionEvent).reason,
  });
});

console.info('[investor-scout] service worker booted', {
  timestamp: new Date().toISOString(),
});

export {};
