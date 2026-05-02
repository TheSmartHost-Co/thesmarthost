import type { PaidByType } from './receipt'

// Expense Types for HostMetrics Frontend

/**
 * Expense line item (from GET /api/expenses/:id with nested lineItems[])
 */
export interface ExpenseLineItem {
  id: string
  expenseId: string
  supplyListItemId: string | null
  description: string
  quantity: number
  unitCost: number | null
  totalCost: number | null
  createdAt: string
}

/**
 * Linked receipt summary (nested in expense response)
 */
export interface ExpenseLinkedReceipt {
  id: string
  vendorName: string | null
  total: number | null
  status: string
  expenseDate: string | null
  originalName: string
}

/**
 * Linked supply list summary (nested in expense response)
 */
export interface ExpenseLinkedSupplyList {
  id: string
  status: string
  propertyId: string | null
  itemCount: number
}

/**
 * Payment method options
 */
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'etransfer' | 'check' | 'other'

/**
 * Payment status options
 */
export type PaymentStatus = 'pending' | 'paid' | 'reimbursed' | 'cancelled'

/**
 * QuickBooks sync status (column already exists on `expenses`).
 */
export type QbSyncStatus = 'pending' | 'synced' | 'failed'

/**
 * Receipt status (mirrors receipts.status). Surfaced on the expense row via
 * the LEFT JOIN in selectExpensesByFilters so the UI can filter / display it
 * without a second round-trip.
 */
export type ReceiptStatus = 'pending' | 'matched' | 'failed' | 'applied' | 'archived'

/**
 * Recurring frequency options
 */
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'

/**
 * OCR confidence scores for expense fields
 */
export interface OcrConfidence {
  vendorName?: number
  expenseDate?: number
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxTotal?: number
  total?: number
  description?: number
  paymentMethod?: number
}

/**
 * Main Expense interface
 * Matches backend response structure
 */
export interface Expense {
  id: string
  userId: string
  propertyId?: string
  propertyName?: string
  propertyAddress?: string
  bookingId?: string
  bookingGuestName?: string
  bookingCheckInDate?: string
  bookingReservationCode?: string
  expenseDate: string
  amount: number
  currency: string
  category?: string
  vendorName?: string
  description?: string
  receiptPath?: string
  receiptOriginalName?: string
  receiptMimeType?: string
  isReimbursable: boolean
  isTaxDeductible: boolean
  paymentMethod?: PaymentMethod
  paymentStatus: PaymentStatus
  qbSyncStatus?: QbSyncStatus | null
  qbEntityType?: 'purchase' | 'bill' | null
  qbEntityId?: string | null
  receiptStatus?: ReceiptStatus | null
  isRecurring: boolean
  recurringFrequency?: RecurringFrequency
  recurringEndDate?: string
  parentExpenseId?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
  ocrProcessed?: boolean
  ocrConfidence?: OcrConfidence
  receiptId?: string | null
  supplyListId?: string | null
  paidByType?: PaidByType | null
  paidById?: string | null
  paidByName?: string | null
  // QB-flow context. Populated by GET /expenses/:id (the joined detail query)
  // and by all create/update responses. SendToQbModal reads these to auto-fill
  // the rebillable toggle and to match a QBO Customer.
  isBillable?: boolean
  primaryOwnerName?: string | null
  primaryOwnerEmail?: string | null
  createdAt: string
  updatedAt: string
  // Nested related objects (from detail endpoint)
  lineItems?: ExpenseLineItem[]
  receipt?: ExpenseLinkedReceipt | null
  supplyList?: ExpenseLinkedSupplyList | null
}

/**
 * Payload for creating an expense
 */
export interface CreateExpensePayload {
  userId: string
  propertyId?: string
  bookingId?: string
  expenseDate: string
  amount: number
  currency?: string
  category?: string
  vendorName?: string
  description?: string
  isReimbursable?: boolean
  isTaxDeductible?: boolean
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  isRecurring?: boolean
  recurringFrequency?: RecurringFrequency
  recurringEndDate?: string
  parentExpenseId?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
  ocrProcessed?: boolean
  ocrConfidence?: OcrConfidence
  paidByType?: PaidByType | null
  paidById?: string | null
  /** QuickBooks per-expense override; null/omitted = use connection default. */
  qbEntityType?: 'purchase' | 'bill' | null
}

/**
 * Payload for updating an expense (metadata only, not receipt)
 */
export interface UpdateExpensePayload {
  userId: string
  propertyId?: string | null
  bookingId?: string | null
  expenseDate: string
  amount: number
  currency?: string
  category?: string
  vendorName?: string
  description?: string
  isReimbursable?: boolean
  isTaxDeductible?: boolean
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  isRecurring?: boolean
  recurringFrequency?: RecurringFrequency | null
  recurringEndDate?: string | null
  parentExpenseId?: string | null
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
  paidByType?: PaidByType | null
  paidById?: string | null
  /** QuickBooks per-expense override; null clears the override. */
  qbEntityType?: 'purchase' | 'bill' | null
}

/**
 * Filter options for expense queries.
 * Single-value fields stay back-compat with existing callers; the array-valued
 * counterparts power the new multi-select filter bar. Backend `parseExpenseFilters`
 * accepts either form.
 */
export interface ExpenseFilters {
  userId: string
  // Back-compat single-value
  propertyId?: string
  bookingId?: string
  category?: string
  paymentStatus?: PaymentStatus
  // Multi-value (new)
  propertyIds?: string[]
  categories?: string[]
  paymentStatuses?: PaymentStatus[]
  qbSyncStatuses?: QbSyncStatus[]
  receiptStatuses?: ReceiptStatus[]
  hasReceipt?: boolean
  search?: string
  // Common
  startDate?: string
  endDate?: string
  isReimbursable?: boolean
}

