// Expense Types for HostMetrics Frontend

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
  category: string
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
  createdAt: string
  updatedAt: string
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
  category: string
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
  category: string
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
  category: string
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
