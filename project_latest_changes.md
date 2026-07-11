---
title: Project Latest Changes
description: Reverse-chronological log of session changes (newest first)
---

## 2026-07-10: WALKTHROUGH-001 — Delete walkthrough photos (confirmation + multi-select, graceful fallback)

**Goal**: Extend the existing single-photo delete with a confirmation step, full multi-select/bulk delete, and let PMs delete on completed projects — all degrading gracefully when the frontend ships ahead of the backend.

### Changes:
1. **`bulkDeleteWalkthroughPhotos`** (`src/services/cleaningProjectService.ts`) — new. Tries `POST /cleaning-projects/:id/walkthrough/photos/bulk-delete`; on `BackendError.status === 404` (backend not yet deployed) falls back to looping the existing single `deleteWalkthroughPhoto` via `Promise.allSettled`. Returns `{ deleted, failed }`. Types added in `services/types/cleaningProject.ts`.
2. **`DeleteWalkthroughPhotosModal`** (`src/components/walkthrough/DeleteWalkthroughPhotosModal.tsx`) — new. Count-aware confirm ("Delete photo?" / "Delete N photos?"), owns its own spinner, follows the `DeleteWalkthroughTemplateModal` pattern. Used for both single and bulk.
3. **Multi-select in `WalkthroughAccordion`** (`src/components/walkthrough/WalkthroughAccordion.tsx`) — optional `SelectionProps` threaded to `PhotoGrid`: checkbox overlay + tap-to-select in selection mode, per-group and freeform "select all", and an embedded toolbar (Select / N selected / Delete(N) / Cancel). All props optional → read-only client portal unaffected.
4. **Consumers** — `ChecklistModal.tsx` (cleaner) keeps optimistic strip; `ProjectDetailModal.tsx` (PM) keeps refetch-after. Both route single (trash icon) + bulk (toolbar) deletes through the confirm modal. `WalkthroughContent.tsx` forwards selection props via `Pick<ComponentProps<typeof WalkthroughAccordion>>`.
5. **i18n** — new keys in `turnover.json` + `cleanerPortal.json` (confirm copy, select/delete-count, partial-failure). Removed 3 accidental duplicate keys (`selectAll`/`deselectAll`/`selectedCount`) that would have relowercased existing calendar-filter copy.

### Key design decisions:
- **Graceful fallback is the whole point**: single-delete already ships in prod, so the 404→loop fallback makes multi-select fully functional day one; the bulk endpoint is a transparent optimization once the backend deploys. PM-delete-on-completed degrades to an honest error toast (no regression). Confirmed against Express 5 (unmatched route → clean 404; no greedy route swallows `/bulk-delete`; CORS preflight handled globally).
- Selection toolbar lives **inside** the accordion (one place, `turnover` ns loaded everywhere) instead of duplicated in both consumers.
- Cleaner-side `canEdit = !readOnly` (readOnly unless in_progress) means selection/delete only appear in-progress, matching the backend cleaner gate for free.
- Reviewed by 2 agents: no correctness bugs; only the i18n dup (fixed). `npm run build` clean.

## 2026-07-04: PAYSTUB-007 — Off-by-one expense date display (UTC-vs-local)

**Goal**: Expense dates were rendering one day earlier than stored (2026-06-15 → "Jun 14") in the expenses list, details view, and attach-receipt list.

### Changes:
1. **`formatExpenseDate`** (`src/services/expenseService.ts`) — parse date-only `"YYYY-MM-DD"` values with `parseLocalDate` (guarded by `/^\d{4}-\d{2}-\d{2}$/`) instead of bare `new Date()`, then format. Fixes expenses list (`property-manager/expenses/page.tsx`) and `ExpenseViewerModal`.
2. **`formatDate`** (`src/components/expenses/attach/AttachReceiptModal.tsx`) — same date-only guard so `receipt.expenseDate` parses local while `createdAt` instants still format normally.

### Key design decisions:
- Root cause: `new Date("2026-06-15")` = UTC midnight → shifts back a day in behind-UTC zones. The `+ 'T00:00:00'` idiom (~40 sites) parses LOCAL and is CORRECT — left untouched (not the bug). Reused the existing canonical `parseLocalDate` (`utils/dateUtils.ts`) rather than a new helper; the two sites differ in locale/sentinel so no wrapper extracted.
- Backend `notificationTemplates.js` email `formatDate` shared the bug (email period "May 31 — Jun 29"); confirmed corrected in the tested env. Verified end-to-end on localhost.
- **Follow-up (separate ticket):** cleaner-invoice module repeats the same `new Date(dateOnly)` off-by-one in ~5 spots (see `notes/PAYSTUB-007.md`).

