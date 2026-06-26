---
title: Project Latest Changes
description: Reverse-chronological log of session changes (newest first)
---

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
