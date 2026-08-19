---
title: Project Latest Changes
description: Reverse-chronological log of session changes (newest first)
---

## 2026-08-18: FEEDBACK-001 — In-app feedback system + shared ImageDropzone

**Goal**: Give Luis and selected cleaners a way to report problems from inside the product — a persistent navbar button that captures the current page, a list of their own submissions with status, and an admin triage backlog. Along the way, extract the duplicated image-picker that four create-modals had each reimplemented.

### Changes:
1. **Shared image picker** (`src/components/shared/ImageDropzone.tsx`, new) — controlled `files`/`onChange`, `maxFiles`/`maxSizeBytes`/`accept`, `existingImages` + `onRemoveExisting` for edit mode, `onRejected` returning `{file, reason: 'type'|'size'|'count'}`, `variant: 'dropzone'|'button'`, `accent`. Deliberately i18n-free — all copy arrives via props so it works under `turnover`, `common` and `feedback` alike.
2. **ReportIssueModal migrated** (`src/components/turnover/issues/ReportIssueModal.tsx`) — fixes two live bugs: the 5-file cap was computed but never applied (`setSelectedFiles([...selectedFiles, ...validFiles])` with no slice, so one multi-select of 9 reached multer and died *after* a success toast), and `URL.createObjectURL` was called inline in JSX with no `revokeObjectURL` anywhere, minting a fresh blob per photo on every keystroke-triggered re-render.
3. **Patch-note modals migrated** (`create/createPatchNoteModal.tsx`, `update/updatePatchNoteModal.tsx`) — previously had *zero* client-side type/size validation despite the copy promising limits; now mirror the backend's 5MB/no-HEIC. The update modal's manual `5 - existingImages.length` arithmetic is now automatic.
4. **Feedback UI** (`src/components/feedback/*`, new) — `CreateFeedbackModal`, `FeedbackDetailModal`, `MyFeedbackView`, `FeedbackBacklogView`, `FeedbackTagInput`, `FeedbackStatusBadge`.
5. **Navbar entry point** (`src/components/navbar/UserNavbar.tsx`) — speech-bubble button left of `NotificationBell`, gated on `canSubmit`. `UserNavbar` is mounted by all three portal layouts, so one edit makes it global. Mirrors the existing cleaner-only camera button precedent.
6. **Access hook** (`src/hooks/useFeedbackAccess.ts`, new) — module-scope promise cache so the navbar, both sidebars and both pages share one `GET /feedback/access` per page load. `resetFeedbackAccessCache()` wired into `LogoutModal` so the next user in the same tab doesn't inherit the previous user's flags.
7. **Routes + nav** (`src/app/(user)/{property-manager/feedback,property-manager/feedback-backlog,cleaner/feedback}/page.tsx`, `ResponsiveSidebar.tsx`) — thin shells over the shared views; links injected in both the grouped (manager) and flat (cleaner) renderers.
8. **Service + types** (`src/services/feedbackService.ts`, `src/services/types/feedback.ts`, new) and a dedicated **`feedback` i18n namespace** across en/fr/es (75 keys each) plus 2 `nav.json` keys per locale.
9. **Backlog route un-nested** — moved `/property-manager/feedback/backlog` → `/property-manager/feedback-backlog` (see decisions).

### Key design decisions:
- **Purpose-built `FeedbackTagInput` instead of extending `SearchableSelect`.** Its multi-select trigger renders `firstLabel +N` rather than per-item chips, and it can't promote a typed query into a new option — the two things tags most need. Both would have meant changing internals shared by ~12 unrelated screens. `SearchableSelect` left untouched.
- **Backlog route made a sibling, not nested.** `isRouteActive` (`ResponsiveSidebar.tsx:21`, duplicated verbatim in `SidebarGroupSection.tsx:13`) matches `pathname === href || pathname.startsWith(href + '/')`, so a nested backlog lit up *both* nav links. The two links render as flat siblings with no visual containment, so the URL hierarchy was the defect. Hyphenated siblings are also the house convention (`team-time-sheet`, `report-templates`, `turnover-requests`). Rejected a shared longest-match helper: zero dynamic segments exist anywhere in `src/app` (detail views are modals), so it would future-proof against nothing while changing how every nav item in all three portals resolves.
- **Signed image URLs come from the API, never constructed client-side** — the `feedback-images` bucket is private, unlike the public `patch-note-images` bucket that `updatePatchNoteModal` builds `/object/public/` URLs against.
- **Two-request submit** (create as JSON → POST FormData with `photos` repeated), the house pattern; a partial image failure shows an `info` toast and still closes, since the feedback row exists either way.
- **Known rough edge**: submitting via the navbar button while already on My feedback doesn't refresh the list — `UserNavbar` renders `CreateFeedbackModal` without an `onCreated` callback and `MyFeedbackView` fetches on mount only.

## 2026-08-03: TICKET-009 + TICKET-011 — Receipt property: required on scan, editable in the Edit tab

**Goal**: Two related receipt-property gaps. (009) "Scan Receipt" required a Property from the Expenses page but not from the Receipts page, silently creating "Unassigned" receipts with incomplete filenames. (011) Property was missing from the receipt Edit tab — settable only via the View-tab pencil.

