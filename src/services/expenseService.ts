// Expense Service - API calls for expense management

import apiClient from './apiClient'
import type {
  Expense,
  ExpenseResponse,
  ExpensesResponse,
  ExpenseSummaryResponse,
  ExpenseDownloadResponse,
  DeleteExpenseResponse,
  ReceiptOperationResponse,
  CreateExpensePayload,
  UpdateExpensePayload,
  ExpenseFilters,
  ExpenseTotals
} from './types/expense'

/**
 * Get all expenses for a user with optional filters
 * @param filters - Filter options (userId required, others optional)
 * @returns Promise with expenses array
 */
export async function getExpenses(filters: ExpenseFilters): Promise<ExpensesResponse> {
  const params = new URLSearchParams()
  params.append('userId', filters.userId)

  if (filters.propertyId) {
    params.append('propertyId', filters.propertyId)
  }
  if (filters.bookingId) {
    params.append('bookingId', filters.bookingId)
  }
  if (filters.category) {
    params.append('category', filters.category)
  }
  if (filters.startDate) {
    params.append('startDate', filters.startDate)
  }
  if (filters.endDate) {
    params.append('endDate', filters.endDate)
  }
  if (filters.isReimbursable !== undefined) {
    params.append('isReimbursable', filters.isReimbursable.toString())
  }
  if (filters.paymentStatus) {
    params.append('paymentStatus', filters.paymentStatus)
  }

  return apiClient<ExpensesResponse>(`/expenses?${params.toString()}`)
}

/**
 * Get single expense by ID
 * @param id - Expense ID
 * @param userId - User ID for ownership validation
 * @returns Promise with expense details
 */
export async function getExpenseById(id: string, userId: string): Promise<ExpenseResponse> {
  return apiClient<ExpenseResponse>(`/expenses/${id}?userId=${userId}`)
}

/**
 * Create a new expense (with optional receipt)
 * @param data - Expense creation payload
 * @returns Promise with created expense
 */
