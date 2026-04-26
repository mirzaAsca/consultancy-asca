# LinkedIn Investor Scout — Chrome Extension

**Master Specification v1.0**
Personal-use Chrome extension for managing a large list of potential LinkedIn investor contacts: detect connection level at scale, and visually surface those contacts anywhere they appear on LinkedIn.

---

## Progress Tracker (summary)

Keep this block in sync with the detailed checkboxes below. Bump the count as you complete items.

- [x] **M1** — Scaffold
- [x] **M2** — Data layer
- [x] **M3** — CSV upload flow
- [x] **M4** — Scan worker
- [x] **M5** — Dashboard
- [x] **M6** — Feed highlighter
- [x] **M7** — Export
- [x] **M8** — Polish & hardening
- [ ] **Release v1.0** — All manual smoke tests pass, README written, zipped build _(awaiting user-run §14.3 smoke test; README + `bun run zip` bundle ready)_

---

## 1. Goal & Success Criteria

### 1.1 Primary Goal
Turn a flat CSV of scraped LinkedIn profile URLs (potential investors) into an actionable, continuously-enriched prospect list, and make it effortless to spot and engage those prospects on LinkedIn.

### 1.2 Two Core Features
1. **Scan & Update** — Walk through uploaded LinkedIn profile URLs, open each profile in a hidden background tab, parse the connection-degree badge, and persist the result (`1st` / `2nd` / `3rd` / `out-of-network`) along with profile metadata.
2. **Feed Highlight** — Anywhere on linkedin.com (feed, search, notifications, profile pages), detect if a visible profile is in the prospect list and visually mark it with a colored border + level badge so the user can connect, comment, or engage strategically.

### 1.3 Definition of Done (v1)
- [x] Upload a CSV (single column, no header, `.csv`) with up to 50,000 LinkedIn `/in/` URLs.
- [x] Scan runs in the background with configurable pacing, auto-resumes after browser restart, respects daily cap, and persists results in IndexedDB.
- [x] Feed highlighter runs automatically on `linkedin.com/*` and marks matches in posts, reposts, comments, reactors (on hover), and the "People you may know" sidebar, with level-coded colors (green/blue/purple).
- [x] Popup exposes upload, start/pause/resume, progress, stats, export (full + filtered CSV), and logs.
- [x] Full dashboard page provides a sortable/filterable table of all prospects with bulk actions and an activity log.

---

## 2. User (You) & Context

- **User**: Solo operator managing outbound to potential investors.
- **Scale**: 20,000–50,000 URLs per list. Single active list at a time. New uploads replace the previous list (with an explicit confirm).
- **Environment**: Personal Chrome profile, already logged into LinkedIn (extension assumes active session cookies).
- **Distribution**: Loaded unpacked on the user's own machine. No Web Store submission, no team sharing.
- **Account risk tolerance**: Moderate — default pacing is conservative; user can tune via settings.

---

## 3. Scope

### 3.1 In Scope (v1)
- [x] CSV upload (single-column, no header, profile URLs only).
- [x] URL normalization (strip query params, trailing slashes, `#` fragments, force lowercase host, canonicalize to `https://www.linkedin.com/in/{slug}/`).
- [x] Background-tab scanning of LinkedIn profile pages to extract:
  - [x] `level` (1st / 2nd / 3rd / out-of-network)
  - [x] `name`, `headline`, `company`, `location`
  - [x] `last_scanned` timestamp, `scan_status` (`pending` / `in_progress` / `done` / `failed` / `skipped`)
  - [x] `notes` (user-editable from dashboard)
- [x] Configurable rate limiter with human-like jitter and daily cap.
- [x] Auto-pause on CAPTCHA / rate-limit / auth-wall detection (detection rules, not user-toggleable — these are safety invariants).
- [x] Auto-resume on browser start (if a scan was running).
- [x] Manual rescan (selected rows or all rows).
- [x] Feed highlighter on `linkedin.com/*` covering: post authors, reposters, commenters, reactors (on hover modal), suggested connections sidebar.
- [x] Activity tracker: mark a profile as "Connected" / "Commented" / "Messaged" from the dashboard or in-page badge.
- [x] Popup UI: upload, start/pause/resume, live progress, stats, export, logs.
- [x] Dashboard (full-page options view): searchable/filterable/sortable table, bulk actions, per-row detail drawer, settings panel.
- [x] Export: full CSV (original columns + appended columns) and filtered CSV (by level, by activity, by scan_status).

### 3.2 Explicitly Out of Scope (v1)
Reference-only list — DO NOT implement in v1.
- ~~Publishing to Chrome Web Store~~
- ~~Cloud sync / multi-device~~
- ~~Multiple named lists (single list replace-only for v1)~~
- ~~Auto-drafting connection notes or any automated outreach~~
- ~~Re-scan staleness scheduler (manual rescan only)~~
- ~~Excel/JSON export formats (CSV only)~~
- ~~Working-hours scheduler, session break enforcer, emergency kill switch as separate feature~~
- ~~Voyager internal-API fallback (DOM parsing only)~~
- ~~Company / school pages~~

