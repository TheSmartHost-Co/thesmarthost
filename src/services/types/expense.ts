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
 * Recurring frequency options
 */
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'

/**
 * OCR extracted field with confidence score
 */
export interface OcrField<T> {
  value: T | null
  confidence: number
}

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
 * OCR extracted receipt data
 */
export interface OcrReceiptData {
  vendorName: OcrField<string>
  expenseDate: OcrField<string>
  subtotal: OcrField<number>
  taxGst: OcrField<number>
  taxPst: OcrField<number>
  taxHst: OcrField<number>
  taxTotal: OcrField<number>
  total: OcrField<number>
  description: OcrField<string>
  paymentMethod: OcrField<string>
  lineItems: OcrField<Array<{ name: string; quantity: number; price: number }>>
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
  isRecurring: boolean
  recurringFrequency?: RecurringFrequency
  recurringEndDate?: string
  parentExpenseId?: string
  subtotal?: number
  taxGst?: number
  taxPst?: number
  taxHst?: number
  taxTotal?: number
  ocrProcessed?: boolean
  ocrConfidence?: OcrConfidence
  receiptId?: string | null
  supplyListId?: string | null
  paidByType?: PaidByType | null
  paidById?: string | null
  paidByName?: string | null
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
  receipt?: File
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
  taxTotal?: number
  ocrProcessed?: boolean
  ocrConfidence?: OcrConfidence
  paidByType?: PaidByType | null
  paidById?: string | null
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
  taxTotal?: number
  paidByType?: PaidByType | null
  paidById?: string | null
}

/**
 * Filter options for expense queries
 */
export interface ExpenseFilters {
  userId: string
  propertyId?: string
  bookingId?: string
  category?: string
  startDate?: string
  endDate?: string
  isReimbursable?: boolean
  paymentStatus?: PaymentStatus
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
 * API response for receipt download
 */
export interface ExpenseDownloadResponse {
  status: 'success' | 'failed'
  data: {
    downloadUrl: string
    originalName: string
    mimeType: string
    expiresIn: number
  }
  message?: string
}

/**
 * API response for delete operations
 */
export interface DeleteExpenseResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * API response for receipt operations
 */
export interface ReceiptOperationResponse {
  status: 'success' | 'failed'
  data?: Expense
  message?: string
}

/**
 * API response for OCR scan receipt
 */
export interface ScanReceiptResponse {
  status: 'success' | 'failed'
  data?: OcrReceiptData
  message?: string
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