// ─── Bulk + export response types ──────────────────────────────

export interface BulkExpenseFailure {
  expenseId: string
  error: string
}

export interface BulkUpdateExpensesResponse {
  status: 'success' | 'failed'
  data?: {
    summary: { total: number; updated: number; failed: number }
    updated: Array<{ expenseId: string }>
    failed: BulkExpenseFailure[]
  }
  message?: string
}

export interface BulkDeleteExpensesResponse {
  status: 'success' | 'failed'
  data?: {
    summary: { total: number; deleted: number; failed: number }
    deleted: Array<{ expenseId: string }>
    failed: BulkExpenseFailure[]
  }
  message?: string
}

export interface ExportExpensesResult {
  rowCount: number
  filename: string
}

/**
 * Expense summary by category
 */
export interface ExpenseSummaryByCategory {
  category?: string
  expenseCount: number
  totalAmount: number
  reimbursableAmount: number
  taxDeductibleAmount: number
}

/**
 * Expense summary by property
 */
export interface ExpenseSummaryByProperty {
  propertyId: string
  propertyName?: string
  propertyAddress?: string
  expenseCount: number
  totalAmount: number
  reimbursableAmount: number
  taxDeductibleAmount: number
}

/**
 * Expense totals
 */
export interface ExpenseTotals {
  totalCount: number
  totalAmount: number
  reimbursableAmount: number
  taxDeductibleAmount: number
}

/**
 * Combined expense summary response data
 */
export interface ExpenseSummaryData {
  totals: ExpenseTotals
  breakdown: ExpenseSummaryByCategory[] | ExpenseSummaryByProperty[]
}

/**
 * API response for single expense
 */
export interface ExpenseResponse {
  status: 'success' | 'failed'
  data: Expense
  message?: string
}

/**
 * API response for multiple expenses
 */
export interface ExpensesResponse {
  status: 'success' | 'failed'
  data: Expense[]
  message?: string
}

/**
 * API response for expense summary
 */
export interface ExpenseSummaryResponse {
  status: 'success' | 'failed'
  data: ExpenseSummaryData
  message?: string
}

/**
 * API response for delete operations
 */
export interface DeleteExpenseResponse {
  status: 'success' | 'failed'
  message: string
}

// ============================================================================
// BULK IMPORT TYPES
// ============================================================================

/**
 * Payload for a single expense in bulk import
 * expenseDate and amount are required
 */
export interface BulkExpensePayload {
  propertyId?: string | null
  expenseDate: string
  amount: number
  currency?: string
  category?: string
  vendorName?: string
  description?: string
  isReimbursable?: boolean
  isTaxDeductible?: boolean
  paymentMethod?: string
  paymentStatus?: string
  isRecurring?: boolean
  recurringFrequency?: string
  recurringEndDate?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxQst?: number
  taxTotal?: number
}

/**
 * Imported expense result with validation info
 */
export interface BulkImportedExpense {
  expense: Expense
  categoryValid: boolean
  propertyValid: boolean
}

/**
 * Summary of bulk import operation
 */
export interface BulkImportExpenseSummary {
  total: number
  imported: number
  skipped: number
}

/**
 * API response for bulk expense import
 */
export interface BulkImportExpensesResponse {
  status: 'success' | 'failed'
  data?: {
    summary: BulkImportExpenseSummary
    imported: BulkImportedExpense[]
  }
  message?: string
}

// ============================================================================
// EXPENSE LINE ITEM TYPES
// ============================================================================

/**
 * Payload for creating an expense line item
 */
export interface CreateExpenseLineItemPayload {
  userId: string
  description: string
  quantity?: number
  unitCost?: number
  totalCost?: number
  supplyListItemId?: string | null
}

/**
 * Payload for updating an expense line item
 */
export interface UpdateExpenseLineItemPayload {
  userId: string
  description?: string
  quantity?: number
  unitCost?: number
  totalCost?: number
  supplyListItemId?: string | null
}

/**
 * API response for single expense line item
 */
export interface ExpenseLineItemResponse {
  status: 'success' | 'failed'
  data: ExpenseLineItem
  message?: string
}

/**
 * API response for multiple expense line items
 */
export interface ExpenseLineItemsResponse {
  status: 'success' | 'failed'
  data: ExpenseLineItem[]
  message?: string
}

// ============================================================================
// ATTACH / DETACH RECEIPT TYPES
// ============================================================================

/**
 * Receipt summary returned by the attach endpoint.
 * Contains OCR-extracted fields for diff comparison against the expense.
 */
export interface AttachReceiptData {
  id: string
  vendorName: string | null
  expenseDate: string | null
  subtotal: number | null
  taxGst: number | null
  taxPst: number | null
  taxHst: number | null
  taxTotal: number | null
  total: number | null
  paymentMethod: string | null
  description: string | null
  originalName: string
  status: string
  propertyId: string | null
}

/**
 * Receipt line item returned by the attach endpoint.
 */
export interface AttachReceiptLineItem {
  id: string
  receiptId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sortOrder: number
}

/**
 * Response from POST /api/expenses/:id/attach-receipt
 */
export interface AttachReceiptResponse {
  status: 'success' | 'failed'
  data: {
    expense: Expense
    receipt: AttachReceiptData
    receiptLineItems: AttachReceiptLineItem[]
  }
  message?: string
}

/**
 * Response from POST /api/expenses/:id/detach-receipt
 */
export interface DetachReceiptResponse {
  status: 'success' | 'failed'
  data: Expense
  message?: string
}
