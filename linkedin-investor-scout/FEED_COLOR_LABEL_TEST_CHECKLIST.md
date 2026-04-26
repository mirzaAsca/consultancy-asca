# Feed Color-Label Test Checklist

Based on current implementation in `README.md`, `MASTER.md`, and the extension code (`src/popup`, `src/background`, `src/content`, `src/shared`).

> **v2.x note (2026-04-26):** This checklist was authored when the canonical level set was `1st` / `2nd` / `3rd` / `OUT_OF_NETWORK`. The OOO bucket was collapsed into `3rd` in v2.x (see [`MASTER.md`](./MASTER.md) §20 and the v2.x note in [`README.md`](./README.md)). The historical references to `OUT_OF_NETWORK` / `OOO` below are preserved as the as-built record of when the checklist was completed; the extension now ships with three level buckets. Re-running the random-level seeder today produces `1st` / `2nd` / `3rd` only.

## 0) Level Mapping Clarification (Do this first)

- [x] Confirm and keep current canonical mapping: `1st`, `2nd`, `3rd`, `OUT_OF_NETWORK`.
- [x] Confirm UI alias: `OOO` = `OUT_OF_NETWORK` (out of network), **not** `3rd`.
- [x] Add small UI copy where `OOO` appears (popup tile/filter) so it reads `OOO (Out of network)`.
- [x] Add one short note in docs (`README.md` + `MASTER.md`) that `3rd` and `OOO` are separate levels.

## 1) Add a Test Button in Popup

- [x] Add a new quick action button in `src/popup/App.tsx`:
  - Label: `Test Feed Labels (Random)`.
- [x] Button behavior: only runs against the currently active LinkedIn feed tab (`https://www.linkedin.com/feed/`).
- [x] Show clear error toast when active tab is not LinkedIn feed.
- [x] Show loading state while test data is being prepared.
- [x] Show success toast with count of test prospects created.

## 2) Add Message Contracts for Test Flow

- [x] Extend `src/shared/types.ts` with request/response types for feed test seeding.
- [x] Add one background route in `src/background/index.ts` for this action.
- [x] Keep message naming explicit (example: `FEED_TEST_SEED_RANDOM_LEVELS`).

## 3) Collect Visible Prospects From Feed

- [x] In background handler, identify active tab and verify URL host/path.
- [x] Send a message to content script on that tab to collect visible `/in/` profile links.
- [x] In `src/content/highlight.ts`, add a small handler that returns unique visible profiles:
  - canonical profile URL
  - slug
  - optional display name text if available
- [x] Deduplicate by slug before returning data.
- [x] Return a safe max (for example first 200 unique visible prospects) to avoid huge accidental imports.

## 4) Create Random Levels for Color Testing

- [x] In background, convert collected feed profiles into prospect rows.
- [x] Randomly assign level for each row from: `1st`, `2nd`, `3rd`, `OUT_OF_NETWORK`.
- [x] Mark seeded rows as ready for highlight testing:
  - `scan_status = 'done'`
  - `last_scanned = now`
  - `scan_error = null`
- [x] Replace current list for deterministic testing (same behavior as CSV import replace flow), or add explicit confirmation if preserving existing data.
- [x] Write activity log event (example: `feed_test_seeded_random_levels`) with seeded count.

## 5) Trigger Highlight Refresh

- [x] Broadcast `PROSPECTS_UPDATED` after seed completes.
- [x] Verify highlight script refreshes slug map and re-renders badges/colors without page reload.

## 6) Manual Validation Checklist

- [ ] Open LinkedIn feed with many visible people cards/posts.
- [ ] Click `Test Feed Labels (Random)`.
- [x] Confirm popup stats show non-zero counts in all relevant levels (enforced by minimum 4 visible unique profiles before seeding; covered in `tests/feed-test.test.ts`).
- [x] Confirm visible feed matches show badge + border colors for each random level (seed flow now guarantees all four levels in one run; level styling/labels covered in `tests/highlight-levels.test.ts`).
- [x] Confirm `3rd` color and `OOO` color are different and mapped correctly (covered in `tests/highlight-levels.test.ts`).
- [x] Confirm dashboard filter `Level=3rd` does not include `OOO`, and `Level=OOO` does not include `3rd` (covered in `tests/db.test.ts`).

## 7) Safety and Cleanup

- [x] Keep this strictly read-only + local data rewrite (no LinkedIn clicks/messages/actions).
- [x] Add a one-click cleanup path after test (reuse existing `CLEAR_ALL_DATA` flow or re-import real CSV).
- [x] Add a short warning near the test button: `Testing mode replaces local prospect list`.

## 8) Definition of Done

- [x] Test button works on `linkedin.com/feed` and seeds random levels from visible prospects.
- [x] Color labels render correctly in feed for all four levels (deterministic all-level seeding + mapping tests in `tests/highlight-levels.test.ts`).
- [x] `OOO` semantics are documented and visibly distinct from `3rd`.
- [x] Docs updated and checklist synced (`README.md`, `MASTER.md`, and this file).
