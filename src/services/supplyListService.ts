import apiClient from './apiClient'
import type {
  SupplyList,
  SupplyListStatus,
  SupplyListResponse,
  SupplyListsResponse,
  CreateSupplyListPayload,
  UpdateSupplyListPayload,
  DeleteSupplyListResponse,
  ToggleItemPayload,
  SupplyListSummaryResponse,
  ScanReceiptResponse,
  ApplyReceiptPayload,
  ApplyReceiptResponse,
  ReceiptsResponse,
  ReceiptDetailResponse,
  CreateExpenseLineItemPayload,
  UpdateExpenseLineItemPayload,
  ExpenseLineItemResponse,
  ExpenseLineItemsResponse,
  DeleteExpenseLineItemResponse,
  AssignProjectResponse,
} from './types/supplyList'

// =============================================
// SUPPLY LIST CRUD OPERATIONS
// =============================================

/**
 * Get all supply lists for a cleaning project
 */
export function getSupplyListsByProject(projectId: string): Promise<SupplyListsResponse> {
  return apiClient<SupplyListsResponse>(`/cleaning-projects/${projectId}/supply-lists`)
}

/**
 * Get all pending supply lists for a PM (dashboard view)
 * Auth: userId derived from JWT token server-side
 */
export function getPendingSupplyLists(): Promise<SupplyListsResponse> {
  return apiClient<SupplyListsResponse>(`/supply-lists?status=pending`)
}

/**
 * Get all supply lists for a user (overview page - supports optional status filter)
 * Auth: userId derived from JWT token server-side
 */
export function getAllSupplyLists(status?: SupplyListStatus): Promise<SupplyListsResponse> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  const qs = params.toString()
  return apiClient<SupplyListsResponse>(`/supply-lists${qs ? `?${qs}` : ''}`)
}

/**
 * Get a single supply list by ID
 */
export function getSupplyListById(supplyListId: string): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse>(`/supply-lists/${supplyListId}`)
}

/**
 * Create a new supply list for a project
 */