export async function createExpense(data: CreateExpensePayload): Promise<ExpenseResponse> {
  // Use FormData for file upload support
  const formData = new FormData()
  formData.append('userId', data.userId)
  formData.append('expenseDate', data.expenseDate)
  formData.append('amount', data.amount.toString())
  formData.append('category', data.category)

  if (data.propertyId) {
    formData.append('propertyId', data.propertyId)
  }
  if (data.bookingId) {
    formData.append('bookingId', data.bookingId)
  }
  if (data.currency) {
    formData.append('currency', data.currency)
  }
  if (data.vendorName) {
    formData.append('vendorName', data.vendorName)
  }
  if (data.description) {
    formData.append('description', data.description)
  }
  if (data.receipt) {
    formData.append('receipt', data.receipt)
  }
  if (data.isReimbursable !== undefined) {
    formData.append('isReimbursable', data.isReimbursable.toString())
  }
  if (data.isTaxDeductible !== undefined) {
    formData.append('isTaxDeductible', data.isTaxDeductible.toString())
  }
  if (data.paymentMethod) {
    formData.append('paymentMethod', data.paymentMethod)
  }
  if (data.paymentStatus) {
    formData.append('paymentStatus', data.paymentStatus)
  }
  if (data.isRecurring !== undefined) {
    formData.append('isRecurring', data.isRecurring.toString())
  }
  if (data.recurringFrequency) {
    formData.append('recurringFrequency', data.recurringFrequency)
  }
  if (data.recurringEndDate) {
    formData.append('recurringEndDate', data.recurringEndDate)
  }
  if (data.parentExpenseId) {
    formData.append('parentExpenseId', data.parentExpenseId)
  }

  // Use fetch directly for FormData (apiClient might not handle it correctly)
  return fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/expenses`, {
    method: 'POST',
    body: formData,
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  })
}

/**
 * Update an existing expense (metadata only, not receipt)
 * @param id - Expense ID
 * @param data - Expense update payload
 * @returns Promise with updated expense
 */
export async function updateExpense(id: string, data: UpdateExpensePayload): Promise<ExpenseResponse> {
  return apiClient<ExpenseResponse, UpdateExpensePayload>(`/expenses/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Delete an expense
 * @param id - Expense ID
 * @param userId - User ID for ownership validation
 * @returns Promise with success message
 */
export async function deleteExpense(id: string, userId: string): Promise<DeleteExpenseResponse> {
  return apiClient<DeleteExpenseResponse>(`/expenses/${id}?userId=${userId}`, {
    method: 'DELETE',
  })
}

/**
 * Upload or replace receipt for an existing expense
 * @param expenseId - Expense ID
 * @param userId - User ID for ownership validation
 * @param receipt - Receipt file to upload
 * @returns Promise with updated expense
 */
export async function uploadReceipt(
  expenseId: string,
  userId: string,
  receipt: File
): Promise<ReceiptOperationResponse> {
  const formData = new FormData()
  formData.append('userId', userId)
  formData.append('receipt', receipt)

  return fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/expenses/${expenseId}/receipt`, {
    method: 'POST',
    body: formData,
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  })
}

/**
 * Remove receipt from an expense (keeps expense, removes file)
 * @param expenseId - Expense ID
 * @param userId - User ID for ownership validation
 * @returns Promise with result
 */
export async function deleteReceipt(
  expenseId: string,
  userId: string
): Promise<ReceiptOperationResponse> {
  return apiClient<ReceiptOperationResponse>(`/expenses/${expenseId}/receipt?userId=${userId}`, {
    method: 'DELETE',
  })
}

/**
 * Get download URL for expense receipt
 * @param expenseId - Expense ID
 * @param userId - User ID for ownership validation
 * @returns Promise with download URL details
 */
export async function getReceiptDownloadUrl(
  expenseId: string,
  userId: string
): Promise<ExpenseDownloadResponse> {
  return apiClient<ExpenseDownloadResponse>(`/expenses/${expenseId}/download?userId=${userId}`)
}

/**
 * Get expense summary with totals and breakdown
 * @param userId - User ID
 * @param groupBy - Group breakdown by 'category' or 'property'
 * @param propertyId - Optional property filter
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Promise with expense summary
 */
export async function getExpenseSummary(
  userId: string,
  groupBy: 'category' | 'property' = 'category',
  propertyId?: string,
  startDate?: string,
  endDate?: string
): Promise<ExpenseSummaryResponse> {
  const params = new URLSearchParams()
  params.append('userId', userId)
  params.append('groupBy', groupBy)

  if (propertyId) {
    params.append('propertyId', propertyId)
  }
  if (startDate) {
    params.append('startDate', startDate)
  }
  if (endDate) {
    params.append('endDate', endDate)
  }

  return apiClient<ExpenseSummaryResponse>(`/expenses/summary?${params.toString()}`)
}

// ============================================================================
// Helper Functions (Client-side calculations)
// ============================================================================

/**
 * Download expense receipt file
 * @param expenseId - Expense ID
 * @param userId - User ID for ownership validation
 * @param filename - Optional custom filename
 */
export async function downloadReceipt(
  expenseId: string,
  userId: string,
  filename?: string
): Promise<void> {
  try {
    const response = await getReceiptDownloadUrl(expenseId, userId)
    if (response.status === 'success') {
      // Fetch the file and trigger browser download
      const fileResponse = await fetch(response.data.downloadUrl)
      const blob = await fileResponse.blob()

      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || response.data.originalName
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

/**
 * Get receipt URL for preview
 * @param expenseId - Expense ID
 * @param userId - User ID for ownership validation
 * @returns Promise with signed URL for preview
 */
export async function getReceiptPreviewUrl(
  expenseId: string,
  userId: string
): Promise<string> {
  try {
    const response = await getReceiptDownloadUrl(expenseId, userId)
    if (response.status === 'success') {
      return response.data.downloadUrl
    }
    throw new Error('Failed to get preview URL')
  } catch (error) {
    console.error('Preview URL failed:', error)
    throw error
  }
}

/**
 * Calculate expense totals from expenses array (client-side)
 * Useful for dashboard when you already have expenses data
 * @param expenses - Array of expenses
 * @returns Expense totals object
 */
export function calculateExpenseTotals(expenses: Expense[]): ExpenseTotals {
  if (expenses.length === 0) {
    return {
      totalCount: 0,
      totalAmount: 0,
      reimbursableAmount: 0,
      taxDeductibleAmount: 0
    }
  }

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const reimbursableAmount = expenses
    .filter(e => e.isReimbursable)
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const taxDeductibleAmount = expenses
    .filter(e => e.isTaxDeductible)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return {
    totalCount: expenses.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    reimbursableAmount: Math.round(reimbursableAmount * 100) / 100,
    taxDeductibleAmount: Math.round(taxDeductibleAmount * 100) / 100
  }
}

/**
 * Filter expenses by date range (client-side)
 * @param expenses - Array of expenses
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Filtered expenses array
 */
export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate: string,
  endDate: string
): Expense[] {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.expenseDate)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return expenseDate >= start && expenseDate <= end
  })
}

/**
 * Filter expenses by category (client-side)
 * @param expenses - Array of expenses
 * @param category - Category to filter by
 * @returns Filtered expenses array
 */
export function filterExpensesByCategory(expenses: Expense[], category: string): Expense[] {
  return expenses.filter(expense => expense.category === category)
}

/**
 * Sort expenses by date (client-side)
 * @param expenses - Array of expenses
 * @param descending - Sort descending (newest first)
 * @returns Sorted expenses array
 */
export function sortExpensesByDate(expenses: Expense[], descending = true): Expense[] {
  return [...expenses].sort((a, b) => {
    const dateA = new Date(a.expenseDate)
    const dateB = new Date(b.expenseDate)
    return descending ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
  })
}

/**
 * Group expenses by category (client-side)
 * @param expenses - Array of expenses
 * @returns Object with category as key and expenses array as value
 */
export function groupExpensesByCategory(expenses: Expense[]): Record<string, Expense[]> {
  return expenses.reduce((groups, expense) => {
    const category = expense.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(expense)
    return groups
  }, {} as Record<string, Expense[]>)
}

/**
 * Group expenses by property (client-side)
 * @param expenses - Array of expenses
 * @returns Object with propertyId as key and expenses array as value
 */
export function groupExpensesByProperty(expenses: Expense[]): Record<string, Expense[]> {
  return expenses.reduce((groups, expense) => {
    const propertyId = expense.propertyId || 'unassigned'
    if (!groups[propertyId]) {
      groups[propertyId] = []
    }
    groups[propertyId].push(expense)
    return groups
  }, {} as Record<string, Expense[]>)
}

/**
 * Format currency for display
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'CAD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, currency = 'CAD'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-'
  }

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatExpenseDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-CA', options)
}
