import apiClient, { getAuthHeaders } from './apiClient'
import type {
  PaystubResponse,
  PaystubsResponse,
  PaystubSummaryResponse,
  AvailableTimeEntriesResponse,
  AvailablePaystubExpensesResponse,
  PaystubItemResponse,
  DeletePaystubResponse,
  CreatePaystubPayload,
  UpdatePaystubPayload,
  UpdatePaystubItemPayload,
  AddPaystubItemPayload,
  AddPaystubExpensePayload,
  PaystubPDFResponse,
  PaystubFilesResponse,
  PaystubFileDownloadResponse,
  MonthlyEarningsResponse,
  PaystubStatus,
  ConvertPaystubItemToExpensePayload,
  ConvertPaystubItemToExpenseResponse,
  SendPaystubPayload,
  SendPaystubResponse,
} from './types/paystub'

// List paystubs with optional filters
export function getPaystubs(
  teamMemberId?: string,
  status?: string,
  includeArchived?: boolean
): Promise<PaystubsResponse> {
  const params = new URLSearchParams()
  if (teamMemberId) params.append('teamMemberId', teamMemberId)
  if (status) params.append('status', status)
  if (includeArchived) params.append('includeArchived', 'true')
  const qs = params.toString()
  return apiClient<PaystubsResponse>(`/paystubs${qs ? `?${qs}` : ''}`)
}

// TM self-list (auto-scoped to caller)
export function getMyPaystubs(
  status?: string,
  includeArchived?: boolean
): Promise<PaystubsResponse> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (includeArchived) params.append('includeArchived', 'true')
  const qs = params.toString()
  return apiClient<PaystubsResponse>(`/paystubs/me${qs ? `?${qs}` : ''}`)
}

// Summary stats + dollar totals
export function getPaystubSummary(teamMemberId?: string): Promise<PaystubSummaryResponse> {
  const params = new URLSearchParams()
  if (teamMemberId) params.append('teamMemberId', teamMemberId)
  const qs = params.toString()
  return apiClient<PaystubSummaryResponse>(`/paystubs/summary${qs ? `?${qs}` : ''}`)
}

