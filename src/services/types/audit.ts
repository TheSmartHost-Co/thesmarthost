// Audit log types — see /api/audit endpoints on the backend.

export type AuditEntityType = 'booking' | 'cleaning_project' | 'incoming_booking'
export type AuditAction = 'create' | 'update' | 'delete'
export type AuditActorType = 'user' | 'webhook' | 'cron' | 'system'

// Open-ended — backend may add new sources. Common: 'hostaway', 'hospitable',
// 'guesty', 'ical-cron', 'manual', 'cleaningProjectService'.
export type AuditActorSource = string | null

// beforeData / afterData are raw row snapshots and preserve the source table's
// snake_case shape. They are deliberately not normalized to camelCase.
export interface AuditEvent {
  id: string
  correlationId: string
  parentEventId: string | null
  userId: string | null
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  changedFields: string[]
  actorType: AuditActorType
  actorId: string | null
  actorRole: string | null
  actorSource: AuditActorSource
  impersonatedBy: string | null
  webhookAuditLogId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

// Trimmed payload returned by /audit/search (omits heavy snapshots).
export type AuditEventSummary = Omit<AuditEvent, 'beforeData' | 'afterData' | 'metadata'>

export interface AuditHistoryResponse {
  status: 'success' | 'failed'
  message?: string
  data: AuditEvent[]
  limit: number
  offset: number
}

export interface AuditTraceResponse {
  status: 'success' | 'failed'
  message?: string
  data: AuditEvent[]
}

export interface AuditSearchResponse {
  status: 'success' | 'failed'
  message?: string
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
  from?: string
  to?: string
  limit?: number
  offset?: number
}
