# LinkedIn Investor Scout - Growth Extension TODO

Last updated: 2026-04-23
Owner: Mirza + Codex
Status: **Canonical v2 plan.** `TODO-v2.md` is superseded — see that file's header for the pointer. **Sprint 1 foundations landed 2026-04-22** (Phase 0 + 1.1 + 2.1 + scoring helper + backup utility + MASTER v1.1 §19). **Phase 2.2 content-script extractor landed 2026-04-23** — `extractUrnsFromHydration` helper, `FEED_EVENT_SELECTORS` tuples, debounced bulk `FEED_EVENTS_UPSERT_BULK` (500ms / max-50), piggybacked on the existing highlight scan pass. Sprint 2 can now start on UI.

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
- [ ] **Kill switch mandatory** — write actions auto-pause when health thresholds breach (7d accept-rate floor, repeated safety triggers, restriction-banner detection). Manual resume only, with a minimum cooldown (default 24h, Settings-configurable).
- [x] **Idempotency keys** on every write and event — stable action id + event fingerprint prevent double-send / double-count across service-worker restarts. _(`outreach_actions.by_idempotency_key` unique + `feed_events.by_event_fingerprint` unique)_
- [ ] **Active-tab-only operation** — all scheduled work (scan, harvest, outreach queue progression) is gated on `scan_state.status === 'running'` AND at least one open `linkedin.com/*` tab. No `chrome.alarms` except for daily-bucket rollover at local midnight and the existing 30s orphan-tab watchdog.
- [x] **Local-only** — no network egress except to `linkedin.com`. No telemetry, no cloud sync, no external integration in v2.

## MASTER.md v1.1 supersede block (to write before Phase 1 ships)

Concrete list of MASTER.md sections that v2 contradicts. A `MASTER.md` v1.1 amendment section must land in the same PR as Phase 0.

_Landed 2026-04-22 — see [`MASTER.md`](./MASTER.md) §19._

- [x] **§3.2 Out of Scope** — `Working-hours scheduler` stays out of scope (confirmed). `Re-scan staleness scheduler` becomes in-scope for S/A tier only (Phase 1.4 / 3.3).
- [x] **§3.3 Non-Goals** — relax "never clicks Connect / submits any form" to allow **Mode A only**: extension may open the Connect modal and prefill the note textarea; the user still clicks Send. All other write surfaces (DMs, reactions, comments, posts, follows) remain fully manual.
- [x] **§6.3 CSV Export Format** — append columns after `notes`: `score`, `tier`, `lifecycle_status`, `mutual_count`, `last_outreach_at`. Column order frozen at v2.0.
- [x] **§7.2 Scan Queue ordering** — change from `id ASC` to `tier DESC, score DESC, last_scanned ASC NULLS FIRST`. S/A-tier rows > 30d stale get priority re-queue.

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
- [ ] "Safe mode" = these defaults. Dashboard → Settings exposes sliders/inputs for override, with a warning banner if the user sets anything above 2× default. _(defaults live, UI in follow-up)_
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
- [ ] Keyword + firm seed lists are user-maintained via Settings UI. Provide CRUD for both lists with per-item weight fields; persist in the `settings` store. _(storage shape + putSettings merge landed; UI follows)_
- [ ] Recompute score on:
  - scan completion,
  - feed event ingestion (any new `feed_event` for the prospect),
  - outreach action completion (`invite_sent`, `accepted`, `withdrawn`),
  - keyword/firm list edits (full rescore).
- [ ] Scan queue ordering: `tier DESC, score DESC, last_scanned ASC NULLS FIRST`. S/A-tier rows > 30d stale jump priority on next pass.
- [x] Unit tests cover each input in isolation + a combined fixture with a representative scored prospect row. _([`tests/scoring.test.ts`](./tests/scoring.test.ts))_

### 1.3 Outreach queue UX (Mode A only)

- [ ] Add Dashboard tab: `Outreach Queue`.
- [ ] Filters:
  - status,
  - level,
  - action type,
  - tier,
  - due today/overdue.
- [ ] Queue actions:
  - `Open next profile` — navigates the active tab to the prospect's canonical URL.
  - `Prefill Connect modal` — opens Connect dialog on the loaded profile, types the rendered note into the textarea, highlights the Send button. **User clicks Send.** (Mode A — the only send mode in v2.)
  - `Copy template` — clipboard copy of rendered note / message for manual paste flows.
  - `Mark request sent` — manual override if auto-detector misses.
  - `Mark message sent` — manual override for DMs.
  - `Skip for today`.
