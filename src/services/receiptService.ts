import apiClient from './apiClient'
import type {
  ReceiptsListResponse,
  UploadReceiptResponse,
  ReceiptDetailResponse,
  ReceiptSearchParams,
} from './types/receipt'

/**
 * Upload a standalone receipt (no supply list required)
 */
export function uploadReceipt(
  file: File,
  propertyId?: string,
  supplyListId?: string
): Promise<UploadReceiptResponse> {
  const formData = new FormData()
  formData.append('receipt', file)
  if (propertyId) formData.append('propertyId', propertyId)
  if (supplyListId) formData.append('supplyListId', supplyListId)
  return apiClient<UploadReceiptResponse, FormData>('/receipts/upload', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Search/list receipts for the current user
 */
export function searchReceipts(
  params?: ReceiptSearchParams
): Promise<ReceiptsListResponse> {
  const qs = new URLSearchParams()
  if (params?.search) qs.append('search', params.search)
  if (params?.propertyId) qs.append('propertyId', params.propertyId)
  if (params?.limit) qs.append('limit', String(params.limit))
  if (params?.offset) qs.append('offset', String(params.offset))
  const queryString = qs.toString()
  return apiClient<ReceiptsListResponse>(`/receipts${queryString ? `?${queryString}` : ''}`)
}

/**
 * Get a single receipt by ID with signed URL
 */
export function getReceiptById(id: string): Promise<ReceiptDetailResponse> {
  return apiClient<ReceiptDetailResponse>(`/receipts/${id}`)
}
