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
} from './types/receipt'

/**
 * Upload a receipt image + trigger OCR.
 * When autoApplyOptions is provided, the receipt is immediately applied to create
 * an expense (and optionally a supply list) in a single call.
 */
export function uploadReceipt(
  file: File,
  propertyId?: string,
  supplyListId?: string,
  autoApplyOptions?: AutoApplyOptions
): Promise<UploadReceiptResponse | AutoApplyReceiptResponse> {
  const formData = new FormData()
  formData.append('receipt', file)
  if (propertyId) formData.append('propertyId', propertyId)
  if (supplyListId) formData.append('supplyListId', supplyListId)

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
  if (params?.linked) qs.append('linked', params.linked)
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
