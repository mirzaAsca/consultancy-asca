# LinkedIn Investor Scout — Implementation Validation Checklist

Validated against [`MASTER.md`](./MASTER.md) on **2026-04-19**.

## Validation Summary

- `bun run lint`: ✅ passes
- `bun run test`: ⚠️ fails on local `node v18.18.0` runtime (`node:util.styleText` missing)
- `bun run build`: ⚠️ fails on local `node v18.18.0` runtime (`File` global missing in undici path)
- Node 20 equivalents:
  - `npx -p node@20 node ./node_modules/vitest/vitest.mjs run`: ✅ passes
  - `npx -p node@20 node ./node_modules/typescript/bin/tsc --noEmit && npx -p node@20 node ./node_modules/vite/bin/vite.js build`: ✅ passes

## Must-Fix Checkpoints

### A) Reliability / correctness (blockers)

- [x] **Fix flaky jitter behavior or test contract mismatch**
  - Resolution: `jitterAround` now hard-bounds Gaussian jitter to ±4σ ([`src/shared/time.ts:24`](./src/shared/time.ts#L24)), matching the test contract ([`tests/time.test.ts:60`](./tests/time.test.ts#L60)).
  - Verification: `bun run test` passes on 2026-04-19.

- [x] **Fix lint errors in popup filter toggles**
  - Resolution: replaced side-effect ternaries in export filter toggles with explicit `if/else` branches ([`src/popup/App.tsx:783`](./src/popup/App.tsx#L783), [`src/popup/App.tsx:794`](./src/popup/App.tsx#L794), [`src/popup/App.tsx:805`](./src/popup/App.tsx#L805)).
  - Verification: `bun run lint` passes on 2026-04-19.

- [x] **Honor `retry_on_failure` setting in scan worker**
  - Resolution: scan-worker now branches on `settings.scan.retry_on_failure`; for `retry` outcomes with retries disabled it marks the prospect `failed` immediately instead of re-queueing ([`src/background/scan-worker.ts:312`](./src/background/scan-worker.ts#L312), [`src/background/scan-worker.ts:357`](./src/background/scan-worker.ts#L357), [`src/background/scan-worker.ts:465`](./src/background/scan-worker.ts#L465)).
  - Verification: `bun run lint` and `bun run test` pass on 2026-04-19.

- [x] **Fix daily cap accounting semantics**
  - Resolution: `scans_today` now increments for every processed scan attempt outcome (done/failed/retry/auto-paused), not just `done`, so daily cap enforcement reflects actual scan activity ([`src/background/scan-worker.ts:469`](./src/background/scan-worker.ts#L469)).
  - Verification: `bun run lint` and `bun run test` pass on 2026-04-19.

- [x] **Broadcast prospect updates during scan loop**
  - Resolution: scan worker now emits `PROSPECTS_UPDATED` once per processed prospect after outcome handling (batched at per-prospect granularity), so highlighter slug-map refreshes track ongoing scan mutations ([`src/background/scan-worker.ts:48`](./src/background/scan-worker.ts#L48), [`src/background/scan-worker.ts:481`](./src/background/scan-worker.ts#L481), [`src/content/highlight.ts:618`](./src/content/highlight.ts#L618)).
  - Verification: `bun run lint` and `bun run test` pass on 2026-04-19.

- [x] **Remove stale highlights when data changes**
  - Resolution: `scanAndHighlight` now tracks active containers each pass and clears previously marked containers that are no longer matched ([`src/content/highlight.ts:498`](./src/content/highlight.ts#L498), [`src/content/highlight.ts:536`](./src/content/highlight.ts#L536)).
  - Verification: `bun run lint` and `bun run test` pass on 2026-04-19.

- [x] **Fix container-kind misclassification order in highlighter**
  - Resolution: container detection now uses explicit priority order with specific kinds first (commenters/reactors/suggested/reposters before post_authors) to avoid generic `article` swallowing narrower contexts ([`src/content/highlight.ts:87`](./src/content/highlight.ts#L87), [`src/content/highlight.ts:137`](./src/content/highlight.ts#L137)).
  - Verification: `bun run lint` and `bun run test` pass on 2026-04-19.

- [x] **Avoid persistent DOM side-effect on `position` style**
  - Resolution: highlighter now stores prior inline `position` before patching static containers and restores it when highlights are cleared ([`src/content/highlight.ts:294`](./src/content/highlight.ts#L294), [`src/content/highlight.ts:325`](./src/content/highlight.ts#L325)).
  - Verification: `bun run lint` and `bun run test` pass on 2026-04-19.

- [x] **Fix “Open in dashboard” deep-link behavior from in-page badge**
  - Resolution: dashboard now parses hash query params (including `id`) and auto-opens the target prospect drawer on `#/prospects?id={id}` deep-links; hash state is kept in sync with drawer open/close ([`src/content/highlight.ts:415`](./src/content/highlight.ts#L415), [`src/dashboard/App.tsx:20`](./src/dashboard/App.tsx#L20), [`src/dashboard/App.tsx:47`](./src/dashboard/App.tsx#L47), [`src/dashboard/App.tsx:67`](./src/dashboard/App.tsx#L67)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

### B) Spec parity gaps (UI/workflow)

- [x] **Popup summary card: add “Last upload” timestamp**
  - Resolution: popup now queries latest `csv_imported` log entry and shows `Last upload` in the summary card, refreshing after successful imports ([`src/popup/App.tsx:206`](./src/popup/App.tsx#L206), [`src/popup/App.tsx:293`](./src/popup/App.tsx#L293), [`src/popup/App.tsx:444`](./src/popup/App.tsx#L444)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Popup scan controls: add ETA output**
  - Resolution: popup now computes ETA from pending rows and configured scan delay window, and renders it in the scan card (`ETA hh:mm`) while running ([`src/popup/App.tsx:386`](./src/popup/App.tsx#L386), [`src/popup/App.tsx:510`](./src/popup/App.tsx#L510)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Popup day counter: show `scans_today/daily_cap`**
  - Resolution: popup now loads scan settings and renders day usage as `scans_today/daily_cap today` in the scan card ([`src/popup/App.tsx:197`](./src/popup/App.tsx#L197), [`src/popup/App.tsx:381`](./src/popup/App.tsx#L381), [`src/popup/App.tsx:504`](./src/popup/App.tsx#L504)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Make level stat tiles clickable to open pre-filtered dashboard**
  - Resolution: level tiles are now clickable buttons that open dashboard prospects with `level` deep-link params; dashboard hash parser now applies deep-link level filters on load/hash change ([`src/popup/App.tsx:583`](./src/popup/App.tsx#L583), [`src/popup/App.tsx:737`](./src/popup/App.tsx#L737), [`src/dashboard/App.tsx:28`](./src/dashboard/App.tsx#L28), [`src/dashboard/App.tsx:67`](./src/dashboard/App.tsx#L67), [`src/dashboard/store.ts:9`](./src/dashboard/store.ts#L9)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Add “View logs” quick action in popup**
  - Resolution: popup quick actions now include a `View logs` button that opens dashboard `#/logs` directly ([`src/popup/App.tsx:303`](./src/popup/App.tsx#L303), [`src/popup/App.tsx:659`](./src/popup/App.tsx#L659)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Add explicit Resume action inside auto-pause banner**
  - Resolution: auto-pause banner now includes a dedicated `Resume scan` button wired to `SCAN_RESUME` ([`src/popup/App.tsx:462`](./src/popup/App.tsx#L462), [`src/popup/App.tsx:473`](./src/popup/App.tsx#L473)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Add user-facing table sorting controls in dashboard**
  - Resolution: prospects table headers now expose sort toggles (name/company/level/status/scanned) wired to existing store sort state with direction indicators ([`src/dashboard/routes/Prospects.tsx:269`](./src/dashboard/routes/Prospects.tsx#L269), [`src/dashboard/routes/Prospects.tsx:510`](./src/dashboard/routes/Prospects.tsx#L510), [`src/dashboard/routes/Prospects.tsx:726`](./src/dashboard/routes/Prospects.tsx#L726)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Add per-row actions menu (ellipsis) in prospects table**
  - Resolution: each prospects row now includes an actions column with ellipsis menu (`open details`, `rescan`, activity marks, `delete`) and outside-click dismissal ([`src/dashboard/routes/Prospects.tsx:667`](./src/dashboard/routes/Prospects.tsx#L667), [`src/dashboard/routes/Prospects.tsx:713`](./src/dashboard/routes/Prospects.tsx#L713), [`src/dashboard/routes/Prospects.tsx:764`](./src/dashboard/routes/Prospects.tsx#L764)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Provide “Rescan all rows” action (not only selected rows)**
  - Resolution: added header-level `Rescan all` action that resolves all currently matching rows and queues them for rescan in one flow (not limited to selected rows) ([`src/dashboard/routes/Prospects.tsx:230`](./src/dashboard/routes/Prospects.tsx#L230), [`src/dashboard/routes/Prospects.tsx:377`](./src/dashboard/routes/Prospects.tsx#L377)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

- [x] **Log invalid CSV rows as warnings during import**
  - Resolution: popup now sends invalid-row summary metadata with `CSV_COMMIT`, and background import logs warning events (`csv_invalid_rows` + sampled `csv_invalid_row`) when invalid rows are present ([`src/shared/types.ts:121`](./src/shared/types.ts#L121), [`src/popup/App.tsx:280`](./src/popup/App.tsx#L280), [`src/background/index.ts:68`](./src/background/index.ts#L68)).
  - Verification: `bun run lint`, `bun run test`, and `bun run build` pass on 2026-04-19.

### C) Contract/doc consistency

- [x] **Align `PROSPECTS_UPDATED` payload with spec or update MASTER**
  - Resolution: typed contract now uses `payload.changed_ids`, and all prospect mutation broadcasts now emit normalized changed IDs (or `[]` for full-list refreshes) in both background router and scan loop ([`src/shared/types.ts:226`](./src/shared/types.ts#L226), [`src/background/index.ts:97`](./src/background/index.ts#L97), [`src/background/index.ts:106`](./src/background/index.ts#L106), [`src/background/scan-worker.ts:47`](./src/background/scan-worker.ts#L47), [`src/background/scan-worker.ts:479`](./src/background/scan-worker.ts#L479)).
  - Verification: `bun run lint` and `npx -p node@20 node ./node_modules/vitest/vitest.mjs run` pass on 2026-04-19.

- [x] **Update README claims to match current implementation**
  - Resolution: README export claim now matches the Blob URL download implementation, and testing section now documents selector fixture contract coverage ([`README.md:15`](./README.md#L15), [`README.md:95`](./README.md#L95)).
  - Verification: docs reviewed against implementation in [`src/popup/App.tsx:136`](./src/popup/App.tsx#L136) and new selector contract tests.

## Testing / release checkpoints still open

- [x] **Add selector fixture contract tests** (`tests/selectors.fixtures.html` + parser assertions)
  - Resolution: added fixture corpus in `tests/selectors.fixtures.html` and `jsdom` contract tests that run `scanProfilePageInTab` across `1st/2nd/3rd/oon/unavailable` fixtures with level assertions + metadata extraction checks ([`tests/selectors.fixtures.html:1`](./tests/selectors.fixtures.html#L1), [`tests/selectors.contract.test.ts:1`](./tests/selectors.contract.test.ts#L1), [`MASTER.md:695`](./MASTER.md#L695)).
  - Verification: `npx -p node@20 node ./node_modules/vitest/vitest.mjs run` passes on 2026-04-19.

- [ ] **Execute and record MASTER §14.3 manual smoke test**
  - Evidence: release checkbox and all smoke steps remain unchecked in [`MASTER.md`](./MASTER.md).

- [x] **After fixes, run full gate and update docs/checklists**
  - Resolution: updated `MASTER.md` fixture-contract status and README implementation claims; updated this checklist with completed items and current verification status.
  - Verification (2026-04-19):
    - `bun run lint`: ✅ passes
    - `bun run test`: ⚠️ fails in this machine runtime (`node v18.18.0`; `node:util.styleText` missing)
    - `bun run build`: ⚠️ fails in this machine runtime (`node v18.18.0`; undici `File` global missing)
    - Node 20 gate equivalent: `npx -p node@20 node ./node_modules/vitest/vitest.mjs run` ✅, and `npx -p node@20 node ./node_modules/typescript/bin/tsc --noEmit && npx -p node@20 node ./node_modules/vite/bin/vite.js build` ✅
