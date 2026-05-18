# Audit Log — Frontend Implementation Guide

A persistent, append-only change log lives on the backend for `bookings`, `cleaning_projects`, and `incoming_bookings`. It captures every mutation with full before/after JSONB snapshots, an actor (user / webhook / cron / system), and a causation chain (`correlation_id` + `parent_event_id`) that links cascading changes back to the trigger that caused them. This guide covers the frontend integration: API contract, types, services, components, and where to embed them.

**Stack assumed**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Zustand + Framer Motion + Heroicons + Supabase auth + `@/services/apiClient`.

---

## Table of contents

1. [API contract](#1-api-contract)
2. [TypeScript types](#2-typescript-types)
3. [Service module](#3-service-module)
4. [Hooks](#4-hooks)
5. [`<AuditHistoryPanel>` — reusable per-record view](#5-audithistorypanel--reusable-per-record-view)
6. [`<AuditTraceModal>` — tree vs flat causation viewer](#6-audittracemodal--tree-vs-flat-causation-viewer)
7. [Standalone admin page](#7-standalone-admin-page)
8. [Nav + permissions wiring](#8-nav--permissions-wiring)
9. [Embed history in existing detail views](#9-embed-history-in-existing-detail-views)
10. [i18n keys](#10-i18n-keys)
11. [Build order](#11-build-order)
12. [Future integration ideas](#12-future-integration-ideas)

---

## 1. API contract

Base URL: `${NEXT_PUBLIC_BASE_URL}/api/audit`. All endpoints require a valid Supabase session token (Authorization header, handled by `apiClient`) and `role === 'PROPERTY-MANAGER' || role === 'ADMIN'`. Cleaners, clients, and team members get **403**.

All responses follow the project envelope: `{ status: "success" | "failed", message?, data?, ... }`.

The `entityType` path/query value is one of: `booking`, `cleaning_project`, `incoming_booking`.

### Endpoint 1: Per-record history

```
GET /api/audit/:entityType/:entityId?limit=50&offset=0
```

**Path params**
- `entityType` — `booking` | `cleaning_project` | `incoming_booking`
- `entityId` — UUID

**Query params**
- `limit` — int, default 50, max 200
- `offset` — int, default 0

**Success 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "9b5e3c4a-1f7d-4a8e-9c12-2d4f5a6b7c8d",
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "parentEventId": "5f4e3d2c-1b0a-9876-5432-10fedcba9876",
      "userId": "11111111-2222-3333-4444-555555555555",
      "entityType": "cleaning_project",
      "entityId": "f0e1d2c3-b4a5-9687-5849-3a2b1c0d9e8f",
      "action": "update",
      "beforeData": {
        "id": "f0e1d2c3-b4a5-9687-5849-3a2b1c0d9e8f",
        "user_id": "11111111-2222-3333-4444-555555555555",
        "property_id": "aa11bb22-cc33-dd44-ee55-ff6677889900",
        "previous_booking_id": "1234abcd-5678-90ab-cdef-1234567890ab",
        "next_booking_id": "fedcba98-7654-3210-fedc-ba9876543210",
        "cleaner_id": null,
        "checklist_id": null,
        "project_date": "2026-05-15",
        "project_start_time": "11:00:00",
        "project_end_time": "15:00:00",
        "estimated_duration_minutes": 120,
        "guest_count": 2,
        "is_same_day_turnover": false,
        "status": "pending",
        "cleaner_accepted": null,
        "pm_notes": null,
        "cleaner_notes": null,
        "source": "webhook",
        "guest_name": "Mark Cena",
        "reservation_code": "HM-12345",
        "ical_event_uid": null,
        "ical_subscription_id": null,
        "pm_override": false,
        "created_at": "2026-05-10T14:32:10.000Z",
        "updated_at": "2026-05-10T14:32:10.000Z"
      },
      "afterData": {
        "id": "f0e1d2c3-b4a5-9687-5849-3a2b1c0d9e8f",
        "user_id": "11111111-2222-3333-4444-555555555555",
        "property_id": "aa11bb22-cc33-dd44-ee55-ff6677889900",
        "previous_booking_id": "1234abcd-5678-90ab-cdef-1234567890ab",
        "next_booking_id": "ccccdddd-eeee-ffff-0000-111122223333",
        "cleaner_id": null,
        "checklist_id": null,
        "project_date": "2026-05-15",
        "project_start_time": "11:00:00",
        "project_end_time": "15:00:00",
        "estimated_duration_minutes": 120,
        "guest_count": 2,
        "is_same_day_turnover": true,
        "status": "pending",
        "cleaner_accepted": null,
        "pm_notes": null,
        "cleaner_notes": null,
        "source": "webhook",
        "guest_name": "Mark Cena",
        "reservation_code": "HM-12345",
        "ical_event_uid": null,
        "ical_subscription_id": null,
        "pm_override": false,
        "created_at": "2026-05-10T14:32:10.000Z",
        "updated_at": "2026-05-12T09:21:44.000Z"
      },
      "changedFields": ["next_booking_id", "is_same_day_turnover"],
      "actorType": "webhook",
      "actorId": "11111111-2222-3333-4444-555555555555",
      "actorRole": null,
      "actorSource": "hostaway",
      "impersonatedBy": null,
      "webhookAuditLogId": "abc12345-def6-7890-1234-567890abcdef",
      "metadata": {
        "cascade": "relinkNextBooking",
        "triggeredByBookingId": "1234abcd-5678-90ab-cdef-1234567890ab",
        "newNextBookingId": "ccccdddd-eeee-ffff-0000-111122223333",
        "isSameDayTurnover": true
      },
      "createdAt": "2026-05-12T09:21:44.123Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

**400 — invalid entityType**
```json
{ "status": "failed", "message": "Invalid entityType. Must be one of: booking, cleaning_project, incoming_booking" }
```

**403 — wrong role**
```json
{ "status": "failed", "message": "Audit log access requires PROPERTY-MANAGER or ADMIN role" }
```

**500 — DB error**
```json
{ "status": "failed", "message": "Failed to load audit history" }
```

### Endpoint 2: Correlation trace

```
GET /api/audit/trace/:correlationId
```

Returns **every** audit row sharing the correlation_id, ascending by `createdAt`. The frontend builds the tree by walking `parentEventId`.

**Success 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "5f4e3d2c-1b0a-9876-5432-10fedcba9876",
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "parentEventId": null,
      "userId": "11111111-2222-3333-4444-555555555555",
      "entityType": "incoming_booking",
      "entityId": "aaaa1111-bbbb-2222-cccc-333344445555",
      "action": "create",
      "beforeData": null,
      "afterData": {
        "id": "aaaa1111-bbbb-2222-cccc-333344445555",
        "user_id": "11111111-2222-3333-4444-555555555555",
        "platform": "airbnb",
        "external_reservation_id": "AB-9988776",
        "guest_name": "Mark Cena",
        "check_in_date": "2026-05-10",
        "check_out_date": "2026-05-15",
        "status": "pending",
        "raw_webhook_data": { "/* original payload */": "..." },
        "webhook_received_at": "2026-05-10T14:32:09.000Z"
      },
      "changedFields": [
        "id", "user_id", "platform", "external_reservation_id",
        "guest_name", "check_in_date", "check_out_date", "status",
        "raw_webhook_data", "webhook_received_at"
      ],
      "actorType": "webhook",
      "actorId": "11111111-2222-3333-4444-555555555555",
      "actorRole": null,
      "actorSource": "hostaway",
      "impersonatedBy": null,
      "webhookAuditLogId": "abc12345-def6-7890-1234-567890abcdef",
      "metadata": { "hostawayEvent": "reservation.created", "reservationId": "9988776" },
      "createdAt": "2026-05-10T14:32:10.001Z"
    },
    {
      "id": "6a5b4c3d-2e1f-0987-6543-21fedcba9876",
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "parentEventId": "5f4e3d2c-1b0a-9876-5432-10fedcba9876",
      "userId": "11111111-2222-3333-4444-555555555555",
      "entityType": "booking",
      "entityId": "1234abcd-5678-90ab-cdef-1234567890ab",
      "action": "create",
      "beforeData": null,
      "afterData": { "/* full booking row */": "..." },
      "changedFields": ["/* all columns */"],
      "actorType": "webhook",
      "actorId": "11111111-2222-3333-4444-555555555555",
      "actorRole": null,
      "actorSource": "hostaway",
      "impersonatedBy": null,
      "webhookAuditLogId": "abc12345-def6-7890-1234-567890abcdef",
      "metadata": { "promotedFrom": "incoming_booking", "incomingBookingId": "aaaa1111-bbbb-2222-cccc-333344445555" },
      "createdAt": "2026-05-10T14:32:10.105Z"
    },
    {
      "id": "7b6c5d4e-3f2a-1098-7654-32fedcba9876",
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "parentEventId": "6a5b4c3d-2e1f-0987-6543-21fedcba9876",
      "userId": "11111111-2222-3333-4444-555555555555",
      "entityType": "incoming_booking",
      "entityId": "aaaa1111-bbbb-2222-cccc-333344445555",
      "action": "update",
      "beforeData": { "/* status: pending */": "..." },
      "afterData": { "/* status: imported, imported_booking_id: 1234abcd... */": "..." },
      "changedFields": ["status", "imported_booking_id", "imported_at", "is_auto_imported"],
      "actorType": "webhook",
      "actorSource": "hostaway",
      "actorId": "11111111-2222-3333-4444-555555555555",
      "actorRole": null,
      "impersonatedBy": null,
      "webhookAuditLogId": "abc12345-def6-7890-1234-567890abcdef",
      "metadata": { "newStatus": "imported", "importedBookingId": "1234abcd-5678-90ab-cdef-1234567890ab" },
      "createdAt": "2026-05-10T14:32:10.155Z"
    },
    {
      "id": "8c7d6e5f-4a3b-2109-8765-43fedcba9876",
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "parentEventId": "6a5b4c3d-2e1f-0987-6543-21fedcba9876",
      "userId": "11111111-2222-3333-4444-555555555555",
      "entityType": "cleaning_project",
      "entityId": "f0e1d2c3-b4a5-9687-5849-3a2b1c0d9e8f",
      "action": "create",
      "beforeData": null,
      "afterData": { "/* full project row */": "..." },
      "changedFields": ["/* all columns */"],
      "actorType": "webhook",
      "actorSource": "hostaway",
      "actorId": "11111111-2222-3333-4444-555555555555",
      "actorRole": null,
      "impersonatedBy": null,
      "webhookAuditLogId": "abc12345-def6-7890-1234-567890abcdef",
      "metadata": {
        "source": "webhook",
        "triggeredByBookingId": "1234abcd-5678-90ab-cdef-1234567890ab",
        "incomingBookingId": "aaaa1111-bbbb-2222-cccc-333344445555"
      },
      "createdAt": "2026-05-10T14:32:10.241Z"
    }
  ]
}
```

If the trace doesn't belong to the requesting PM (`user_id` filter excludes it), the array is `[]`.

### Endpoint 3: Search

```
GET /api/audit/search?entityType=...&entityId=...&action=...&actorType=...&actorSource=...&actorId=...&from=...&to=...&limit=...&offset=...
```

**All query params optional.** PM scoping is automatic via session.

| Param | Type | Notes |
|---|---|---|
| `entityType` | `booking` \| `cleaning_project` \| `incoming_booking` | |
| `entityId` | UUID | |
| `action` | `create` \| `update` \| `delete` | |
| `actorType` | `user` \| `webhook` \| `cron` \| `system` | |
| `actorSource` | string | e.g. `hostaway`, `hospitable`, `ical-cron`, `manual` |
| `actorId` | string | authUserId or PM userId |
| `from` | ISO8601 timestamp | inclusive lower bound on `createdAt` |
| `to` | ISO8601 timestamp | inclusive upper bound |
| `limit` | int | default 50, max 200 |
| `offset` | int | default 0 |

**Success 200**
```json
{
  "status": "success",
  "data": [
    {
      "id": "8c7d6e5f-4a3b-2109-8765-43fedcba9876",
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      "parentEventId": "6a5b4c3d-2e1f-0987-6543-21fedcba9876",
      "userId": "11111111-2222-3333-4444-555555555555",
      "entityType": "cleaning_project",
      "entityId": "f0e1d2c3-b4a5-9687-5849-3a2b1c0d9e8f",
      "action": "create",
      "changedFields": ["/* trimmed for list response */"],
      "actorType": "webhook",
      "actorId": "11111111-2222-3333-4444-555555555555",
      "actorRole": null,
      "actorSource": "hostaway",
      "impersonatedBy": null,
      "webhookAuditLogId": "abc12345-def6-7890-1234-567890abcdef",
      "createdAt": "2026-05-10T14:32:10.241Z"
    }
  ],
  "total": 1247,
  "limit": 50,
  "offset": 0
}
```

> **Note**: the search endpoint omits `beforeData`, `afterData`, and `metadata` in the list response to keep payloads small. For full details, click through to either the per-record or trace endpoint.

---

## 2. TypeScript types

Create `src/services/types/audit.ts`:

```typescript
// Audit log types

export type AuditEntityType = 'booking' | 'cleaning_project' | 'incoming_booking'
export type AuditAction = 'create' | 'update' | 'delete'
export type AuditActorType = 'user' | 'webhook' | 'cron' | 'system'

/**
 * Source of an audit row's actor. Open-ended — backend may add new values.
 * Common values: 'hostaway', 'hospitable', 'guesty', 'ical-cron',
 * 'manual', 'backfill-sync', 'cleaningProjectService'.
 */
export type AuditActorSource = string | null

/**
 * Full audit event as returned by per-record / trace endpoints.
 * The `before`/`after` snapshots use the SOURCE table's snake_case shape
 * (we deliberately do NOT normalize them to camelCase since they are raw
 * historical snapshots — see beforeData / afterData below).
 */
export interface AuditEvent {
  id: string
  correlationId: string
  parentEventId: string | null
  userId: string | null
  entityType: AuditEntityType
  entityId: string
  action: AuditAction

  /** Full row snapshot BEFORE the change. null on `create`. snake_case keys. */
  beforeData: Record<string, unknown> | null

  /** Full row snapshot AFTER the change. null on `delete`. snake_case keys. */
  afterData: Record<string, unknown> | null

  /** Column names that differ between before and after (system fields excluded). */
  changedFields: string[]

  actorType: AuditActorType
  actorId: string | null
  actorRole: string | null
  actorSource: AuditActorSource
  impersonatedBy: string | null

  /** Links back to webhook_audit_log.id for webhook-triggered chains. */
  webhookAuditLogId: string | null

  /**
   * Free-form bag set by the writer at the call site. Common keys:
   * - cascade: string ("relinkNextBooking", "dragProjectDateForCheckoutChange", ...)
   * - triggeredByBookingId / newNextBookingId / isSameDayTurnover
   * - hostawayEvent / reservationId
   * - cancellation: boolean
   * - newStatus / importedBookingId
   * - source / mode
   */
  metadata: Record<string, unknown> | null

  createdAt: string
}

/** Trimmed audit row returned by the search endpoint (no before/after/metadata). */
export type AuditEventSummary = Omit<AuditEvent, 'beforeData' | 'afterData' | 'metadata'>

// ─── Response envelopes ──────────────────────────────────────────────────

export interface AuditHistoryResponse {
  status: 'success'
  data: AuditEvent[]
  limit: number
  offset: number
}

export interface AuditTraceResponse {
  status: 'success'
  data: AuditEvent[]
}

export interface AuditSearchResponse {
  status: 'success'
  data: AuditEventSummary[]
  total: number
  limit: number
  offset: number
}

export interface AuditSearchFilters {
  entityType?: AuditEntityType
  entityId?: string
  action?: AuditAction
  actorType?: AuditActorType
  actorSource?: string
  actorId?: string
  from?: string  // ISO8601
  to?: string    // ISO8601
  limit?: number
  offset?: number
}
```

---

## 3. Service module

Create `src/services/auditService.ts`:

```typescript
import apiClient from './apiClient'
import type {
  AuditEntityType,
  AuditEvent,
  AuditHistoryResponse,
  AuditTraceResponse,
  AuditSearchResponse,
  AuditSearchFilters,
} from './types/audit'

export async function getRecordHistory(
  entityType: AuditEntityType,
  entityId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<AuditHistoryResponse> {
  const params = new URLSearchParams()
  if (opts.limit != null) params.append('limit', String(opts.limit))
  if (opts.offset != null) params.append('offset', String(opts.offset))
  const qs = params.toString()
  return apiClient<AuditHistoryResponse>(
    `/audit/${entityType}/${entityId}${qs ? `?${qs}` : ''}`
  )
}

export async function getTrace(correlationId: string): Promise<AuditTraceResponse> {
  return apiClient<AuditTraceResponse>(`/audit/trace/${correlationId}`)
}

export async function searchEvents(filters: AuditSearchFilters): Promise<AuditSearchResponse> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') params.append(k, String(v))
  }
  const qs = params.toString()
  return apiClient<AuditSearchResponse>(`/audit/search${qs ? `?${qs}` : ''}`)
}

// ─── Pure helpers ────────────────────────────────────────────────────────

export interface AuditTreeNode extends AuditEvent {
  children: AuditTreeNode[]
}

/**
 * Build a tree from a flat array of audit events that share a correlationId.
 * Returns an array of root nodes (parentEventId === null) with `.children`
 * populated recursively. Orphans (parent in another correlation) appear at
 * the top level for visibility.
 */
export function buildAuditTree(events: AuditEvent[]): AuditTreeNode[] {
  const byId = new Map<string, AuditTreeNode>()
  events.forEach(e => byId.set(e.id, { ...e, children: [] }))

  const roots: AuditTreeNode[] = []
  for (const node of byId.values()) {
    if (node.parentEventId && byId.has(node.parentEventId)) {
      byId.get(node.parentEventId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (n: AuditTreeNode) => {
    n.children.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    n.children.forEach(sortRec)
  }
  roots.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  roots.forEach(sortRec)
  return roots
}

export interface DiffRow {
  field: string
  before: unknown
  after: unknown
}

/**
 * Compute the diff between an audit event's before and after for display.
 * Skips fields that didn't change, returns [{field, before, after}].
 */
export function computeDiff(event: AuditEvent): DiffRow[] {
  return event.changedFields.map(field => ({
    field,
    before: event.beforeData?.[field] ?? null,
    after: event.afterData?.[field] ?? null,
  }))
}

/** Human-readable label for an audit event row. */
export function labelEvent(
  e: AuditEvent | { entityType: string; action: string; metadata?: Record<string, unknown> | null }
): string {
  const cascade = (e as AuditEvent).metadata?.cascade as string | undefined
  if (cascade) {
    const labels: Record<string, string> = {
      relinkNextBooking: 'Re-linked next booking',
      dragProjectDateForCheckoutChange: 'Dragged project date',
      adaptProjectDateForCheckinChange: 'Adapted project date',
      autoRescheduleForNewBooking: 'Auto-rescheduled',
      cancelOnBookingDeletedOrCancelled: 'Cancelled (booking gone)',
      cancelOnScheduleConflict: 'Cancelled (schedule conflict)',
    }
    return labels[cascade] || cascade
  }
  return `${e.action[0].toUpperCase()}${e.action.slice(1)} ${e.entityType.replace('_', ' ')}`
}
```

---

## 4. Hooks

Create `src/hooks/useAuditHistory.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { getRecordHistory } from '@/services/auditService'
import type { AuditEntityType, AuditEvent } from '@/services/types/audit'

export function useAuditHistory(
  entityType: AuditEntityType,
  entityId: string | null | undefined,
  opts: { limit?: number; autoLoad?: boolean } = {}
) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getRecordHistory(entityType, entityId, { limit: opts.limit ?? 100 })
      setEvents(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (opts.autoLoad !== false && entityId) fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId])

  return { events, loading, error, refresh: fetchHistory }
}
```

Create `src/hooks/useAuditTrace.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { getTrace, buildAuditTree, type AuditTreeNode } from '@/services/auditService'
import type { AuditEvent } from '@/services/types/audit'

export function useAuditTrace(correlationId: string | null | undefined) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [tree, setTree] = useState<AuditTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!correlationId) return
    setLoading(true)
    setError(null)
    getTrace(correlationId)
      .then(res => {
        setEvents(res.data)
        setTree(buildAuditTree(res.data))
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load trace'))
      .finally(() => setLoading(false))
  }, [correlationId])

  return { events, tree, loading, error }
}
```

---

## 5. `<AuditHistoryPanel>` — reusable per-record view

The single component you embed in booking detail, cleaning project detail, and the admin page's "per-record" view.

Create `src/components/audit/AuditHistoryPanel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRightIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useAuditHistory } from '@/hooks/useAuditHistory'
import { computeDiff, labelEvent } from '@/services/auditService'
import type { AuditEntityType, AuditEvent } from '@/services/types/audit'
import AuditTraceModal from './AuditTraceModal'

interface Props {
  entityType: AuditEntityType
  entityId: string
}

export default function AuditHistoryPanel({ entityType, entityId }: Props) {
  const { events, loading, error, refresh } = useAuditHistory(entityType, entityId, { limit: 200 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [traceId, setTraceId] = useState<string | null>(null)

  if (loading) return <div className="p-6 text-gray-500">Loading history…</div>
  if (error) return (
    <div className="p-6 text-red-600 flex items-center gap-2">
      <ExclamationCircleIcon className="h-5 w-5" /> {error}
      <button onClick={refresh} className="ml-2 underline">Retry</button>
    </div>
  )
  if (events.length === 0) return (
    <div className="p-6 text-gray-500 flex items-center gap-2">
      <ClockIcon className="h-5 w-5" /> No history recorded yet.
    </div>
  )

  return (
    <>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {events.map(event => (
          <EventRow
            key={event.id}
            event={event}
            isExpanded={expandedId === event.id}
            onToggle={() => setExpandedId(prev => prev === event.id ? null : event.id)}
            onOpenTrace={() => setTraceId(event.correlationId)}
          />
        ))}
      </ul>
      <AnimatePresence>
        {traceId && (
          <AuditTraceModal
            correlationId={traceId}
            highlightId={null}
            onClose={() => setTraceId(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function EventRow({
  event, isExpanded, onToggle, onOpenTrace
}: {
  event: AuditEvent
  isExpanded: boolean
  onToggle: () => void
  onOpenTrace: () => void
}) {
  const diff = computeDiff(event)
  const actorBadge = `${event.actorType}${event.actorSource ? `/${event.actorSource}` : ''}`

  return (
    <li className="py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronRightIcon
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          <div>
            <div className="font-medium text-sm">{labelEvent(event)}</div>
            <div className="text-xs text-gray-500">
              {new Date(event.createdAt).toLocaleString()} · {actorBadge}
              {event.actorRole && <span> · {event.actorRole}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ActionBadge action={event.action} />
          <button
            onClick={(e) => { e.stopPropagation(); onOpenTrace() }}
            className="text-xs underline text-blue-600 hover:text-blue-800"
          >
            View trace
          </button>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 ml-7 rounded bg-gray-50 dark:bg-gray-800 p-3 text-xs space-y-2">
              {diff.length === 0 ? (
                <div className="text-gray-500 italic">No field-level changes (full row in metadata).</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="font-medium pr-4">Field</th>
                      <th className="font-medium pr-4">Before</th>
                      <th className="font-medium">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map(d => (
                      <tr key={d.field} className="align-top">
                        <td className="font-mono pr-4">{d.field}</td>
                        <td className="font-mono pr-4 text-red-600 break-all">{formatValue(d.before)}</td>
                        <td className="font-mono text-green-600 break-all">{formatValue(d.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="font-medium mb-1">Metadata</div>
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {event.webhookAuditLogId && (
                <div className="text-xs text-gray-500">
                  Webhook payload: <span className="font-mono">{event.webhookAuditLogId}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
  } as const
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[action as keyof typeof colors] || 'bg-gray-100'}`}>
      {action}
    </span>
  )
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
```

---

## 6. `<AuditTraceModal>` — tree vs flat causation viewer

Create `src/components/audit/AuditTraceModal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { XMarkIcon, ListBulletIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { useAuditTrace } from '@/hooks/useAuditTrace'
import { labelEvent, type AuditTreeNode } from '@/services/auditService'
import type { AuditEvent } from '@/services/types/audit'

interface Props {
  correlationId: string
  highlightId: string | null
  onClose: () => void
}

type ViewMode = 'tree' | 'flat'

export default function AuditTraceModal({ correlationId, highlightId, onClose }: Props) {
  const { events, tree, loading, error } = useAuditTrace(correlationId)
  const [mode, setMode] = useState<ViewMode>('tree')

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Causation trace</h2>
            <p className="text-xs text-gray-500 font-mono">{correlationId}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border overflow-hidden">
              <button
                onClick={() => setMode('tree')}
                className={`px-3 py-1 text-sm flex items-center gap-1 ${mode === 'tree' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
              >
                <Squares2X2Icon className="h-4 w-4" /> Tree
              </button>
              <button
                onClick={() => setMode('flat')}
                className={`px-3 py-1 text-sm flex items-center gap-1 ${mode === 'flat' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
              >
                <ListBulletIcon className="h-4 w-4" /> Flat
              </button>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-gray-500">Loading trace…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && events.length === 0 && (
            <div className="text-gray-500">No events found for this correlation_id.</div>
          )}
          {!loading && !error && events.length > 0 && (
            mode === 'tree'
              ? <TreeView nodes={tree} highlightId={highlightId} />
              : <FlatView events={events} highlightId={highlightId} />
          )}
        </div>

        <footer className="p-3 border-t text-xs text-gray-500">
          {events.length} event{events.length === 1 ? '' : 's'} in trace
        </footer>
      </motion.div>
    </motion.div>
  )
}

function TreeView({ nodes, highlightId }: { nodes: AuditTreeNode[]; highlightId: string | null }) {
  return (
    <ul className="space-y-1">
      {nodes.map(n => <TreeNode key={n.id} node={n} depth={0} highlightId={highlightId} />)}
    </ul>
  )
}

function TreeNode({ node, depth, highlightId }: { node: AuditTreeNode; depth: number; highlightId: string | null }) {
  const isHighlight = highlightId === node.id
  return (
    <li>
      <div
        style={{ paddingLeft: depth * 20 }}
        className={`flex items-baseline gap-2 py-1 px-2 rounded text-sm ${isHighlight ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
      >
        <span className="text-xs text-gray-400 font-mono">{new Date(node.createdAt).toISOString().slice(11, 23)}</span>
        <ActionDot action={node.action} />
        <span className="font-medium">{labelEvent(node)}</span>
        <span className="text-xs text-gray-500 font-mono">{node.entityType}/{node.entityId.slice(0, 8)}</span>
        <span className="ml-auto text-xs text-gray-500">
          {node.actorType}{node.actorSource ? `/${node.actorSource}` : ''}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-2 border-l border-gray-200 dark:border-gray-700">
          {node.children.map(c => <TreeNode key={c.id} node={c} depth={depth + 1} highlightId={highlightId} />)}
        </ul>
      )}
    </li>
  )
}

function FlatView({ events, highlightId }: { events: AuditEvent[]; highlightId: string | null }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b">
          <th className="py-2 pr-3">Time</th>
          <th className="pr-3">Entity</th>
          <th className="pr-3">Action</th>
          <th className="pr-3">Actor</th>
          <th>Label</th>
        </tr>
      </thead>
      <tbody>
        {events.map(e => (
          <tr key={e.id} className={`border-b ${highlightId === e.id ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}>
            <td className="py-1.5 pr-3 font-mono text-xs">{new Date(e.createdAt).toISOString().slice(11, 23)}</td>
            <td className="pr-3 font-mono text-xs">{e.entityType}/{e.entityId.slice(0, 8)}</td>
            <td className="pr-3"><ActionDot action={e.action} /> {e.action}</td>
            <td className="pr-3 text-xs">{e.actorType}{e.actorSource ? `/${e.actorSource}` : ''}</td>
            <td>{labelEvent(e)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ActionDot({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: 'bg-green-500', update: 'bg-blue-500', delete: 'bg-red-500'
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[action] || 'bg-gray-400'}`} />
}
```

---

## 7. Standalone admin page

Create the route at `src/app/(user)/property-manager/audit/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { searchEvents } from '@/services/auditService'
import type {
  AuditEventSummary,
  AuditSearchFilters,
  AuditEntityType,
  AuditAction,
  AuditActorType,
} from '@/services/types/audit'
import AuditTraceModal from '@/components/audit/AuditTraceModal'
import AuditHistoryPanel from '@/components/audit/AuditHistoryPanel'

const PAGE_SIZE = 50

export default function AuditPage() {
  usePermissionGuard('audit') // see Section 8 — add this permission key

  const [filters, setFilters] = useState<AuditSearchFilters>({ limit: PAGE_SIZE, offset: 0 })
  const [results, setResults] = useState<AuditEventSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [traceId, setTraceId] = useState<string | null>(null)
  const [recordView, setRecordView] = useState<{ type: AuditEntityType; id: string } | null>(null)

  const runSearch = async (override?: Partial<AuditSearchFilters>) => {
    setLoading(true)
    setError(null)
    const effective = { ...filters, ...override }
    setFilters(effective)
    try {
      const res = await searchEvents(effective)
      setResults(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-gray-500">
          Debug Hostaway and cleaning project data quality issues. 30-day retention.
        </p>
      </header>

      <div className="bg-white dark:bg-gray-900 border rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Select label="Entity" value={filters.entityType ?? ''} onChange={v => setFilters(f => ({ ...f, entityType: (v || undefined) as AuditEntityType | undefined }))}
          options={['', 'booking', 'cleaning_project', 'incoming_booking']} />
        <Select label="Action" value={filters.action ?? ''} onChange={v => setFilters(f => ({ ...f, action: (v || undefined) as AuditAction | undefined }))}
          options={['', 'create', 'update', 'delete']} />
        <Select label="Actor type" value={filters.actorType ?? ''} onChange={v => setFilters(f => ({ ...f, actorType: (v || undefined) as AuditActorType | undefined }))}
          options={['', 'user', 'webhook', 'cron', 'system']} />
        <TextInput label="Actor source" placeholder="hostaway / ical-cron / …" value={filters.actorSource ?? ''}
          onChange={v => setFilters(f => ({ ...f, actorSource: v || undefined }))} />
        <TextInput label="Entity ID (UUID)" value={filters.entityId ?? ''}
          onChange={v => setFilters(f => ({ ...f, entityId: v || undefined }))} />
        <TextInput label="Actor ID" value={filters.actorId ?? ''}
          onChange={v => setFilters(f => ({ ...f, actorId: v || undefined }))} />
        <TextInput label="From (ISO)" type="datetime-local" value={filters.from ?? ''}
          onChange={v => setFilters(f => ({ ...f, from: v || undefined }))} />
        <TextInput label="To (ISO)" type="datetime-local" value={filters.to ?? ''}
          onChange={v => setFilters(f => ({ ...f, to: v || undefined }))} />
        <div className="md:col-span-3 lg:col-span-4 flex items-end gap-2">
          <button
            onClick={() => runSearch({ offset: 0 })}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="h-4 w-4" /> Search
          </button>
          <button
            onClick={() => { setFilters({ limit: PAGE_SIZE, offset: 0 }); setResults([]); setTotal(0) }}
            className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500">
            <tr className="text-left">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Changed fields</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500"><ArrowPathIcon className="h-4 w-4 animate-spin inline" /> Searching…</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No results. Adjust filters and search.</td></tr>
            ) : (
              results.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 font-mono text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <button onClick={() => setRecordView({ type: r.entityType, id: r.entityId })} className="text-blue-600 hover:underline">
                      {r.entityType}/{r.entityId.slice(0, 8)}
                    </button>
                  </td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2 text-xs">{r.actorType}{r.actorSource ? `/${r.actorSource}` : ''}</td>
                  <td className="px-3 py-2 text-xs">{r.changedFields.join(', ')}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setTraceId(r.correlationId)} className="text-blue-600 hover:underline text-xs">Trace</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {results.length > 0 && (
          <div className="flex items-center justify-between p-3 text-xs text-gray-500 border-t">
            <span>{(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + results.length, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                disabled={(filters.offset ?? 0) === 0}
                onClick={() => runSearch({ offset: Math.max(0, (filters.offset ?? 0) - PAGE_SIZE) })}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Prev</button>
              <button
                disabled={(filters.offset ?? 0) + PAGE_SIZE >= total}
                onClick={() => runSearch({ offset: (filters.offset ?? 0) + PAGE_SIZE })}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {traceId && <AuditTraceModal correlationId={traceId} highlightId={null} onClose={() => setTraceId(null)} />}

      {recordView && (
        <RecordHistoryModal
          entityType={recordView.type}
          entityId={recordView.id}
          onClose={() => setRecordView(null)}
        />
      )}
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-xs text-gray-500">
      {label}
      <select className="block w-full mt-1 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-800"
        value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || '(any)'}</option>)}
      </select>
    </label>
  )
}

function TextInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="text-xs text-gray-500">
      {label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="block w-full mt-1 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-800" />
    </label>
  )
}

function RecordHistoryModal({ entityType, entityId, onClose }: { entityType: AuditEntityType; entityId: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b">
          <h2 className="text-lg font-semibold">Record history</h2>
          <p className="text-xs font-mono text-gray-500">{entityType} / {entityId}</p>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <AuditHistoryPanel entityType={entityType} entityId={entityId} />
        </div>
      </motion.div>
    </motion.div>
  )
}
```

---

## 8. Nav + permissions wiring

**`src/constants/routePermissionMap.ts`** — add the new route:

```typescript
'/property-manager/audit': 'audit',
```

**`src/constants/permissionTemplates.ts`** — add `audit` as a new `PermissionKey` (PM/ADMIN auto-true; cleaner/team_member default to `'none'`). Match how other PM-only routes are gated; if you don't have a permission scheme that already restricts by ADMIN/PROPERTY-MANAGER role, the backend's `requireAuditAccess` middleware will still 403 cleaners and team members.

**Sidebar nav** — wherever the PM sidebar items live (constants file or `useFilteredNavConfig`), add:

```typescript
{ href: '/property-manager/audit', label: 'Audit Log', icon: ClipboardDocumentListIcon, permission: 'audit' }
```

---

## 9. Embed history in existing detail views

The `AuditHistoryPanel` is self-contained: fetches its own history, expands diffs inline, opens the trace modal on "View trace". No extra wiring.

**Booking detail** (likely `src/components/booking/preview/previewBookingModal.tsx`):

```typescript
import AuditHistoryPanel from '@/components/audit/AuditHistoryPanel'

{activeTab === 'history' && booking?.id && (
  <AuditHistoryPanel entityType="booking" entityId={booking.id} />
)}
```

**Cleaning project detail** — same pattern, `entityType="cleaning_project"`.

---

## 10. i18n keys

Add to `public/locales/<lang>/common.json`:

```json
{
  "audit": {
    "title": "Audit Log",
    "subtitle": "Debug Hostaway and cleaning project data quality issues. 30-day retention.",
    "noHistory": "No history recorded yet.",
    "loading": "Loading history…",
    "noResults": "No results. Adjust filters and search.",
    "filters": {
      "entity": "Entity",
      "action": "Action",
      "actorType": "Actor type",
      "actorSource": "Actor source",
      "entityId": "Entity ID",
      "actorId": "Actor ID",
      "from": "From",
      "to": "To"
    },
    "actions": { "search": "Search", "reset": "Reset", "trace": "View trace", "prev": "Prev", "next": "Next" },
    "cascade": {
      "relinkNextBooking": "Re-linked next booking",
      "dragProjectDateForCheckoutChange": "Dragged project date (checkout changed)",
      "adaptProjectDateForCheckinChange": "Adapted project date (check-in changed)",
      "autoRescheduleForNewBooking": "Auto-rescheduled for new booking",
      "cancelOnBookingDeletedOrCancelled": "Cancelled (booking gone)",
      "cancelOnScheduleConflict": "Cancelled (schedule conflict)"
    }
  }
}
```

---

## 11. Build order

| Step | What | Effort |
|---|---|---|
| 1 | Types + service module + hooks (pure infrastructure) | ~1 hour |
| 2 | `AuditHistoryPanel` — drop into a dev page, verify diffs render | ~2 hours |
| 3 | `AuditTraceModal` (tree + flat) — test against a known webhook correlation_id | ~3 hours |
| 4 | Standalone admin page + nav wiring + permissions | ~2 hours |
| 5 | Embed `AuditHistoryPanel` in booking detail + project detail | ~30 min |
| 6 | i18n keys | ~15 min |
| **Total** | | **~9 hours** |

---

## 12. Future integration ideas

- **Webhook response header**: Hostaway webhook responses include `X-Correlation-Id` — surface it on the incoming-bookings detail page as a "Show trace" link so PMs can investigate a specific webhook by clicking.
- **Activity feed integration**: the existing dashboard activity feed (`dashboardService.ts`) could optionally augment each row with a "Show audit trace" link when a correlation_id is available.
- **Bulk export**: a "Download CSV" button on the admin page that runs the search with `limit=1000` and streams to a file — useful for offline triage.
