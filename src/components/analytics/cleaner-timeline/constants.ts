import type { CleanerProjectStatus, InvoiceStatus } from '@/services/types/cleanerAnalytics'

// --- Tabs ---

export type AnalyticsTab = 'spend' | 'workload'

export type BreakdownView = 'byCleaner' | 'byProperty'

export type ChartType = 'bar' | 'area' | 'pie'

// --- Spend colors ---

export const SPEND_COLORS = {
  paid: '#10B981',           // emerald-500
  paidStroke: '#059669',     // emerald-600
  owed: '#F59E0B',           // amber-500
  owedStroke: '#D97706',     // amber-600
  notBilled: '#EF4444',      // red-500
  notBilledStroke: '#DC2626',// red-600
  upcoming: '#3B82F6',       // blue-500
  upcomingStroke: '#2563EB', // blue-600
  overdue: '#DC2626',        // red-600
  overdueStroke: '#B91C1C',  // red-700
  unassigned: '#9CA3AF',     // gray-400
} as const

// --- Workload colors ---

export const WORKLOAD_COLORS = {
  completed: '#10B981',      // emerald-500
  completedStroke: '#059669',// emerald-600
  pending: '#3B82F6',        // blue-500
  pendingStroke: '#2563EB',  // blue-600
} as const

// --- Status filter options ---

export const STATUS_OPTIONS: { value: CleanerProjectStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: '#94A3B8' },
  { value: 'confirmed', label: 'Confirmed', color: '#6366F1' },
  { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { value: 'completed', label: 'Completed', color: '#14B8A6' },
]

export const STATUS_COLORS: Record<CleanerProjectStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-slate-50', text: 'text-slate-700', dot: '#94A3B8' },
  confirmed: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: '#6366F1' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#F59E0B' },
  completed: { bg: 'bg-teal-50', text: 'text-teal-700', dot: '#14B8A6' },
}

// --- Invoice status filter options ---

export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: 'paid', label: 'Paid', color: '#10B981' },
  { value: 'unpaid', label: 'Unpaid', color: '#F59E0B' },
  { value: 'uninvoiced', label: 'Uninvoiced', color: '#EF4444' },
]

// --- Cleaner palette for workload chart bars ---

export const CLEANER_PALETTE = [
  '#0F766E', // teal-700
  '#4F46E5', // indigo-600
  '#0E7490', // cyan-700
  '#7C3AED', // violet-600
  '#059669', // emerald-600
  '#2563EB', // blue-600
  '#DB2777', // pink-600
  '#CA8A04', // yellow-600
] as const

export const OTHER_CLEANER_COLOR = '#64748B' // slate-500

export const MAX_CLEANER_STACKS = 6

// --- Drift threshold ---

export const DRIFT_THRESHOLD_PERCENT = 5
