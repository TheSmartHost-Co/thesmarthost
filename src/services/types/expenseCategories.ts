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

/**
 * Look up category display info by code from the user's seeded category list.
 *
 * The backend lazy-seeds the canonical defaults (MAINT, CLEAN, UTIL, SUPP, INS,
 * TAX, MKTG, PROF, COMM, MISC) into `expense_categories` on first read of
 * /api/expense-categories/:userId — so callers are guaranteed to have the
 * defaults in `userCategories` once that endpoint has resolved. Returns null
 * for unknown codes (e.g. legacy free-text values that pre-date the canonical
 * code system); callers fall back to displaying the raw code.
 */
export function getCategoryByCode(
  code: string,
  userCategories: ExpenseCategory[]
): { label: string; colorHex: string } | null {
  const cat = userCategories.find(c => c.code === code)
  if (!cat) return null
  return { label: cat.label, colorHex: cat.colorHex || '#6B7280' }
}
