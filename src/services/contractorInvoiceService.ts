import apiClient from './apiClient'
import type {
  ContractorInvoiceResponse,
  ContractorInvoicesResponse,
  ContractorInvoiceSummaryResponse,
  AvailableTasksResponse,
  ContractorInvoiceItemResponse,
  DeleteContractorInvoiceResponse,
  CreateContractorInvoicePayload,
  UpdateContractorInvoicePayload,
  UpdateContractorInvoiceItemPayload,
  AddContractorInvoiceItemPayload,
  ContractorInvoicePDFResponse,
  ContractorInvoiceFilesResponse,
  ContractorInvoiceFileDownloadResponse,
  ContractorMonthlyEarningsResponse,
  ContractorInvoiceStatus,
} from './types/contractorInvoice'

// List invoices with optional filters (contractors are auto-scoped server-side)
export function getContractorInvoices(
  contractorId?: string,
  status?: string,
  includeArchived?: boolean
): Promise<ContractorInvoicesResponse> {
  const params = new URLSearchParams()
  if (contractorId) params.append('contractorId', contractorId)
  if (status) params.append('status', status)
  if (includeArchived) params.append('includeArchived', 'true')
  const qs = params.toString()
  return apiClient<ContractorInvoicesResponse>(`/contractor-invoices${qs ? `?${qs}` : ''}`)
}

// Get invoice summary stats
export function getInvoiceSummary(
  contractorId?: string
): Promise<ContractorInvoiceSummaryResponse> {
  const params = new URLSearchParams()
  if (contractorId) params.append('contractorId', contractorId)
  const qs = params.toString()
  return apiClient<ContractorInvoiceSummaryResponse>(`/contractor-invoices/summary${qs ? `?${qs}` : ''}`)
}

// Get completed maintenance tasks available for invoicing.
// PM must pass contractorId; contractors are auto-scoped server-side.
export function getAvailableTasks(
  contractorId?: string,
  startDate?: string,
  endDate?: string,
  propertyId?: string,
  search?: string
): Promise<AvailableTasksResponse> {
  const params = new URLSearchParams()
  if (contractorId) params.append('contractorId', contractorId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (propertyId) params.append('propertyId', propertyId)
  if (search) params.append('search', search)
  const qs = params.toString()
  return apiClient<AvailableTasksResponse>(`/contractor-invoices/available-tasks${qs ? `?${qs}` : ''}`)
}

// Get single invoice with items
export function getInvoiceById(id: string): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse>(`/contractor-invoices/${id}`)
}

// Create invoice from completed tasks (+ optional extra items)
export function createInvoice(data: CreateContractorInvoicePayload): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse, CreateContractorInvoicePayload>('/contractor-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

// Update invoice metadata
export function updateInvoice(id: string, data: UpdateContractorInvoicePayload): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse, UpdateContractorInvoicePayload>(`/contractor-invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

// Update a line item
export function updateInvoiceItem(
  invoiceId: string,
  itemId: string,
  data: UpdateContractorInvoiceItemPayload
): Promise<ContractorInvoiceItemResponse> {
  return apiClient<ContractorInvoiceItemResponse, UpdateContractorInvoiceItemPayload>(
    `/contractor-invoices/${invoiceId}/items/${itemId}`,
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
  data: AddContractorInvoiceItemPayload
): Promise<ContractorInvoiceItemResponse> {
  return apiClient<ContractorInvoiceItemResponse, AddContractorInvoiceItemPayload>(
    `/contractor-invoices/${invoiceId}/items`,
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
): Promise<DeleteContractorInvoiceResponse> {
  return apiClient<DeleteContractorInvoiceResponse>(`/contractor-invoices/${invoiceId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

// Submit invoice to PM (cash out)
export function submitInvoice(id: string): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse>(`/contractor-invoices/${id}/submit`, {
    method: 'POST',
  })
}

// Delete invoice (PM only)
export function deleteInvoice(id: string): Promise<DeleteContractorInvoiceResponse> {
  return apiClient<DeleteContractorInvoiceResponse>(`/contractor-invoices/${id}`, {
    method: 'DELETE',
  })
}

// PM: Approve invoice
export function approveInvoice(id: string, notes?: string): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse>(`/contractor-invoices/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { notes } as unknown as Record<string, unknown>,
  })
}

// PM: Reject invoice
export function rejectInvoice(id: string, notes?: string): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse>(`/contractor-invoices/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { notes } as unknown as Record<string, unknown>,
  })
}

// PM: Mark invoice as paid
export function markInvoicePaid(id: string, notes?: string): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse>(`/contractor-invoices/${id}/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { notes } as unknown as Record<string, unknown>,
  })
}

// PM: Change invoice status to any value
export function changeInvoiceStatus(id: string, status: ContractorInvoiceStatus): Promise<ContractorInvoiceResponse> {
  return apiClient<ContractorInvoiceResponse, { status: ContractorInvoiceStatus }>(`/contractor-invoices/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { status },
  })
}

// Generate invoice PDF
export function generateInvoicePDF(id: string): Promise<ContractorInvoicePDFResponse> {
  return apiClient<ContractorInvoicePDFResponse>(`/contractor-invoices/${id}/generate-pdf`, {
    method: 'POST',
  })
}

// List PDF files for an invoice
export function getInvoiceFiles(id: string): Promise<ContractorInvoiceFilesResponse> {
  return apiClient<ContractorInvoiceFilesResponse>(`/contractor-invoices/${id}/files`)
}

// Get signed download URL for a file
export function downloadInvoiceFile(invoiceId: string, fileId: string): Promise<ContractorInvoiceFileDownloadResponse> {
  return apiClient<ContractorInvoiceFileDownloadResponse>(`/contractor-invoices/${invoiceId}/files/${fileId}/download`)
}

// Monthly earnings breakdown
export function getMonthlyEarnings(contractorId?: string): Promise<ContractorMonthlyEarningsResponse> {
  const params = new URLSearchParams()
  if (contractorId) params.append('contractorId', contractorId)
  const qs = params.toString()
  return apiClient<ContractorMonthlyEarningsResponse>(`/contractor-invoices/earnings${qs ? `?${qs}` : ''}`)
}