## 2026-07-04: PAYSTUB-005 — "Over-cap request" badge only shows for actual over-cap entries

**Goal**: Stop the manager's "Review entry" approval dialog from showing the orange "Over-cap request" badge on every non-backfill entry (including normal under-cap ones).

### Changes:
1. **Badge kind logic** (`src/components/time-entry/approve/ReviewOverCapModal.tsx`) — replaced the binary `pendingKind === 'backfill' ? … : 'Over-cap request'` ternary with a 3-way branch on the three-valued `pendingKind`: `backfill` → "Past-shift submission" (blue), `over_cap` → "Over-cap request" (amber), `null`/other → "Submission" (gray).

### Key design decisions:
- `pendingKind` is `'backfill' | 'over_cap' | null`; the old else-branch treated `null` (ordinary under-cap pending entry) as over-cap. Mirrored the already-correct list-view logic (`team-time-sheet/page.tsx:344`) and its "Submission" wording.
- Display-only; backend already sets `pendingKind` correctly. Component name left as-is (pre-existing misnomer; rename out of scope for a 1-pointer).

## 2026-06-29: PAYSTUB-004 — Builder receipt total no longer renders blank/$0

**Goal**: Fix the paystub builder showing a blank/CA$0.00 total for a checked receipt (header, footer, "Selected items", and Confirm dialog), even though creation valued the receipt correctly.

### Changes:
1. **`receiptDisplayAmount` helper** (`src/components/paystub/create/CreatePaystubModal.tsx`) — coerces receipt money fields with `Number()` before math, then computes `(subtotal + taxTotal) || total` (mirrors backend `paystubs.controller.js`). Used in the `receiptSubtotal` memo and the per-row amount; per-row shows `—` only when all three fields are null.

### Key design decisions:
- Root cause: Postgres NUMERIC columns serialize as strings (e.g. `"75.71"`), so the builder was doing string concatenation (`0 + "75.71"`) → NaN, and `formatMoney` returns '' for non-finite input → blank. Coercion is the real fix.
- Frontend-only: `total` was always sent, so a briefly-staged backend list-projection change (adding subtotal/tax_total) was reverted as unnecessary. The helper still falls back to coerced `total` if subtotal/tax are absent.
- Out of scope, still open: the "Receipt {uuid} not found" abort (Bug B) could not be reproduced; documented in `notes/PAYSTUB-004.md`. Also flagged: the same pg-NUMERIC-as-string risk may affect other money fields (possible audit ticket).

## 2026-06-26: PAYSTUB-003 — Line items no longer vanish on in-modal status change

**Goal**: Fix the display bug where a paystub's LINE ITEMS section collapsed to "No items yet." after changing status (or saving notes) from inside the detail modal, even though the data was intact.

### Changes:
1. **`applyPaystubHeaderUpdate` merge helper** (`src/components/paystub/view/ViewPaystubModal.tsx`) — new functional `setPaystub` merge that keeps the in-memory `items` while taking all other fields from the response. Modeled on the existing `optimisticReplaceItems`.
2. **`doStatusAction`** (same file) — routed through `applyPaystubHeaderUpdate` instead of `setPaystub(res.data)`, so Approve / Mark-as-paid / Submit / Reject / Set-status no longer wipe items.
3. **`handleSaveNotes`** (same file) — same merge; saving PM/TM notes previously dropped items too (identical root cause).

### Key design decisions:
- Status endpoints return a header-only paystub (no `items` — only `GET /paystubs/:id` populates them via a separate query + per-item signed-URL enrichment). Chose a client-side merge over refetching or changing the backend: status/notes edits never alter line items, so the in-memory copy is authoritative and we avoid an extra GET + enrichment on every transition.
- `loadPaystub` (the full GET) intentionally left as a plain replace — it carries authoritative `items`.
- No automated test added: the frontend repo has no test harness (no Jest/RTL/jsdom). Per the working agreement, tests are backend-scoped and frontend verification is `npm run build` (passed). Standing up frontend test infra deferred to its own ticket.
