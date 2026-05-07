// services/timeEntryService.ts
//
// Service layer for the Time-Sheet (Clock In/Out + approval) feature.

import apiClient, { getAuthHeaders } from './apiClient'
import type {
  TimeEntryResponse,
  TimeEntriesResponse,
  MyTimeEntriesResponse,
  TeamTimeSummaryResponse,
  DeleteTimeEntryResponse,
  ClockOutPayload,
  BackfillTimeEntryPayload,
  UpdateTimeEntryPayload,
  RejectTimeEntryPayload,
} from './types/timeEntry'

// ---- Team-member self-service ----------------------------------------------

/**
 * Unified "Log hours" submission. Always lands as 'pending'; over-cap entries
 * additionally require an `overCapReason`. Returns the new TimeEntry.
 */
export interface SubmitTimeEntryPayload {
  startedAt: string
  endedAt: string
  notes?: string
  overCapReason?: string
}

export function submitTimeEntry(payload: SubmitTimeEntryPayload): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse, SubmitTimeEntryPayload>(
    '/time-entries',
    { method: 'POST', body: payload },
  )
}

export function clockIn(): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse>('/time-entries/clock-in', { method: 'POST', body: {} })
}

export function clockOut(payload: ClockOutPayload = {}): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse, ClockOutPayload>(
    '/time-entries/clock-out',
    { method: 'POST', body: payload },
  )
}

export function backfillTimeEntry(payload: BackfillTimeEntryPayload): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse, BackfillTimeEntryPayload>(
    '/time-entries/backfill',
    { method: 'POST', body: payload },
  )
}

export function getMyTimeEntries(): Promise<MyTimeEntriesResponse> {
  return apiClient<MyTimeEntriesResponse>('/time-entries/me')
}

// ---- Generic CRUD ----------------------------------------------------------

export function updateTimeEntry(id: string, payload: UpdateTimeEntryPayload): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse, UpdateTimeEntryPayload>(
    `/time-entries/${id}`,
    { method: 'PUT', body: payload },
  )
}

export function deleteTimeEntry(id: string): Promise<DeleteTimeEntryResponse> {
  return apiClient<DeleteTimeEntryResponse>(`/time-entries/${id}`, { method: 'DELETE' })
}

// ---- PM-only ---------------------------------------------------------------

export interface ListTimeEntriesQuery {
  userId: string
  teamMemberId?: string
  weekStart?: string                      // ISO instant
  weekEnd?: string
  status?: 'open' | 'approved' | 'pending' | 'rejected'
}

export function getTimeEntries(query: ListTimeEntriesQuery): Promise<TimeEntriesResponse> {
  const params = new URLSearchParams()
  params.set('userId', query.userId)
  if (query.teamMemberId) params.set('teamMemberId', query.teamMemberId)
  if (query.weekStart)    params.set('weekStart', query.weekStart)
  if (query.weekEnd)      params.set('weekEnd', query.weekEnd)
  if (query.status)       params.set('status', query.status)
  return apiClient<TimeEntriesResponse>(`/time-entries?${params.toString()}`)
}

export function getTeamTimeSummary(userId: string, weekAnchor?: string): Promise<TeamTimeSummaryResponse> {
  const params = new URLSearchParams()
  params.set('userId', userId)
  if (weekAnchor) params.set('weekStart', weekAnchor)
  return apiClient<TeamTimeSummaryResponse>(`/time-entries/summary?${params.toString()}`)
}

export function approveTimeEntry(id: string): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse>(`/time-entries/${id}/approve`, { method: 'PATCH', body: {} })
}

export function rejectTimeEntry(id: string, payload: RejectTimeEntryPayload): Promise<TimeEntryResponse> {
  return apiClient<TimeEntryResponse, RejectTimeEntryPayload>(
    `/time-entries/${id}/reject`,
    { method: 'PATCH', body: payload },
  )
}

export interface BulkApproveResponse {
  status: 'success' | 'failed'
  data: {
    approvedCount: number
    skippedCount: number
    approvedIds: string[]
  }
  message?: string
}

export function bulkApproveTimeEntries(ids: string[]): Promise<BulkApproveResponse> {
  return apiClient<BulkApproveResponse, { ids: string[] }>(
    '/time-entries/bulk-approve',
    { method: 'PATCH', body: { ids } },
  )
}

// ---- CSV export ------------------------------------------------------------
// apiClient parses every response as JSON, so we drop down to raw fetch here.
// Returns a Blob that the caller can pipe into a download anchor.

export interface ExportPayrollQuery {
  userId: string
  startDate: string                       // YYYY-MM-DD (interpreted in PM tz)
  endDate: string
  teamMemberId?: string
  includePending?: boolean
}

export async function exportPayrollCsv(query: ExportPayrollQuery): Promise<{ blob: Blob; filename: string }> {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL
  const params = new URLSearchParams()
  params.set('userId', query.userId)
  params.set('startDate', query.startDate)
  params.set('endDate', query.endDate)
  if (query.teamMemberId) params.set('teamMemberId', query.teamMemberId)
  if (query.includePending) params.set('includePending', 'true')

  const headers = await getAuthHeaders()
  const response = await fetch(`${baseURL}/time-entries/export?${params.toString()}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    let msg = `Export failed (HTTP ${response.status})`
    try {
      const body = await response.json()
      if (body?.message) msg = body.message
    } catch { /* not JSON */ }
    throw new Error(msg)
  }

  const blob = await response.blob()
  const cd = response.headers.get('Content-Disposition') || ''
  const match = cd.match(/filename="?([^";]+)"?/)
  const filename = match ? match[1] : `timesheet_${query.startDate}_${query.endDate}.csv`
  return { blob, filename }
}

// Convenience: trigger a download in the browser
export function downloadCsvBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Free the object URL on the next tick
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
