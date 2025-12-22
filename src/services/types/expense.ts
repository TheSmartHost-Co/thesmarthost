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
