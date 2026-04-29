// Standalone receipt types for the receipts management page

import type { SupplyList } from './supplyList'

export type ReceiptStatus = 'pending' | 'matched' | 'failed' | 'applied' | 'archived'
export type PaidByType = 'PROPERTY-MANAGER' | 'CLEANER' | 'TEAM_MEMBER'

export interface ReceiptLineItem {
  id: string
  receiptId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// List-level receipt (no line items, used by GET /receipts)
export interface UploadedReceipt {
  id: string
  supplyListId: string | null
  uploadedBy: string | null
  storagePath: string
  originalName: string
  mimeType: string
  signedUrl?: string
  status: ReceiptStatus
  appliedAt: string | null
  errorMessage: string | null
  createdAt: string
  userId: string | null
  propertyId: string | null
  propertyName: string | null
  vendorName: string | null
  expenseDate: string | null
  subtotal: number | null
  taxTotal: number | null
  total: number | null
  description: string | null
  uploaderName: string | null
}

// Linked supply list summary (nested in receipt detail response)
export interface ReceiptLinkedSupplyList {
  id: string
  status: string
  propertyId: string | null
  itemCount: number
}

// Linked expense summary (nested in receipt detail response)
export interface ReceiptLinkedExpense {
  id: string
  amount: number
  paymentStatus: string
  paidByType: string | null
  paidById: string | null
  expenseDate: string
  category: string | null
  propertyId?: string | null
  propertyName?: string | null
}

// Detail-level receipt (includes line items, used by GET /receipts/:id)
export interface ReceiptDetail extends UploadedReceipt {
  taxGst: number | null
  taxPst: number | null
  taxHst: number | null
  paymentMethod: string | null
  ocrRaw: Record<string, unknown> | null
  matchPreview: Record<string, unknown>[] | null
  lineItems: ReceiptLineItem[]
  signedUrl: string
  // Nested related objects (from detail endpoint)
  supplyList?: ReceiptLinkedSupplyList | null
  expense?: ReceiptLinkedExpense | null
}

// Search/filter params for GET /receipts
export interface ReceiptSearchParams {
  search?: string
  propertyId?: string
  supplyListId?: string
  status?: ReceiptStatus | ''
  startDate?: string
  endDate?: string
  linked?: string // 'true' | 'false'
  limit?: number
  offset?: number
}

// Payloads
export interface UpdateReceiptPayload {
  vendorName?: string
  expenseDate?: string
  subtotal?: number
  taxGst?: number | null
  taxPst?: number | null
  taxHst?: number | null
  taxTotal?: number
  total?: number
  paymentMethod?: string
  description?: string
  propertyId?: string
}

export interface CreateLineItemPayload {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface UpdateLineItemPayload {
  name?: string
  quantity?: number
  unitPrice?: number
  totalPrice?: number
}

export interface ApplyReceiptPayload {
  propertyId: string
  expenseDate: string
  vendorName: string
  category: string
  paymentMethod: string
  paidByType: PaidByType
  paidById: string | null
  subtotal: number
  taxGst: number | null
  taxPst: number | null
  taxHst: number | null
  taxTotal: number
  supplyList: {
    mode: 'none' | 'new' | 'existing'
    projectId?: string | null
    supplyListId?: string
    mapping?: ConfirmedMapping[]
  }
}

// Auto-apply options for uploadReceipt
export interface AutoApplyOptions {
  autoApply: true
  expenseDate?: string
  vendorName?: string
  category?: string
  paymentMethod?: string
  paidByType?: PaidByType
  paidById?: string | null
  subtotal?: number
  taxGst?: number | null
  taxPst?: number | null
  taxHst?: number | null
  taxTotal?: number
  supplyList?: {
    mode: 'none' | 'new' | 'existing'
    projectId?: string | null
    supplyListId?: string
  }
}

// API Responses
export interface ReceiptsListResponse {
  status: 'success' | 'failed'
  data: UploadedReceipt[]
  total?: number
  message?: string
}

export interface UploadReceiptResponse {
  status: 'success' | 'failed'
  data: {
    receipt: ReceiptDetail
    lineItems: ReceiptLineItem[]
    signedUrl: string
  }
  message?: string
}

export interface AutoApplyReceiptResponse {
  status: 'success' | 'failed'
  data: {
    receipt: ReceiptDetail
    lineItems: ReceiptLineItem[]
    signedUrl: string
    expense: Record<string, unknown>
    supplyList: SupplyList | null
  }
  message?: string
}

export interface ReceiptDetailResponse {
  status: 'success' | 'failed'
  data: ReceiptDetail
  message?: string
}

export interface GenericReceiptResponse {
  status: 'success' | 'failed'
  data?: UploadedReceipt | ReceiptDetail
  message?: string
}

export interface ApplyReceiptResponse {
  status: 'success' | 'failed'
  data: {
    receipt: ReceiptDetail
    expense: Record<string, unknown>
    supplyList: SupplyList | null
  }
  message?: string
}

export interface ReceiptLineItemsResponse {
  status: 'success' | 'failed'
  data: ReceiptLineItem[]
  message?: string
}

export interface ReceiptLineItemResponse {
  status: 'success' | 'failed'
  data: ReceiptLineItem
  message?: string
}

// OCR display types (used by scan/review UI to cast receipt.ocrRaw and receipt.matchPreview)

export interface OcrDataField<T> {
  value: T
  confidence: number
}

export interface ScanReceiptOcrData {
  vendorName: OcrDataField<string>
  expenseDate: OcrDataField<string>
  total: OcrDataField<number>
  subtotal: OcrDataField<number>
  taxGst: OcrDataField<number>
  taxPst: OcrDataField<number>
  taxHst: OcrDataField<number>
  taxTotal: OcrDataField<number>
  lineItems: {
    name: OcrDataField<string>
    quantity: OcrDataField<number>
    unitPrice: OcrDataField<number>
    totalPrice: OcrDataField<number>
  }[]
}

export interface ScanReceiptMatch {
  lineItemName: string
  lineItemQuantity: number
  lineItemUnitPrice: number
  lineItemTotalPrice: number
  matchedItemId: string | null
  matchedItemName: string | null
  matchScore: number
  matchType: 'exact' | 'fuzzy' | 'none'
}

// --- Match Review Types ---

// Match suggestion from POST /receipts/:id/match
export interface ReceiptMatchSuggestion {
  receiptLineItemId: string
  receiptLineItemName: string
  suggestedSupplyListItemId: string | null
  suggestedSupplyListItemName: string | null
  matchScore: number
  matchType: 'exact' | 'fuzzy' | 'new'
}

export interface MatchSuggestionsResponse {
  status: 'success' | 'failed'
  data: { matches: ReceiptMatchSuggestion[] }
  message?: string
}

// Confirmed mapping item sent with apply
export interface ConfirmedMapping {
  receiptLineItemId: string
  supplyListItemId: string | null
  action: 'existing' | 'new'
}

// --- Bulk Upload Types ---

export type BulkBatchSource = 'bulk_upload' | 'bulk_expense'

export interface BulkBatchInitPayload {
  source?: BulkBatchSource
  expectedCount?: number
}

export interface BulkBatchInitResponse {
  status: 'success' | 'failed'
  data: {
    batchId: string
    source: BulkBatchSource
    expectedCount: number | null
    createdAt: string
  }
  message?: string
}

// One assignment in a bulk-apply call. Matches ApplyReceiptPayload but with a
// few fields optional (vendorName/category default server-side).
export interface BulkApplyAssignment {
  propertyId: string
  expenseDate: string
  vendorName?: string
  category?: string
  paymentMethod?: string
  paidByType?: PaidByType
  paidById?: string | null
  subtotal?: number
  taxGst?: number | null
  taxPst?: number | null
  taxHst?: number | null
  taxTotal?: number
  supplyList?: { mode: 'none' | 'new' | 'existing' }
}

export interface BulkApplyPayload {
  receiptIds: string[]
  assignments: Record<string, BulkApplyAssignment>
}

export interface BulkApplySummary {
  total: number
  applied: number
  failed: number
}

export interface BulkApplyResponse {
  status: 'success' | 'failed'
  data: {
    summary: BulkApplySummary
    applied: { receiptId: string; expenseId: string }[]
    failed: { receiptId: string; error: string }[]
  }
  message?: string
}

export interface RescanReceiptResponse {
  status: 'success' | 'failed'
  data: {
    receipt: ReceiptDetail
    lineItems: ReceiptLineItem[]
    signedUrl: string | null
  }
  message?: string
}

export interface BulkDeletePayload {
  receiptIds: string[]
}

export interface BulkDeleteResponse {
  status: 'success' | 'failed'
  data: {
    summary: { total: number; deleted: number; failed: number }
    deleted: { receiptId: string }[]
    failed: { receiptId: string; error: string }[]
  }
  message?: string
}

// --- Duplicate Detection (migration 027) ---

export interface DuplicateExistingReceipt {
  id: string
  originalName: string
  createdAt: string
  vendorName?: string | null
}

export interface DuplicateMatch {
  hash: string
  existingReceipt: DuplicateExistingReceipt
}

export interface CheckDuplicatesPayload {
  hashes: string[]
}

export interface CheckDuplicatesResponse {
  status: 'success' | 'failed'
  data: { duplicates: DuplicateMatch[] }
  message?: string
}
