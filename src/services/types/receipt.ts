// Standalone receipt types (for invoice attachment and cross-system receipt access)

export interface UploadedReceipt {
  id: string
  supplyListId: string | null
  uploadedBy: string | null
  storagePath: string
  originalName: string
  mimeType: string
  signedUrl?: string
  status: string
  appliedAt: string | null
  errorMessage: string | null
  createdAt: string
  userId: string | null
  propertyId: string | null
  propertyName: string | null
}

export interface ReceiptSearchParams {
  search?: string
  propertyId?: string
  limit?: number
  offset?: number
}

// API Responses
export interface ReceiptsListResponse {
  status: 'success' | 'failed'
  data: UploadedReceipt[]
  message?: string
}

export interface UploadReceiptResponse {
  status: 'success' | 'failed'
  data: UploadedReceipt
  message?: string
}

export interface ReceiptDetailResponse {
  status: 'success' | 'failed'
  data: UploadedReceipt
  message?: string
}