export function createSupplyList(
  projectId: string,
  data: CreateSupplyListPayload
): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, CreateSupplyListPayload>(
    `/cleaning-projects/${projectId}/supply-lists`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update a supply list (toggle purchased, add PM notes, add/remove items)
 */
export function updateSupplyList(
  supplyListId: string,
  data: UpdateSupplyListPayload
): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, UpdateSupplyListPayload>(
    `/supply-lists/${supplyListId}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a supply list
 */
export function deleteSupplyList(supplyListId: string): Promise<DeleteSupplyListResponse> {
  return apiClient<DeleteSupplyListResponse>(`/supply-lists/${supplyListId}`, {
    method: 'DELETE',
  })
}

/**
 * Toggle a single item's purchased status
 */
export function toggleSupplyListItem(
  supplyListId: string,
  itemId: string,
  data: ToggleItemPayload
): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, ToggleItemPayload>(
    `/supply-lists/${supplyListId}/items/${itemId}`,
    {
      method: 'PATCH',
      body: data,
    }
  )
}

/**
 * Mark a supply list as fulfilled (notifies cleaner)
 */
export function fulfillSupplyList(supplyListId: string, fulfilledBy?: string): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, { fulfilledBy?: string }>(`/supply-lists/${supplyListId}/fulfill`, {
    method: 'POST',
    body: fulfilledBy ? { fulfilledBy } : {},
  })
}

// =============================================
// RECEIPT & SUMMARY OPERATIONS
// =============================================

/**
 * Get supply list summary (totals + by-property breakdown)
 */
export function getSupplyListSummary(
  propertyId?: string,
  startDate?: string,
  endDate?: string
): Promise<SupplyListSummaryResponse> {
  const params = new URLSearchParams()
  if (propertyId) params.append('propertyId', propertyId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  const qs = params.toString()
  return apiClient<SupplyListSummaryResponse>(`/supply-lists/summary${qs ? `?${qs}` : ''}`)
}

/**
 * Scan a receipt image (OCR + fuzzy matching)
 * - With supplyListId: matches against existing supply list items
 * - With propertyId: receipt-first mode (no existing supply list)
 */
export function scanSupplyListReceipt(
  file: File,
  options: { supplyListId?: string; propertyId?: string }
): Promise<ScanReceiptResponse> {
  const formData = new FormData()
  formData.append('receipt', file)
  if (options.supplyListId) formData.append('supplyListId', options.supplyListId)
  if (options.propertyId) formData.append('propertyId', options.propertyId)
  return apiClient<ScanReceiptResponse, FormData>(
    `/supply-lists/receipts/scan`,
    { method: 'POST', body: formData }
  )
}

/**
 * Apply a scanned receipt to create an expense
 */
export function applySupplyListReceipt(
  receiptId: string,
  payload: ApplyReceiptPayload
): Promise<ApplyReceiptResponse> {
  return apiClient<ApplyReceiptResponse, ApplyReceiptPayload>(
    `/supply-lists/receipts/${receiptId}/apply`,
    { method: 'POST', body: payload }
  )
}

/**
 * Assign a project to a standalone supply list
 */
export function assignProjectToSupplyList(
  supplyListId: string,
  projectId: string
): Promise<AssignProjectResponse> {
  return apiClient<AssignProjectResponse, { projectId: string }>(
    `/supply-lists/${supplyListId}/assign-project`,
    { method: 'PATCH', body: { projectId } }
  )
}

/**
 * Create a standalone supply list (not linked to a project)
 */
export function createStandaloneSupplyList(
  data: { propertyId: string; projectId?: string; submittedBy?: string; notes?: string; items: { name: string; quantity?: number }[] }
): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, typeof data>(
    `/supply-lists`,
    { method: 'POST', body: data }
  )
}

/**
 * Get all receipts for a supply list
 */
export function getSupplyListReceipts(supplyListId: string): Promise<ReceiptsResponse> {
  return apiClient<ReceiptsResponse>(`/supply-lists/${supplyListId}/receipts`)
}

/**
 * Get a single receipt by ID with OCR data and match preview
 */
export function getSupplyListReceiptById(
  supplyListId: string,
  receiptId: string
): Promise<ReceiptDetailResponse> {
  return apiClient<ReceiptDetailResponse>(
    `/supply-lists/${supplyListId}/receipts/${receiptId}`
  )
}

/**
 * Delete a receipt from a supply list
 * If the receipt was applied, this also deletes the linked expense and reverts matched items to unpurchased.
 */
export function deleteSupplyListReceipt(
  supplyListId: string,
  receiptId: string
): Promise<DeleteSupplyListResponse> {
  return apiClient<DeleteSupplyListResponse>(
    `/supply-lists/${supplyListId}/receipts/${receiptId}`,
    { method: 'DELETE' }
  )
}

// =============================================
// EXPENSE LINE ITEM CRUD
// =============================================

/**
 * Get all expense line items for a receipt
 */
export function getExpenseLineItems(
  supplyListId: string,
  receiptId: string
): Promise<ExpenseLineItemsResponse> {
  return apiClient<ExpenseLineItemsResponse>(
    `/supply-lists/${supplyListId}/receipts/${receiptId}/line-items`
  )
}

/**
 * Create an expense line item for a receipt
 */
export function createExpenseLineItem(
  supplyListId: string,
  receiptId: string,
  data: CreateExpenseLineItemPayload
): Promise<ExpenseLineItemResponse> {
  return apiClient<ExpenseLineItemResponse, CreateExpenseLineItemPayload>(
    `/supply-lists/${supplyListId}/receipts/${receiptId}/line-items`,
    { method: 'POST', body: data }
  )
}

/**
 * Update an expense line item
 */
export function updateExpenseLineItem(
  supplyListId: string,
  receiptId: string,
  lineItemId: string,
  data: UpdateExpenseLineItemPayload
): Promise<ExpenseLineItemResponse> {
  return apiClient<ExpenseLineItemResponse, UpdateExpenseLineItemPayload>(
    `/supply-lists/${supplyListId}/receipts/${receiptId}/line-items/${lineItemId}`,
    { method: 'PUT', body: data }
  )
}

/**
 * Delete an expense line item
 */
export function deleteExpenseLineItem(
  supplyListId: string,
  receiptId: string,
  lineItemId: string
): Promise<DeleteExpenseLineItemResponse> {
  return apiClient<DeleteExpenseLineItemResponse>(
    `/supply-lists/${supplyListId}/receipts/${receiptId}/line-items/${lineItemId}`,
    { method: 'DELETE' }
  )
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Format supply list created date as relative time
 */
export function formatSupplyListAge(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`
  } else {
    return created.toLocaleDateString()
  }
}