### 3.3 Non-Goals
This extension **does not automate outreach**. It never clicks Connect, Follow, Message, or submits any form on the user's behalf. All engagement actions remain manual — the extension only enriches data and visually surfaces context.

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety across manifest, messages, storage shape |
| Build | Vite 5 + `@crxjs/vite-plugin` | Fast HMR for MV3 extensions, clean unpacked build output |
| Manifest | Manifest V3 | Required by Chrome going forward |
| UI | React 18 + Tailwind CSS | Matches user's established FlyRank patterns; rich popup + dashboard |
| UI primitives | shadcn/ui components (table, dialog, button, input, progress) | Consistent with user's preferred stack |
| Storage | IndexedDB via `idb` (Jake Archibald's wrapper) | Required for 20–50k row scale; `chrome.storage.local` would hit 10MB quota |
| CSV parse/emit | `papaparse` | Battle-tested, streaming parser for large files |
| State (popup + dashboard) | Zustand | Matches user's established patterns |
| Messaging | `chrome.runtime.sendMessage` + typed message bus | Typed discriminated-union messages |
| Lint/Format | ESLint + Prettier | Standard |
| Package manager | `bun` (matches existing repo) | Repo already uses bun.lock |

### 4.1 Dependencies (to install)

Runtime:
- [x] `react`, `react-dom`
- [x] `zustand`
- [x] `papaparse` + `@types/papaparse`
- [x] `idb`
- [x] `lucide-react`
- [x] `clsx`, `tailwind-merge`
- [x] `class-variance-authority`
- [x] `@tanstack/react-virtual` (for dashboard virtualized table)

Dev:
- [x] `vite`, `@vitejs/plugin-react`, `@crxjs/vite-plugin`
- [x] `typescript`, `@types/chrome`, `@types/react`, `@types/react-dom`
- [x] `tailwindcss`, `postcss`, `autoprefixer`
- [x] `eslint`, `prettier`

(Exact versions resolved at install time via `bun add` — do not hardcode.)

---

## 5. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      POPUP (React)                              │
│  Upload CSV · Start/Pause · Progress · Stats · Export · Logs    │
└──────────────┬──────────────────────────────────────────────────┘
               │  chrome.runtime messages (typed)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│           BACKGROUND SERVICE WORKER (MV3)                       │
│  • Scan queue & scheduler (rate limiter + jitter + daily cap)   │
│  • Tab orchestrator (create hidden tab → wait → parse → close)  │
│  • IndexedDB access (CRUD on prospects store)                   │
│  • Message router between popup / dashboard / content scripts   │
│  • Safety: CAPTCHA/rate-limit/auth-wall detection → auto-pause  │
│  • Resume on browser startup if state == RUNNING                │
└─────┬─────────────────────────────────────┬─────────────────────┘
      │                                     │
      ▼                                     ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│ CONTENT SCRIPT (scan)    │   │ CONTENT SCRIPT (highlight)       │
│ Injected only in the     │   │ Injected on linkedin.com/*       │
│ hidden scan tab.         │   │ Observes DOM for profile links,  │
│ Parses connection badge  │   │ queries background for matches,  │
│ + name/headline/company/ │   │ applies border + badge + color.  │
│ location from profile.   │   │ Re-runs on SPA route changes.    │
└──────────────────────────┘   └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              DASHBOARD PAGE (React, chrome-extension://)        │
│  Full prospect table · filters · bulk actions · settings        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Model

### 6.1 IndexedDB Schema
Database: `linkedin-investor-scout` (version 1)

**Object store: `prospects`**
- Key path: `id` (auto-increment)
- Indexes:
  - `by_url` → `url` (unique)
  - `by_level` → `level`
  - `by_scan_status` → `scan_status`
  - `by_last_scanned` → `last_scanned`

```ts
interface Prospect {
  id: number;                          // auto-increment PK
  url: string;                         // canonical https://www.linkedin.com/in/{slug}/
  slug: string;                        // {slug} extracted for fast feed matching
  level: 'NONE' | '1st' | '2nd' | '3rd' | 'OUT_OF_NETWORK';
  name: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  scan_status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';
  scan_error: string | null;           // last error message if failed
  scan_attempts: number;               // retry counter (max 3)
  last_scanned: number | null;         // epoch ms
  activity: {
    connected: boolean;
    connected_at: number | null;
    commented: boolean;
    commented_at: number | null;
    messaged: boolean;
    messaged_at: number | null;
  };
  notes: string;                       // user-editable
  created_at: number;                  // epoch ms (row insert time)
  updated_at: number;                  // epoch ms
}
```

**Object store: `settings`** (key-value, single row with `id = 'global'`)
```ts
interface Settings {
  id: 'global';
  scan: {
    min_delay_ms: number;              // default 5000
    max_delay_ms: number;              // default 10000
    daily_cap: number;                 // default 500
    retry_on_failure: boolean;         // default true
    max_retries: number;               // default 3
  };
  highlight: {
    enabled: boolean;                  // default true
    colors: {
      first: string;                   // default '#22c55e' (green)
      second: string;                  // default '#3b82f6' (blue)
      third: string;                   // default '#a855f7' (purple)
      out_of_network: string;          // default '#6b7280' (gray)
    };
    show_on: {
      post_authors: boolean;           // default true
      reposters: boolean;              // default true
      commenters: boolean;             // default true
      reactors: boolean;               // default true
      suggested: boolean;              // default true
    };
  };
  updated_at: number;
}
```

**Object store: `scan_state`** (key-value, single row with `id = 'current'`)
```ts
interface ScanState {
  id: 'current';
  status: 'idle' | 'running' | 'paused' | 'auto_paused';
  auto_pause_reason: 'captcha' | 'rate_limit' | 'auth_wall' | null;
  started_at: number | null;
  last_activity_at: number | null;
  scans_today: number;
  day_bucket: string;                  // 'YYYY-MM-DD' in user's local TZ
  current_prospect_id: number | null;  // row being scanned
}
```

**Object store: `activity_log`** (time-series, ring-buffered to last 2,000 entries)
```ts
interface LogEntry {
  id: number;                          // auto-increment
  ts: number;                          // epoch ms
  level: 'info' | 'warn' | 'error';
  event: string;                       // e.g. 'scan_start', 'profile_scanned', 'rate_limit_detected'
  prospect_id: number | null;
  data: Record<string, unknown>;       // structured context
}
```

### 6.2 CSV Input Format
- Extension: `.csv`
- No header row.
- Single column.
- Each row is a LinkedIn profile URL (only `/in/` URLs accepted; others are skipped with a warning row in the log).
- Allowed URL variations (all normalized to canonical form before storage):
  - `linkedin.com/in/john-doe`
  - `www.linkedin.com/in/john-doe/`
  - `https://linkedin.com/in/john-doe?miniProfileUrn=...`
  - `https://www.linkedin.com/in/john-doe/overlay/...` → base profile extracted
- On upload: parse with PapaParse streaming, dedupe by canonical URL, show a pre-import summary modal (`Total rows`, `Valid`, `Invalid`, `Duplicates`, `Will replace current list: Y/N`), user confirms before persisting.

### 6.3 CSV Export Format

**Full export** — all original columns (just the `url` column) plus appended enrichment columns, in this order:
```
url,level,name,headline,company,location,scan_status,last_scanned,connected,commented,messaged,notes
```

**Filtered export** — same columns, rows filtered by active dashboard filters (level, scan_status, activity flags).

---

## 7. Scan & Update — Detailed Workflow

### 7.1 State Machine
```
idle ──▶ running ──▶ paused (user)
  ▲        │  │
  │        │  └─▶ auto_paused (captcha | rate_limit | auth_wall)
  │        ▼
  └──── completed (no more pending rows)
```
- `idle`: initial, no scan in progress.
- `running`: worker is actively processing the queue.
- `paused`: user clicked Pause. Stays paused across browser restart until user clicks Resume.
- `auto_paused`: safety trigger fired. Notification banner shown in popup/dashboard with reason. User clicks "Resume" to continue after resolving (e.g. solving CAPTCHA manually).

### 7.2 Scan Queue & Scheduler

**Queue source**: IndexedDB query `scan_status = 'pending'` ordered by `id ASC`. Results streamed 100 rows at a time.

**Per-profile cycle** (executed in background service worker):

1. **Pre-check**:
   - If `scan_state.status !== 'running'` → stop.
   - If `scans_today >= daily_cap` → transition to `idle`, log `daily_cap_reached`, notify popup.
   - If `day_bucket` ≠ today → reset `scans_today = 0`, update bucket.
2. **Jitter delay**: sleep `random(min_delay_ms, max_delay_ms)` with additional ±15% Gaussian jitter to avoid fixed-interval fingerprints.
3. **Mark row**: `scan_status = 'in_progress'`, `current_prospect_id = id`.
4. **Open hidden tab**:
   ```ts
   const tab = await chrome.tabs.create({ url, active: false, pinned: false });
   ```
   Store `tab.id` in background-worker memory map.
5. **Inject scan content script** via `chrome.scripting.executeScript` when tab reaches `complete` status (listen via `chrome.tabs.onUpdated`).
6. **Content script** (`content/scan.ts`) waits for the profile top card to render (MutationObserver on `main`, resolves when the connection-degree badge or a known "Profile unavailable" state is seen, max wait 15s), then returns:
   ```ts
   {
     ok: true,
     data: {
       level, name, headline, company, location,
       detected_captcha: boolean,
       detected_rate_limit: boolean,
       detected_auth_wall: boolean,
     }
   }
   ```
   If signals indicate CAPTCHA/rate-limit/auth-wall → background transitions to `auto_paused`, logs the reason, **does not close the tab** (user may need to solve it), and notifies popup.
7. **Close tab**: `chrome.tabs.remove(tab.id)` (only on success or normal failure — NOT on safety trigger).
8. **Persist result**: update prospect row (`level`, metadata, `scan_status = 'done'`, `last_scanned = now`, `updated_at = now`). Increment `scans_today`. Append `activity_log` entry.
9. **On timeout / parse failure**:
   - Increment `scan_attempts`. If `< max_retries` → re-queue (push to end).
   - Else mark `scan_status = 'failed'`, store `scan_error`.
10. Loop to next row.

### 7.3 Level Detection (DOM parsing)

LinkedIn profile top card renders the degree badge adjacent to the profile name. Selectors (v1, with fallbacks):

```ts
// Primary selector: the distance badge in the top card
const badgeEl = document.querySelector(
  '.pv-top-card--list-bullet .dist-value, ' +
  'span.dist-value, ' +
  '[data-test-distance-badge]'
);
const badgeText = badgeEl?.textContent?.trim().toLowerCase() || '';

// Secondary: "You are connected to" / "Message" button heuristic
// 1st: has "Message" as primary action AND no "Connect" button
// 2nd: has "Connect" as primary action
// 3rd / out-of-network: has "Follow" as primary action and no "Connect"
```

Mapping:
| Badge text | Level |
|---|---|
| `1st` | `1st` |
| `2nd` | `2nd` |
| `3rd`, `3rd+` | `3rd` |
| (missing) + no Connect button + no Message = `OUT_OF_NETWORK` |
| If profile page is "Profile unavailable" / 404 | `scan_status = 'failed'`, `scan_error = 'profile_unavailable'` |

`3rd` and `OUT_OF_NETWORK` are distinct levels; UI shorthand `OOO` always means `OUT_OF_NETWORK`.

**Selector resilience**: selectors are defined in a single module `content/selectors.ts`. If LinkedIn changes DOM, only this file needs updating. Each selector has 2–3 fallbacks tried in order.

### 7.4 Safety Detection Rules (auto-pause triggers)

Content script flags any of the following and background worker transitions to `auto_paused`:

| Signal | Detection |
|---|---|
| CAPTCHA / challenge | URL contains `/checkpoint/challenge` or body contains `linkedin-challenge` / `captcha` iframe |
| Rate limit | URL redirects to `/checkpoint/` with rate-limit params, or page contains "We've restricted your account" / "unusual activity" |
| Auth wall | URL redirects to `/login` or `/authwall` |

On auto-pause: popup shows a red banner with reason and a "Resume scan" button (user must manually resume after resolving).

### 7.5 Resume on Browser Startup

Background worker registers `chrome.runtime.onStartup` and `chrome.runtime.onInstalled` listeners. On fire:

1. Read `scan_state`. If `status === 'running'` → re-enter the loop automatically.
2. If `status === 'paused'` or `'auto_paused'` → do nothing (wait for user).
3. On startup always reset any rows stuck in `scan_status = 'in_progress'` back to `'pending'` (since their tabs are gone).

---

## 8. Feed Highlight — Detailed Workflow

### 8.1 Content Script Scope
`manifest.json` matches: `https://www.linkedin.com/*`.

Excluded paths (the scan content script handles these, we don't want double-work in regular tabs):
- None at the script level — the highlight script runs everywhere on linkedin.com. It simply does not highlight the currently-viewed profile's own top card.

### 8.2 Matching Strategy
On script init and on every SPA navigation (listen for `history.pushState` / `popstate` via monkey-patch and also `MutationObserver` on `main`):

1. Fetch full slug→level map from background **once per session** (cached in memory on the content-script side). On prospect DB updates, background broadcasts a `PROSPECTS_UPDATED` message; content script invalidates cache.
2. Walk the DOM to find every anchor matching `a[href*="/in/"]`.
3. For each anchor, extract slug from `href`, look up in map.
4. If match, climb DOM up to the closest relevant container:
   - In feed: `article` or `div[data-urn*="urn:li:activity"]`
   - In comments: `article.comments-comment-item` (or current LinkedIn equivalent)
   - In suggested connections sidebar: `li.entity-result` / `li.reusable-search__result-container`
   - In reactors modal: `li.artdeco-list__item`
5. Apply `data-lis-match="{level}"` attribute + level-colored border class + badge element.

### 8.3 Visual Style
CSS injected via content script:

```css
[data-lis-match] { position: relative; border-radius: 8px; transition: box-shadow .2s; }
[data-lis-match="1st"] { box-shadow: 0 0 0 2px var(--lis-color-1st, #22c55e); }
[data-lis-match="2nd"] { box-shadow: 0 0 0 2px var(--lis-color-2nd, #3b82f6); }
[data-lis-match="3rd"] { box-shadow: 0 0 0 2px var(--lis-color-3rd, #a855f7); }
[data-lis-match="OUT_OF_NETWORK"] { box-shadow: 0 0 0 2px var(--lis-color-oon, #6b7280); }

.lis-badge {
  position: absolute; top: 8px; right: 8px; z-index: 10;
  padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
  color: white; background: var(--lis-badge-bg);
}
```

Badge text: `"1st · TARGET"`, `"2nd · TARGET"`, `"3rd · TARGET"`, `"OUT · TARGET"`.

CSS variables are set from the `settings.highlight.colors` on script init so user-customized colors propagate.

### 8.4 Reactors (on-hover) Handling
Reactors list is loaded lazily when user opens the reactor modal. The content script uses a `MutationObserver` on `document.body` (subtree, filtered by added nodes) to detect modals being added, then re-scans their content for `/in/` anchors.

### 8.5 Activity Quick-Actions (inline)
Clicking the badge opens a small floating action menu (absolute-positioned) with:
- **Open in dashboard** → opens `chrome-extension://{id}/dashboard.html#prospect/{id}`
- **Mark as commented**
- **Mark as connected**
- **Mark as messaged**
- **View profile** (opens prospect's canonical URL in a new tab)

These only toggle activity flags in IndexedDB — they do **not** perform any LinkedIn action.

---

## 9. UI Specifications

### 9.1 Popup (380 × 560 px)

Layout (top to bottom):
1. **Header**: Extension name + status dot (gray=idle, blue=running, yellow=paused, red=auto_paused).
2. **List summary card**: `{N} prospects loaded · Last upload: {date}`. CTA "Upload new CSV" (file picker).
3. **Scan controls**: Primary button toggles between `Start scan` / `Pause scan` / `Resume scan`. Below: `X of Y scanned · ETA {hh:mm}` + linear progress bar. Day counter: `{scans_today}/{daily_cap} today`.
4. **Stats grid (4 tiles)**: counts of 1st / 2nd / 3rd / OOO, each clickable → opens dashboard pre-filtered.
5. **Quick actions**: `Export CSV (all)`, `Export CSV (filtered...)` (opens filter modal), `Test Feed Labels (Random)` (requires active `linkedin.com/feed` tab + at least 4 visible unique `/in/` profiles), `Open dashboard`, `View logs`.
6. **Auto-pause banner** (conditional): red background, reason text, "Resume" button.

### 9.2 Dashboard (full page at `chrome-extension://{id}/dashboard.html`)

Sections (left-nav layout):
- **Prospects** (default)
  - Top bar: search (slug/name/company/headline), filter chips (Level, Scan status, Activity flags), bulk action dropdown (Rescan, Mark as…, Delete, Export filtered).
  - Virtualized table (shadcn `Table` wrapped with `@tanstack/react-virtual` — add as dep) with columns: checkbox, name, headline, company, level badge, scan_status, last_scanned, activity icons, notes preview, actions menu (⋯).
  - Clicking a row opens a right-side **drawer** with full profile details, editable `notes`, activity timeline pulled from `activity_log`, "Open on LinkedIn" button, "Rescan now" button.
- **Settings**
  - Scan pacing: two sliders (min/max delay), daily cap input, retry toggle.
  - Highlighter: master toggle, 4 color pickers (one per level), 5 checkboxes (where to highlight).
  - Data: `Clear all data` (typed confirm), `Export backup` (JSON of all stores — bonus, nice-to-have if time allows).
- **Logs**
  - Reverse-chronological list from `activity_log`. Filter by level (info/warn/error) and event type. Export as JSON.

### 9.3 Design System
- Tailwind + shadcn/ui components already aligned with user preferences.
- Dark background: `bg-[#0F1014]`; cards: `bg-[#1B1C21]`; borders: `border-gray-800`; accent: `text-blue-400`.
- Level colors (consistent across popup, dashboard, and feed badges):
  - 1st: `#22c55e` (green-500)
  - 2nd: `#3b82f6` (blue-500)
  - 3rd: `#a855f7` (purple-500)
  - OOO: `#6b7280` (gray-500)

---

## 10. Manifest V3

```json
{
  "manifest_version": 3,
  "name": "LinkedIn Investor Scout",
  "version": "1.0.0",
  "description": "Scan LinkedIn profile URLs to detect connection level and highlight prospects in-feed.",
  "permissions": ["storage", "tabs", "scripting", "alarms"],
  "host_permissions": ["https://www.linkedin.com/*", "https://linkedin.com/*"],
  "background": { "service_worker": "src/background/index.ts", "type": "module" },
  "action": { "default_popup": "src/popup/index.html", "default_title": "Investor Scout" },
  "options_page": "src/dashboard/index.html",
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["src/content/highlight.ts"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "web_accessible_resources": [
    { "resources": ["assets/*"], "matches": ["https://www.linkedin.com/*"] }
  ],
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
}
```

Notes:
- The **scan content script** is injected programmatically via `chrome.scripting.executeScript` only into the hidden scan tab — not listed in `content_scripts` to avoid injecting it into every LinkedIn page.
- `alarms` permission used for: daily-bucket rollover at midnight local time, and a 30s watchdog that recovers the worker if tab events stall.

---

## 11. Messaging Contract (typed)

```ts
type Message =
  // popup/dashboard → background
  | { type: 'SCAN_START' }
  | { type: 'SCAN_PAUSE' }
  | { type: 'SCAN_RESUME' }
  | { type: 'CSV_UPLOAD'; payload: { filename: string; rows: string[] } }
  | { type: 'PROSPECTS_QUERY'; payload: ProspectFilter }
  | { type: 'PROSPECT_UPDATE'; payload: { id: number; patch: Partial<Prospect> } }
  | { type: 'PROSPECT_RESCAN'; payload: { ids: number[] } }
  | { type: 'SETTINGS_UPDATE'; payload: Partial<Settings> }
  | { type: 'EXPORT_CSV'; payload: { filter: ProspectFilter | null } }
  // content (highlight) → background
  | { type: 'SLUGS_QUERY' }
  // background → all listeners (broadcast)
  | { type: 'SCAN_STATE_CHANGED'; payload: ScanState }
  | { type: 'PROSPECTS_UPDATED'; payload: { changed_ids: number[] } };

type Response<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
```
All messaging goes through a single `sendMessage<T>(msg): Promise<Response<T>>` helper defined in `src/shared/messaging.ts`.

---

## 12. File/Folder Structure

```
linkedin-investor-scout/
├── MASTER.md                         (this file)
├── README.md                         (install + dev instructions)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
├── manifest.json
├── icons/
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
├── src/
│   ├── shared/
│   │   ├── types.ts                  (Prospect, Settings, ScanState, LogEntry, Message)
│   │   ├── url.ts                    (canonicalize, slugify, validate)
│   │   ├── messaging.ts              (typed sendMessage + router helpers)
│   │   ├── db.ts                     (IndexedDB wrapper using idb)
│   │   ├── csv.ts                    (parse + emit helpers)
│   │   ├── constants.ts              (defaults, selectors, event names)
│   │   └── time.ts                   (jitter, sleep, day-bucket helpers)
│   ├── background/
│   │   ├── index.ts                  (service worker entry)
│   │   ├── scan-worker.ts            (queue + scheduler + tab orchestrator)
│   │   ├── message-router.ts
│   │   └── startup.ts                (resume logic, alarms)
│   ├── content/
│   │   ├── scan.ts                   (injected into hidden tab)
│   │   ├── highlight.ts              (runs on all linkedin.com pages)
│   │   ├── selectors.ts              (DOM selectors with fallbacks)
│   │   └── highlight.css
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/…
│   │   └── store.ts                  (Zustand)
│   └── dashboard/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/                   (Prospects, Settings, Logs)
│       ├── components/
│       └── store.ts                  (Zustand)
└── tests/
    ├── url.test.ts                   (canonicalization)
    ├── csv.test.ts                   (parse edge cases)
    └── selectors.fixtures.html       (snapshots for scan selector resilience)
```

---

## 13. Implementation Milestones

Ordered for incremental verification. Each milestone ends with a runnable, testable state. Tick the sub-items as you go; the parent milestone can be ticked once all its children are done.

### [x] M1 — Scaffold (½ day)
- [x] Init Vite + React + TS + Tailwind + CRXJS.
- [x] Manifest stub, popup shows "Hello", service worker logs on install.
- [x] Load unpacked in Chrome verified.

### [x] M2 — Data layer (1 day)
- [x] IndexedDB schema with `idb`, migrations.
- [x] `shared/db.ts` with CRUD for prospects.
- [x] `shared/db.ts` with CRUD for settings.
- [x] `shared/db.ts` with CRUD for scan_state.
- [x] `shared/db.ts` with CRUD for activity_log (ring-buffered to 2,000).
- [x] Unit tests for URL canonicalization.

### [x] M3 — CSV upload flow (½ day)
- [x] Popup upload → background persists via streaming parse.
- [x] Pre-import summary modal with confirm (Total / Valid / Invalid / Duplicates).
- [x] Dedupe by canonical URL on import.
- [x] Basic stats counters update on popup.

### [x] M4 — Scan worker (2 days)
- [x] Scan queue + scheduler with jitter and daily cap.
- [x] Hidden-tab orchestration (`chrome.tabs.create` with `active: false`).
- [x] `content/scan.ts` injection + selectors with 2–3 fallbacks.
- [x] Level detection mapping (1st / 2nd / 3rd / OUT_OF_NETWORK / unavailable).
- [x] Name / headline / company / location extraction.
- [x] Safety detection — CAPTCHA → `auto_paused`.
- [x] Safety detection — rate-limit page → `auto_paused`.
- [x] Safety detection — auth-wall → `auto_paused`.
- [x] Retry logic (max 3 attempts, re-queue on failure).
- [x] Auto-resume on browser startup (`chrome.runtime.onStartup`).
- [x] Reset stuck `in_progress` rows back to `pending` on startup.
- [x] Watchdog alarm every 30s to close orphan tabs.
- [x] Daily bucket rollover at local midnight (via `chrome.alarms`).
- [x] Popup live progress via broadcast messages.

### [x] M5 — Dashboard (1½ days)
- [x] Full prospect table (virtualized with `@tanstack/react-virtual`).
- [x] Search (slug / name / company / headline).
- [x] Filter chips (Level, Scan status, Activity flags).
- [x] Row click → right-side drawer with full details.
- [x] Editable notes field (persisted to IndexedDB).
- [x] Per-row activity timeline from `activity_log`.
- [x] Bulk rescan action.
- [x] Bulk mark-activity action.
- [x] Settings page — pacing sliders (min/max delay).
- [x] Settings page — daily cap input.
- [x] Settings page — highlight master toggle + 5 location checkboxes.
- [x] Settings page — 4 level color pickers.
- [x] Settings page — "Clear all data" (typed confirm).
- [x] Logs page with level + event filter + JSON export.

### [x] M6 — Feed highlighter (1 day)
- [x] `content/highlight.ts` skeleton + CSS injection.
- [x] Slug map cache fetched on script init.
- [x] `PROSPECTS_UPDATED` broadcast invalidates cache.
- [x] SPA route-change detection (history API patch + MutationObserver).
- [x] Match post authors.
- [x] Match reposters.
- [x] Match commenters.
- [x] Match reactors (modal MutationObserver).
- [x] Match "People you may know" sidebar.
- [x] Border + badge with level-coded colors.
- [x] CSS variables driven by user-customized colors.
- [x] Inline action menu on badge click (Open in dashboard / Mark as… / View profile).

### [x] M7 — Export (½ day)
- [x] Full CSV export (PapaParse unparse).
- [x] Filtered CSV export (respects active dashboard filters).
- [x] Export triggers a download via `chrome.downloads.download` or blob link.

### [x] M8 — Polish & hardening (1 day)
- [x] Error boundaries in popup and dashboard.
- [x] Icon assets (16 / 48 / 128).
- [x] README with install-unpacked instructions.
- [ ] Manual smoke test over a 200-row CSV end-to-end (see section 14.3). _user-run pre-release checklist_
- [x] Production build (`bun run build`) produces loadable `/dist`.

**Total: ~8 working days.**

---

## 14. Testing Plan

### 14.1 Unit
- [x] URL canonicalization: all listed variations collapse to a single canonical form.
- [x] CSV parse: handles BOM, trailing newlines, CRLF, quoted cells, invalid URLs, duplicates.
- [x] Day-bucket rollover across timezones.
- [x] Jitter delay stays within bounds.
- [x] Feed test seeding guarantees all four levels are present when at least 4 profiles are collected.
- [x] Highlight level mapping keeps `3rd` and `OUT_OF_NETWORK` (`OOO`) color variables separate.

### 14.2 Fixture / Contract
- [x] `tests/selectors.fixtures.html` contains saved selector fixtures per level (`1st`, `2nd`, `3rd`, `oon`, `unavailable`) via named `<template>` blocks.
- [x] `content/scan.ts` parser runs against each fixture and asserts the expected level (`tests/selectors.contract.test.ts`).
- [ ] Re-capture fixtures quarterly (calendar reminder).

### 14.3 Manual Smoke (run before every release build)
- [ ] Load unpacked. Popup opens.
- [ ] Upload a 10-row test CSV with a mix of 1st/2nd/3rd connections. Confirm import summary.
- [ ] Start scan. Watch hidden tabs open/close. Confirm all 10 rows reach `scan_status = done` with correct levels.
- [ ] Export CSV (all). Open in Numbers/Excel. Verify columns.
- [ ] Browse `linkedin.com/feed` with a post from one of the prospects visible. Verify border + badge + color matches level.
- [ ] Open comments on any post authored by a prospect. Verify commenter highlight.
- [ ] Open reactors modal. Verify highlight.
- [ ] Pause scan mid-run, close browser, reopen. State = `paused`. Resume. Completes.
- [ ] Trigger auto-pause by manually navigating to a non-existent profile → verify `failed` status + retry logic.

---

## 15. Risk Register & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LinkedIn detects automated behavior and restricts the account | Medium | High | Human jitter, conservative defaults, auto-pause on all 3 signals, no automated interactions (only reading), daily cap |
| LinkedIn DOM changes break selectors | High | Medium | Centralized selectors module + 2–3 fallbacks each + fixture tests for quick re-calibration |
| 50k IndexedDB writes stall UI | Low | Medium | Bulk writes in transactions of 500; CSV upload streams; table uses virtualization |
| Hidden tabs leak / pile up on crash | Low | Medium | Watchdog alarm every 30s reconciles tracked tab-ids vs actual tabs; closes orphans |
| User uploads a giant CSV that fails mid-import | Low | Low | Streaming parse with per-batch persist; partial imports are fine, user can re-upload (dedupe handles it) |
| Feed highlighter causes layout shift on large feeds | Low | Low | Use `box-shadow` (no layout shift) instead of `border`; throttle MutationObserver (requestIdleCallback) |

---

## 16. Privacy & Ethics

- **All data stays local**. No network calls except to `linkedin.com` (as the logged-in user, same as normal browsing) and the user's own browser storage. No analytics, no telemetry, no third-party requests.
- **No automated outreach**. The extension only enriches data and visually surfaces context. All Connect / Message / Comment actions remain manual.
- **Respect LinkedIn ToS boundaries** — user is on notice that automated scraping at scale may violate LinkedIn's User Agreement; default pacing is conservative to reduce both risk and impact. This tool is a personal productivity aid, not a mass-scraping product.

---

## 17. Open Questions / Backlog (v1.1+)

Acknowledged but intentionally deferred. Tick when picked up in a future iteration.
- [ ] Working-hours scheduler (only scan 9am–6pm local).
- [ ] JSON backup/restore of IndexedDB (may land opportunistically in M8).
- [ ] Multi-list support (named lists, switch/merge).
- [ ] Auto-draft connection notes from profile data.
- [ ] Re-scan staleness scheduler (auto-rescan after N days).
- [ ] Excel/JSON export formats.
- [ ] Publish to Chrome Web Store (private/unlisted).
- [ ] Risk-profile selector in Settings (Safe / Balanced / Fast presets).

---

## 18. Appendix — Quick Start (developer)

First-time setup:
- [ ] `cd linkedin-investor-scout`
- [ ] `bun install`
- [ ] `bun run dev` (Vite dev build with watch; outputs to `/dist`)
- [ ] Open `chrome://extensions` in Chrome
- [ ] Toggle **Developer mode** ON (top right)
- [ ] Click **Load unpacked** → select `linkedin-investor-scout/dist`
- [ ] Pin the extension icon to the Chrome toolbar

Rebuild cycle during development:
- [ ] Vite watcher rebuilds on file save
- [ ] Click the reload icon on the extension card in `chrome://extensions` after manifest / background changes
- [ ] Content-script changes pick up on next page load; popup/dashboard changes pick up on next open

Production build:
- [ ] `bun run build` → `/dist` is the loadable unpacked extension
- [ ] Optional: zip `/dist` for backup or team sharing

---

**End of Master Specification v1.0**

---

## 19. v1.1 Amendments (v2 Supersede Block)

_Added 2026-04-22 alongside the Phase 0/1.1/2.1 v2-foundation landing. Supersedes the sections referenced below. See [`EXTENSION_GROWTH_TODO.md`](./EXTENSION_GROWTH_TODO.md) for the full v2 roadmap._

### 19.1 Supersedes §3.2 — Out of Scope

- **`Working-hours scheduler` stays out of scope** (confirmed 2026-04-22 interview; no `chrome.alarms` scheduler added beyond the existing day-bucket rollover and 30s orphan-tab watchdog).
- **`Re-scan staleness scheduler` becomes in-scope for S/A-tier only** (Phase 1.4 / 3.3 of the growth roadmap). S/A rows older than 30d jump to the front of the scan queue on the next pass.

### 19.2 Supersedes §3.3 — Non-Goals

Relaxes the "never clicks Connect / submits any form" invariant to allow **Mode A only**: the extension may open the LinkedIn Connect modal and prefill the note textarea; the user still clicks Send. All other write surfaces (DMs, reactions, comments, posts, follows) remain fully manual. Message and follow-up templates are **clipboard-copy only** — the extension never submits the LinkedIn message composer.

### 19.3 Supersedes §6.3 — CSV Export Format

The v2.0 frozen column order appends after `notes`:

```
url,level,name,headline,company,location,scan_status,last_scanned,connected,commented,messaged,notes,score,tier,lifecycle_status,mutual_count,last_outreach_at
```

Emitted by `prospectsToCsv()` in [`src/shared/csv.ts`](./src/shared/csv.ts) (landed 2026-04-23). Order is append-only at v2.0 — never reorder, never remove existing columns; v2.1+ additions go at the tail. Null `score` / `tier` / `mutual_count` / `last_outreach_at` render as empty cells; `last_outreach_at` is ISO-stamped when set; `lifecycle_status` is never null (defaults to `'new'`).

### 19.4 Supersedes §7.2 — Scan Queue ordering

Change from `id ASC` to **`tier DESC, priority_score DESC, last_scanned ASC NULLS FIRST`**. S/A-tier rows stale > `STALE_SA_TIER_REQUEUE_DAYS` (default 30) are priority-requeued on the next pass — `requeueStaleSATierProspects()` runs once at every `runScanLoop()` entry, flips `done` rows whose `tier IN ('S','A')` AND `last_scanned < now - 30d` back to `'pending'` (resetting `scan_attempts` + `scan_error`), and logs `stale_sa_tier_requeued` to `activity_log` when the count is non-zero. Only `done` rows are eligible — `failed` rows are gated by retry policy and `in_progress` rows belong to an active scan tab.

### 19.5 New sections (landed in this PR as foundation; UI follows in later sprints)

- **DB_VERSION bumped to 2** — new stores: `outreach_actions`, `feed_events`, `message_templates`, `daily_usage`. New `Prospect` fields: `lifecycle_status`, `priority_score`, `score_breakdown`, `tier`, `mutual_count`, `next_action`, `next_action_due_at`, `last_level_change_at`, `last_outreach_at`.
- **Scoring engine** — deterministic pure function in [`src/shared/scoring.ts`](./src/shared/scoring.ts). Formula and weights frozen in `SCORE_WEIGHTS`. Tier thresholds default S≥140, A≥100, B≥60, C≥30 (Settings-configurable).
- **Outreach caps (shared bucket)** — defaults `daily_invites=15`, `daily_visits=40`, `daily_messages=10`, `weekly_invites=80`, `shared_bucket=true`. Live in `DEFAULT_OUTREACH_CAPS` and persisted under `settings.outreach.caps`.
- **Feed-event fingerprint** — sync FNV-1a 64-bit hex over `prospect_id|event_kind|activity_urn|comment_urn`. Unique index `feed_events.by_event_fingerprint` enforces dedupe across scroll passes / feed modes.
- **Pre-migration JSON backup** — [`src/shared/backup.ts`](./src/shared/backup.ts) captures a full-DB snapshot at the current on-disk version before the next `openScoutDb()` upgrade runs. Consumers gate on `shouldBackupBeforeUpgrade(lastBootedVersion)`.

### 19.6 Deferred to follow-up commits

Not landed in this PR; see `EXTENSION_GROWTH_TODO.md` sprint plan:

- ~~Phase 1.3 Outreach Queue UX (Mode A prefill flow)~~ — landed 2026-04-23. New `src/dashboard/routes/OutreachQueue.tsx` tab with tier/level/action filters, per-row Open profile / Prefill Connect / Copy template / Mark sent / Skip for today actions. Background exposes `OUTREACH_QUEUE_QUERY`, `OUTREACH_ACTION_RECORD` (idempotent via `{prospect}:{kind}:{day}` keys), `OUTREACH_SKIP_TODAY` (persisted as activity_log entries — no schema bump), and `OUTREACH_PREFILL_CONNECT` (forwards to active LinkedIn tab → content script opens the Connect modal, types the rendered invite note, and highlights the Send button; user still clicks Send per §19.2 Mode A invariant). `OutreachQueueCandidate` / `OutreachQueuePage` shapes in `src/shared/types.ts`; ranking / recommendation / budget-gate logic lives in pure helpers in `src/shared/outreach-queue.ts` with 34 unit tests. Popup gains a "Next best target" row below the daily glance that opens the new dashboard tab. Pre-invite profile-visit warming surfaces via the scoring recommender (when `warm_visit_before_invite` is on and no prior visit exists for the prospect).
- ~~Phase 1.4 Message template CRUD UI~~ — landed 2026-04-23. New `src/dashboard/routes/Templates.tsx` tab with connect-note / first-message / follow-up editors, `{{placeholder}}` renderer in `src/shared/templates.ts`, `CONNECT_NOTE_CHAR_CAP = 300` cap warning (yellow >90 %, red over cap), archive/restore of prior versions. Background exposes `TEMPLATES_LIST` / `TEMPLATE_UPSERT` / `TEMPLATE_ARCHIVE`; new versions auto-increment per kind. Settings route gained Outreach caps + Tier thresholds + Keyword/Firm seed-list CRUD (editing any of the three triggers the existing `SETTINGS_UPDATE` full-rescore path).
- ~~Phase 2.2 Content-script feed-event extraction~~ — landed 2026-04-23. `src/content/feed-events.ts` pure extractor + `FeedEventBatcher` (500 ms debounce / max batch 50), wired into the existing highlight scan pass. `FEED_EVENTS_UPSERT_BULK` message + background handler bump `daily_usage.feed_events_captured` on insert.
- ~~Phase 2.3 Engagement Tasks inbox + `chrome.action` badge~~ — landed 2026-04-23. `src/dashboard/routes/EngagementTasks.tsx` (virtualized task table with filters + bulk Queue/Done/Ignore). Background exposes `FEED_EVENTS_QUERY` / `FEED_EVENT_UPDATE` / `FEED_EVENTS_BULK_UPDATE`; badge text = count of `task_status = 'new'` with 2 s trailing-edge throttle, seeded on boot + refreshed on every mutation.
- ~~Phase 3.1 (manual) + 3.2 Feed Crawl Session (Top/Recent mode switching + per-mode telemetry)~~ — landed 2026-04-23. Popup "Run feed crawl session" button in [`src/popup/App.tsx`](./src/popup/App.tsx) (`FeedCrawlSessionRow`) dispatches `FEED_CRAWL_SESSION_START` to the background, which validates the active tab is `linkedin.com/feed` + scan-worker is idle, then sends `FEED_CRAWL_RUN_IN_TAB` to the highlight content script. The in-tab runner in [`src/content/feed-crawler.ts`](./src/content/feed-crawler.ts) switches URL to the canonical Top URL, waits for `[data-testid="mainFeed"]` to hydrate (`FEED_CRAWL_FEED_READY_TIMEOUT_MS = 15s`), then runs up to `FEED_CRAWL_MAX_SCROLLS_PER_MODE = 20` gentle scroll cycles (Box–Muller ±20% jitter over `[FEED_CRAWL_MIN_SCROLL_PX, FEED_CRAWL_MAX_SCROLL_PX] = [600, 1200]` px) with `[FEED_CRAWL_MIN_WAIT_MS, FEED_CRAWL_MAX_WAIT_MS] = [2000, 5000]` ms waits between each; stops on `no_new_events` (3 consecutive empty scrolls), `max_scrolls`, or any user interaction (keyboard / mouse / wheel / non-programmatic scroll). Then repeats for Recent. Per-mode metrics (scroll steps, events captured, stop reason) + overlap count + total duration land on the returned `FeedCrawlSessionResult` and into `activity_log` as `feed_crawl_session_end` (plus `feed_crawl_session_start` / `_failed` for the lifecycle bookends). 18 unit tests in `tests/feed-crawler.test.ts` cover the jitter bounds, stop-reason priority ordering, mode URL builder, `isOnFeedMode` normalization, and overlap counting. Passive continuous harvester (scan-worker peer) remains deferred — the manual button covers the common "refresh my inbox" path without the coordination complexity.
- ~~Phase 4.3 Health snapshots + kill-switch + resume cooldown + `/health` dashboard~~ — landed 2026-04-23. `src/shared/health.ts` owns the pure logic (`computeHealthSnapshot`, `detectKillSwitchBreach`, `computeResumeCooldown`, `buildWeekBuckets`) against 21 unit tests. `AutoPauseReason` extended with `'health_breach'`; `KillSwitchThresholds` + `HealthSnapshot` types added to `src/shared/types.ts`; `DEFAULT_KILL_SWITCH_THRESHOLDS` (`accept_rate_floor: 0.15`, `invites_sent_min: 20`, `safety_window_hours: 24`, `safety_trigger_max: 2`) in `src/shared/constants.ts`. No `health_snapshots` store — the snapshot is computed on-demand from `daily_usage` + filtered `activity_log` (`scan_auto_paused`) + `outreach_actions` (invites / accepts). `checkAndTripKillSwitch()` runs at the tail of every scanned row inside the scan loop (no new `chrome.alarms` — the v2 invariant holds). `resumeScan()` now returns `ResumeScanResult = { ok: true, state } | { ok: false, error, cooldown }`; the cooldown gate only applies when `auto_pause_reason === 'health_breach'` (captcha / rate_limit / auth_wall auto-pauses still resume freely). Dashboard `/health` route (`src/dashboard/routes/Health.tsx`) renders threshold tiles + 7-day stacked-bar sparkline + breach banner with live countdown + Resume button that surfaces the cooldown error. Settings page gains a `HealthSection` between Tier thresholds and Keywords for `health_cooldown_hours` (0–168) plus the four kill-switch threshold fields. Restriction-banner detector remains open as a Phase 5.3 hook — `HealthBreachReason.restriction_banner` is already in the union so the detector can `autoPause('health_breach')` when it lands.
- Phase 3.1 / 3.2 Continuous harvester + per-mode metrics.
- Phase 4.2 Weekly analytics dashboard.
- Phase 5.x Auto reconciliation (detectors + inbox correlation).

**End of v1.1 Amendments**

---

## 20. v2.x Amendments — `OUT_OF_NETWORK` collapsed into `3rd`

_Added 2026-04-26._

### 20.1 Supersedes §6.1, §7.3, §9.3, §14.1 — Level union

`ProspectLevel` is now `'NONE' | '1st' | '2nd' | '3rd'`. The `OUT_OF_NETWORK` (`OOO`) bucket was a legacy artifact: pre-SDUI Topcard selectors couldn't read a degree badge on far profiles, so `src/content/scan.ts` synthesized `OUT_OF_NETWORK` from a "Follow button + no Connect" heuristic. In production scans the legacy badge selectors (`.dist-value`, `.artdeco-entity-lockup__degree`) almost never matched modern LinkedIn DOM, which meant nearly every non-1st/2nd profile fell through to the OOO bucket regardless of actual degree. From an outreach standpoint these were always 3rd-degree rows; v2.x collapses the distinction.

Behavioral changes:

- **Scan fallback** ([`src/content/scan.ts`](./src/content/scan.ts)): "Follow button present, no Connect" → `'3rd'` (was `'OUT_OF_NETWORK'`). "No badge text + no Connect + no Follow" → `'3rd'` (was `'OUT_OF_NETWORK'`).
- **Scoring** ([`src/shared/scoring.ts`](./src/shared/scoring.ts), [`src/shared/constants.ts`](./src/shared/constants.ts)): `SCORE_WEIGHTS.level_out_of_network` removed. Rows that previously scored +5 from OOO now score +20 from `level_3rd` — a conservative upgrade for rows that were silently penalized for failing to expose a badge our stale selector couldn't read.
- **UI** ([`src/popup/App.tsx`](./src/popup/App.tsx), [`src/dashboard/App.tsx`](./src/dashboard/App.tsx), [`src/dashboard/routes/*.tsx`](./src/dashboard/routes/), [`src/dashboard/helpers.ts`](./src/dashboard/helpers.ts)): popup stats grid drops from 4 tiles to 3, dashboard level filters drop the OOO chip, settings color picker drops the 4th color, hash router rejects `level=OUT_OF_NETWORK`.
- **Highlighter** ([`src/content/highlight-levels.ts`](./src/content/highlight-levels.ts)): the `--lis-color-oon` CSS var is gone; `NONE`-state badges share the `--lis-color-3rd` palette.
- **Acceptance watcher** ([`src/shared/acceptance-watcher.ts`](./src/shared/acceptance-watcher.ts)): `PRE_CONNECTED_LEVELS` is now `{'2nd','3rd'}`. A `3rd → 1st` transition still credits live invites.
- **CSV export** (§19.3): unchanged — the `level` column now emits `1st` / `2nd` / `3rd` only.

### 20.2 DB v3 → v4 migration

DB version bumped to 4 in [`src/shared/constants.ts`](./src/shared/constants.ts). The `oldVersion < 4` branch in [`src/shared/db.ts`](./src/shared/db.ts) cursor-walks every prospect row and flips `level === 'OUT_OF_NETWORK'` to `'3rd'`, stamping a fresh `updated_at`. Idempotent — subsequent passes find no OOO rows. The v3.0-frozen pre-migration JSON snapshot machinery in [`src/shared/backup.ts`](./src/shared/backup.ts) writes a backup before the upgrade fires, so users have a recovery path.

### 20.3 Test coverage adjusted

- `tests/highlight-levels.test.ts`: dropped OOO label/var assertions; pinned `NONE` falls back to the 3rd palette, asserts `OUT_OF_NETWORK` no longer appears in the generated CSS.
- `tests/scoring.test.ts`: dropped the OOO row from the level-weight table; replaced "OOO with no signals → low score" with "3rd with no signals → score = level weight, skip tier".
- `tests/db.test.ts`: replaced the "keeps 3rd and OOO separate" filter test with a "3rd-level filter returns all far prospects" assertion.
- `tests/selectors.contract.test.ts`: the `oon` fixture is unchanged but the expected level is now `'3rd'`, matching the collapsed heuristic.
- `tests/acceptance-watcher.test.ts`: the OOO → 1st acceptance test was renamed to "3rd → 1st with a live invite" with a comment noting it covers the former OOO bucket.

**End of v2.x Amendments**
