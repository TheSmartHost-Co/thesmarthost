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
 * Default category structure (frontend-only, no database storage)
 */
export interface DefaultExpenseCategory {
  code: string
  label: string
  colorHex: string
  isSystemDefault: true
}

/**
 * Default expense categories for property managers
 * These are always available and don't need to be created in the database
 */
export const DEFAULT_EXPENSE_CATEGORIES: DefaultExpenseCategory[] = [
  { code: 'MAINT', label: 'Maintenance & Repairs', colorHex: '#3B82F6', isSystemDefault: true },
  { code: 'CLEAN', label: 'Cleaning Services', colorHex: '#10B981', isSystemDefault: true },
  { code: 'UTIL', label: 'Utilities', colorHex: '#F59E0B', isSystemDefault: true },
  { code: 'SUPP', label: 'Supplies & Amenities', colorHex: '#8B5CF6', isSystemDefault: true },
  { code: 'INS', label: 'Insurance', colorHex: '#EF4444', isSystemDefault: true },
  { code: 'TAX', label: 'Property Taxes & Fees', colorHex: '#6366F1', isSystemDefault: true },
  { code: 'MKTG', label: 'Marketing & Advertising', colorHex: '#EC4899', isSystemDefault: true },
  { code: 'PROF', label: 'Professional Services', colorHex: '#14B8A6', isSystemDefault: true },
  { code: 'COMM', label: 'Commissions', colorHex: '#F97316', isSystemDefault: true },
  { code: 'MISC', label: 'Miscellaneous', colorHex: '#6B7280', isSystemDefault: true },
]

/**
 * Combined category type for use in components
 * Can be either a user-created category or a default category
 */
export type CombinedExpenseCategory = ExpenseCategory | DefaultExpenseCategory

/**
 * Helper to check if a category is a system default
 */
export function isSystemDefaultCategory(category: CombinedExpenseCategory): category is DefaultExpenseCategory {
  return 'isSystemDefault' in category && category.isSystemDefault === true
}

/**
 * Get category display info by code (searches both defaults and user categories)
 */
export function getCategoryByCode(
  code: string,
  userCategories: ExpenseCategory[]
): { label: string; colorHex: string } | null {
  // First check user categories (they can override defaults)
  const userCat = userCategories.find(c => c.code === code)
  if (userCat) {
    return { label: userCat.label, colorHex: userCat.colorHex || '#6B7280' }
  }

  // Then check default categories
  const defaultCat = DEFAULT_EXPENSE_CATEGORIES.find(c => c.code === code)
  if (defaultCat) {
    return { label: defaultCat.label, colorHex: defaultCat.colorHex }
  }

  return null
}
