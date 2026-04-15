export const EXPENSE_CHART_COLORS = {
  actual: '#10B981',
  actualLight: '#10B98166',
} as const

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'reimbursed', label: 'Reimbursed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const PAYMENT_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#F59E0B' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#10B981' },
  reimbursed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: '#3B82F6' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: '#EF4444' },
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit', label: 'Debit' },
  { value: 'cash', label: 'Cash' },
  { value: 'e-transfer', label: 'E-Transfer' },
  { value: 'cheque', label: 'Cheque' },
] as const

export const PAID_BY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'PROPERTY-MANAGER': { bg: 'bg-violet-100', text: 'text-violet-700' },
  'CLEANER': { bg: 'bg-teal-100', text: 'text-teal-700' },
  'OWNER': { bg: 'bg-blue-100', text: 'text-blue-700' },
}

export const OTHER_CATEGORY_COLOR = '#6B7280'

export const MAX_CATEGORY_STACKS = 7

export type ChartType = 'bar' | 'area'
