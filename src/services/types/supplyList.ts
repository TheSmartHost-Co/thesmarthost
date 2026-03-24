// Types for Supply Lists (cleaners request missing supplies during cleaning projects)

export type SupplyListStatus = 'pending' | 'in_progress' | 'fulfilled'

export interface SupplyListItem {
  id: string
  name: string
  quantity: number
  isPurchased: boolean
  pmNotes: string | null
  fulfilledBy: string | null
  fulfilledAt: string | null
  unitCost: number | null
  totalCost: number | null
  createdAt: string
}

export interface SupplyList {
  id: string
  projectId: string
  submittedBy: string | null
  status: SupplyListStatus
  notes: string | null
  fulfilledAt: string | null
  createdAt: string
  updatedAt: string
  // Joined fields
  submitterName: string | null
  userId: string
  propertyId: string
  propertyName: string | null
  projectDate: string
  items: SupplyListItem[]
  progress?: { totalItems: number; purchasedItems: number; percentage: number }
}

export interface CreateSupplyListPayload {
  submittedBy?: string | null
  items: { name: string; quantity?: number }[]
  notes?: string
}

export interface UpdateSupplyListPayload {
  items?: { id: string; name?: string; quantity?: number; isPurchased?: boolean; pmNotes?: string }[]
  newItems?: { name: string; quantity?: number }[]
  removeItemIds?: string[]
  fulfilledBy?: string
  notes?: string
}

export interface ToggleItemPayload {
  isPurchased: boolean
  fulfilledBy?: string
}

// API Response Types
export interface SupplyListResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyList
}

export interface SupplyListsResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyList[]
}

export interface DeleteSupplyListResponse {
  status: 'success' | 'failed'
  message?: string
}

// Receipt types
export type ReceiptStatus = 'pending' | 'matched' | 'applied' | 'error' | 'failed'

export interface Receipt {
  id: string
  supplyListId: string
  uploadedBy: string | null
  storagePath: string
  originalName: string
  mimeType: string
  signedUrl?: string
  status: ReceiptStatus
  appliedAt: string | null
  errorMessage: string | null
  createdAt: string
}

// Receipt detail types (from GET /supply-lists/:id/receipts/:receiptId)
export interface ReceiptDetailOcrRaw {
  vendorName: OcrDataField<string>
  expenseDate: OcrDataField<string>
  total: OcrDataField<number>
  lineItems: {
    value: {
      name: OcrDataField<string>
      quantity: OcrDataField<number>
      unitPrice: OcrDataField<number>
      totalPrice: OcrDataField<number>
    }[]
    confidence: number
  }
}

export interface ReceiptDetail extends Receipt {
  ocrRaw: ReceiptDetailOcrRaw
  matchPreview: ScanReceiptMatch[]
}

export interface ReceiptDetailResponse {
  status: 'success' | 'failed'
  message?: string
  data: ReceiptDetail
}

export interface OcrDataField<T> {
  value: T
  confidence: number
}

export interface ScanReceiptOcrData {
  vendorName: OcrDataField<string>
  expenseDate: OcrDataField<string>
  total: OcrDataField<number>
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

export interface ScanReceiptResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    receiptId: string
    ocrData: ScanReceiptOcrData
    matches: ScanReceiptMatch[]
  }
}

export interface ApplyReceiptPayload {
  confirmedMatches: { itemId: string; unitCost: number; totalCost: number }[]
  newItems: { name: string; quantity: number; unitCost: number; totalCost: number }[]
  expenseDate: string
  vendorName: string
  category?: string
  paymentMethod?: string
  paidByType?: string
  paidById?: string
}

export interface ApplyReceiptResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    supplyList: SupplyList
    receipt: Receipt
    expense: { id: string; amount: number }
  }
}

export interface ExpenseLineItem {
  id: string
  expenseId: string
  supplyListItemId: string | null
  description: string
  quantity: number
  unitCost: number
  totalCost: number
  createdAt: string
}

export interface CreateExpenseLineItemPayload {
  description: string
  totalCost: number
  quantity?: number
  unitCost?: number
  supplyListItemId?: string
}

export interface UpdateExpenseLineItemPayload {
  description?: string
  totalCost?: number
  quantity?: number
  unitCost?: number
  supplyListItemId?: string | null
}

export interface ExpenseLineItemResponse {
  status: 'success' | 'failed'
  message?: string
  data: ExpenseLineItem
  expenseAmount?: number
}

export interface ExpenseLineItemsResponse {
  status: 'success' | 'failed'
  message?: string
  data: ExpenseLineItem[]
}

export interface DeleteExpenseLineItemResponse {
  status: 'success' | 'failed'
  message?: string
}

export interface ReceiptsResponse {
  status: 'success' | 'failed'
  message?: string
  data: Receipt[]
}

export interface SupplyListSummary {
  totals: {
    totalLists: number
    pendingLists: number
    inProgressLists: number
    fulfilledLists: number
    totalItems: number
    purchasedItems: number
    totalCost: number
    totalExpensesCreated: number
    totalExpenseAmount: number
  }
  byProperty: {
    propertyId: string
    propertyName: string
    listCount: number
    itemCount: number
    totalCost: number
  }[]
}

export interface SupplyListSummaryResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyListSummary
}

export interface AggregatedItem {
  name: string
  displayName: string
  totalQuantity: number
  totalCost: number
  listCount: number
  purchasedCount: number
  properties: string[]
}

// Status display information
export const SUPPLY_LIST_STATUS_INFO: Record<SupplyListStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'amber' },
  in_progress: { label: 'In Progress', color: 'blue' },
  fulfilled: { label: 'Fulfilled', color: 'green' },
}
