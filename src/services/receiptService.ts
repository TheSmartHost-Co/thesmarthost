import apiClient from './apiClient'
import type {
  ReceiptsListResponse,
  UploadReceiptResponse,
  AutoApplyReceiptResponse,
  AutoApplyOptions,
  ReceiptDetailResponse,
  ReceiptSearchParams,
  UpdateReceiptPayload,
  ApplyReceiptPayload,
  ApplyReceiptResponse,
  GenericReceiptResponse,
  CreateLineItemPayload,
  UpdateLineItemPayload,
  ReceiptLineItemsResponse,
  ReceiptLineItemResponse,
  MatchSuggestionsResponse,
  BulkBatchInitPayload,
  BulkBatchInitResponse,
  BulkApplyPayload,
  BulkApplyResponse,
  RescanReceiptResponse,
  BulkDeletePayload,
  BulkDeleteResponse,
  CheckDuplicatesPayload,
  CheckDuplicatesResponse,
} from './types/receipt'

/**
 * Upload a receipt image + trigger OCR.
 * When autoApplyOptions is provided, the receipt is immediately applied to create
 * an expense (and optionally a supply list) in a single call.
 *
 * Pass `batchId` (from initBulkBatch) to associate the upload with a bulk batch
 * for telemetry — does not change semantics.
 *
 * `forceUpload=true` is the "Upload anyway" override path: the backend bypasses
 * duplicate detection and stores content_hash=NULL for this receipt. Use only
 * after the user has explicitly chosen to upload despite a duplicate warning.
 */