- [ ] Mode A state machine ownership:
  - Background owns `outreach_queue` FSM (`draft → approved → sent → accepted | declined | expired | withdrawn`).
  - Content script owns DOM interaction (open modal, fill textarea).
  - Detector (Phase 5.3) owns the `approved → sent` transition, keyed on dialog unmount + toast signal within 3s of Send click.
  - On detector miss, user's manual `Mark request sent` is the fallback; row routes through `needs_review`.
- [ ] Pre-invite profile visit warming:
  - before a `connection_request_sent` is queued for a prospect, auto-queue a `profile_visit` action 24–72h earlier on the same prospect so the target receives a "X viewed your profile" notification first (measurable lift on accept rate).
  - visit consumes `max_profile_visits_per_day` from the unified bucket; skip the warming slot if budget is exhausted but do not block the invite.
  - user-toggleable in Settings (`warm_visit_before_invite`, **default `true`** per interview).
  - dedupe: skip warming if any `profile_visit` on this prospect already exists within the last 14 days.
- [ ] One-click "Next Best Target" button in popup (opens top-of-queue prospect, no auto-send).

### 1.4 Template system (single template per type — no A/B in v2.0)

- [ ] Add basic template CRUD (exactly one active template per type in v2.0):
  - connection note template (rendered into Connect modal textarea, Mode A).
  - first message template (manual send — clipboard copy only).
  - follow-up template (manual send — clipboard copy only).
- [ ] Message/follow-up templates are **clipboard-copy only**. The extension never submits the LinkedIn message composer. (Mode A is invite-only.)
- [ ] Support placeholders:
  - `{{first_name}}`
  - `{{company}}`
  - `{{mutual_context}}`
  - `{{headline}}`
  - `{{mutual_count}}`
  - `{{recent_post_snippet}}` — pulled from the latest `feed_event` for this prospect; empty string if none.
- [ ] Render preview before copy/prefill.
- [ ] Log template id/version on each completed action (future-proofs v2.1 A/B without paying the cost now).
- [ ] Enforce invite-note rendered length cap before prefill (Premium: 300 chars; validate at runtime since LinkedIn can change it).
- [ ] Template quality lint:
  - warn when rendered preview is empty or >20% of scored-in-range targets render missing/empty variables.
- [ ] **A/B infrastructure deferred to v2.1** — design template table with `version` + `archived` fields so multi-variant can land later without migration.

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

- [ ] Harvester is a peer of scan-worker under the same Start/Pause control:
  - When `scan_state.status === 'running'` and any active `linkedin.com/*` tab exposes a feed view (`/feed`, `/feed/?sortBy=*`), harvester extracts events from that tab passively.
  - When the user scrolls the feed themselves, events are captured in the normal highlighter pass (no extra scrolling).
  - When no user scrolling has happened in 30s and harvester is "owed" a pass (cooldown elapsed), it performs **one** gentle scroll cycle: `scrollBy(600–1200px)` with ±20% gaussian jitter, wait 2–5s, observe.
  - Per-run stop conditions: no-new-events-for-3-scrolls, max 20 scrolls, or user interaction (keyboard/scroll/click) resets cooldown and yields.
- [ ] Manual `Feed Crawl Session` button in popup/dashboard — runs one pass both sorts (Top then Recent) regardless of Start/Pause state.
- [ ] Session config (for both passive and manual modes):
  - max scroll steps per pass,
  - pause jitter range,
  - feed mode pass order (Top → Recent).
- [ ] **No dedicated background harvest tab** — requires the user to have a LinkedIn tab open. Revisit in v2.1 only if harvest coverage proves insufficient after 30+ days of clean operation.
- [ ] Stop conditions:
  - no new events for N cycles,
  - manual stop,
  - safety stop (auto-pause reason set),
  - user started typing / scrolling in any LinkedIn tab.
- [ ] Harvester-run telemetry: `run_start`, `run_end`, `events_captured`, `duration`, `stop_reason`, `mode` (Top/Recent).

### 3.2 Feed mode switching + per-mode metrics

- [ ] Helper that checks current feed mode (`top`/`recent`) via URL query param `sortBy`.
- [ ] If harvester owes a pass in a mode the user isn't currently viewing, it switches URL (same tab) during the pass and restores on completion.
- [ ] Persist per-session mode metrics:
  - events found in top,
  - events found in recent,
  - overlap percentage.
- [ ] Popup footer surfaces: "Harvester: running · N events captured this session" or "Harvester: idle (click Start to run)". No "next run at" — there is no schedule.
- [ ] Log yield reasons (user-activity-detected / safety-pause / no-new-events) to `activity_log`.

