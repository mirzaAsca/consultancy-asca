# LinkedIn Investor Scout

Chrome MV3 extension that scans LinkedIn profile URLs to detect connection level (`1st` / `2nd` / `3rd` / `OUT_OF_NETWORK`) and highlights matched prospects in-feed with a level-coded border and badge. Personal-use tool — **no outreach automation**. See [`MASTER.md`](./MASTER.md) for the full spec.

Current status: **v1.0 feature-complete**. All core milestones (scaffold → data layer → CSV upload → scan worker → dashboard → feed highlighter → export → polish) land. Remaining release step is the manual smoke test in [`MASTER.md`](./MASTER.md) §14.3.

---

## Features

- **Scan & Update** — walks an uploaded CSV of `/in/` URLs, opens each profile in a hidden background tab, parses the connection-degree badge + name/headline/company/location, and persists the result with retry + auto-pause on CAPTCHA / rate-limit / auth-wall.
- **Feed highlighter** — on any `linkedin.com/*` page, marks post authors, reposters, commenters, reactors, and "People you may know" cards that belong to your prospect list with a level-colored border and badge. Inline badge menu for marking Connected / Commented / Messaged (no automated actions).
- **Dashboard** — virtualized table with search, level/scan-status/activity filters, per-row drawer with editable notes and activity timeline, bulk rescan / bulk activity flags, settings panel (pacing sliders, daily cap, color pickers, clear-data).
- **Popup** — upload, start / pause / resume, live progress + ETA, 4-tile stats grid, quick export.
- **Export** — full or filtered CSV (PapaParse `unparse`) delivered via `chrome.downloads.download`.
- **Safety** — conservative defaults (5–10 s jitter, 500/day cap), auto-pause on safety triggers, auto-resume on browser restart, watchdog alarm reconciles orphan tabs.

---

## Tech stack

- TypeScript (strict)
- Vite 5 + [`@crxjs/vite-plugin`](https://crxjs.dev/) for MV3 bundling
- React 19 + Tailwind CSS 3 (popup + dashboard UI)
- Zustand (state), `idb` (IndexedDB, streams 20–50k rows), `papaparse` (CSV), `@tanstack/react-virtual` (virtualized table)
- Vitest (unit tests) + `fake-indexeddb`
- Package manager: `bun`

---

## First-time setup

```bash
cd linkedin-investor-scout
bun install
bun run build
```

`bun run build` type-checks, bundles via Vite + CRXJS, and writes a loadable unpacked extension to `linkedin-investor-scout/dist`.

### Load unpacked into Chrome

1. Open `chrome://extensions`.
2. Toggle **Developer mode** ON (top right).
3. Click **Load unpacked** and select `linkedin-investor-scout/dist`.
4. Pin the Investor Scout icon (blue radar target) to the Chrome toolbar.
5. Click the icon — the popup opens with the list summary, scan controls, and stats grid.
6. Right-click the extension → **Inspect views: service worker** — you should see `[investor-scout] service worker booted` in the console.

Assumes you are already logged into LinkedIn in this Chrome profile; the extension relies on your existing session cookies and never submits forms on your behalf.

### Production distribution

```bash
bun run zip
```

Runs `build` then produces `linkedin-investor-scout.zip` (~130 KB) at the repo root with `dist/` contents, ready to back up or load as an unpacked extension on another machine. Source maps and the internal `.vite/` metadata are stripped from the zip.

---

## Development

```bash
bun run dev
```

Vite + CRXJS runs in watch mode and writes an unpacked build to `dist/` on every save with HMR for the popup and dashboard.

Reload cycle while developing:

- Popup / dashboard / content-script edits pick up on next open or next page load.
- Manifest / background-worker edits: click the reload icon on the extension card at `chrome://extensions`.

Other scripts:

```bash
bun run build      # production build with type-check, writes /dist
bun run zip        # build + zip dist/ into linkedin-investor-scout.zip
bun run test       # vitest run (url, csv, db, time)
bun run preview    # preview built dashboard page
bun run lint       # eslint over src/
bun run format     # prettier --write over src/
bun run icons      # regenerate icons/16.png, 48.png, 128.png via Pillow
```

---

## Tests

```bash
bun run test
```

Covers URL canonicalization (all variant forms collapse to the canonical `/in/{slug}/` shape), CSV parsing edge cases (BOM, CRLF, quoted cells, duplicates), IndexedDB CRUD against `fake-indexeddb`, local day-bucket rollover, and jitter bounds. Fixture-based selector resilience tests (§14.2) and the end-to-end manual smoke test (§14.3) are run by hand before releases — see `MASTER.md`.

---

## Layout

```
linkedin-investor-scout/
├── manifest.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── icons/                   # 16/48/128 PNGs (regen via `bun run icons`)
├── scripts/
│   └── generate-icons.py    # Pillow-based icon generator
├── src/
│   ├── shared/              # styles, types, db, csv, url, time helpers
│   ├── background/          # service worker, scan queue, message router, startup
│   ├── content/             # highlight.ts (all LinkedIn pages), scan.ts (injected)
│   ├── popup/               # React popup UI
│   └── dashboard/           # React options page
├── tests/                   # vitest suites (url, csv, db, time)
└── dist/                    # unpacked extension output (gitignored)
```

---

## Privacy & ethics

All data stays local. No network calls except to `linkedin.com` (as the logged-in user, same as normal browsing) and your own browser storage. No analytics, no telemetry, no third-party requests. The extension only enriches data and visually surfaces context — all Connect / Message / Comment actions remain manual. See [`MASTER.md`](./MASTER.md) §16.