### Changes:
1. **`requireProperty` prop** (`src/components/receipt/upload/UploadReceiptModal.tsx`) — opt-in prop that loads properties on open (`getProperties(effectiveUserId)` + `usePermissions`, same pattern as `ScanReceiptModal`), renders a required selector seeded from the existing `propertyId` prop, blocks "Upload & Process" until chosen, and guards in `handleUpload`. Without the prop, behavior is unchanged.
2. **PM Receipts page** (`src/app/(user)/property-manager/receipts/page.tsx`) — passes `requireProperty`.
3. **PM Supply Lists page** (`src/app/(user)/property-manager/supply-lists/page.tsx`) — passes `requireProperty` + `propertyId={receiptContextPropertyId || undefined}` (scan-from-row preselects). Also routed the two modal-open paths that bypassed `handleScanReceipt()` (header button, create-modal action) through it — review caught that stale context would otherwise preselect the wrong property on the next generic scan.
4. **i18n** (`public/locales/{en,es,fr}/common.json`) — new `selectAProperty` key; modal switched to `useTranslation(['expenses', 'common'])`.
5. **Property in the Edit tab** (`src/components/receipt/detail/ReceiptDetailModal.tsx`) — `propertyId` added to `EditFormState` + initial state, seeded in `initEditForm`, diffed in `handleSave`, and a `<select>` rendered as the first Edit-tab field (above Vendor), mirroring the Apply tab's existing selector.

### Key design decisions:
- **No backend changes needed for either.** 009: the display-filename rename (`date_merchant_property.ext`) already runs on the general OCR path (`receiptService.js:263-270`), so sending `propertyId` fixed both the Unassigned state and the filename for free. 011: `PATCH /receipts/:id` already accepts `propertyId` (it's what the View pencil calls).
- **Scope: PM surfaces only.** Cleaner dashboard/receipts and the navbar quick-scan (cleaner-only — `isCleaner` in `UserNavbar.tsx`) deliberately untouched; cleaners may lack a property list. Bulk upload keeps its own assign step, so the endpoint must stay property-optional.
- **Receipts scan stays OCR-only** (no `autoApply`) — same property *rule* as Expenses, not the same *flow*; the Receipts page never created expenses and still doesn't.
- **Unassign remains impossible by design** (011): backend `COALESCE`s `propertyId`, `PropertyEditPill` is `clearable={false}`. Empty selection is omitted from the payload, and the Edit field is not marked required so unassigned receipts stay saveable.
- **New failure mode to watch**: the PM scan now hard-depends on `getProperties` succeeding — a failed/empty fetch leaves the selector empty and blocks upload, silently (console-only error). Inherited from `ScanReceiptModal`'s pattern but it bites harder on a required field.
- **Flagged, not built**: `ScanReceiptModal`/`UploadReceiptModal` duplicate the drop-zone/camera UI (real dedup candidate); both that file and `ReceiptDetailModal` are 100% hardcoded English. **TICKET-010 shelved** (backend): `original_name` isn't recomputed when property/vendor/date change post-upload, and there's no real download button — so property edits still leave stale filenames.
- Reviewed by 3 agents across both tickets: one real bug (the stale supply-list context) + one a11y fix (label `htmlFor`/select `id`); otherwise clean. `npm run build` + `tsc --noEmit` green. Notes at `notes/TICKET-009.md`, `notes/TICKET-011.md` (each with retest steps + degradation watchlist).

## 2026-07-11: WALKTHROUGH-001 — Delete button in the enlarged photo viewer

**Goal**: Client testing showed single-delete was hover-only (unreachable on mobile — cleaners are on phones). Add a Delete action inside the enlarged photo viewer for both cleaner and PM, routed through the existing confirm modal + delete handlers.

### Changes:
1. **`findWalkthroughPhotoByUrl(walkthrough, url)`** (`src/services/cleaningProjectService.ts`) — new shared helper mapping a viewer URL back to its `WalkthroughPhoto` (searches groups + items, orphans, freeform). `ProjectDetailModal`'s existing inline `allPhotos.find()` lookup refactored to use it (2 call sites → dedup).
2. **`ImagePreviewModal`** (`src/components/shared/ImagePreviewModal.tsx`) — new optional `onDelete?: () => void` prop → red Delete button in the footer (left group, next to Close). Shown only when provided, so the other consumer (`PhotoGalleryModal`) is unaffected. Strings hardcoded to match the file's existing convention (its `useTranslation` import is dead/unused).
3. **PM viewer** (`src/components/turnover/ProjectDetailModal.tsx`) — `previewImage` state gains `onDelete`; set only for walkthrough photos → `{ setPreviewImage(null); requestPmWalkthroughDelete([photo.id]) }`. Checklist/issue photos omit it → no Delete button there. Passed into `<ImagePreviewModal onDelete=... />`.
4. **Cleaner viewer** (`src/components/cleaner-portal/ChecklistModal.tsx`) — inline full-screen viewer gains a red Delete button, gated `!readOnly && findWalkthroughPhotoByUrl(walkthrough, viewingImage)`. On click: close viewer + `requestWalkthroughDelete([id])`. New `delete` key in `cleanerPortal.json`; `TrashIcon` imported.

### Key design decisions:
- **Mobile fix**: hover-trash is unreachable on touch (a tap opens the viewer). Tap-photo → viewer → Delete is now the reliable single-delete path on phones; hover-trash + Select stay for desktop.
- Delete is **walkthrough-only** in the shared viewer — driven by whether `onDelete`/`findWalkthroughPhotoByUrl` resolves, so checklist/issue/client-portal photos never show it.
- Cleaner gate `!readOnly` (readOnly unless in_progress) mirrors the backend cleaner rule for free.
- Viewers sit above the confirm modal (z-100 vs z-60), so Delete closes the viewer first, then the confirm opens.
- `npm run build` clean.

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
