# LinkedIn Investor Scout - Growth Extension TODO

Last updated: 2026-04-23
Owner: Mirza + Codex
Status: **Canonical v2 plan.** `TODO-v2.md` is superseded — see that file's header for the pointer. **Phase 3.1 (manual) + 3.2 Feed Crawl Session landed 2026-04-23** — popup `Run feed crawl session` button dispatches a two-mode (Top → Recent) DOM-walk into the active LinkedIn feed tab. Pure helpers (`pickScrollStep` / `pickWaitMs` / `shouldStopCrawl` / `buildModeUrl` / `isOnFeedMode` / `computeOverlap`) in [`src/shared/feed-crawler.ts`](./src/shared/feed-crawler.ts) with 18 unit tests. In-tab runner in [`src/content/feed-crawler.ts`](./src/content/feed-crawler.ts) handles navigation, scroll loop with Box–Muller ±20% jitter over `[600, 1200]` px, user-interaction guards (keyboard / mouse / wheel / non-programmatic scroll), and the `no_new_events / max_scrolls / user_interaction / canceled` stop reasons. Background owns session FSM + activity-log telemetry (`feed_crawl_session_start / _end / _failed`) and broadcasts `FEED_CRAWL_SESSION_CHANGED` so the popup updates inline. Passive continuous harvester (scan-worker peer) remains deferred until Phase 5 detectors land. **Phase 4.2 weekly analytics landed 2026-04-23** — new `Analytics` dashboard tab (`src/dashboard/routes/Analytics.tsx`) renders 30-day actions-by-kind sparkline, 12-week accept-rate chart with overlay line, event→action latency tile, inbox captured-vs-handled tile, and three cohort tables (by level / by firm tier / by source feed-event). Pure aggregator in `src/shared/analytics.ts` (`computeAnalyticsSnapshot`, Monday-anchored week buckets, DST-safe noon-anchor bucket math) with 15 unit tests. Background handler `ANALYTICS_SNAPSHOT_QUERY` hydrates from `getAllProspects` + `getAllOutreachActions` + `getAllFeedEvents` + `getDailyUsageRange(today, 30)` — no dedicated store, matches the Phase 4.3 on-demand health-snapshot pattern. **Phase 3.3 unlock tracking + acceptance watcher + popup accepts/pending landed 2026-04-23** — scan-worker detects level transitions and flips matching live `connection_request_sent` rows to `accepted` (pure logic in [`src/shared/acceptance-watcher.ts`](./src/shared/acceptance-watcher.ts), 13 unit tests). Newly-unlocked 2nd-degree rows get a flat `recent_unlock_boost` (+25 for 7d) so they promote tiers cleanly; `scoreProspect` now takes `last_level_change_at` and exposes `breakdown.recent_unlock`. `DailySnapshot` carries `accepts_today` + `pending_invites`; popup renders them beneath the budget tiles. Activity log gains `level_transition` + `outreach_accepted` events for auditability. **Sprint 1 foundations landed 2026-04-22** (Phase 0 + 1.1 + 2.1 + scoring helper + backup utility + MASTER v1.1 §19). **Phase 2.2 content-script extractor landed 2026-04-23** — `extractUrnsFromHydration` helper, `FEED_EVENT_SELECTORS` tuples, debounced bulk `FEED_EVENTS_UPSERT_BULK` (500ms / max-50), piggybacked on the existing highlight scan pass. **Phase 1.2 scoring-recompute triggers + §19.4 queue ordering + Phase 4.1 popup daily quick-glance landed 2026-04-23** — `src/shared/prospect-scoring.ts` orchestrates the DB-aware scoring pass and is wired into scan-complete, `FEED_EVENTS_UPSERT_BULK`, and `SETTINGS_UPDATE` (keyword / firm / tier-threshold edits trigger a full rescore). `takePendingProspectsBatch` now sorts `tier DESC, priority_score DESC, last_scanned ASC NULLS FIRST` with v1-parity fallback for null tier/score rows. Popup renders a `Today` row (invites / visits / messages / inbox unread) with a 20%-remaining budget chip, backed by a new `DAILY_SNAPSHOT_QUERY` message. **Phase 1.4 template CRUD + keyword/firm/tier/caps Settings UI landed 2026-04-23** — new `src/dashboard/routes/Templates.tsx` tab with connect-note / first-message / follow-up editors, `{{placeholder}}` renderer (`src/shared/templates.ts`), 300-char Connect-note cap warning, archive/restore of prior versions, `TEMPLATES_LIST` / `TEMPLATE_UPSERT` / `TEMPLATE_ARCHIVE` message handlers. Settings page now exposes Outreach caps (daily/weekly invites/visits/messages, shared-bucket toggle, warm-visit toggle), Tier thresholds, and full CRUD for keyword + firm seed lists (triggers the existing `SETTINGS_UPDATE` rescore path). **Phase 1.3 Outreach Queue UX (Mode A) landed 2026-04-23** — new `src/dashboard/routes/OutreachQueue.tsx` tab with tier/level/action/include-skipped filters, Next Best Target card, budget strip, and per-row Open profile / Prefill Connect / Copy template / Mark sent / Skip for today actions. Background owns `outreach_actions` FSM writes (idempotent via `{prospect}:{kind}:{day}` keys) and dispatches `OUTREACH_PREFILL_CONNECT_IN_TAB` to the active LinkedIn tab — `src/content/outreach-prefill.ts` opens the Connect modal (via the aria-label CTA from `example2.html`), handles the Stage-1 "Add a note" prompt, types the rendered body into the textarea, and highlights Send (user still clicks per §19.2). Popup carries a "Next best target" row under the daily glance. 34 new unit tests in `tests/outreach-queue.test.ts` cover queue ordering, recommender rules, live-action semantics, budget gating (incl. shared bucket), skip-today filtering, and idempotency-key stability. Sprint 2 remaining: A/B template reporting (deferred to v2.1).

## Interview resolutions (2026-04-22)

Captured live with the user; load-bearing decisions baked into the sections below.

- **Account:** LinkedIn Premium Career / Business, dedicated Chrome profile, clean history, currently 15–30 invites/day manual.
- **Send automation ceiling:** **Mode A only** (prefill Connect modal, user clicks Send). Mode B (batch-approve) and Mode C (headless) are **out of scope for v2**. Rollout gates collapse accordingly.
- **Operating model:** No `chrome.alarms` scheduler, no working-hours window, no background harvest tab. Everything — scan, harvester, outreach surfacing — runs continuously while `scan_state.status === 'running'` and a LinkedIn tab is active. Start/Pause in popup is the single switch. Manual "Feed Crawl Session" button still exists for ad-hoc pushes.
- **Integration:** Local-only. No Sheets / CRM / cross-app sync.
- **Top scoring driver:** Connection level. Level weights 2nd=100, 3rd=20, OOO=5, 1st=skip (already connected).
- **Templates:** Single connect-note template, single first-message, single follow-up. No A/B infrastructure in v2.0 — add in v2.1 if needed.
- **Metrics review cadence:** Daily quick-glance in popup, weekly deep-dive in Dashboard Analytics.
- **Warming:** Pre-invite profile-visit default ON, toggleable.
- **Seed lists:** Keyword + firm tier lists are user-maintained in Settings (CRUD + per-item weight). No file-based seeding — user populates directly via the UI.

## Why this roadmap

Primary goal: turn a static CSV of ~20k investors into a repeatable daily pipeline that:

- prioritizes the best reachable targets (start with 2nd-degree),
- keeps discovering new reachable targets as levels change over time,
- captures feed events as actionable tasks (post/comment links),
- maximizes daily visibility actions with strict caps and tracking.

## Current architecture baseline (already in code)

- MV3 extension with robust scan worker, retry logic, safety auto-pause, and daily cap (`src/background/scan-worker.ts`).
- IndexedDB persistence for prospects/settings/scan state/logs (`src/shared/db.ts`).
- Feed highlighter that already classifies context (`post_authors`, `commenters`, `reposters`, `reactors`, `mentions`, `suggested`) (`src/content/highlight.ts` + helpers).
- Dashboard with filters, bulk actions, notes, logs, and activity flags (`src/dashboard/routes/*`).

This is a strong base. Highest ROI is to add an engagement pipeline, not rebuild scanning.

## Strategy choice (recommended)

Use a semi-auto workflow first, then optionally add more automation:

- Keep LinkedIn actions human-confirmed (connect/message click done by you).
- Automate prioritization, queueing, navigation, template prep, and tracking.
- Capture every feed signal into a task table, dedupe aggressively.

Reason: best speed/risk balance, lower account risk, and easier iteration.

## North-star KPIs

- Daily `targeted_actions_completed` (visits + requests + messages).
- Weekly `new_2nd_degree_unlocked`.
- Weekly `connection_accept_rate`.
- Weekly `feed_event_to_action_rate` (events captured -> action taken).
- Median `time_to_first_touch` after a feed signal appears.

---

## v2 Invariants

