import apiClient from './apiClient'
import type {
  CleanerInvoiceResponse,
  CleanerInvoicesResponse,
  InvoiceSummaryResponse,
  AvailableProjectsResponse,
  InvoiceItemResponse,
  DeleteInvoiceResponse,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  UpdateInvoiceItemPayload,
  AddInvoiceItemPayload,
  InvoicePDFResponse,
  InvoiceFilesResponse,
  InvoiceFileDownloadResponse,
  MonthlyEarningsResponse,
  InvoiceStatus,
} from './types/cleanerInvoice'

// List invoices with optional filters
export function getCleanerInvoices(
  cleanerId?: string,
  status?: string,
  includeArchived?: boolean
): Promise<CleanerInvoicesResponse> {
  const params = new URLSearchParams()
  if (cleanerId) params.append('cleanerId', cleanerId)
  if (status) params.append('status', status)
  if (includeArchived) params.append('includeArchived', 'true')
  const qs = params.toString()
  return apiClient<CleanerInvoicesResponse>(`/cleaner-invoices${qs ? `?${qs}` : ''}`)
}

// Get invoice summary stats
export function getInvoiceSummary(
  cleanerId?: string
): Promise<InvoiceSummaryResponse> {
  const params = new URLSearchParams()
  if (cleanerId) params.append('cleanerId', cleanerId)
  const qs = params.toString()
  return apiClient<InvoiceSummaryResponse>(`/cleaner-invoices/summary${qs ? `?${qs}` : ''}`)
}

// Get completed projects available for invoicing
export function getAvailableProjects(
  cleanerId: string,
  startDate?: string,
  endDate?: string
): Promise<AvailableProjectsResponse> {
  const params = new URLSearchParams()
  params.append('cleanerId', cleanerId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  return apiClient<AvailableProjectsResponse>(`/cleaner-invoices/available-projects?${params.toString()}`)
}

// Get single invoice with items
export function getInvoiceById(id: string): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse>(`/cleaner-invoices/${id}`)
}

// Create invoice from date range
export function createInvoice(data: CreateInvoicePayload): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse, CreateInvoicePayload>('/cleaner-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

// Update invoice metadata
export function updateInvoice(id: string, data: UpdateInvoicePayload): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse, UpdateInvoicePayload>(`/cleaner-invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

// Update a line item
export function updateInvoiceItem(
  invoiceId: string,
  itemId: string,
  data: UpdateInvoiceItemPayload
): Promise<InvoiceItemResponse> {
  return apiClient<InvoiceItemResponse, UpdateInvoiceItemPayload>(
    `/cleaner-invoices/${invoiceId}/items/${itemId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }
  )
}

// Add manual extra charge item
export function addInvoiceItem(
  invoiceId: string,
  data: AddInvoiceItemPayload
): Promise<InvoiceItemResponse> {
  return apiClient<InvoiceItemResponse, AddInvoiceItemPayload>(
    `/cleaner-invoices/${invoiceId}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }
  )
}

// Delete a line item
export function deleteInvoiceItem(
  invoiceId: string,
  itemId: string
): Promise<DeleteInvoiceResponse> {
  return apiClient<DeleteInvoiceResponse>(`/cleaner-invoices/${invoiceId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

// Submit invoice to PM (cash out)
export function submitInvoice(id: string): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse>(`/cleaner-invoices/${id}/submit`, {
    method: 'POST',
  })
}

// Delete draft invoice
export function deleteInvoice(id: string): Promise<DeleteInvoiceResponse> {
  return apiClient<DeleteInvoiceResponse>(`/cleaner-invoices/${id}`, {
    method: 'DELETE',
  })
}

// PM: Approve invoice
export function approveInvoice(id: string, notes?: string): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse>(`/cleaner-invoices/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { notes } as unknown as Record<string, unknown>,
  })
}

// PM: Reject invoice
export function rejectInvoice(id: string, notes?: string): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse>(`/cleaner-invoices/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { notes } as unknown as Record<string, unknown>,
  })
}

// PM: Mark invoice as paid
export function markInvoicePaid(id: string, notes?: string): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse>(`/cleaner-invoices/${id}/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { notes } as unknown as Record<string, unknown>,
  })
}

// PM: Change invoice status to any value
export function changeInvoiceStatus(id: string, status: InvoiceStatus): Promise<CleanerInvoiceResponse> {
  return apiClient<CleanerInvoiceResponse, { status: InvoiceStatus }>(`/cleaner-invoices/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { status },
  })
}

// Generate invoice PDF
export function generateInvoicePDF(id: string): Promise<InvoicePDFResponse> {
  return apiClient<InvoicePDFResponse>(`/cleaner-invoices/${id}/generate-pdf`, {
    method: 'POST',
  })
}

// List PDF files for an invoice
export function getInvoiceFiles(id: string): Promise<InvoiceFilesResponse> {
  return apiClient<InvoiceFilesResponse>(`/cleaner-invoices/${id}/files`)
}

// Get signed download URL for a file
export function downloadInvoiceFile(invoiceId: string, fileId: string): Promise<InvoiceFileDownloadResponse> {
  return apiClient<InvoiceFileDownloadResponse>(`/cleaner-invoices/${invoiceId}/files/${fileId}/download`)
}

// Monthly earnings breakdown
export function getMonthlyEarnings(cleanerId?: string): Promise<MonthlyEarningsResponse> {
  const params = new URLSearchParams()
  if (cleanerId) params.append('cleanerId', cleanerId)
  const qs = params.toString()
  return apiClient<MonthlyEarningsResponse>(`/cleaner-invoices/earnings${qs ? `?${qs}` : ''}`)
}