### 3.3 Unlock tracking

- [ ] On scan completion, detect level transitions:
  - `OUT_OF_NETWORK -> 3rd`
  - `3rd -> 2nd`
  - `2nd -> 1st`
- [ ] Log transitions in `level_history`.
- [ ] Surface "newly unlocked 2nd-degree" in queue with highest priority.
- [ ] Add acceptance watcher:
  - if outreach state is `sent` and level becomes `1st`, mark `accepted`.
  - auto-generate follow-up draft (manual send only).

Acceptance criteria:

- [ ] You can run daily crawl sessions and see net-new events/tasks by mode.
- [ ] Newly unlocked 2nd-degree investors are auto-prioritized.

---

## Phase 4 - Analytics (weekly deep-dive) + popup daily quick-glance + health

### 4.1 Popup daily quick-glance (confirmed review cadence)

- [ ] Add a new row to the popup showing today's operational numbers:
  - `Today: X/15 invites · Y/40 visits · Z events captured · N inbox unread`.
  - `Accepts today: A · Pending invites: P` (pending = `sent` + not yet resolved).
  - Budget remaining + warning chip if <20% of daily budget left.
- [ ] Popup "Next Best Target" CTA reads the top-of-queue tier + score.

### 4.2 Dashboard analytics (weekly deep-dive)

- [ ] Dashboard KPIs:
  - actions/day by type (line chart, 30d),
  - accept rate by week (sparkline, 12w),
  - avg time from event → action,
  - events captured vs inbox handled ratio.
- [ ] Cohort slices:
  - by level at first touch,
  - by firm tier,
  - by event type source (post / comment / repost / reaction).
- [ ] **Template A/B reporting deferred to v2.1** — single-template v2.0 doesn't need it. Log template id/version now so v2.1 can reconstruct.
- [ ] Cap recommendations:
  - show historical completion + warning trend,
  - suggest manual cap adjustments (never auto-escalate).

### 4.3 Health snapshots + kill switch

- [ ] Daily `health_snapshots` rollup at local midnight:
  - invites sent/accepted (7d),
  - accept rate (7d),
  - captcha/rate-limit/auth-wall hits (7d),
  - harvested events (7d),
  - profile visits (7d).
- [ ] Kill-switch triggers (auto-pause with `auto_pause_reason = 'health_threshold'`):
  - `accept_rate_7d < 15%` AND `invites_sent_7d >= 20` (sample-size gate),
  - any 2 safety triggers in same 24h window,
  - LinkedIn restriction banner detected by content script.
- [ ] **Kill-switch cooldown:** after breach, manual resume is gated by a minimum `health_cooldown_hours` (default **24**, Settings-configurable). User cannot resume sooner even with typed confirmation.
- [ ] Dashboard `/health` route with sparkline charts + threshold indicators.

Acceptance criteria:

- [ ] Daily glance takes <5s in the popup.
- [ ] Weekly review can be done fully in dashboard Analytics.
- [ ] Health breach → auto-pause → 24h cooldown → typed-confirm resume is demonstrable end-to-end.

---

## Phase 5 - Inbox-driven action tracking (auto reconciliation)

Goal: when you open an Inbox/Queue item in a new tab and act manually on LinkedIn, the extension auto-updates the corresponding todo/outreach row.

### 5.1 Tracking model

- [ ] Add store `interaction_events`:
  - `id`
  - `prospect_id`
  - `source_task_id` (engagement task/outreach row id)
  - `interaction_type` (`opened_from_inbox`, `reacted`, `commented`, `invite_sent`, `message_sent`, `profile_visited`)
  - `target_url`
  - `fingerprint` (unique idempotency key)
  - `detected_at`
  - `confidence` (`high`, `medium`, `low`)
- [ ] Add lightweight state on task/outreach rows:
  - `last_opened_from_inbox_at`
  - `auto_updated_at`
  - `reconciliation_status` (`matched`, `needs_review`, `unmatched`)

### 5.2 Inbox open instrumentation

- [ ] All "Open post/comment/profile" buttons from Inbox/Queue open via tracked link wrapper:
  - include internal context (`task_id`, `prospect_id`, `action_expected`).
- [ ] Emit `opened_from_inbox` event before tab open.
- [ ] Keep short-lived in-memory + IDB correlation window (for example 30-60 min).

### 5.3 Action detectors (content script)

- [ ] Detect high-confidence manual outcomes:
  - reaction state toggled on target post/comment,
  - comment successfully posted in thread,
  - connect request sent confirmation,
  - message sent confirmation in thread.
