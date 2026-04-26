import type { PaymentStatus, QbSyncStatus, ReceiptStatus } from './expense'

/**
 * Date range preset for the expenses filter bar. Saved presets store the
 * preset CHOICE (not resolved dates), so "Last month" re-resolves correctly
 * each time the saved view is loaded.
 */
export type DateRangePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'ytd' | 'custom'

/**
 * Tri-state for the "Has receipt?" filter.
 */
export type HasReceiptFilter = 'any' | 'yes' | 'no'

/**
 * The full filter snapshot persisted to expense_filter_presets.filters.
 * Mirrors the backend JSONB shape exactly.
 */
export interface ExpenseFilterState {
  propertyIds: string[]
  categories: string[]
  paymentStatuses: PaymentStatus[]
  qbSyncStatuses: QbSyncStatus[]
  dateRange: {
    preset: DateRangePreset
    customStart: string | null   // 'YYYY-MM-DD' (only used when preset === 'custom')
    customEnd: string | null
  }
  hasReceipt: HasReceiptFilter
  receiptStatuses: ReceiptStatus[]
  search: string
}

export interface ExpenseFilterPreset {
  id: string
  name: string
  filters: ExpenseFilterState
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateExpenseFilterPresetPayload {
  name: string
  filters: ExpenseFilterState
  sortOrder?: number
}

export interface UpdateExpenseFilterPresetPayload {
  name?: string
  filters?: ExpenseFilterState
  sortOrder?: number
}

export interface ExpenseFilterPresetResponse {
  status: 'success' | 'failed'
  data: ExpenseFilterPreset
  message?: string
}

export interface ExpenseFilterPresetsResponse {
  status: 'success' | 'failed'
  data: ExpenseFilterPreset[]
  message?: string
}

export interface DeleteExpenseFilterPresetResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * Default filter state for a freshly-loaded /expenses page.
 */
export const DEFAULT_EXPENSE_FILTER_STATE: ExpenseFilterState = {
  propertyIds: [],
  categories: [],
  paymentStatuses: [],
  qbSyncStatuses: [],
  dateRange: { preset: 'thisMonth', customStart: null, customEnd: null },
  hasReceipt: 'any',
  receiptStatuses: [],
  search: '',
}

/**
 * Resolve a date-range preset into concrete YYYY-MM-DD endpoints.
 * Pure / synchronous so it can be called inside render.
 */
const formatLocal = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function resolveDateRange(
  range: ExpenseFilterState['dateRange']
): { startDate: string | null; endDate: string | null } {
  const now = new Date()
  switch (range.preset) {
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: formatLocal(start), endDate: formatLocal(end) }
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { startDate: formatLocal(start), endDate: formatLocal(end) }
    }
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      const end = new Date(now.getFullYear(), q * 3 + 3, 0)
      return { startDate: formatLocal(start), endDate: formatLocal(end) }
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { startDate: formatLocal(start), endDate: formatLocal(now) }
    }
    case 'custom':
      return { startDate: range.customStart, endDate: range.customEnd }
    default:
      return { startDate: null, endDate: null }
  }
}

/**
 * Count "active" (i.e. non-default) filters for the badge on the filter button.
 */
export function countActiveFilters(state: ExpenseFilterState): number {
  let n = 0
  if (state.propertyIds.length) n++
  if (state.categories.length) n++
  if (state.paymentStatuses.length) n++
  if (state.qbSyncStatuses.length) n++
  if (state.hasReceipt !== 'any') n++
  if (state.receiptStatuses.length) n++
  if (state.search.trim()) n++
  if (state.dateRange.preset !== 'thisMonth') n++
  return n
}