- [x] **Mode A only** — every connect request must go through the prefill-modal + user-click-Send flow. No batch-approve, no headless sending, ever in v2. _(invariant codified in types + MASTER §19.2)_
- [x] **Unified budget bucket** — invites and profile visits share one risk bucket (`shared_bucket = true`). Defaults: `daily_invites: 15`, `daily_visits: 40`, `weekly_invites: 80`. _(DEFAULT_OUTREACH_CAPS, `daily_usage` store)_
- [x] **Kill switch mandatory** — write actions auto-pause when health thresholds breach (7d accept-rate floor, repeated safety triggers inside the rolling window). Manual resume only, with a minimum cooldown (default 24h, Settings-configurable). _(Landed 2026-04-23 — Phase 4.3 below. Restriction-banner detector landed 2026-04-23 — content-side pattern matcher in [`src/shared/restriction-banner-detector.ts`](./src/shared/restriction-banner-detector.ts) + watcher in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts); background `LINKEDIN_RESTRICTION_BANNER` handler calls the new `triggerHealthBreach('restriction_banner', …)` export on scan-worker.)_
- [x] **Idempotency keys** on every write and event — stable action id + event fingerprint prevent double-send / double-count across service-worker restarts. _(`outreach_actions.by_idempotency_key` unique + `feed_events.by_event_fingerprint` unique)_
- [x] **Active-tab-only operation** — all scheduled work (scan, harvest, outreach queue progression) is gated on `scan_state.status === 'running'` AND at least one open `linkedin.com/*` tab. No `chrome.alarms` except for daily-bucket rollover at local midnight and the existing 30s orphan-tab watchdog. _(landed 2026-04-25 — new `hasOpenUserLinkedInTab()` in [`src/background/scan-worker.ts`](./src/background/scan-worker.ts) excludes worker-owned scan tabs (via `getOwnedTabIds()`) so the gate tracks user presence, not the worker's own footprint. `runScanLoop()` checks at the top of every iteration; on miss it logs `scan_loop_yield_no_linkedin_tab` and breaks (state stays `running` — this is a yield, not a pause). New `registerLinkedInTabWatcher()` in [`src/background/startup.ts`](./src/background/startup.ts) listens on `chrome.tabs.onCreated` + `onUpdated` (URL-change only) and re-fires `runScanLoop()` when a non-owned LinkedIn tab appears while status is `running` — closes the loop without polling. No new `chrome.alarms`. 4 unit tests in [`tests/scan-tab-gate.test.ts`](./tests/scan-tab-gate.test.ts) cover the empty-tabs miss, the owned-tab-excluded path, the dual host-pattern query, and the no-id user-tab-fallback.)_
- [x] **Local-only** — no network egress except to `linkedin.com`. No telemetry, no cloud sync, no external integration in v2.

## MASTER.md v1.1 supersede block (to write before Phase 1 ships)

Concrete list of MASTER.md sections that v2 contradicts. A `MASTER.md` v1.1 amendment section must land in the same PR as Phase 0.

_Landed 2026-04-22 — see [`MASTER.md`](./MASTER.md) §19._

- [x] **§3.2 Out of Scope** — `Working-hours scheduler` stays out of scope (confirmed). `Re-scan staleness scheduler` becomes in-scope for S/A tier only (Phase 1.4 / 3.3).
- [x] **§3.3 Non-Goals** — relax "never clicks Connect / submits any form" to allow **Mode A only**: extension may open the Connect modal and prefill the note textarea; the user still clicks Send. All other write surfaces (DMs, reactions, comments, posts, follows) remain fully manual.
- [x] **§6.3 CSV Export Format** — append columns after `notes`: `score`, `tier`, `lifecycle_status`, `mutual_count`, `last_outreach_at`. Column order frozen at v2.0. _(Frozen-order columns landed 2026-04-23 — `EXPORT_COLUMNS` + `prospectsToCsv` in [`src/shared/csv.ts`](./src/shared/csv.ts) emit the full 17-column header; null score/tier/mutual/outreach values render as empty cells, `last_outreach_at` ISO-stamped. Two new fixtures in [`tests/csv.test.ts`](./tests/csv.test.ts) pin the order against accidental reorders.)_
- [x] **§7.2 Scan Queue ordering** — change from `id ASC` to `tier DESC, score DESC, last_scanned ASC NULLS FIRST`. S/A-tier rows > 30d stale get priority re-queue. _(Sort order landed 2026-04-23 — `compareScanQueueOrder` in [`src/shared/db.ts`](./src/shared/db.ts). Stale-row re-queue mechanism landed 2026-04-23 — new `requeueStaleSATierProspects` in `src/shared/db.ts` flips `done` rows whose `tier IN ('S','A')` AND `last_scanned < now - STALE_SA_TIER_REQUEUE_DAYS` (default 30) back to `'pending'`, resetting `scan_attempts` + `scan_error`. Wired at `runScanLoop` entry in [`src/background/scan-worker.ts`](./src/background/scan-worker.ts) — runs once per loop entry, idempotent. Logged as `stale_sa_tier_requeued` activity event when count > 0. Three new tests in `tests/db-v2.test.ts` cover the happy path, null-tier/null-last_scanned skip, and non-positive/NaN window guards.)_

---

## DOM Reference — findings from `example1.html`

Compact reference captured from the user-provided feed snapshot (`/example1.html`, 1.1MB). Selectors here are what the v2 implementation must target. **Critical structural finding first — it changes the selector strategy.**

### Structural gotcha: LinkedIn has migrated the feed to React SDUI

The snapshot is a modern React **Server-Driven UI** render, not the classical `feed-shared-update-v2` DOM that older scraping docs describe. Implications the plan must respect:

- **No `data-urn` attribute on feed-card containers.** Activity URNs are embedded in `data-testid` hashes (base64-ish like `CgsIgsDKgKL2turOAQ`) and in hydration-data JSON blobs — not as stable top-level attributes.
- **Semantic class names are gone.** All CSS classes are obfuscated CSS-in-JS hashes (`_25e299b4`, `_155684ca`). Selectors keyed off `feed-shared-*` / `update-components-*` will miss most cards.
- **SDUI marker on page root:** `data-sdui-screen="com.linkedin.sdui.flagshipnav.feed.MainFeed"`.

**Selector strategy for v2 (supersedes v1's class-based approach):**

1. **Primary: `data-testid` pattern matching** — stable across obfuscation passes.
2. **Secondary: extract URNs from embedded hydration JSON** — the URNs (`urn:li:activity:...`, `urn:li:comment:(urn:li:activity:X,Y)`, `urn:li:ugcPost:...`, `urn:li:groupPost:...`) live in `<script>` / hydration payload even when DOM doesn't expose them as attrs.
3. **Tertiary: `/in/{slug}` anchor scan + climb to nearest post container via `data-component-type`.**
4. **Fallback: classical `feed-shared-*` / `update-components-*` selectors** — only as a last resort for older/experimental surfaces still rendered by the legacy pipeline.

`src/content/selectors.ts` must be reorganized around this ordering (primary → fallback), not around a single "correct" selector per field.

### Confirmed selectors (from `example1.html`)

- **Feed landmark:** `<main id="workspace">`.
- **Feed list root:** `div[data-testid="mainFeed"][role="list"]`.
- **Feed card container:** `div[data-testid*="FeedType_MAIN_FEED"]` — each card has a `data-testid` containing both a base64 activity ID and the literal substring `FeedType_MAIN_FEED_RELEVANCE`. 6 cards present in the snapshot.
- **Comment list container inside a card:** `div[data-testid*="-commentList"][data-testid*="FeedType_MAIN_FEED"]`.
- **Lazy-scroll marker:** `data-component-type="LazyColumn"` — useful sentinel for infinite-scroll wait conditions.
- **Embedded URN patterns observed:**
  - `urn:li:activity:7451889312482283521`
  - `urn:li:comment:(urn:li:activity:7451889312482283521,7451891984450940928)`
  - `urn:li:ugcPost:7451886104967839744`
  - `urn:li:groupPost:3990648-7445075414298894336`
- **Post permalink construction** (from URN): `https://www.linkedin.com/feed/update/{activity_urn}/` — verify against a separate post-detail fixture before shipping.
- **Comment permalink construction** (from comment URN): `https://www.linkedin.com/feed/update/{activity_urn}/?commentUrn={comment_urn}` — verify once we have a real rendered comment anchor.
- **`/in/{slug}` anchor scan:** works — 5 `/in/` anchors in the snapshot; extension already handles this path in v1 highlighter.

### Fixtures captured via Chrome DevTools MCP (2026-04-22) — live selectors

All 9 fixtures below were captured from the user's live LinkedIn session on 2026-04-22 via Chrome DevTools MCP. They live as `exampleN.html` files in this directory and are the source-of-truth for v2 selector strategy. Key finding: **aria-labels are the most stable hook across LinkedIn's SDUI churn** — obfuscated CSS classes change every deploy, but aria-labels have held shape through multiple redesigns.

#### Universal aria-label detector hooks (found across multiple fixtures)

| Purpose | aria-label pattern | Found in |
|---|---|---|
| Post author identity | `"Open control menu for post by {NAME}"` | example8, example9 |
| Post author (fallback 2) | `"Hide post by {NAME}"` | example8, example9 |
| Post author (fallback 3) | `"Follow {NAME}"` | example8, example9 |
| OWN reaction state on a post | `"Reaction button state: no reaction"` (or `"...: like"`, `"...: celebrate"`, etc.) | example9 — Phase 5.3 hook |
| Reaction picker hover | `"Open reactions menu"` | example9 |
| Reactor modal trigger | `"{NAME} and N others"` (or `"You and N others"`) | example4 source post |
| Reactor list entry | `"{reactionType} View {NAME}'s profile {1st\|2nd\|3rd} degree connection {HEADLINE}"` | example4 — Phase 3 harvester + degree detection |
| Connect CTA on profile | `"Invite {NAME} to connect"` | example2 — Phase 5.3 hook |
| Connect modal Send | `"Send invitation"` (disabled when textarea empty) | example3 — Phase 5.3 hook |
| Connect modal Cancel | `"Cancel adding a note"` | example3 |
| Connect textarea | `aria-label="Please limit personal note to 300 characters."` (role="textbox") | example3 |
| Generic modal close | `"Dismiss"` | example3, example4 |
| Pending invite in Sent tab | `"Withdraw invitation sent to {NAME}"` — tag is `<a>`, not `<button>` | example7 — Phase 5.6 withdrawal hook |
| Message thread recipient (from composer toolbar) | `"Attach an image to your conversation with {RECIPIENT_NAME}"` | example5 |
| Message bubble sender | `"Options for the message from {SENDER_NAME}: {BODY_SNIPPET}"` | example5 |
| Comment options | `"View more options for {COMMENTER_NAME}'s comment."` | example1 |

#### Key URL / URN patterns

- **Profile fsd URN:** `ACoAA...` (32 chars, base64-ish). Used in reactor hrefs (`/in/ACoAA...`) and message-compose URL params. Canonical internal identifier — more stable than vanity slug.
- **Vanity slug:** `/in/{slug}/` — used in invitation manager, profile URL, Connect action URL.
- **Connect action URL:** `/preload/custom-invite/?vanityName={slug}` (href on Connect `<a>`). Direct navigation to this URL opens the Connect modal even without clicking.
- **Message compose URL:** `/messaging/compose/?profileUrn=urn:li:fsd_profile:{URN}&recipient={URN}&screenContext=NON_SELF_PROFILE_VIEW&interop=msgOverlay` (href on Message `<a>`).
- **Activity URN in feed cards:** encoded inside `componentkey="expanded{base64_id}FeedType_MAIN_FEED_RELEVANCE"`. The base64 segment is LinkedIn's internal representation of `urn:li:activity:{N}` — we cannot easily decode it client-side, but the full `componentkey` is a stable fingerprint for the card.
- **Comment URN:** `urn:li:comment:(urn:li:activity:{activity_id},{comment_id})`.
- **Profile top card componentkey:** `com.linkedin.sdui.profile.card.ref{PROFILE_URN}Topcard` — profile URN recoverable directly.
- **Reactor anchor href:** `https://www.linkedin.com/in/ACoAA...` — URN-form, NOT vanity. Resolving to vanity slug requires either (a) a later profile visit, (b) extracting from hydrated JSON on the reactor modal page.

#### Per-fixture concrete selectors

- [x] **`example2.html` — 2nd-degree profile top card (Medin Aljukic, 5 mutuals, 228 connections).**
  - Top section: `section[componentkey^="com.linkedin.sdui.profile.card.ref"][componentkey$="Topcard"]`.
  - Name: `<h1>` (single top-level h1 on profile page).
  - Connect: `<a aria-label^="Invite " aria-label$=" to connect" href^="/preload/custom-invite/"]`.
  - Message: `<a href^="/messaging/compose/?profileUrn="]`.
  - Mutual connections link: `<a>` whose text matches `/(\S+.*)\band (\d+) other mutual connection/` — total = 2 visible names + N others. Also a numeric-only `<p>` nearby carries total-connections count.
  - **Degree detection:** the text nodes `· 1st` AND `· 2nd` both render; CSS class `cf5ecd8c` on the inactive one toggles visibility. Do NOT parse by text — instead infer degree from presence of the Connect `<a>` (present → 2nd/3rd, absent → 1st or 3rd+-restricted).

- [x] **`example3-stage1.html` + `example3.html` — Connect-with-note modal, two-stage flow.**
  - Stage 1 (prompt): `[role="dialog"]` whose `<h2>` text is `"Add a note to your invitation?"`. Two buttons: `"Add a note"` and `"Send without a note"`.
  - Stage 2 (textarea): `[role="dialog"]` whose `<h2>` text is `"Add a note to your invitation"` (no `?`). Contains `[role="textbox"][aria-label*="personal note"]`, Send button `[aria-label="Send invitation"]` (starts disabled), Cancel button `[aria-label="Cancel adding a note"]`.
  - Char counter rendered as plain text `"0/200"` (Free tier) or `"0/300"` (Premium). Helper text above: `"N personalized invitations remaining for this month."` (Free tier only — invite-cap signal for Phase 4 health).
  - Detector for `invite_sent`: watch for the dialog unmounting (`aria-label` containing `"invitation"` disappearing from DOM within 3s of Send click) + subsequent toast.

- [x] **`example4.html` — Reactions modal (opens from any post's reactor-count).**
  - Dialog: `[role="dialog"]` identified by `<h2>` text `"Reactions"` (NOT aria-label — it's null).
  - Filter tabs: `[role="tab"]` with text pattern `"All {N}"` / `"like {N}"` / `"celebrate {N}"` / `"support {N}"` / `"love {N}"` / `"insightful {N}"` / `"funny {N}"`.
  - Reactor row: `<a href^="https://www.linkedin.com/in/ACoAA"]` with rich aria-label (see universal table above).
  - Reaction type: `<img alt>` equals reaction kind literal (`like`, `celebrate`, `support`, `love`, `insightful`, `funny`).

- [x] **`example5.html` — messaging thread full page (`/messaging/thread/{id}/`).**
  - Composer form: `form.msg-form.msg-form--thread-footer-feature`.
  - Contenteditable: `div.msg-form__contenteditable[role="textbox"][aria-label="Write a message…"]` (em-dash char, not three dots).
  - Send button: `button.msg-form__send-button` (type=submit). Disabled state ↔ empty composer.
  - Message bubble: `li.msg-s-event-listitem` with variants `--last-in-group`, `--m2m-msg-followed-by-date-boundary`.
  - Body text: `.msg-s-event-listitem__body`.
  - Seen receipts: `.msg-s-event-listitem__seen-receipts` — `<img title="Seen by {NAME} at {TIME}.">` carries timestamp.
  - **Sent-message detector strategy:** watch for new `li.msg-s-event-listitem--last-in-group` appending to the list, AND composer contenteditable innerHTML returning to `<p><br></p>`, AND send button re-disabling — three-signal correlation for high confidence.

- [x] **`example6.html` — messaging drawer (preload iframe).**
  - Lives in iframe: `iframe[src*="/preload/"]`. Content script must iterate same-origin iframes.
  - Drawer root: `<aside id="msg-overlay" class="msg-overlay-container">`.
  - Minimized state: `.msg-overlay-list-bubble--is-minimized` class toggles on root's first child.
  - Reactor-list outlet: `#msg-overlay__reactor-list-outlet` — reactor modals opened from a drawer thread mount here (not top-level doc).
  - Cross-tab detector note: content script needs to inject into this iframe explicitly.

- [x] **`example7.html` + `example7-item.html` — invitation manager Sent tab.**
  - Tab nav: `<a>` with text `"People (N)"` where N = pending invite count.
  - Each invite row: contains `<a href="/in/{slug}/">` for the target + image + headline text + `"Sent {N} {unit} ago"` time string (parseable: regex `/Sent (\d+) (day|week|month|year)s? ago/`).
  - Withdraw control: `<a aria-label="Withdraw invitation sent to {NAME}">` with text `"Withdraw"`, href=current page (actual withdrawal is JS).
  - **Phase 5.6 withdrawal detector:** MutationObserver on this page watches for invite rows being removed OR a toast confirming withdrawal — flip outreach row to `withdrawn`, credit budget.

- [x] **`example8.html` — Sunny Madra feed card (multi-actor — reposter+mention/tagged).**
  - Container: `div[componentkey$="FeedType_MAIN_FEED_RELEVANCE"]`.
  - TWO `/in/` anchors in card: first is the `aria-label="Open control menu..."` subject = reposter/author; second is in post body = mentioned person. Disambiguate by walking anchor ancestors: the one inside an element also referenced by `"Open control menu for post by {NAME}"` is the author, others are mentions.

- [x] **`example9.html` — Alex Turnbull feed card (reaction state = none, baseline).**
  - Reaction trigger button label: `"Reaction button state: no reaction"`. After a user reacts, label changes to `"Reaction button state: {type}"` (e.g. `"like"`, `"celebrate"`).
  - The label is the Phase 5.3 reaction-toggled detector hook: MutationObserver watches for `aria-label` attribute changes on this specific button from `"no reaction"` → any other value.
  - Card-level author name is ONLY reliably extractable via aria-labels on control-menu/hide/follow buttons — the h2/h3 author name element uses obfuscated classes, no stable data attributes.

### Acceptance for the DOM reference

- [x] `src/content/selectors.ts` organized as `{ primary, secondary, fallback }` tuples per field. _(new `FEED_EVENT_SELECTORS` export + `queryFirstTiered` / `queryAllTiered` helpers; scan-side `LINKEDIN_SELECTORS` kept as flat string[] for executeScript serialization.)_
- [x] A parser helper `extractUrnsFromHydration(html)` lives in `src/shared/` and is unit-tested against `example1.html`. _([`src/shared/urn.ts`](./src/shared/urn.ts) + [`tests/urn.test.ts`](./tests/urn.test.ts) — 17 cases.)_
- [x] A contract test per fixture asserts expected extracted fields (post URN, author slug, comment URNs, etc.). _([`tests/feed-events.test.ts`](./tests/feed-events.test.ts) covers example8 / example9 end-to-end; URN helpers covered against example1 in urn.test.ts.)_
- [ ] Fixture re-capture reminder calendar entry (quarterly) — LinkedIn's SDUI will keep moving.

---

## Phase 0 - Foundation decisions (ship first)

_Landed 2026-04-22 in [`src/shared/types.ts`](./src/shared/types.ts) and [`src/shared/constants.ts`](./src/shared/constants.ts)._

- [x] Define outreach action taxonomy:
  - `profile_visit`
  - `connection_request_sent`
  - `message_sent`
  - `followup_message_sent`
- [x] Define prospect lifecycle statuses:
  - `new`
  - `ready_for_visit`
  - `ready_for_connect`
  - `request_sent`
  - `connected`
  - `followup_due`
  - `do_not_contact`
- [x] Define per-day caps as settings (no hardcoded LinkedIn assumptions):
  - `max_profile_visits_per_day` (default **40**)
  - `max_connection_requests_per_day` (default **15**, matches conservative target for 15–30/day manual baseline on clean Premium account)
  - `max_messages_per_day` (default **10** — manual send only, cap is for draft-surfacing)
  - `max_weekly_invites` (default **80**)
  - `shared_bucket` (default `true` — invites count against visits too)
- [x] "Safe mode" = these defaults. Dashboard → Settings exposes sliders/inputs for override, with a warning banner if the user sets anything above 2× default. _(landed 2026-04-23 — `OutreachCapsSection` in [`src/dashboard/routes/Settings.tsx`](./src/dashboard/routes/Settings.tsx) renders a red banner listing every cap over 2× `DEFAULT_OUTREACH_CAPS`; warns that LinkedIn risk scales non-linearly.)_
- [ ] Rollout gates (simplified — no Mode B/C):
  - `v2.0-alpha`: harvester + inbox only, passive browsing fills `feed_events`.
  - `v2.0-beta`: scoring + tier filtering + health dashboard + kill switch. Still no write automation.
  - `v2.0`: Mode A outreach (prefill Connect modal, user clicks Send) + pre-invite visit warming + acceptance watcher.

Acceptance criteria:

- [x] MASTER.md v1.1 supersede block (see top of this doc) is committed in the same PR as Phase 0.
- [x] All new enums/types centralized in `src/shared/types.ts`.
- [x] Default cap values above land as constants in `src/shared/constants.ts`.

---

## Phase 1 - Prospect pipeline + semi-auto outreach queue (highest ROI)

> **Ordering note:** Phase 2 (feed event capture) co-sprints with Phase 1, it does not come after. The scoring model in 1.2 consumes feed-activity recency from 2.1/2.2, and the Engagement Tasks inbox from 2.3 is the primary daily surface before the outreach queue is used in anger. See "Sequencing for fastest payoff" below for the updated sprint order.

### 1.1 Data model and DB migration

_Landed 2026-04-22. DB v1→v2 upgrade hook backfills existing prospect rows; see `openScoutDb()` in [`src/shared/db.ts`](./src/shared/db.ts)._

- [x] Bump DB version to 2 in `src/shared/constants.ts`.
- [x] Add store `outreach_actions`.
- [x] Add store `daily_usage`.
- [x] Add store `message_templates`.
- [x] Add fields to `Prospect`:
  - `lifecycle_status`
  - `priority_score`
  - `score_breakdown`
  - `tier` (`S`, `A`, `B`, `C`, `skip`)
  - `mutual_count`
  - `next_action`
  - `next_action_due_at`
  - `last_level_change_at`
  - `last_outreach_at`

### 1.2 Prioritization engine

_Scoring helper landed 2026-04-22 in [`src/shared/scoring.ts`](./src/shared/scoring.ts) with full unit tests. Settings UI + the recompute-on-change wiring remain open._

- [x] Add deterministic scoring helper `src/shared/scoring.ts` (pure, unit-tested). Formula (confirmed with user, top driver = connection level):

  | Input | Weight | Notes |
  |---|---|---|
  | `level === '2nd'` | +100 | Dominant driver — reachability is the ballgame. |
  | `level === '3rd'` | +20 | Viable only when other signals strong. |
  | `level === 'OUT_OF_NETWORK'` | +5 | Rarely scored high; surfaces only with firm/keyword hits. |
  | `level === '1st'` | **skip** | Already connected — excluded from outreach queue entirely. |
  | Headline keyword match | +0…40 | User-maintained keyword list (seed from `linkedin_private.csv`). Weighted by keyword tier (strong match: Partner / Investor / Principal / Angel / Scout = +40; soft match: Director / Head of = +15). |
  | Firm tier match | +0…40 | User-maintained firm whitelist with per-firm weight. Top-tier VC = +40; mid = +25; boutique / solo = +15. |
  | Mutual connection count | +0…15 | `min(15, round(5 * log2(1 + mutual_count)))` — caps at 20+ mutuals. |
  | Activity recency | +0…20 | `20 * exp(-days_since_last_feed_event / 30)` — 30-day decay. |
  | Cooldown | −30 | Applied if `last_outreach_at` within 14 days. |

- [x] Tier thresholds (Settings-configurable, defaults: **S ≥ 140, A ≥ 100, B ≥ 60, C ≥ 30, skip < 30**). _(DEFAULT_TIER_THRESHOLDS + `settings.outreach.tier_thresholds`)_
- [x] Keyword + firm seed lists are user-maintained via Settings UI. Provide CRUD for both lists with per-item weight fields; persist in the `settings` store. _(landed 2026-04-23 — `KeywordsSection` + `FirmsSection` in [`src/dashboard/routes/Settings.tsx`](./src/dashboard/routes/Settings.tsx); per-row edit + add/remove, full-replace semantics via `SETTINGS_UPDATE`.)_
- [x] Recompute score on:
  - [x] scan completion, _(wired in `scanSingleProspect` after the `done` write — [`src/background/scan-worker.ts`](./src/background/scan-worker.ts))_
  - [x] feed event ingestion (any new `feed_event` for the prospect), _(`FEED_EVENTS_UPSERT_BULK` handler — [`src/background/index.ts`](./src/background/index.ts))_
  - [x] outreach action completion (`invite_sent`, `accepted`, `withdrawn`), _(landed 2026-04-23 — `handleOutreachActionRecord` in [`src/background/index.ts`](./src/background/index.ts) calls `recomputeProspectsByIds([action.prospect_id])` after every record write so the cooldown penalty (−30 inside the 14-day window) refreshes as soon as `last_outreach_at` moves)_
  - [x] keyword/firm list edits (full rescore). _(`SETTINGS_UPDATE` handler diffs `outreach.keywords` / `outreach.firms` / `tier_thresholds` and calls `recomputeAllProspects` on change)_
- [x] Scan queue ordering: `tier DESC, score DESC, last_scanned ASC NULLS FIRST`. _(Sort order landed 2026-04-23 in `takePendingProspectsBatch` / `compareScanQueueOrder`.)_ S/A-tier rows > 30d stale jump priority on next pass. _(Stale-row re-queue mechanism still TODO — sort preserves ordering once rows are flagged pending by an upstream helper.)_
- [x] Unit tests cover each input in isolation + a combined fixture with a representative scored prospect row. _([`tests/scoring.test.ts`](./tests/scoring.test.ts))_

### 1.3 Outreach queue UX (Mode A only)

_Landed 2026-04-23. See [`src/dashboard/routes/OutreachQueue.tsx`](./src/dashboard/routes/OutreachQueue.tsx), [`src/shared/outreach-queue.ts`](./src/shared/outreach-queue.ts), the new `OUTREACH_*` handlers in [`src/background/index.ts`](./src/background/index.ts), and [`src/content/outreach-prefill.ts`](./src/content/outreach-prefill.ts). The detector that flips `sent → accepted` lives in Phase 5.3 and is still open._

- [x] Add Dashboard tab: `Outreach Queue`.
- [x] Filters:
  - [x] level,
  - [x] action type,
  - [x] tier,
  - [x] include-skipped toggle.
  - [x] status (lifecycle_status filter) — landed 2026-04-23 — `lifecycle_statuses` field on `OutreachQueueFilter` in [`src/shared/types.ts`](./src/shared/types.ts); matching filter loop in [`src/shared/outreach-queue.ts`](./src/shared/outreach-queue.ts) `buildCandidates`; Status chip in [`src/dashboard/routes/OutreachQueue.tsx`](./src/dashboard/routes/OutreachQueue.tsx) with the six non-`do_not_contact` lifecycle labels. New unit test in `tests/outreach-queue.test.ts` pins single- and multi-value filtering.
  - [x] due today/overdue — landed 2026-04-23. New `OutreachDueFilter = 'all' | 'due_today' | 'overdue'` on `OutreachQueueFilter` ([`src/shared/types.ts`](./src/shared/types.ts)); pure helpers `classifyDueBucket` + `passesDueFilter` in [`src/shared/outreach-queue.ts`](./src/shared/outreach-queue.ts) bucket `prospect.next_action_due_at` against the local-day boundary so DST drift can't cross-fire. `buildCandidates` reads `now` from new `FilterOptions.now` and applies the filter before recommendation. UI surfaces a 3-state chip (All / Due today / Overdue) next to the lifecycle pill in [`src/dashboard/routes/OutreachQueue.tsx`](./src/dashboard/routes/OutreachQueue.tsx). Data source for due-at is the Phase 3.3 follow-up scheduler that stamps `next_action_due_at` on acceptance — the staleness path itself is still TODO but the filter is live now.
- [x] Queue actions:
  - [x] `Open profile` — opens the prospect URL in a new tab (leaves the user's active LinkedIn window intact for the prefill flow).
  - [x] `Prefill Connect modal` — navigates the active LinkedIn tab to the profile (if not already there), opens the Connect modal via the `example2.html` aria-label CTA, handles the Stage-1 "Add a note" prompt, types the rendered body into the textarea, and highlights Send. **User clicks Send.** (Mode A — the only send mode in v2.)
  - [x] `Copy template` — clipboard copy of the active connect-note / first-message template rendered against the prospect.
  - [x] `Mark request sent` — records an idempotent `connection_request_sent` row in `sent` state + bumps `daily_usage.invites_sent` / `visits` (shared bucket).
  - [x] `Mark message sent` — records a `message_sent` row + bumps `daily_usage.messages_sent`.
  - [x] `Skip for today` — persisted as activity_log entries (`outreach_skipped_today` / `outreach_unskipped_today`) so the skip set survives service-worker restarts without a schema bump.
- [x] Mode A state machine ownership:
  - [x] Background owns `outreach_queue` FSM (`draft → approved → sent → accepted | declined | expired | withdrawn`). Idempotency key = `{prospect_id}:{kind}:{yyyy-mm-dd}`; upsert path handles detector races + manual-override collisions.
  - [x] Content script owns DOM interaction (open modal, fill textarea) via `prefillConnectModal()` in `src/content/outreach-prefill.ts`. Uses a native-setter + synthetic-event path so React's modal doesn't reset the value on focus.
  - [x] Detector (Phase 5.3) owns the `approved → sent` transition, keyed on dialog unmount + toast signal within 3s of Send click. _(landed 2026-04-23 — after `prefillConnectModal` fills the textarea it calls `watchForInviteSent()` in [`src/content/outreach-prefill.ts`](./src/content/outreach-prefill.ts), which attaches capture-phase click listeners to the Send / Cancel buttons and a MutationObserver on the dialog's parent; the collected events are replayed through the pure `decideSendVerdict()` in [`src/shared/send-detector.ts`](./src/shared/send-detector.ts) (10 unit tests). On `sent` verdict the watcher dispatches an `OUTREACH_ACTION_RECORD` with `state: 'sent'`, which hits the existing background idempotency-key upsert path and flips the already-written draft row — no double-writes, no daily-usage double-bumps. `canceled` / `unknown` verdicts leave the draft in place for manual confirm. Mode A invariant honored: we observe clicks, never synthesize them.)_
  - [x] On detector miss, user's manual `Mark request sent` is the fallback; the `needs_review` sidelane is reachable but currently only set explicitly by downstream reconciliation code.
- [~] Pre-invite profile visit warming:
  - [x] Recommender surfaces a `profile_visit` before the invite when `warm_visit_before_invite` is on and no prior visit exists for the prospect (logic lives in `recommendAction()`).
  - [x] Visit counts against `max_profile_visits_per_day` via `incrementDailyUsage({ visits: 1 })` on `sent`. Shared bucket is respected at read time by the budget gate.
  - [x] Settings toggle already exposed (`warm_visit_before_invite`, default `true`).
  - [x] 14-day dedupe window on prior visits — landed 2026-04-23. `WARMING_VISIT_DEDUPE_MS = 14 * 24 * 60 * 60 * 1000` in [`src/shared/constants.ts`](./src/shared/constants.ts) (mirrors the scoring-cooldown horizon). `recommendAction` now picks the most recent confirmed (`sent` / `accepted`) `profile_visit` and treats anything older than 14d as stale — the recommender re-surfaces a fresh warming visit instead of going straight to invite. Aborted / declined visits are ignored when picking the most-recent.
  - [x] 24h delay between warming visit and the subsequent invite — landed 2026-04-23. `WARMING_VISIT_INVITE_DELAY_MS = 24h` in [`src/shared/constants.ts`](./src/shared/constants.ts). Within the 14d window, if the most recent confirmed visit is < 24h old, `recommendAction` returns `null` (prospect is held in warming) instead of immediately recommending the invite. The user can still send manually before the gate elapses; the queue just won't surface it. Conservative single-bound choice rather than the original 24–72h range — simpler invariant, easier to reason about, and the upper-bound was always advisory.
- [x] One-click "Next best target" card in popup (opens the Outreach Queue dashboard tab pre-loaded on the top candidate that fits today's caps).

### 1.4 Template system (single template per type — no A/B in v2.0)

_Landed 2026-04-23. See [`src/dashboard/routes/Templates.tsx`](./src/dashboard/routes/Templates.tsx), [`src/shared/templates.ts`](./src/shared/templates.ts), and the `TEMPLATES_LIST` / `TEMPLATE_UPSERT` / `TEMPLATE_ARCHIVE` handlers in [`src/background/index.ts`](./src/background/index.ts). Outreach-action surfacing (prefill / clipboard copy) lands with Phase 1.3 — the template store + renderer are the prerequisite._

- [x] Add basic template CRUD (exactly one active template per type in v2.0):
  - [x] connection note template (rendered into Connect modal textarea, Mode A).
  - [x] first message template (manual send — clipboard copy only).
  - [x] follow-up template (manual send — clipboard copy only).
- [x] Message/follow-up templates are **clipboard-copy only**. The extension never submits the LinkedIn message composer. (Mode A is invite-only.) _(enforced by the UI kind-switch — only the connect_note preview carries the Mode A cap check; messaging templates remain copy-only until the outreach queue wires them up.)_
- [x] Support placeholders:
  - [x] `{{first_name}}`
  - [x] `{{company}}`
  - [x] `{{mutual_context}}`
  - [x] `{{headline}}`
  - [x] `{{mutual_count}}`
  - [x] `{{recent_post_snippet}}` — pulled from the latest `feed_event` for this prospect; empty string if none. _(renderer supports it via `TemplateRenderContext.recent_post_snippet`; the live lookup lands with Phase 1.3 outreach queue wiring.)_
- [x] Render preview before copy/prefill. _(Templates route shows a live preview against a sample `TemplateRenderContext`; missing/unknown-placeholder warnings rendered inline.)_
- [x] Log template id/version on each completed action (future-proofs v2.1 A/B without paying the cost now). _(landed 2026-04-23 — `handlePrefillConnect` in [`src/dashboard/routes/OutreachQueue.tsx`](./src/dashboard/routes/OutreachQueue.tsx) already stamped both fields on the prefilled-Connect path; manual `Mark request sent` / `Mark message sent` now resolves the active template per kind (`connect_note` for `connection_request_sent`, `first_message` for `message_sent`) and forwards `template_id` + `template_version` into the `OUTREACH_ACTION_RECORD` payload. Falls back to nulls when no active template exists or for non-template actions (`profile_visit` / `followup_message_sent` today).)_
- [x] Enforce invite-note rendered length cap before prefill (Premium: 300 chars; validate at runtime since LinkedIn can change it). _(cap constant `CONNECT_NOTE_CHAR_CAP` in `src/shared/constants.ts`; red warning in preview when exceeded, yellow when > 90 %.)_
- [x] Template quality lint:
  - warn when rendered preview is empty or >20% of scored-in-range targets render missing/empty variables. _(landed 2026-04-25 — pure `lintTemplateAgainstCorpus` in [`src/shared/templates.ts`](./src/shared/templates.ts) runs the body against an arbitrary array of `TemplateRenderContext` and reports `sample_size` / `empty_count` / `any_missing_count` / `per_placeholder` / `missing_rate` / `threshold_exceeded` (default `TEMPLATE_CORPUS_LINT_THRESHOLD = 0.20`, strict greater-than so an exact 20 % rate does NOT trip — matches "more than" wording in the spec). New `TEMPLATE_LINT_CORPUS` message + `handleTemplateLintCorpus` in [`src/background/index.ts`](./src/background/index.ts) sources up to 200 scored-in-range prospects (`tier !== null && tier !== 'skip' && lifecycle_status !== 'do_not_contact'`), ranks them by tier→score so the lint reflects the rows the user is most likely to touch, and renders against `buildRenderContextFromProspect`. `recent_post_snippet` is intentionally passed `null` since v2 doesn't persist post body text — that placeholder honestly counts as missing. Templates editor in [`src/dashboard/routes/Templates.tsx`](./src/dashboard/routes/Templates.tsx) gains a debounced (500 ms) corpus-lint panel under the preview that shows `n=<sample_size>`, missing-rate %, top-3 missing placeholders, and a red banner when over threshold. 6 unit tests in [`tests/templates.test.ts`](./tests/templates.test.ts) cover the happy path, custom-threshold override, strict-greater-than threshold semantics, fully-empty-render counting, and empty-corpus divide-by-zero guard.)_
- [x] **A/B infrastructure deferred to v2.1** — design template table with `version` + `archived` fields so multi-variant can land later without migration. _(already designed; the v2.0 UI creates v1 on first save and bumps the version on every new-draft save after an archive.)_

Acceptance criteria:

- [ ] You can run a full day from queue only (no spreadsheet).
- [ ] All completed actions are persisted and queryable by date.
- [ ] Daily caps are visible and enforced in UI.

---

## Phase 2 - Feed event capture -> actionable task table

> **Ordering note:** This phase co-sprints with Phase 1 (2.1 lands with the 1.1 DB migration, 2.2 runs alongside 1.2). Reason: feed-activity recency is an input to the scoring model, and the inbox is a usable daily surface before any outreach queue action is taken. Building outreach queue first would mean invites sent to dormant targets, which hurts accept rate.

### 2.1 Feed event store

_Landed 2026-04-22 alongside the v2 DB migration. `upsertFeedEvent` / `upsertFeedEventsBulk` in [`src/shared/db.ts`](./src/shared/db.ts)._

- [x] Add store `feed_events` with indexes:
  - `by_slug`
  - `by_prospect_id`
  - `by_event_kind`
  - `by_first_seen_at`
  - `by_task_status`
  - `by_event_fingerprint` (unique dedupe key)
- [x] Event shape includes:
  - `prospect_id`
  - `slug`
  - `event_kind` (`post`, `comment`, `repost`, `reaction`, `mention`, `tagged`)
  - `post_url` (canonical: `https://www.linkedin.com/feed/update/{activity_urn}/`)
  - `comment_url` (canonical: `https://www.linkedin.com/feed/update/{activity_urn}/?commentUrn={comment_urn}`)
  - `activity_urn` (raw URN, e.g. `urn:li:activity:7451889312482283521` — also supports `urn:li:ugcPost:*`, `urn:li:groupPost:*`, `urn:li:share:*` per findings)
  - `comment_urn` (raw URN when event_kind is `comment`, shape `urn:li:comment:(urn:li:activity:X,Y)`)
  - `post_kind` (`activity` | `ugcPost` | `groupPost` | `share`) — derived from URN prefix, useful for filtering group-only traffic later
  - `feed_mode` (`top` or `recent`)
  - `first_seen_at`
  - `last_seen_at`
  - `seen_count`
  - `task_status` (`new`, `queued`, `done`, `ignored`)
- [x] Event fingerprint = sha1(`prospect_id` + `event_kind` + `activity_urn` + `comment_urn || ''`) — stable across SDUI hash churn since URNs survive. _(implemented as sync FNV-1a 64-bit hex; MASTER §19.5 documents the rationale. `computeFeedEventFingerprint` in `scoring.ts`.)_

### 2.2 Content-script extraction

_Landed 2026-04-23 in [`src/content/feed-events.ts`](./src/content/feed-events.ts) (pure extractor + `FeedEventBatcher`), wired into the existing [`src/content/highlight.ts`](./src/content/highlight.ts) scan pass. Background handler in [`src/background/index.ts`](./src/background/index.ts) calls `upsertFeedEventsBulk` + bumps `daily_usage.feed_events_captured`._

- [x] In `src/content/highlight.ts`, batch-capture matched events during scan pass. _(piggybacks on `scanAndHighlight()` via `captureFeedEvents()` — same DOM walk, marginal cost.)_
- [x] Selector strategy (see "DOM Reference" section above for full rationale):
  - **Feed list root:** `div[data-testid="mainFeed"][role="list"]` _(in `FEED_EVENT_SELECTORS.feedListRoot.primary`)_.
  - **Feed card container (primary):** `div[data-testid*="FeedType_MAIN_FEED"]` — each card carries its activity ID in the `data-testid` hash. _(also `componentkey*="FeedType_MAIN_FEED"`.)_
  - **Comment list container (primary):** `div[data-testid*="-commentList"][data-testid*="FeedType_MAIN_FEED"]`.
  - **Classical fallback (last resort only):** `article.feed-shared-update-v2`, `div[data-urn^="urn:li:activity:"]` — legacy surfaces may still render this; try after primary misses.
  - **`/in/{slug}` anchor scan + climb to nearest `data-component-type` or `data-testid*="FeedType_"` ancestor** — cheap path when neither primary nor fallback exposes a URN.
- [x] URN extraction: extract from `data-testid` when present, otherwise from hydration-data JSON via `extractUrnsFromHydration()` helper (see DOM Reference acceptance). _(unified — `extractUrnsFromHydration(card.outerHTML)` picks up both inline attrs and hydration blobs in one pass.)_
- [x] Resolve nearest post permalink:
  - if activity URN in scope: `https://www.linkedin.com/feed/update/{activity_urn}/` _(via `buildPostPermalink`)_.
  - fallback: a direct `href="/feed/update/..."` anchor (timestamp link). _(left as-is; the `buildPostPermalink` null is the documented signal for "no stable permalink" — consumers can fall back on the anchor href.)_
- [x] Resolve comment permalink when in comments context: _(via `buildCommentPermalink`)_
  - if comment URN in scope: `https://www.linkedin.com/feed/update/{activity_urn}/?commentUrn={comment_urn}`.
  - comment URN shape observed: `urn:li:comment:(urn:li:activity:{activity_id},{comment_id})`.
- [x] Post type classification using URN prefix: `urn:li:activity:*` (post), `urn:li:ugcPost:*` (user-generated), `urn:li:groupPost:*` (group post), `urn:li:share:*` (shared link), `urn:li:comment:*` (comment). _(via `classifyPostKindFromUrn`.)_
- [x] Send events in debounced bulk message to background:
  - `FEED_EVENTS_UPSERT_BULK` with debounce **500ms** + max batch **50** events. Overflow batches flush immediately and restart the debounce window. Prevents per-scroll write-amplification on fast feeds. _(constants exported + pinned by `tests/feed-events-pure.test.ts`.)_
- [x] Dedupe on `event_fingerprint` to keep only new events. _(two layers: in-tab `FeedEventBatcher.seenFingerprints` pre-messaging, plus `upsertFeedEventsBulk` idempotency at the DB.)_
- [x] Track per-event `feed_mode` (`top`/`recent`) and `first_seen_at/last_seen_at/seen_count`. _(detected via `detectFeedModeFromUrl(location.href)` from `?sortBy=`; DB bumps `last_seen_at` + `seen_count` on fingerprint hit.)_
- [x] Wait condition for lazy-loaded cards: observe `data-component-type="LazyColumn"` boundaries; don't emit events for cards that haven't finished rendering their actor anchor. _(`isInsideUnhydratedLazyColumn` — skips cards under a `data-loading="true"` LazyColumn.)_

### 2.3 Event backlog UI

_Landed 2026-04-23 — [`src/dashboard/routes/EngagementTasks.tsx`](./src/dashboard/routes/EngagementTasks.tsx) + `FEED_EVENTS_QUERY` / `FEED_EVENT_UPDATE` / `FEED_EVENTS_BULK_UPDATE` handlers in [`src/background/index.ts`](./src/background/index.ts). `chrome.action` badge wired to `countFeedEventsByTaskStatus('new')` with 2 s trailing-edge debounce._

- [x] Add Dashboard tab: `Engagement Tasks`.
- [x] Columns:
  - investor,
  - event type,
  - post link,
  - comment link,
  - seen count,
  - last seen,
  - task status.
- [x] Bulk actions:
  - `Queue outreach`,
  - `Mark done`,
  - `Ignore`.
- [x] Deep link from task -> open LinkedIn post/comment. _(post + comment URLs open in new tab via `target="_blank"`; investor name deep-links into Prospects drawer.)_
- [x] Add extension badge count via `chrome.action.setBadgeText`: count of `task_status IN ('new')` feed events. Debounced to at most once per 2s. Clears to empty when count is 0. _(trailing-edge throttle; seeds on service-worker boot + `onInstalled`; refreshes on bulk upsert / single update / bulk update / clear-all.)_

Acceptance criteria:

- [ ] Feed browsing automatically builds a deduped task backlog.
- [ ] Both post and comment links are stored when available.
- [ ] Duplicate events do not inflate queue counts.

---

## Phase 3 - Feed crawler (continuous while running) + unlock discovery

> **Operating model (confirmed with user):** No `chrome.alarms`-based scheduler. No working-hours window. Harvester runs continuously while `scan_state.status === 'running'` AND at least one `linkedin.com/*` tab is open. Start/Pause in popup is the only switch. Manual "Feed Crawl Session" button exists for ad-hoc pushes (e.g., run once without starting the full worker loop).

### 3.1 Continuous harvester + manual crawl session

_Manual Feed Crawl Session landed 2026-04-23. Passive continuous harvester (scan-worker peer) deferred — Mode A invite flow depends on harvested signal, and the manual button covers the "I want to refresh my event inbox now" path without the coordination complexity of running alongside the scan worker. Pure helpers in [`src/shared/feed-crawler.ts`](./src/shared/feed-crawler.ts) with 18 unit tests in [`tests/feed-crawler.test.ts`](./tests/feed-crawler.test.ts). In-tab runner in [`src/content/feed-crawler.ts`](./src/content/feed-crawler.ts). Background session state + activity-log telemetry in [`src/background/index.ts`](./src/background/index.ts) (`handleFeedCrawlSessionStart` / `handleFeedCrawlSessionStop`). Popup button + status row in [`src/popup/App.tsx`](./src/popup/App.tsx) (`FeedCrawlSessionRow`)._

- [x] Harvester is a peer of scan-worker under the same Start/Pause control:
  - When `scan_state.status === 'running'` and any active `linkedin.com/*` tab exposes a feed view (`/feed`, `/feed/?sortBy=*`), harvester extracts events from that tab passively.
  - When the user scrolls the feed themselves, events are captured in the normal highlighter pass (no extra scrolling).
  - When no user scrolling has happened in 30s and harvester is "owed" a pass (cooldown elapsed), it performs **one** gentle scroll cycle: `scrollBy(600–1200px)` with ±20% gaussian jitter, wait 2–5s, observe.
  - Per-run stop conditions: no-new-events-for-3-scrolls, max 20 scrolls, or user interaction (keyboard/scroll/click) resets cooldown and yields.
  _(Landed 2026-04-25 — pure decision logic in [`src/shared/passive-harvester.ts`](./src/shared/passive-harvester.ts) (`decidePassiveHarvest` reports the first failing gate: `scan_not_running` / `manual_session_running` / `no_linkedin_tab` / `cooldown_active` / `user_active`; 14 unit tests in [`tests/passive-harvester.test.ts`](./tests/passive-harvester.test.ts)). Background scheduler in [`src/background/passive-harvester.ts`](./src/background/passive-harvester.ts) uses a self-rearming `setTimeout` loop (no `chrome.alarms`) that wakes every `PASSIVE_HARVEST_TICK_INTERVAL_MS = 60_000`, picks the active LinkedIn feed tab via `pickActiveFeedTab()` (worker-owned tabs excluded via `getOwnedTabIds()`), and dispatches a single-mode `FEED_CRAWL_RUN_IN_TAB { passive: true }` when the gate clears. New `passive` flag on `RunFeedCrawlOptions` ([`src/content/feed-crawler.ts`](./src/content/feed-crawler.ts)) skips `ensureFeedMode` and runs ONE pass against the user's current sort (top/recent), so the harvester never navigates out from under the user. Existing user-interaction guards (keydown / mousedown / touchstart / wheel / non-programmatic scroll) yield immediately with `stop_reason='user_interaction'`, which the scheduler records as `lastUserInteractionAt` to extend the idle gate. Cooldown defaults: `PASSIVE_HARVEST_COOLDOWN_MS = 5 * 60_000`, `PASSIVE_HARVEST_USER_IDLE_MS = 30_000`. Wired in `SCAN_START` / `SCAN_RESUME` (arms scheduler when `state.status === 'running'`) and `SCAN_PAUSE` / auto-pause hook (stops scheduler) in [`src/background/index.ts`](./src/background/index.ts); also re-armed on every SW boot via `getScanState()` so MV3 worker recycles don't silence it. Telemetry: `passive_harvest_cycle_start` / `_end` / `_failed` / `_skipped` activity-log entries; skip log debounced (5 min per identical reason) so the scheduler doesn't flood the logs while the user is actively browsing.)_
- [x] Manual `Feed Crawl Session` button in popup/dashboard — runs one pass both sorts (Top then Recent) regardless of Start/Pause state. _(Popup "Run feed crawl session" button; blocked while `scan_state.status === 'running'` so the two workers don't fight for the tab. Background owns the `FEED_CRAWL_SESSION_START / STOP / STATUS` messages and dispatches `FEED_CRAWL_RUN_IN_TAB` to the active LinkedIn feed tab via the existing `sendMessageToTab` helper.)_
- [x] Session config (for both passive and manual modes):
  - [x] max scroll steps per pass _(`FEED_CRAWL_MAX_SCROLLS_PER_MODE = 20` in `src/shared/constants.ts`)_,
  - [x] pause jitter range _(`FEED_CRAWL_MIN_WAIT_MS` / `FEED_CRAWL_MAX_WAIT_MS` in ms, `FEED_CRAWL_MIN_SCROLL_PX` / `FEED_CRAWL_MAX_SCROLL_PX` in px; jitter applied by `pickScrollStep` via a Box–Muller draw, clamped to absolute bounds)_,
  - [x] feed mode pass order (Top → Recent) _(`MODES = ['top', 'recent']` in `src/content/feed-crawler.ts`)_.
- [x] **No dedicated background harvest tab** — requires the user to have a LinkedIn tab open. Revisit in v2.1 only if harvest coverage proves insufficient after 30+ days of clean operation. _(honored — the crawler operates inside the active feed tab; background rejects the start when no `/feed` tab is active.)_
- [x] Stop conditions:
  - [x] no new events for N cycles _(`FEED_CRAWL_NO_NEW_EVENTS_STOP = 3`; `shouldStopCrawl` returns `'no_new_events'`)_,
  - [x] manual stop _(`FEED_CRAWL_SESSION_STOP` sends `FEED_CRAWL_CANCEL_IN_TAB`, in-tab runner flips `isCanceled` → returns `'canceled'`)_,
  - [x] safety stop (auto-pause reason set) — landed 2026-04-25. New `registerAutoPauseHook(hook)` registry in [`src/background/scan-worker.ts`](./src/background/scan-worker.ts) fires every registered hook after `autoPause()` flips the scan state and writes its `scan_auto_paused` log entry. Hooks run in registration order; thrown errors are caught + warned so a misbehaving hook can't block the pause itself. [`src/background/index.ts`](./src/background/index.ts) registers a hook that checks `feedCrawlState.running` and, when set, writes a `feed_crawl_session_safety_stop` activity-log entry (with `{ reason, session_id, tab_id }`) and reuses the existing `handleFeedCrawlSessionStop()` path — which dispatches `FEED_CRAWL_CANCEL_IN_TAB` to the in-tab runner. The crawler terminates with `stop_reason='canceled'` and lands the normal `feed_crawl_session_end` log entry, so the activity trail shows both the safety reason (kill-switch / captcha / rate_limit / auth_wall) and the canceled session in chronological order. Avoids a content-script SCAN_STATE watch entirely — coordination stays inside the service worker where the autoPause transition originates. No new chrome.alarms, no new state machine.,
  - [x] user started typing / scrolling in any LinkedIn tab _(keydown / mousedown / touchstart / wheel / non-programmatic scroll all flip `user_interacted`; `shouldStopCrawl` returns `'user_interaction'`)_.
- [x] Harvester-run telemetry: `run_start`, `run_end`, `events_captured`, `duration`, `stop_reason`, `mode` (Top/Recent). _(activity_log entries: `feed_crawl_session_start` on dispatch, `feed_crawl_session_end` on completion with `{ duration_ms, total_events_captured, overlap_count, stop_reason, modes[] }`; `feed_crawl_session_failed` on tab error. Popup status row surfaces the last completed session summary inline.)_

### 3.2 Feed mode switching + per-mode metrics

_Landed 2026-04-23 alongside Phase 3.1. `isOnFeedMode` + `buildModeUrl` in [`src/shared/feed-crawler.ts`](./src/shared/feed-crawler.ts); overlap counter (`computeOverlap`) covered by unit tests._

- [x] Helper that checks current feed mode (`top`/`recent`) via URL query param `sortBy`. _(pre-existing `detectFeedModeFromUrl` in [`src/content/feed-events.ts`](./src/content/feed-events.ts) plus the new boolean `isOnFeedMode(href, mode)` helper used by the crawler to skip the nav when we're already in the target mode.)_
- [x] If harvester owes a pass in a mode the user isn't currently viewing, it switches URL (same tab) during the pass and restores on completion. _(Manual session dispatches `location.assign(buildModeUrl(mode))`, waits for `[data-testid="mainFeed"]` / `componentkey*="FeedType_MAIN_FEED"` to mount (15 s timeout via `FEED_CRAWL_FEED_READY_TIMEOUT_MS`), then drops into the scroll loop. We do **not** restore to the original URL — the session ends with the feed in Recent mode; this matches the "I want to refresh my inbox" intent and keeps the content script small. Revisit if the restore behavior matters for continuous passive harvester.)_
- [x] Persist per-session mode metrics: _(surfaced in the `FeedCrawlSessionResult` returned by the content script + echoed in the `feed_crawl_session_end` activity-log payload; popup `FeedCrawlSessionRow` renders them inline beneath the button.)_
  - [x] events found in top _(per-mode `FeedCrawlModeMetrics.events_captured`)_,
  - [x] events found in recent _(per-mode `FeedCrawlModeMetrics.events_captured`)_,
  - [x] overlap percentage _(`FeedCrawlSessionResult.overlap_count` — absolute count; popup renders "overlap N"; the percentage is trivial to derive in the analytics dashboard)_.
- [x] Popup footer surfaces: "Harvester: running · N events captured this session" or "Harvester: idle (click Start to run)". No "next run at" — there is no schedule. _(`FeedCrawlSessionRow` renders "Session running since HH:MM" while live and the last-session summary when idle: "Last session: N new events (top X, recent Y, overlap Z) · Ns · stop-reason".)_
- [x] Log yield reasons (user-activity-detected / safety-pause / no-new-events) to `activity_log`. _(stop reason lives on both `FeedCrawlSessionResult.stop_reason` and each per-mode row; written into the `feed_crawl_session_end` log entry so the Logs tab shows the reason without a separate event.)_

### 3.3 Unlock tracking

_Landed 2026-04-23. Level transitions + acceptance watcher ship on the scan-complete path in [`src/background/scan-worker.ts`](./src/background/scan-worker.ts); the detection logic is pure in [`src/shared/acceptance-watcher.ts`](./src/shared/acceptance-watcher.ts) (13 unit tests). Newly-unlocked 2nd-degree rows get a +25 scoring boost for the 7 days after the level change — see `recentUnlockScore` in [`src/shared/scoring.ts`](./src/shared/scoring.ts). Follow-up draft auto-generation + dashboard unlock surfacing are open follow-ups._

- [x] On scan completion, detect level transitions:
  - [x] `OUT_OF_NETWORK -> 3rd`
  - [x] `3rd -> 2nd`
  - [x] `2nd -> 1st`
- [x] Log transitions in `activity_log` (event `level_transition` with `{ from, to, accepted_action_id }`). _(No dedicated `level_history` store — the activity log is the system of record; `Prospect.last_level_change_at` stamps the most recent transition for scoring.)_
- [x] Surface "newly unlocked 2nd-degree" in queue with highest priority. _(Implemented as a flat +`SCORE_WEIGHTS.recent_unlock_boost` bonus on 2nd-degree rows within `recent_unlock_days` of the transition. Promotes borderline rows into a higher tier for the window.)_
- [~] Add acceptance watcher:
  - [x] if outreach state is live (`draft` / `approved` / `sent` / `needs_review`) and level becomes `1st`, mark `accepted`. _(Scan-worker bundles the transition into the same DB write as the level bump; `outreach_actions.resolved_at` is stamped and `Prospect.lifecycle_status` flips to `connected`. Organic accepts — no prior invite — still flip lifecycle.)_
  - [x] auto-generate follow-up draft (manual send only). _(landed 2026-04-23 — scan-worker acceptance path in [`src/background/scan-worker.ts`](./src/background/scan-worker.ts) fetches the active `followup` template via `getActiveMessageTemplate`, renders against the freshly-updated prospect, inserts an `outreach_actions` row (kind `followup_message_sent`, state `draft`) with idempotency key keyed to the due-day bucket (`now + FOLLOWUP_DRAFT_DELAY_MS`, default 3 days), and stamps `prospect.next_action` + `next_action_due_at`. Collisions on the unique idempotency_key index (rescan of an already-accepted row) are logged and swallowed. Existing in-flight `draft`/`approved` follow-ups are not duplicated. Null template → row is still created without a rendered body so the queue still surfaces the touch. Logged as `followup_draft_created` activity event.)_

Acceptance criteria:

- [ ] You can run daily crawl sessions and see net-new events/tasks by mode.
- [x] Newly unlocked 2nd-degree investors are auto-prioritized. _(recent_unlock_boost in `src/shared/scoring.ts` promotes fresh 2nd-degree rows by a flat +25 for 7 days; outreach queue sort order already reads `tier DESC, priority_score DESC` so the boost shows up in `next_best` first.)_

---

## Phase 4 - Analytics (weekly deep-dive) + popup daily quick-glance + health

### 4.1 Popup daily quick-glance (confirmed review cadence)

_Landed 2026-04-23 — popup renders a `Today` section above the Scan controls backed by a new `DAILY_SNAPSHOT_QUERY` message. See [`src/popup/App.tsx`](./src/popup/App.tsx) `DailyGlanceSection` + [`src/background/index.ts`](./src/background/index.ts) handler. Accepts/pending-invite counters and the "Next Best Target" CTA land with Phase 1.3._

- [x] Add a new row to the popup showing today's operational numbers:
  - [x] `Today: X/15 invites · Y/40 visits · Z events captured · N inbox unread`. _(per-metric tile with used/cap + progress bar; inbox tile shows `new` count and today's captured events)_
  - [x] `Accepts today: A · Pending invites: P` (pending = `sent` + not yet resolved). _(Landed alongside Phase 3.3 — `countAcceptedActionsForDay` + `countPendingInvites` in [`src/shared/db.ts`](./src/shared/db.ts); `DAILY_SNAPSHOT_QUERY` surfaces both and the popup `DailyGlanceSection` renders them in the row beneath the budget tiles.)_
  - [x] Budget remaining + warning chip if <20% of daily budget left.
- [x] Popup "Next Best Target" CTA reads the top-of-queue tier + score. _(Landed 2026-04-23 with Phase 1.3 — `NextBestTargetRow` in `src/popup/App.tsx` fires `OUTREACH_QUEUE_QUERY` with `limit: 1` and opens the dashboard queue on click.)_

### 4.2 Dashboard analytics (weekly deep-dive)

_Landed 2026-04-23. Pure aggregator lives in [`src/shared/analytics.ts`](./src/shared/analytics.ts) (`computeAnalyticsSnapshot`, `buildMonthBuckets`, `build12WeekBuckets`, `weekStartBucket`, `firmTierBucket`) with 15 unit tests in [`tests/analytics.test.ts`](./tests/analytics.test.ts). Dashboard `/analytics` route in [`src/dashboard/routes/Analytics.tsx`](./src/dashboard/routes/Analytics.tsx) renders the 30-day action sparkline (stacked by kind), 12-week accept-rate chart, event→action latency tile, inbox-handled tile, and three cohort tables. Background handler `ANALYTICS_SNAPSHOT_QUERY` in [`src/background/index.ts`](./src/background/index.ts) hydrates the pure computer from `getAllProspects` + `getAllOutreachActions` + `getAllFeedEvents` + `getDailyUsageRange(today, 30)` — no dedicated store, same on-demand approach as the Phase 4.3 health snapshot._

- [x] Dashboard KPIs:
  - [x] actions/day by type (stacked-bar sparkline, 30d),
  - [x] accept rate by week (bar + overlay line, 12w),
  - [x] avg time from event → action (sample size / median / p90 tiles — uses `outreach_action.source_feed_event_id` when set, else nearest preceding `feed_event` for the prospect),
  - [x] events captured vs inbox handled ratio.
- [x] Cohort slices:
  - [x] by level at first touch _(uses current `Prospect.level` as proxy — v2 doesn't snapshot level-at-invite-time on the action row; acceptable since `last_level_change_at` already marks transitions)_,
  - [x] by firm tier _(derived from `score_breakdown.firm` weight: top ≥ 30, mid ≥ 15, boutique > 0)_,
  - [x] by event type source (post / comment / repost / reaction / mention / tagged / no-event).
- [x] **Template A/B reporting deferred to v2.1** — single-template v2.0 doesn't need it. Log template id/version now so v2.1 can reconstruct. _(landed 2026-04-26 — `handleOutreachActionRecord` in [`src/background/index.ts`](./src/background/index.ts) now auto-resolves `template_id` + `template_version` from `getActiveMessageTemplate()` whenever the inbound payload omits them on a template-bearing kind (`connection_request_sent → connect_note`, `message_sent → first_message`, `followup_message_sent → followup`; `profile_visit` is template-less and skipped). Closes the gap where detector-originated writes (the send-detector path in [`src/content/outreach-prefill.ts`](./src/content/outreach-prefill.ts) was already stamping; the message-sent detector in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) and the followup-draft path in [`src/background/scan-worker.ts`](./src/background/scan-worker.ts) were not) landed without template metadata. Existing manual-confirm path in `OutreachQueue` keeps its explicit stamp — passing fields wins, the auto-resolve is the fallback. Idempotency-key upsert path is unaffected: when a draft already exists with non-null template fields, the existing values are preserved (per the `existing.template_id`/`existing.template_version` merge); when both are null, the auto-resolved values now stamp them on the upgrade write.)_
- [x] Cap recommendations:
  - [x] show historical completion + warning trend _(implicit via the 30-day actions chart + 12-week accept-rate chart; breach floor surfaces on the Health tab)_,
  - [x] suggest manual cap adjustments (never auto-escalate) _(landed 2026-04-23 — `deriveCapRecommendation` in [`src/dashboard/routes/Analytics.tsx`](./src/dashboard/routes/Analytics.tsx) reads `snapshot.accept_rate_12w` over a trailing 4-week window (invite-weighted) and compares against `DEFAULT_KILL_SWITCH_THRESHOLDS.accept_rate_floor` / `invites_sent_min`. Three tones: `warn` when rate < floor or < 1.5× floor (advises lowering cap / holding steady), `good` when healthy (notes headroom but never suggests an auto-escalate), `info` when sample size is below `invites_sent_min`. Surfaced via `<CapRecommendations>` section with a contextual icon + bullet details — replaces the prior static prose card. Honors the v2 "never auto-escalate" invariant.)_

### 4.3 Health snapshots + kill switch

_Landed 2026-04-23. Computed on-demand from activity_log + daily_usage + outreach_actions (no dedicated `health_snapshots` store — keeps the DB schema flat and cheaper than a midnight rollup for 7 rows). Pure logic in [`src/shared/health.ts`](./src/shared/health.ts) (`computeHealthSnapshot`, `detectKillSwitchBreach`, `computeResumeCooldown`, `buildWeekBuckets`) with 21 unit tests in [`tests/health.test.ts`](./tests/health.test.ts). New `AutoPauseReason = 'health_breach'` fires via `checkAndTripKillSwitch()` at the tail of every scanned row inside the scan loop (no new `chrome.alarms` — Phase 4.3 invariant). Dashboard `/health` route in [`src/dashboard/routes/Health.tsx`](./src/dashboard/routes/Health.tsx) renders threshold tiles + 7-day stacked sparkline + breach banner with countdown + Resume button that surfaces the cooldown error. Settings page gains a Health section for `health_cooldown_hours` (0–168) + the four kill-switch threshold fields._

- [x] Daily `health_snapshots` rollup at local midnight: _(implemented as on-demand aggregation via `HEALTH_SNAPSHOT_QUERY` — the rollup store was skipped; 7 days of daily_usage + filtered activity_log + outreach_actions are cheap to read on tab open)_
  - [x] invites sent/accepted (7d),
  - [x] accept rate (7d),
  - [x] captcha/rate-limit/auth-wall hits (7d),
  - [x] harvested events (7d),
  - [x] profile visits (7d).
- [x] Kill-switch triggers (auto-pause with `auto_pause_reason = 'health_breach'`):
  - [x] `accept_rate_7d < accept_rate_floor` (default 15%) AND `invites_sent_7d >= invites_sent_min` (default 20) — sample-size gate,
  - [x] any `safety_trigger_max` (default 2) safety triggers in `safety_window_hours` (default 24h) rolling window.
  - [x] LinkedIn restriction banner detected by content script. _(landed 2026-04-23 — pure matcher in [`src/shared/restriction-banner-detector.ts`](./src/shared/restriction-banner-detector.ts) (requires unambiguous phrase OR `unusual activity` co-occurring with a restriction hint to avoid false positives). Watcher runs once per content-script lifetime from [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) against `[role="alert"]` / `.artdeco-toast-item` / `.artdeco-notice` / main-area headings; fires-once guard prevents re-reports across mutations. Background handler `handleLinkedInRestrictionBanner` logs `restriction_banner_seen` + calls the new exported `triggerHealthBreach('restriction_banner', …)` from [`src/background/scan-worker.ts`](./src/background/scan-worker.ts), which sets `auto_pause_reason = 'health_breach'` (idempotent: already-breached state short-circuits) and logs `kill_switch_tripped`. Resume cooldown in `resumeScan()` gates recovery for the configured window. 8 unit tests in [`tests/restriction-banner-detector.test.ts`](./tests/restriction-banner-detector.test.ts).)_
- [x] **Kill-switch cooldown:** after breach, manual resume is gated by a minimum `health_cooldown_hours` (default **24**, Settings-configurable). `resumeScan()` returns an error with the cooldown payload until `last_breach_at + cooldown_hours` elapses — captcha / rate_limit / auth_wall auto-pauses are NOT gated so the user can still clear a CAPTCHA and resume.
- [x] Dashboard `/health` route with sparkline charts + threshold indicators. _(pure Tailwind div stacked bars — no chart library.)_

Acceptance criteria:

- [ ] Daily glance takes <5s in the popup.
- [ ] Weekly review can be done fully in dashboard Analytics.
- [ ] Health breach → auto-pause → 24h cooldown → typed-confirm resume is demonstrable end-to-end.

---

## Phase 5 - Inbox-driven action tracking (auto reconciliation)

Goal: when you open an Inbox/Queue item in a new tab and act manually on LinkedIn, the extension auto-updates the corresponding todo/outreach row.

### 5.1 Tracking model

_Landed 2026-04-23 — DB bumped to v3 in [`src/shared/constants.ts`](./src/shared/constants.ts); new `interaction_events` + `correlation_tokens` stores in [`src/shared/db.ts`](./src/shared/db.ts). The `interaction_events` audit trail is append-only (dedupe via the unique `by_fingerprint` index) and carries `reconciliation_status` + `confidence` + `source_task_id` + `source_token` per row. Per-row state on `feed_events` / `outreach_actions` is intentionally unchanged — interaction_events is the system of record, joined by `source_task_id` or `prospect_id` when the UI needs it._

- [x] Add store `interaction_events`:
  - `id`, `prospect_id`, `interaction_type` (`opened_from_inbox` / `reacted` / `unreacted` / `commented` / `invite_sent` / `message_sent` / `profile_visited` / `invite_withdrawn`), `fingerprint` (unique), `activity_urn`, `target_url`, `detected_at`, `confidence` (`high` / `medium` / `low`), `reconciliation_status` (`matched` / `needs_review` / `unmatched`), `source_task_id`, `source_token`, `data`.
- [x] Add store `correlation_tokens` — IDB-persisted so MV3 service-worker recycles + cross-tab correlation still work. Keyed on the token value; indexed by `by_expires_at` + `by_prospect_id`. GC'd on every write via `gcExpiredCorrelationTokens` (upperBound cursor on `expires_at`).
- [ ] Add lightweight state on task/outreach rows (deferred — the interaction_events row is sufficient audit for v2.0; promote if the Auto-tracked badge turns out to be expensive to compute on-read).

### 5.2 Inbox open instrumentation

_Landed 2026-04-23 — [`src/dashboard/routes/EngagementTasks.tsx`](./src/dashboard/routes/EngagementTasks.tsx) fires `INTERACTION_TOKEN_OPEN` via `onMouseDown` on the post / comment link before the browser dispatches the `<a target="_blank">` click. `onMouseDown` fires strictly before `onClick`, so the write kicks off on the background service worker in parallel with the tab-open. Fire-and-forget — a token write failure can't block the user's navigation._

- [x] "Open post" / "Open comment" buttons in Engagement Tasks open via a tracked wrapper that fires `INTERACTION_TOKEN_OPEN` with `{ task_id, prospect_id, action_expected: 'reacted' | 'commented' }` before navigation. _(Outreach Queue "Open profile" + "Prefill Connect" wiring landed 2026-04-23 — `handleOpenProfile` in [`src/dashboard/routes/OutreachQueue.tsx`](./src/dashboard/routes/OutreachQueue.tsx) fires `INTERACTION_TOKEN_OPEN { action_expected: 'profile_visited' }` before `window.open`, and `handlePrefillConnect` fires `{ action_expected: 'invite_sent' }` before dispatching the prefill message. Both use fire-and-forget so a token write failure can't block the user's nav. Reconciliation against the profile-visit detector (Phase 5.6) + send detector (Phase 5.3) now sees a live token from the queue path — raising confidence from `medium` to `high` on URN-resolved detections.)_
- [x] Emit `opened_from_inbox` interaction event synchronously when the token is written — background stamps it as `reconciliation_status = 'matched'` against the fresh token so the click itself is auditable even when no downstream detector fires.
- [x] Persist the correlation token in IDB (`correlation_tokens` store) — survives MV3 service-worker recycles + cross-tab operation (click in dashboard tab, detector fires in LinkedIn tab). Default window 45 min via `CORRELATION_TOKEN_DEFAULT_WINDOW_MS`; Settings-tunable not yet wired.

### 5.3 Action detectors (content script)

- [~] Detect high-confidence manual outcomes:
  - [x] reaction state toggled on target post/comment. _(landed 2026-04-23 — pure verdict in [`src/shared/reaction-toggled-detector.ts`](./src/shared/reaction-toggled-detector.ts) (`decideReactionVerdict` + `parseReactionState`, 9 unit tests). Content-side watcher in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) scans every `button[aria-label^="Reaction button state:"]` via delegated MutationObserver on `document.body`, attaches per-button `aria-label`-attribute watchers (bounded by a WeakSet + 45 s timeout), and resolves the post's author slug by preferring the `/in/` anchor scoped to the `"Open control menu for post by {NAME}"` element (per `example8.html` to disambiguate mentions from author on multi-actor cards). Activity URN recovered via the existing `extractActivityUrnFromElement` when hydration JSON exposes it. Emits `REACTION_TOGGLED_DETECTED` to the background, which logs `reaction_given_to_prospect_post` / `reaction_removed_from_prospect_post`, correlates to a `feed_events` row by exact URN (falls back to the newest `task_status='new'` row for the prospect when the URN can't be resolved), and flips the row to `done` on `reacted` / back to `new` on `unreacted`. Badge refresh runs on match so the engagement-tasks inbox count updates in-place. No `daily_usage` bump — reactions don't consume budget; no `outreach_actions` write — reactions aren't outreach.)_
  - [x] comment successfully posted in thread. _(landed 2026-04-23 — two-signal correlation (composer cleared + new comment node appended) within `DEFAULT_COMMENT_POST_WINDOW_MS` of the submit click. Pure verdict logic in [`src/shared/comment-posted-detector.ts`](./src/shared/comment-posted-detector.ts) (`decideCommentVerdict`, `MIN_COMMENT_CONFIRMATION_SIGNALS = 2` of 2) with 10 unit tests in [`tests/comment-posted-detector.test.ts`](./tests/comment-posted-detector.test.ts). Content-side watcher in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) scans for comment composer submit buttons (`button.comments-comment-box__submit-button`, `button[aria-label="Post comment"]`, `form.comments-comment-box__form button[type="submit"]`) via a delegated MutationObserver on `document.body`, reuses the reaction detector's `findFeedCardContainer` / `findAuthorSlugForCard` helpers to scope to tracked prospects, then attaches a per-button capture-phase click listener + comment-list childList observer + composer characterData/childList observer. Emits `COMMENT_POSTED_DETECTED` to the background, which logs `comment_posted_to_prospect_post` and flips the matching `feed_events` row (exact activity_urn match preferred, newest `task_status='new'` row as fallback) from `new` to `done`. Badge refresh runs on match so the engagement-tasks inbox count updates in-place. No `daily_usage` bump — comments don't consume budget; no `outreach_actions` write — comments aren't outreach.)_
  - [x] connect request sent confirmation. _(landed 2026-04-23 — dialog-unmount + Send-click correlation in `watchForInviteSent` ([`src/content/outreach-prefill.ts`](./src/content/outreach-prefill.ts)); pure verdict logic in [`src/shared/send-detector.ts`](./src/shared/send-detector.ts); 10 unit tests in [`tests/send-detector.test.ts`](./tests/send-detector.test.ts). Emits `OUTREACH_ACTION_RECORD { state: 'sent' }` which upserts the existing draft via the stable `{prospect}:{kind}:{day}` idempotency key — daily_usage bump + `last_outreach_at` stamp happen exactly once per invite regardless of detector + manual-confirm overlap.)_
  - [x] message sent confirmation in thread. _(landed 2026-04-23 — three-signal correlation (new `li.msg-s-event-listitem` appended + composer reset to `<p><br></p>` + send button re-disabled) within `DEFAULT_MESSAGE_SEND_WINDOW_MS` of Send click. Pure verdict logic in [`src/shared/message-sent-detector.ts`](./src/shared/message-sent-detector.ts) (`decideMessageVerdict`, `MIN_CONFIRMATION_SIGNALS = 2` of 3); content-side watcher in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) attaches to `/messaging/thread/{id}/` full-thread pages only, resolves the recipient by scanning `/in/{slug}` anchors in the thread DOM (group threads are skipped — ambiguous attribution). Emits `OUTREACH_ACTION_RECORD { kind: 'message_sent', state: 'sent' }` through the same `{prospect}:{kind}:{day}` idempotency path. 9 unit tests in [`tests/message-sent-detector.test.ts`](./tests/message-sent-detector.test.ts) cover the three-signal threshold, pre-send-click confirmation rejection, window clamping, error-toast fallback, and custom window overrides.)_
- [x] Emit structured events to background for reconciliation. _(landed 2026-04-25 — every non-sent → sent transition in `handleOutreachActionRecord` ([`src/background/index.ts`](./src/background/index.ts)) now writes an `interaction_events` row via `recordInteractionAndReconcile` keyed by the new `mapOutreachKindToInteractionType` helper (`profile_visit → profile_visited`, `connection_request_sent → invite_sent`, `message_sent` / `followup_message_sent → message_sent`). Closes the orphan: previously profile-visit and message-sent detectors emitted only `OUTREACH_ACTION_RECORD` and never landed in the audit trail; now they participate in the same correlation-token reconciliation as the reaction / comment / withdrawal paths. Detector + manual-confirmation races collapse on the existing 2 s fingerprint bucket so no double-audit. Reconciliation lands `unmatched / low` when no live correlation token exists, per the "always-on detectors, correlation-optional" spec from §5.6.)_
- [x] Guard for SPA navigation and delayed DOM updates. _(already wired — [`src/content/highlight.ts`](./src/content/highlight.ts) lines 1018–1048 patch `history.pushState` / `replaceState` + listen for `popstate`, debounce 250 ms, and re-invoke `startInteractionDetectorsForUrl()` on every route change. Per-detector guards (`visitWatcherSlug`, `messageWatcherThreadId`, `withdrawalWatcherAttachedPath`) prevent duplicate observer attachment. Drawer + reaction + comment observers persist across SPA nav via global flags + WeakSet dedupe so they don't get garbage-collected on route change.)_

### 5.4 Reconciliation engine

_Landed 2026-04-23 — pure matcher in [`src/shared/reconciliation.ts`](./src/shared/reconciliation.ts) (`pickMatchingToken`, `isActionCompatible`, `computeReconciliationStatus`, `buildInteractionFingerprint`, `generateCorrelationTokenId`) with 18 unit tests in [`tests/reconciliation.test.ts`](./tests/reconciliation.test.ts). Wired from detector handlers in [`src/background/index.ts`](./src/background/index.ts) via the shared `recordInteractionAndReconcile` helper (reaction / comment / withdrawal paths). Auto-transition of dependent rows (feed_events / outreach_actions / lifecycle_status) is the follow-up; for v2.0 the reconciled `interaction_event` row is the source of truth the UI can join against._

- [x] Match detected action to the most likely open Inbox/Queue item using `prospect_id` + action compatibility (`reacted` tokens match `unreacted` observations — the user may undo inside the window) + time window (expired tokens are excluded after `gcExpiredCorrelationTokens`).
- [x] Token selection picks the most recently opened non-expired non-consumed token (`sort((a, b) => b.opened_at - a.opened_at)[0]`). Tokens are one-shot — `consumeCorrelationToken` flips `consumed = true` when matched, so a second detector firing against the same click can't double-match it.
- [x] Confidence ladder:
  - token matched + URN resolved → `high` / `matched`
  - token matched + no URN → `medium` / `matched`
  - no token → `low` / `unmatched` (captured as organic — row still lands in the audit trail)
- [~] Auto-transition states — feed_events already flip `new → done` on URN match via the existing Phase 5.3 detector handlers; queue item / outreach row state transitions beyond the existing Mode A + acceptance + withdrawal paths remain open. **Lifecycle-status auto-advance landed 2026-04-26** — pure helper `nextLifecycleAfterOutreachSent` in [`src/shared/lifecycle.ts`](./src/shared/lifecycle.ts) maps every detector- or queue-confirmed `sent` outreach action to the next prospect lifecycle: `profile_visit` advances `new` / `ready_for_visit` → `ready_for_connect`, `connection_request_sent` advances pre-request states (`new` / `ready_for_visit` / `ready_for_connect`) → `request_sent`, `message_sent` / `followup_message_sent` are no-ops (the user is messaging an existing connection — nothing to advance). Forward-only: `do_not_contact` is never overwritten and post-acceptance states (`connected` / `followup_due` / `request_sent`) never regress. Wired in [`src/background/index.ts`](./src/background/index.ts) `handleOutreachActionRecord` after the `becameSent` block, behind a try/catch so a lifecycle write failure can't roll back the outreach record. Logs `lifecycle_status_advanced` to `activity_log` with `{ from, to, kind, action_id }` so the audit trail covers the transition. 21 unit tests in [`tests/lifecycle.test.ts`](./tests/lifecycle.test.ts) pin the no-regress invariants and the do_not_contact lock. Acceptance (request_sent → connected) keeps living in [`src/shared/acceptance-watcher.ts`](./src/shared/acceptance-watcher.ts) since it triggers from a level transition, not from an outreach write. feed_events / outreach_actions row state transitions beyond Mode A still remain open for v2.1.
- [x] `needs_review` sidelane with one-click confirm chip — landed 2026-04-25. New `resolveInteractionEventReview(id, 'matched' | 'unmatched')` in [`src/shared/db.ts`](./src/shared/db.ts) flips the row's `reconciliation_status` and stamps `data.review_resolved_at` / `data.review_resolution` for audit. New `INTERACTION_REVIEW_RESOLVE` message ([`src/shared/types.ts`](./src/shared/types.ts)) + background handler ([`src/background/index.ts`](./src/background/index.ts)) logs `interaction_review_resolved` to the activity log. UI: each row in `NeedsReviewPanel` ([`src/dashboard/routes/EngagementTasks.tsx`](./src/dashboard/routes/EngagementTasks.tsx)) now carries Confirm (promotes to `matched`) and Dismiss (downgrades to `unmatched`) chips with optimistic remove + refresh-on-error fallback.

### 5.5 UX + auditability

_Landed 2026-04-23. Auto-track visibility + reversibility + needs-review surfacing. See [`src/dashboard/routes/EngagementTasks.tsx`](./src/dashboard/routes/EngagementTasks.tsx) (chips + badge + Undo button + needs-review panel), `bulkAutoTrackFeedEvents` + `undoAutoTrackFeedEvent` + `listNeedsReviewInteractionEvents` in [`src/shared/db.ts`](./src/shared/db.ts), and the `FEED_EVENT_UNDO_AUTO_TRACK` / `INTERACTIONS_NEEDS_REVIEW` handlers in [`src/background/index.ts`](./src/background/index.ts)._

- [x] Add "Auto-tracked" badge + timestamp on rows updated by reconciliation. _(FeedEvent rows now carry `auto_tracked_at` / `auto_tracked_source` / `previous_task_status` (no DB bump needed — IDB stores are field-schemaless). Reaction + comment detector handlers call the new `bulkAutoTrackFeedEvents()` which stamps all three fields atomically with the status flip; the engagement-tasks table renders a Sparkles pill "Auto · 3m ago" with tooltip showing source + absolute timestamp.)_
- [x] Add filter "Needs review" for unresolved matches. _(New `INTERACTIONS_NEEDS_REVIEW` message scans `interaction_events` for `reconciliation_status='needs_review'` and the dashboard shows a dismissible amber panel listing the ambiguous matches with prospect deep-link. Filter chip also auto-hides when count is zero.)_
- [x] Log all reconciliations in activity log with before/after state. _(Reaction / comment handlers now append a `feed_event_auto_tracked` log entry per transition with `{ before: { task_status }, after: { task_status }, source, activity_urn }` — the audit trail survives the Undo path's clear-in-place of `previous_task_status` on the row itself.)_
- [x] Provide undo for last auto-update (time-limited). _(`FEED_EVENT_UNDO_AUTO_TRACK` handler flips `task_status` back to `previous_task_status`, stamps `auto_tracked_source = 'manual_undo'`, clears the previous_task_status, logs `feed_event_auto_track_undone`, and refreshes the badge. UI gates the Undo button to a 10-minute window (`AUTO_TRACK_UNDO_WINDOW_MS`) and hides it for rows already reverted. 4 new unit tests in `tests/db-v2.test.ts` cover the stamp + no-op-when-already-in-target + revert + missing-row paths.)_

### 5.6 Detector coverage gaps (hardening)

- [x] **Always-on detectors, correlation-optional.** Detectors in 5.3 run on every `linkedin.com/*` page regardless of inbox correlation window. Emitting an `interaction_event` is decoupled from matching it to an inbox/queue row:
  - detector always writes the raw event _(landed earlier — `recordInteractionAndReconcile` in [`src/background/index.ts`](./src/background/index.ts) writes the `interaction_events` row unconditionally, with `confidence='low' / reconciliation_status='unmatched'` when no live correlation token exists)._
  - reconciliation engine correlates to an inbox row only if a live correlation token exists _(landed earlier — `pickMatchingToken` short-circuits when no token is in window; the audit row still lands)._
  - organic interactions (no inbox click) still upsert a `feed_event` into `engaged` state so daily activity is captured. _(landed 2026-04-25 — new `ensureOrganicFeedEvent()` helper in [`src/background/index.ts`](./src/background/index.ts) is called from the reaction (`direction='reacted'`) + comment handlers when no existing `feed_events` row matches the resolved `activity_urn`. Inserts via `upsertFeedEvent` keyed on `computeFeedEventFingerprint`, so a passive harvester that later sees the same post collapses onto the row instead of duplicating it. The "engaged" state from the spec maps to our existing `task_status='done' + auto_tracked_source` schema — keeps badge counts, analytics filters, and the FeedTaskStatus enum (`'new' | 'queued' | 'done' | 'ignored'`) unchanged. The fresh row goes through the same `bulkAutoTrackFeedEvents()` path as URN-matched rows so the Engagement Tasks UI surfaces the "Auto-tracked (reaction|comment)" pill + Undo within the 10 min window. Organic detection is skipped on `unreacted` (nothing to revert) and on URN-less observations (would risk duplicate rows since fingerprint would be unstable). `post_kind` + `post_url` are derived from the URN via `classifyPostKindFromUrn` / `buildPostPermalink`; `feed_mode` defaults to `'unknown'` since organic detections fire on diverse surfaces (post permalinks, profile pages) — not just the feed.)_
- [x] **Multi-action fan-out per correlation token.** _(landed 2026-04-23 — `recordInteractionAndReconcile` in [`src/background/index.ts`](./src/background/index.ts) no longer calls `consumeCorrelationToken` on match; tokens stay live for the full window (default 45 min) so a single inbox click can fan out to multiple interactions (e.g. react + comment on the same post). Per-action dedupe is already enforced by the `interaction_events.by_fingerprint` unique index (2 s bucket). The `pickMatchingToken` helper still honors any explicitly-consumed flag on a token for backwards compatibility. New regression test in [`tests/reconciliation.test.ts`](./tests/reconciliation.test.ts) pins that the same token matches both `reacted` and `unreacted` observations inside the window.)_
  - correlation token stays active for full window (not consumed on first match),
  - each detected action produces its own `interaction_event` row,
  - inbox row transitions to `engaged` on first match; subsequent actions append to its timeline.
- [~] **Message surface coverage.** Message-sent detector now handles two of three LinkedIn surfaces:
  - [x] full messaging page `/messaging/thread/{id}/` (Phase 5.3).
  - [x] slide-out drawer on feed / profile / search pages — landed 2026-04-25. New `startDrawerMessageWatcher` in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) runs a global MutationObserver over `aside#msg-overlay` looking for newly-mounted `button.msg-form__send-button` (or `form.msg-form button[type="submit"]`) inside `.msg-overlay-conversation-bubble` containers. Each new send button gets the existing `attachMessageSentWatcher` attached, scoped to its bubble so multi-bubble drawers don't cross-attribute. Recipient resolution scans `/in/{slug}` anchors **inside the bubble container only** via the now-`scope`-aware `resolveThreadRecipient` — group threads (multiple matched prospects) are still skipped to avoid mis-attribution. Per-button WeakSet (`drawerSendButtonWatcherAttached`) prevents duplicate watchers across re-scans. Reuses the same three-signal verdict (`message-sent-detector.ts`) and the same `OUTREACH_ACTION_RECORD { kind: 'message_sent', state: 'sent' }` idempotency path — drawer + full-page sends collapse to the same `{prospect}:message_sent:{day}` row, no double-bumps.
  - [ ] pop-out / new-window messaging view — pop-out renders the same `aside#msg-overlay` DOM in a child window, so the existing drawer watcher already covers the common case once the highlight content script is injected there. Confirming end-to-end coverage requires a fixture + `all_frames` review, deferred.
- [x] **Profile-visit dwell threshold.** _(landed 2026-04-23 — pure verdict in [`src/shared/profile-visit-detector.ts`](./src/shared/profile-visit-detector.ts) (`decideVisitVerdict`: `top_card_rendered` then `dwell_elapsed` → `counts`; any `tab_closed` / `visibility_hidden` / `navigated_away` before dwell → `aborted`). Content-side watcher in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) runs on every `/in/{slug}/` page where the slug matches a tracked prospect: waits for the top-card selector (primary `section[componentkey$="Topcard"]`, fallback `main h1`) to render, then fires a dwell timer keyed off `settings.outreach.profile_visit_dwell_ms` (default 8000, already wired via `DEFAULT_PROFILE_VISIT_DWELL_MS`). Tab-close / SPA-nav / visibility-hidden (past a 2 s grace window) before dwell aborts the watcher without bumping the budget. On `counts`, emits `OUTREACH_ACTION_RECORD { kind: 'profile_visit', state: 'sent' }` — same-day dedupe via the `{prospect}:profile_visit:{day}` idempotency key, so reloading the profile later the same day doesn't double-bump `daily_usage.visits`. 8 unit tests in [`tests/profile-visit-detector.test.ts`](./tests/profile-visit-detector.test.ts).)_
  - Clicking "Open profile" only emits `profile_visited` after dwell >= 8s AND top-card rendered.
  - Tab close before threshold does not count against visit budget.
  - Configurable in Settings (`profile_visit_dwell_ms`, default 8000).
- [x] **Invite withdrawal detection.** _(landed 2026-04-23 — pure verdict logic in [`src/shared/withdrawal-detector.ts`](./src/shared/withdrawal-detector.ts) (`decideWithdrawalVerdict` resolves `withdraw_clicked` + `row_removed` / `toast_seen` / `undo_clicked` / `timeout` events inside a 4 s window; 11 unit tests in [`tests/withdrawal-detector.test.ts`](./tests/withdrawal-detector.test.ts) pin the semantics incl. undo-after-confirmation = canceled, undo-before-confirmation = withdrawn, timeout = unknown). Content-side watcher in [`src/content/interaction-detectors.ts`](./src/content/interaction-detectors.ts) attaches a delegated capture-phase click listener on `/mynetwork/invitation-manager/sent/` against `a[aria-label^="Withdraw invitation sent to "]` (confirmed in `example7.html`), walks to the enclosing row, resolves slug → prospect via the existing SlugMap cache, then runs the verdict loop against a row-removal MutationObserver + toast observer. New message `OUTREACH_WITHDRAW_DETECTED` reaches `handleOutreachWithdrawDetected` in [`src/background/index.ts`](./src/background/index.ts): finds the live `connection_request_sent` row via `getLiveConnectionRequestForProspect`, flips it to `withdrawn` (stamps `resolved_at`), and credits the budget back by decrementing `daily_usage.invites_sent` **and** `visits` for the `sent_at`-bucket day (shared-bucket parity with `bumpDailyUsageForKind`; `incrementDailyUsage` clamps at 0 so partial histories can't drive the budget negative). Logs `outreach_withdrawn` with `{ action_id, slug, sent_at, credited_day_bucket }`; unmatched withdrawals log `outreach_withdraw_unmatched` at warn level. Recompute + broadcast follow the same path as `OUTREACH_ACTION_RECORD`.)_
  - ~~Content script watches `linkedin.com/mynetwork/invitation-manager/sent/` and connect-modal withdraw flows for the toast/confirmation.~~ _(Sent-tab flow covers the common case; connect-modal mid-flight withdrawal is rare and deferred.)_
  - ~~On detect: outreach row `sent -> withdrawn`, credit daily/weekly invite budget back (subject to LinkedIn actually restoring the slot — never assume).~~ _(Credit is applied to the `sent_at` day bucket, not today's, so weekly invite totals stay accurate. We credit knowing LinkedIn may or may not actually restore the slot — the user can re-invite at their discretion.)_
  - ~~Log withdrawal in activity log with original `sent_at` + elapsed time.~~ _(`outreach_withdrawn` event logs `action_id`, `slug`, original `sent_at`, and the `credited_day_bucket`; elapsed time is `Date.now() - sent_at` at read time.)_
- [x] **Cross-tab correlation.** _(landed 2026-04-23 — tokens live in the new `correlation_tokens` IDB store, keyed on the token value with `by_expires_at` + `by_prospect_id` indexes. Matching happens exclusively via background message handlers so a token written from the dashboard tab is immediately visible to a detector firing in a LinkedIn tab. `gcExpiredCorrelationTokens` runs on every `INTERACTION_TOKEN_OPEN` and every detector reconcile so a stale token can't false-match. Token record shape: `{ token, task_id, prospect_id, action_expected, opened_at, expires_at, consumed }` — the `consumed` flag makes tokens one-shot and prevents fan-out across duplicate detector fires. Default 45 min window via `CORRELATION_TOKEN_DEFAULT_WINDOW_MS`; Settings knob deferred.)_

Acceptance criteria:

- [ ] Opening from Inbox and acting manually updates rows without checkbox clicking in most cases.
- [ ] Duplicate detections do not create duplicate completions.
- [ ] Ambiguous detections never silently corrupt state (they route to `needs_review`).
- [ ] Organic LinkedIn interactions (not initiated from inbox) are still captured as `interaction_events` and upsert `feed_events`.
- [ ] Messages sent from any of the three LinkedIn messaging surfaces are detected.
- [ ] Withdrawn invites flip state and credit budget back.

---

## File-level implementation map

- [ ] `src/shared/types.ts`
  - add new entities (feed events, outreach actions, templates, lifecycle enums, interaction events, new messages).
- [ ] `src/shared/constants.ts`
  - DB version bump and defaults for outreach caps.
- [ ] `src/shared/db.ts`
  - migration + CRUD/query helpers for new stores.
- [~] `src/background/index.ts`
  - [x] handlers for `FEED_EVENTS_UPSERT_BULK`, template CRUD, outreach queue queries (`OUTREACH_QUEUE_QUERY`), outreach action recording + skip (`OUTREACH_ACTION_RECORD`, `OUTREACH_SKIP_TODAY`), Mode A modal dispatch (`OUTREACH_PREFILL_CONNECT`).
  - [x] Feed Crawl Session handlers (`FEED_CRAWL_SESSION_START` / `STOP` / `STATUS`) + tab-direct `FEED_CRAWL_RUN_IN_TAB` / `FEED_CRAWL_CANCEL_IN_TAB` dispatch.
  - [x] reconciliation messages (Phase 5.1/5.2/5.4/5.6) — `INTERACTION_TOKEN_OPEN` / `INTERACTIONS_LIST` handlers in `src/background/index.ts` (2026-04-23). `recordInteractionAndReconcile` helper runs at the tail of the existing reaction / comment / withdrawal detector handlers; profile-visit + message-sent + invite-sent reconcile paths landed 2026-04-25 — `handleOutreachActionRecord` now fires `recordInteractionAndReconcile` on every non-sent → sent transition keyed via `mapOutreachKindToInteractionType` so all detector-originated outreach surfaces share the audit trail.
- [ ] `src/content/highlight.ts`
  - event extraction + debounced bulk upsert messaging.
- [ ] `src/content/*` (new detector module)
  - detect manual reactions/comments/invite-send/message-send outcomes for reconciliation.
- [ ] `src/popup/App.tsx`
  - queue quick actions and cap snapshot widgets.
- [ ] `src/dashboard/App.tsx`
  - new routes (`OutreachQueue`, `EngagementTasks`, `Analytics`).
- [ ] `src/dashboard/routes/*`
  - implement UI tables and bulk actions.
- [ ] `tests/*`
  - add contract tests for event fingerprint dedupe, queue scoring, cap enforcement, and reconciliation matching.

---

## Sequencing for fastest payoff

Front-loads the harvester so scoring has real feed-recency signal by the time outreach queue UX lands, and the inbox is the first usable daily surface.

**Sprint 1 — Foundations + inbox-first (v2.0-alpha target):**

- [x] Phase 0 (defaults, types, MASTER v1.1 supersede block committed)
- [x] Phase 1.1 (DB migration + all new stores, including `feed_events`)
- [x] Phase 2.1 (feed_events schema ships with the 1.1 migration — same DB bump)
- [x] Phase 2.2 (content-script extraction + 500ms/50-batch debounce — passive browsing starts filling the inbox immediately) _(landed 2026-04-23 — `src/content/feed-events.ts`, wired into existing highlight scan pass, `FEED_EVENTS_UPSERT_BULK` message + background handler + `daily_usage.feed_events_captured` bump.)_
- [x] Phase 1.2 scoring (formula + unit tests; Settings UI for keyword/firm lists) _(formula + tests landed 2026-04-22; Settings UI for lists deferred)_
- [x] DB migration dry-run + backup utility (export current prospects to JSON before v1→v2 migration) _([`src/shared/backup.ts`](./src/shared/backup.ts))_

**Sprint 2 — Inbox visible, queue+templates (v2.0-beta target):**

- [x] Phase 2.3 (Engagement Tasks UI + `chrome.action` badge) _(landed 2026-04-23)_
- [x] Phase 1.2 scoring-recompute triggers + §19.4 queue ordering _(landed 2026-04-23 — `src/shared/prospect-scoring.ts`, scan-complete + feed-event + settings-edit hooks)_
- [x] Phase 4.1 popup daily quick-glance row _(landed 2026-04-23 — `DailyGlanceSection` + `DAILY_SNAPSHOT_QUERY`)_
- [x] Phase 1.3 (Outreach Queue UX + Mode A prefill flow + pre-invite visit warming) _(landed 2026-04-23 — see §1.3 above; 24–72h visit-delay scheduler deferred to Phase 3.3)_
- [x] Phase 1.4 (single-template-per-type CRUD with placeholders + length cap) _(landed 2026-04-23 — `src/dashboard/routes/Templates.tsx`, `src/shared/templates.ts`, background CRUD handlers)_
- [x] Keyword / firm seed-list Settings UI (prerequisite for scoring to differentiate tiers beyond `level`) _(landed 2026-04-23 — `KeywordsSection` + `FirmsSection` + `OutreachCapsSection` + `TierThresholdsSection` in Settings page)_

**Sprint 3 — Crawler + unlock discovery:**

- [x] Phase 3.1 (continuous harvester + manual Feed Crawl Session button) _(Manual button landed 2026-04-23 — `src/shared/feed-crawler.ts` + `src/content/feed-crawler.ts` + popup `FeedCrawlSessionRow`. Passive continuous harvester landed 2026-04-25 — `src/shared/passive-harvester.ts` (pure gate) + `src/background/passive-harvester.ts` (setTimeout-based scheduler) + `passive: true` flag on `FEED_CRAWL_RUN_IN_TAB` for single-mode no-nav passes.)_
- [x] Phase 3.2 (top/recent mode switching + per-mode telemetry) _(landed 2026-04-23 — `isOnFeedMode` / `buildModeUrl` / `computeOverlap` in `src/shared/feed-crawler.ts`; per-mode `events_captured` + overlap surfaced in `FeedCrawlSessionResult` + popup status row; activity_log `feed_crawl_session_end` carries the mode breakdown.)_
- [x] Phase 3.3 (unlock tracking + acceptance watcher) _(landed 2026-04-23 — `src/shared/acceptance-watcher.ts` + scan-worker wiring; follow-up draft auto-gen deferred to Phase 5.5)_

**Sprint 4 — Analytics + health (v2.0 release candidate):**

- [x] Phase 4.2 core analytics (KPIs, cohort slices — no A/B in v2.0) _(landed 2026-04-23 — `src/shared/analytics.ts` + `src/dashboard/routes/Analytics.tsx` + `ANALYTICS_SNAPSHOT_QUERY` handler. Cap-recommendation heuristic deferred until we have 4+ weeks of steady data.)_
- [x] Phase 4.3 health snapshots + kill-switch thresholds + 24h cooldown _(landed 2026-04-23 — `src/shared/health.ts`, `src/dashboard/routes/Health.tsx`, `checkAndTripKillSwitch()` + `resumeScan()` cooldown gate in `src/background/scan-worker.ts`, Settings HealthSection; restriction-banner detector deferred to Phase 5.3.)_

**Sprint 5 — Auto reconciliation:**

- [ ] Phase 5.1–5.5 (detector modules + reconciliation engine + UX)
- [ ] FP-rate target: ≥80% of detector-matched actions land as `matched` without user confirmation. Below that → revisit detector heuristics, don't ship.

---

## Explicit non-goals for v2

- [ ] **No auto-click on Send.** Connect modal is prefilled; user clicks Send. (Mode A only.)
- [ ] **No auto Message / DM submission, ever.** Message templates are clipboard-copy only.
- [ ] **No auto reactions, comments, or posts.**
- [ ] **No Mode B (batch-approve)** — dropped entirely per user decision.
- [ ] **No Mode C (headless send)** — dropped entirely per user decision.
- [ ] **No `chrome.alarms` scheduler** for harvests/outreach. Only day-bucket rollover + 30s orphan-tab watchdog (v1 carryover).
- [ ] **No working-hours window.** Runs while `scan_state.status === 'running'` + LinkedIn tab open.
- [ ] **No cloud sync, no CRM integration, no Sheets push.** Local-only.
- [ ] **No Chrome Web Store submission.**
- [ ] **No private LinkedIn API usage** (Voyager etc.). DOM-only.
- [ ] **No template A/B infrastructure in v2.0** — deferred to v2.1 if accept rates plateau.
- [ ] **No multi-list / multi-account support.**

## Migration behavior (v1 → v2)

- [x] On DB v1→v2 upgrade: auto-rescore all existing prospects once, using the Phase 1.2 formula against current level + metadata. _(landed 2026-04-25 — `postOpen` hook in [`src/background/migration-boot.ts`](./src/background/migration-boot.ts) calls `recomputeAllProspects()` whenever the on-disk DB came up at `oldVersion < 2 < newVersion`. Logs `db_upgrade_rescore` to `activity_log` with `{ from, to, updated, skipped }` so the audit trail captures the one-shot pass. Wired via the new `registerDbBootHooks` API in [`src/shared/db.ts`](./src/shared/db.ts), which runs the pre/post hooks around `openDB()` and tracks `oldVersion` from the `upgrade` callback.)_
- [x] Pre-migration JSON backup of `prospects` and `settings` stores written to `chrome.downloads` before schema mutation — user recovery path if migration fails. _(landed 2026-04-25 — `preOpen` hook in [`src/background/migration-boot.ts`](./src/background/migration-boot.ts) reads `chrome.storage.local.db_version_on_last_boot` and uses `shouldBackupBeforeUpgrade` from [`src/shared/backup.ts`](./src/shared/backup.ts) to decide whether to snapshot. When yes, it calls `createDbSnapshot()` (no-version `indexedDB.open()` so the upgrade hasn't fired yet) and `downloadDbSnapshot()` to drop a JSON blob via `chrome.downloads`. Skips when fresh-install (snapshot null) or already-at-target. The `postOpen` hook then stamps the new version into `chrome.storage.local` so subsequent boots short-circuit. `manifest.json` already declares `downloads` permission — no manifest change needed. Race-safety: hooks register synchronously at `index.ts` module load via `registerMigrationBoot()` before any `openScoutDb()` call, and `openScoutDb()` itself awaits the `preOpen` hook before invoking `openDB()`.)_
- [x] `max_weekly_invites` default (80) is a ceiling, not a target; Settings UI surfaces live 7d invite count so the user can adjust after observing account behavior. _(landed 2026-04-25 — `OutreachCapsSection` in [`src/dashboard/routes/Settings.tsx`](./src/dashboard/routes/Settings.tsx) now reads `HEALTH_SNAPSHOT_QUERY` on mount (parallel with `SETTINGS_QUERY`) and renders a live "Last 7d invites: N / cap" tile under the cap fields with a colored progress bar. Three-tone status: emerald when under 80 % of the weekly cap, amber 80–99 %, red at-or-above the cap. Helper text reminds the user the cap is a ceiling, not a target. The 7-day count comes from the existing pure `computeHealthSnapshot()` in [`src/shared/health.ts`](./src/shared/health.ts) (`invites_sent_7d`) which already aggregates `daily_usage` + `outreach_actions` over the rolling window — no new DB queries.)_