- [ ] Emit structured events to background for reconciliation.
- [ ] Guard for SPA navigation and delayed DOM updates.

### 5.4 Reconciliation engine

- [ ] Match detected action to most likely open Inbox/Queue item using:
  - `prospect_id`/slug,
  - URL normalization,
  - event type,
  - time window.
- [ ] Auto-transition states:
  - engagement task `new/viewed -> engaged`
  - outreach row `approved -> sent`
  - queue item `ready -> completed`
- [ ] If confidence is not high:
  - set `needs_review` and show quick confirm chip in dashboard (one-click accept).

### 5.5 UX + auditability

- [ ] Add "Auto-tracked" badge + timestamp on rows updated by reconciliation.
- [ ] Add filter "Needs review" for unresolved matches.
- [ ] Log all reconciliations in activity log with before/after state.
- [ ] Provide undo for last auto-update (time-limited).

### 5.6 Detector coverage gaps (hardening)

- [ ] **Always-on detectors, correlation-optional.** Detectors in 5.3 run on every `linkedin.com/*` page regardless of inbox correlation window. Emitting an `interaction_event` is decoupled from matching it to an inbox/queue row:
  - detector always writes the raw event,
  - reconciliation engine correlates to an inbox row only if a live correlation token exists,
  - organic interactions (no inbox click) still upsert a `feed_event` into `engaged` state so daily activity is captured.
- [ ] **Multi-action fan-out per correlation token.** One inbox click can legitimately trigger multiple interactions (reacted + commented on same post):
  - correlation token stays active for full window (not consumed on first match),
  - each detected action produces its own `interaction_event` row,
  - inbox row transitions to `engaged` on first match; subsequent actions append to its timeline.
- [ ] **Message surface coverage.** Message-sent detector must handle all three LinkedIn surfaces:
  - slide-out drawer on feed/profile pages,
  - full messaging page `/messaging/thread/{id}/`,
  - pop-out/new-window messaging view.
  - Detect the "Sent" confirmation at the DOM level of the active thread, keyed by recipient slug or thread participant metadata.
- [ ] **Profile-visit dwell threshold.**
  - Clicking "Open profile" only emits `profile_visited` after dwell >= 8s AND top-card rendered.
  - Tab close before threshold does not count against visit budget.
  - Configurable in Settings (`profile_visit_dwell_ms`, default 8000).
- [ ] **Invite withdrawal detection.**
  - Content script watches `linkedin.com/mynetwork/invitation-manager/sent/` and connect-modal withdraw flows for the toast/confirmation.
  - On detect: outreach row `sent -> withdrawn`, credit daily/weekly invite budget back (subject to LinkedIn actually restoring the slot — never assume).
  - Log withdrawal in activity log with original `sent_at` + elapsed time.
- [ ] **Cross-tab correlation.**
  - Inbox click in tab A must correlate to detector firing in tab B.
  - Correlation tokens stored in IDB (not in-memory) so service-worker restarts don't drop them.
  - Token record: `{ token, task_id, prospect_id, action_expected, opened_at, expires_at }`.
  - Tokens expire after the correlation window (default 45 min, Settings-configurable) and are garbage-collected.

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
- [ ] `src/background/index.ts`
  - handlers for `FEED_EVENTS_UPSERT_BULK`, queue queries, action completion, template CRUD, reconciliation messages.
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
- [ ] Phase 1.3 (Outreach Queue UX + Mode A prefill flow + pre-invite visit warming)
- [ ] Phase 1.4 (single-template-per-type CRUD with placeholders + length cap)
- [ ] Phase 4.1 (popup daily quick-glance row)

**Sprint 3 — Crawler + unlock discovery:**

- [ ] Phase 3.1 (continuous harvester + manual Feed Crawl Session button)
- [ ] Phase 3.2 (top/recent mode switching + per-mode telemetry)
- [ ] Phase 3.3 (unlock tracking + acceptance watcher)

**Sprint 4 — Analytics + health (v2.0 release candidate):**

- [ ] Phase 4.2 core analytics (KPIs, cohort slices — no A/B in v2.0)
- [ ] Phase 4.3 health snapshots + kill-switch thresholds + 24h cooldown

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

- [ ] On DB v1→v2 upgrade: auto-rescore all existing prospects once, using the Phase 1.2 formula against current level + metadata.
- [ ] Pre-migration JSON backup of `prospects` and `settings` stores written to `chrome.downloads` before schema mutation — user recovery path if migration fails.
- [ ] `max_weekly_invites` default (80) is a ceiling, not a target; Settings UI surfaces live 7d invite count so the user can adjust after observing account behavior.
