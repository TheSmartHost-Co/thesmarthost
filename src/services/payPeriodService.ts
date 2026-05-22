// services/payPeriodService.ts
//
// Service layer for the Pay-Schedule / Pay-Period feature. Wraps the
// /pay-schedule-settings and /pay-periods endpoints. Tenancy is scoped
// automatically by the caller's auth token — no userId param needed.

import apiClient, { getAuthHeaders } from './apiClient'
import type {
  PayScheduleSettingsResponse,
  PayScheduleSettingsPayload,
  PayPeriodResponse,
  PayPeriodListResponse,
  PayPeriodDetailResponse,
  ApproveAllResponse,
  DeletePayPeriodResponse,
  CreatePayPeriodPayload,
  UpdatePayPeriodPayload,
} from './types/payPeriod'

// ---- Settings -------------------------------------------------------------

export function getPayScheduleSettings(): Promise<PayScheduleSettingsResponse> {
  return apiClient<PayScheduleSettingsResponse>('/pay-schedule-settings')
}

export function upsertPayScheduleSettings(
  payload: PayScheduleSettingsPayload,
): Promise<PayScheduleSettingsResponse> {
  return apiClient<PayScheduleSettingsResponse, PayScheduleSettingsPayload>(
    '/pay-schedule-settings',
    { method: 'PUT', body: payload },
  )
}

// ---- Periods --------------------------------------------------------------

export interface ListPayPeriodsQuery {
  teamMemberId?: string
  status?: 'open' | 'paid'
  year?: number
}

export function listPayPeriods(query: ListPayPeriodsQuery = {}): Promise<PayPeriodListResponse> {
  const params = new URLSearchParams()
  if (query.teamMemberId) params.set('teamMemberId', query.teamMemberId)
  if (query.status)       params.set('status', query.status)
  if (query.year != null) params.set('year', String(query.year))
  const qs = params.toString()
  return apiClient<PayPeriodListResponse>(`/pay-periods${qs ? `?${qs}` : ''}`)
}

// Team-member self-service: pre-scoped to the caller's own team_member_id.
export function getMyPayPeriods(
  query: { status?: 'open' | 'paid'; year?: number } = {},
): Promise<PayPeriodListResponse> {
  const params = new URLSearchParams()
  if (query.status)       params.set('status', query.status)
  if (query.year != null) params.set('year', String(query.year))
  const qs = params.toString()
  return apiClient<PayPeriodListResponse>(`/pay-periods/me${qs ? `?${qs}` : ''}`)
}

export function createPayPeriod(payload: CreatePayPeriodPayload): Promise<PayPeriodResponse> {
  return apiClient<PayPeriodResponse, CreatePayPeriodPayload>(
    '/pay-periods',
    { method: 'POST', body: payload },
  )
}

export function getPayPeriod(id: string): Promise<PayPeriodDetailResponse> {
  return apiClient<PayPeriodDetailResponse>(`/pay-periods/${id}`)
}

export function updatePayPeriod(
  id: string,
  payload: UpdatePayPeriodPayload,
): Promise<PayPeriodResponse> {
  return apiClient<PayPeriodResponse, UpdatePayPeriodPayload>(
    `/pay-periods/${id}`,
    { method: 'PUT', body: payload },
  )
}

export function deletePayPeriod(id: string): Promise<DeletePayPeriodResponse> {
  return apiClient<DeletePayPeriodResponse>(`/pay-periods/${id}`, { method: 'DELETE' })
}

export function markPayPeriodPaid(id: string): Promise<PayPeriodResponse> {
  return apiClient<PayPeriodResponse>(
    `/pay-periods/${id}/mark-paid`,
    { method: 'PATCH', body: {} },
  )
}

export function approveAllInPeriod(id: string): Promise<ApproveAllResponse> {
  return apiClient<ApproveAllResponse>(
    `/pay-periods/${id}/approve-all`,
    { method: 'PATCH', body: {} },
  )
}

// ---- CSV export -----------------------------------------------------------
// apiClient parses every response as JSON, so we drop to raw fetch here.

export interface ExportPayPeriodQuery {
  includePending?: boolean
}

export async function exportPayPeriodCsv(
  id: string,
  query: ExportPayPeriodQuery = {},
): Promise<{ blob: Blob; filename: string }> {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL
  const params = new URLSearchParams()
  if (query.includePending) params.set('includePending', 'true')
  const qs = params.toString()

  const headers = await getAuthHeaders()
  const response = await fetch(
    `${baseURL}/pay-periods/${id}/export${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers },
  )

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
  const filename = match ? match[1] : `pay_period_${id}.csv`
  return { blob, filename }
}
