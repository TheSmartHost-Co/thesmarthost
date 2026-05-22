// Audit log service — wraps /audit/* endpoints with the standard apiClient.

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

// Build a parent→children tree from a flat trace. Orphans (parent missing from
// the trace) bubble up as additional roots so they remain visible.
export function buildAuditTree(events: AuditEvent[]): AuditTreeNode[] {
  const byId = new Map<string, AuditTreeNode>()
  events.forEach(e => byId.set(e.id, { ...e, children: [] }))

  const attached = new Set<string>()
  for (const node of byId.values()) {
    if (node.parentEventId && byId.has(node.parentEventId) && node.parentEventId !== node.id) {
      byId.get(node.parentEventId)!.children.push(node)
      attached.add(node.id)
    }
  }
  const roots: AuditTreeNode[] = []
  for (const node of byId.values()) {
    if (!attached.has(node.id)) roots.push(node)
  }
  // Defensive: if backend ever emits a cycle, `seen` prevents infinite recursion.
  const sortRec = (n: AuditTreeNode, seen: Set<string>) => {
    if (seen.has(n.id)) return
    seen.add(n.id)
    n.children.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    n.children.forEach(c => sortRec(c, seen))
  }
  roots.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const seen = new Set<string>()
  roots.forEach(r => sortRec(r, seen))
  return roots
}

export interface DiffRow {
  field: string
  before: unknown
  after: unknown
}

export function computeDiff(event: AuditEvent): DiffRow[] {
  return event.changedFields.map(field => ({
    field,
    before: event.beforeData?.[field] ?? null,
    after: event.afterData?.[field] ?? null,
  }))
}

// Recursive object diff for the "changes only" toggle. When both sides are
// plain objects, returns stripped copies containing only the keys whose values
// differ. Arrays and scalars are treated atomically.
export interface DeepDiffResult {
  changed: boolean
  before: unknown
  after: unknown
}

export function deepDiff(before: unknown, after: unknown): DeepDiffResult {
  if (deepEqual(before, after)) return { changed: false, before: undefined, after: undefined }
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return { changed: true, before, after }
  }
  const outBefore: Record<string, unknown> = {}
  const outAfter: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    const sub = deepDiff(before[k], after[k])
    if (sub.changed) {
      outBefore[k] = sub.before
      outAfter[k] = sub.after
    }
  }
  if (Object.keys(outBefore).length === 0 && Object.keys(outAfter).length === 0) {
    return { changed: false, before: undefined, after: undefined }
  }
  return { changed: true, before: outBefore, after: outAfter }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    const bArr = b as unknown[]
    if (a.length !== bArr.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], bArr[i])) return false
    return true
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const ka = Object.keys(ao)
  if (ka.length !== Object.keys(bo).length) return false
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false
    if (!deepEqual(ao[k], bo[k])) return false
  }
  return true
}

// Map a cascade metadata value to the i18n key used to label it. Returns null
// when the event has no cascade tag — caller falls back to action + entity.
export function getCascadeKey(event: Pick<AuditEvent, 'metadata'>): string | null {
  const cascade = event.metadata?.cascade
  return typeof cascade === 'string' ? cascade : null
}