// Time entries available to add to a paystub
export function getAvailableTimeEntries(
  teamMemberId: string,
  startDate?: string,
  endDate?: string,
  includePending?: boolean
): Promise<AvailableTimeEntriesResponse> {
  const params = new URLSearchParams()
  params.append('teamMemberId', teamMemberId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (includePending) params.append('includePending', 'true')
  return apiClient<AvailableTimeEntriesResponse>(`/paystubs/available-entries?${params.toString()}`)
}

// TM-paid expenses available to add to a paystub
export function getAvailablePaystubExpenses(
  teamMemberId: string,
  startDate?: string,
  endDate?: string,
  propertyId?: string,
  category?: string,
  search?: string
): Promise<AvailablePaystubExpensesResponse> {
  const params = new URLSearchParams()
  params.append('teamMemberId', teamMemberId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (propertyId) params.append('propertyId', propertyId)
  if (category) params.append('category', category)
  if (search) params.append('search', search)
  return apiClient<AvailablePaystubExpensesResponse>(`/paystubs/available-expenses?${params.toString()}`)
}

// Monthly earnings breakdown for TM dashboard
export function getMonthlyEarnings(teamMemberId?: string): Promise<MonthlyEarningsResponse> {
  const params = new URLSearchParams()
  if (teamMemberId) params.append('teamMemberId', teamMemberId)
  const qs = params.toString()
  return apiClient<MonthlyEarningsResponse>(`/paystubs/earnings${qs ? `?${qs}` : ''}`)
}

// Get single paystub with items (signed URLs included)
export function getPaystubById(id: string): Promise<PaystubResponse> {
  return apiClient<PaystubResponse>(`/paystubs/${id}`)
}

// Create a paystub
export function createPaystub(data: CreatePaystubPayload): Promise<PaystubResponse> {
  return apiClient<PaystubResponse, CreatePaystubPayload>('/paystubs', {
    method: 'POST',
    body: data,
  })
}

// Update paystub metadata (draft/rejected/pending only)
export function updatePaystub(id: string, data: UpdatePaystubPayload): Promise<PaystubResponse> {
  return apiClient<PaystubResponse, UpdatePaystubPayload>(`/paystubs/${id}`, {
    method: 'PUT',
    body: data,
  })
}

// PM-only hard delete
export function deletePaystub(id: string): Promise<DeletePaystubResponse> {
  return apiClient<DeletePaystubResponse>(`/paystubs/${id}`, {
    method: 'DELETE',
  })
}

// Add a line item (extra charge, existing expense, or receipt-to-expense)
export function addPaystubItem(
  paystubId: string,
  data: AddPaystubItemPayload
): Promise<PaystubItemResponse> {
  return apiClient<PaystubItemResponse, AddPaystubItemPayload>(
    `/paystubs/${paystubId}/items`,
    { method: 'POST', body: data }
  )
}

// Edit a line item
export function updatePaystubItem(
  paystubId: string,
  itemId: string,
  data: UpdatePaystubItemPayload
): Promise<PaystubItemResponse> {
  return apiClient<PaystubItemResponse, UpdatePaystubItemPayload>(
    `/paystubs/${paystubId}/items/${itemId}`,
    { method: 'PUT', body: data }
  )
}

// Convert extra_charge line item to a tracked expense
export function convertPaystubItemToExpense(
  paystubId: string,
  itemId: string,
  data: ConvertPaystubItemToExpensePayload
): Promise<ConvertPaystubItemToExpenseResponse> {
  return apiClient<ConvertPaystubItemToExpenseResponse, ConvertPaystubItemToExpensePayload>(
    `/paystubs/${paystubId}/items/${itemId}/expense`,
    { method: 'POST', body: data }
  )
}

// Remove a line item
export function deletePaystubItem(
  paystubId: string,
  itemId: string
): Promise<DeletePaystubResponse> {
  return apiClient<DeletePaystubResponse>(
    `/paystubs/${paystubId}/items/${itemId}`,
    { method: 'DELETE' }
  )
}

// Link an existing TM-paid expense as a line item (alternative to addPaystubItem)
export function addPaystubExpense(
  paystubId: string,
  expenseId: string
): Promise<PaystubItemResponse> {
  return apiClient<PaystubItemResponse, AddPaystubExpensePayload>(
    `/paystubs/${paystubId}/expenses`,
    { method: 'POST', body: { expenseId } }
  )
}

// Remove an expense line item (returns expense to "available")
export function removePaystubExpense(
  paystubId: string,
  expenseId: string
): Promise<DeletePaystubResponse> {
  return apiClient<DeletePaystubResponse>(
    `/paystubs/${paystubId}/expenses/${expenseId}`,
    { method: 'DELETE' }
  )
}

// Submit (draft|rejected → pending)
export function submitPaystub(id: string): Promise<PaystubResponse> {
  return apiClient<PaystubResponse>(`/paystubs/${id}/submit`, { method: 'POST' })
}

// PM: Approve (pending → approved)
export function approvePaystub(id: string, notes?: string): Promise<PaystubResponse> {
  return apiClient<PaystubResponse, { notes?: string }>(`/paystubs/${id}/approve`, {
    method: 'POST',
    body: { notes },
  })
}

// PM: Reject (pending → rejected; notes required)
export function rejectPaystub(id: string, notes: string): Promise<PaystubResponse> {
  return apiClient<PaystubResponse, { notes: string }>(`/paystubs/${id}/reject`, {
    method: 'POST',
    body: { notes },
  })
}

// PM: Mark paid (approved → paid; snapshots totals)
export function markPaystubPaid(id: string, notes?: string): Promise<PaystubResponse> {
  return apiClient<PaystubResponse, { notes?: string }>(`/paystubs/${id}/mark-paid`, {
    method: 'POST',
    body: { notes },
  })
}

// PM: Free-form status change
export function changePaystubStatus(id: string, status: PaystubStatus): Promise<PaystubResponse> {
  return apiClient<PaystubResponse, { status: PaystubStatus }>(`/paystubs/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

// Generate PDF
export function generatePaystubPDF(id: string): Promise<PaystubPDFResponse> {
  return apiClient<PaystubPDFResponse>(`/paystubs/${id}/generate-pdf`, {
    method: 'POST',
  })
}

// PM: email a fresh branded PDF to the team member as an attachment.
// On 409 (TM has email off) the failed body carries data.emailDisabled —
// re-call with { override: true } to deliver anyway.
export function sendPaystub(
  id: string,
  data: SendPaystubPayload = {}
): Promise<SendPaystubResponse> {
  return apiClient<SendPaystubResponse, SendPaystubPayload>(`/paystubs/${id}/send`, {
    method: 'POST',
    body: data,
  })
}

// List PDF versions
export function getPaystubFiles(id: string): Promise<PaystubFilesResponse> {
  return apiClient<PaystubFilesResponse>(`/paystubs/${id}/files`)
}

// Fresh signed URL for a PDF version
export function downloadPaystubFile(
  paystubId: string,
  fileId: string
): Promise<PaystubFileDownloadResponse> {
  return apiClient<PaystubFileDownloadResponse>(`/paystubs/${paystubId}/files/${fileId}/download`)
}

// CSV export (PM-only). Raw fetch — apiClient parses everything as JSON.
export async function exportPaystubsCsv(
  teamMemberId?: string,
  status?: string
): Promise<{ blob: Blob; filename: string }> {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL
  const params = new URLSearchParams()
  if (teamMemberId) params.append('teamMemberId', teamMemberId)
  if (status) params.append('status', status)
  const qs = params.toString()

  const headers = await getAuthHeaders()
  const response = await fetch(
    `${baseURL}/paystubs/export${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers }
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
  const filename = match ? match[1] : `paystubs_${new Date().toISOString().slice(0, 10)}.csv`
  return { blob, filename }
}
