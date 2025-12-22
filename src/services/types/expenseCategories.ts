// Expense Categories Types for HostMetrics Frontend

/**
 * Main ExpenseCategory interface
 * Matches backend response structure
 */
export interface ExpenseCategory {
  id: string
  userId: string
  code: string
  label: string
  description?: string
  colorHex?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Payload for creating an expense category
 */
export interface CreateExpenseCategoryPayload {
  userId: string
  code: string
  label: string
  description?: string
  colorHex?: string
  isDefault?: boolean
}

/**
 * Payload for updating an expense category
 */
export interface UpdateExpenseCategoryPayload {
  code: string
  label: string
  description?: string
  colorHex?: string
  isDefault?: boolean
}

/**
 * API response for single expense category
 */
export interface ExpenseCategoryResponse {
  status: 'success' | 'failed'
  data: ExpenseCategory
  message?: string
}

/**
 * API response for multiple expense categories
 */
export interface ExpenseCategoriesResponse {
  status: 'success' | 'failed'
  data: ExpenseCategory[]
  message?: string
}

/**
 * API response for delete operations
 */
export interface DeleteExpenseCategoryResponse {
  status: 'success' | 'failed'
  message: string
}