export function uploadReceipt(
  file: File,
  propertyId?: string,
  supplyListId?: string,
  autoApplyOptions?: AutoApplyOptions,
  batchId?: string,
  forceUpload?: boolean
): Promise<UploadReceiptResponse | AutoApplyReceiptResponse> {
  const formData = new FormData()
  formData.append('receipt', file)
  if (propertyId) formData.append('propertyId', propertyId)
  if (supplyListId) formData.append('supplyListId', supplyListId)
  if (batchId) formData.append('batchId', batchId)
  if (forceUpload) formData.append('forceUpload', 'true')

  if (autoApplyOptions) {
    formData.append('autoApply', 'true')
    if (autoApplyOptions.expenseDate) formData.append('expenseDate', autoApplyOptions.expenseDate)
    if (autoApplyOptions.vendorName) formData.append('vendorName', autoApplyOptions.vendorName)
    if (autoApplyOptions.category) formData.append('category', autoApplyOptions.category)
    if (autoApplyOptions.paymentMethod) formData.append('paymentMethod', autoApplyOptions.paymentMethod)
    if (autoApplyOptions.paidByType) formData.append('paidByType', autoApplyOptions.paidByType)
    if (autoApplyOptions.paidById) formData.append('paidById', autoApplyOptions.paidById)
    if (autoApplyOptions.subtotal != null) formData.append('subtotal', String(autoApplyOptions.subtotal))
    if (autoApplyOptions.taxGst != null) formData.append('taxGst', String(autoApplyOptions.taxGst))
    if (autoApplyOptions.taxPst != null) formData.append('taxPst', String(autoApplyOptions.taxPst))
    if (autoApplyOptions.taxHst != null) formData.append('taxHst', String(autoApplyOptions.taxHst))
    if (autoApplyOptions.taxTotal != null) formData.append('taxTotal', String(autoApplyOptions.taxTotal))
    if (autoApplyOptions.supplyList) formData.append('supplyList', JSON.stringify(autoApplyOptions.supplyList))
  }

  return apiClient<UploadReceiptResponse | AutoApplyReceiptResponse, FormData>('/receipts/upload', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Search/list receipts with filters
 */
export function searchReceipts(
  params?: ReceiptSearchParams
): Promise<ReceiptsListResponse> {
  const qs = new URLSearchParams()
  if (params?.search) qs.append('search', params.search)
  if (params?.propertyId) qs.append('propertyId', params.propertyId)
  if (params?.supplyListId) qs.append('supplyListId', params.supplyListId)
  if (params?.status) qs.append('status', params.status)
  if (params?.startDate) qs.append('startDate', params.startDate)
  if (params?.endDate) qs.append('endDate', params.endDate)
  if (params?.purchaseStartDate) qs.append('purchaseStartDate', params.purchaseStartDate)
  if (params?.purchaseEndDate) qs.append('purchaseEndDate', params.purchaseEndDate)
  if (params?.minTotal) qs.append('minTotal', params.minTotal)
  if (params?.maxTotal) qs.append('maxTotal', params.maxTotal)
  if (params?.linked) qs.append('linked', params.linked)
  if (params?.sortBy) qs.append('sortBy', params.sortBy)
  if (params?.sortDirection) qs.append('sortDirection', params.sortDirection)
  if (params?.limit) qs.append('limit', String(params.limit))
  if (params?.offset) qs.append('offset', String(params.offset))
  const queryString = qs.toString()
  return apiClient<ReceiptsListResponse>(`/receipts${queryString ? `?${queryString}` : ''}`)
}

/**
 * Get a single receipt by ID with line items and signed URL
 */
export function getReceiptById(id: string): Promise<ReceiptDetailResponse> {
  return apiClient<ReceiptDetailResponse>(`/receipts/${id}`)
}

/**
 * Update receipt header fields (COALESCE-based partial update)
 */
export function updateReceipt(
  id: string,
  payload: UpdateReceiptPayload
): Promise<GenericReceiptResponse> {
  return apiClient<GenericReceiptResponse, UpdateReceiptPayload>(`/receipts/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

/**
 * Apply a receipt to create an expense and optionally a supply list
 */
export function applyReceipt(
  id: string,
  payload: ApplyReceiptPayload
): Promise<ApplyReceiptResponse> {
  return apiClient<ApplyReceiptResponse, ApplyReceiptPayload>(`/receipts/${id}/apply`, {
    method: 'POST',
    body: payload,
  })
}

/**
 * Archive a receipt
 */
export function archiveReceipt(id: string): Promise<GenericReceiptResponse> {
  return apiClient<GenericReceiptResponse>(`/receipts/${id}/archive`, {
    method: 'PATCH',
  })
}

/**
 * Unarchive a receipt (restore previous status)
 */
export function unarchiveReceipt(id: string): Promise<GenericReceiptResponse> {
  return apiClient<GenericReceiptResponse>(`/receipts/${id}/unarchive`, {
    method: 'PATCH',
  })
}

/**
 * Delete a receipt (cascades to expense + supply list if receipt-first)
 */
export function deleteReceipt(id: string): Promise<GenericReceiptResponse> {
  return apiClient<GenericReceiptResponse>(`/receipts/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Get AI match suggestions for receipt line items against a supply list
 */
export function getReceiptMatchSuggestions(
  receiptId: string,
  supplyListId: string
): Promise<MatchSuggestionsResponse> {
  return apiClient<MatchSuggestionsResponse, { supplyListId: string }>(
    `/receipts/${receiptId}/match`,
    { method: 'POST', body: { supplyListId } }
  )
}

// --- Line Item CRUD ---

export function getReceiptLineItems(receiptId: string): Promise<ReceiptLineItemsResponse> {
  return apiClient<ReceiptLineItemsResponse>(`/receipts/${receiptId}/line-items`)
}

export function createReceiptLineItem(
  receiptId: string,
  payload: CreateLineItemPayload
): Promise<ReceiptLineItemResponse> {
  return apiClient<ReceiptLineItemResponse, CreateLineItemPayload>(
    `/receipts/${receiptId}/line-items`,
    { method: 'POST', body: payload }
  )
}

export function updateReceiptLineItem(
  receiptId: string,
  lineItemId: string,
  payload: UpdateLineItemPayload
): Promise<ReceiptLineItemResponse> {
  return apiClient<ReceiptLineItemResponse, UpdateLineItemPayload>(
    `/receipts/${receiptId}/line-items/${lineItemId}`,
    { method: 'PATCH', body: payload }
  )
}

export function deleteReceiptLineItem(
  receiptId: string,
  lineItemId: string
): Promise<GenericReceiptResponse> {
  return apiClient<GenericReceiptResponse>(
    `/receipts/${receiptId}/line-items/${lineItemId}`,
    { method: 'DELETE' }
  )
}

// --- Bulk Upload ---

/**
 * Open a new bulk-upload batch. Returns a batchId to attach to subsequent
 * uploadReceipt() calls so the backend can group + count them.
 */
export function initBulkBatch(
  payload?: BulkBatchInitPayload
): Promise<BulkBatchInitResponse> {
  return apiClient<BulkBatchInitResponse, BulkBatchInitPayload>(
    '/receipts/bulk-init',
    { method: 'POST', body: payload || {} }
  )
}

/**
 * Re-run OCR on a receipt whose previous OCR attempt failed. The file stays
 * in storage — much faster than re-uploading.
 */
export function rescanReceipt(receiptId: string): Promise<RescanReceiptResponse> {
  return apiClient<RescanReceiptResponse>(`/receipts/${receiptId}/rescan`, {
    method: 'POST',
  })
}

/**
 * Apply N receipts to create N expenses in one round-trip. Per-receipt
 * transactionality: a failure on receipt #7 does NOT roll back receipts #1-6.
 */
export function bulkApplyReceipts(
  payload: BulkApplyPayload
): Promise<BulkApplyResponse> {
  return apiClient<BulkApplyResponse, BulkApplyPayload>('/receipts/bulk-apply', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Delete N receipts in one round-trip. Per-receipt transactionality —
 * applied receipts cascade to expense + supply list (matches single delete).
 */
export function bulkDeleteReceipts(
  receiptIds: string[]
): Promise<BulkDeleteResponse> {
  return apiClient<BulkDeleteResponse, BulkDeletePayload>('/receipts/bulk-delete', {
    method: 'POST',
    body: { receiptIds },
  })
}

/**
 * Pre-flight duplicate check for receipt upload. Given an array of SHA-256
 * hashes, returns which ones already exist as non-archived receipts for the
 * current user. The bulk upload modal calls this after computing hashes
 * client-side, then skips the upload entirely for any matching files.
 *
 * Cap: 50 hashes per call. Hashes that aren't duplicates are simply omitted
 * from the response array.
 */
export function checkReceiptDuplicates(
  hashes: string[]
): Promise<CheckDuplicatesResponse> {
  return apiClient<CheckDuplicatesResponse, CheckDuplicatesPayload>(
    '/receipts/check-duplicates',
    { method: 'POST', body: { hashes } }
  )
}
