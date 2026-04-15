// ============================================================================
// Expense Analytics API Types
// Matches POST /api/analytics/expenses and /api/analytics/expenses/drilldown
// ============================================================================

import type { PaymentStatus } from './expense'

// --- Shared ---

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export type ExpenseGranularity = 'daily' | 'weekly' | 'monthly'

// --- Main Analytics Request ---

export interface ExpenseAnalyticsRequest {
  dateRange: DateRange
  propertyIds?: string[]
  categories?: string[]
  paymentStatuses?: string[]
  paidByIds?: string[]
  paymentMethods?: string[]
  isReimbursable?: boolean | null
  isTaxDeductible?: boolean | null
  comparison?: boolean
  granularity?: ExpenseGranularity
}

// --- Main Analytics Response ---

export interface ExpenseAnalyticsMeta {
  dateRange: DateRange
  comparisonPeriod: DateRange | null
  filters: {
    propertyIds: string[] | null
    categories: string[] | null
    paymentStatuses: string[] | null
    paidByIds: string[] | null
    paymentMethods: string[] | null
    isReimbursable: boolean | null
    isTaxDeductible: boolean | null
  }
  granularity: ExpenseGranularity
  generatedAt: string
  cached: boolean
}

export interface MetricDelta {
  absolute: number
  percentage: number
}

export interface ExpensePortfolioMetrics {
  expenseCount: number
  totalAmount: number
  reimbursableAmount: number
  taxDeductibleAmount: number
  taxBreakdown: {
    gst: number
    pst: number
    hst: number
    total: number
  }
  avgExpenseAmount: number
}

export interface ExpensePortfolioDelta {
  expenseCount: MetricDelta
  totalAmount: MetricDelta
  reimbursableAmount: MetricDelta
  taxDeductibleAmount: MetricDelta
  avgExpenseAmount: MetricDelta
}

export interface ExpensePortfolioData {
  current: ExpensePortfolioMetrics
  previous: ExpensePortfolioMetrics | null
  delta: ExpensePortfolioDelta | null
}

export interface ExpensePropertyBreakdown {
  propertyId: string | null
  propertyName: string
  current: {
    expenseCount: number
    totalAmount: number
    contributionPct: number
  }
  previous: {
    expenseCount: number
    totalAmount: number
    contributionPct: number
  } | null
  delta: {
    expenseCount: MetricDelta
    totalAmount: MetricDelta
  } | null
}

export interface ExpenseCategoryBreakdown {
  category: string
  current: {
    expenseCount: number
    totalAmount: number
    sharePct: number
  }
  previous: {
    expenseCount: number
    totalAmount: number
    sharePct: number
  } | null
  delta: {
    expenseCount: MetricDelta
    totalAmount: MetricDelta
  } | null
}

export interface ExpenseTimelinePoint {
  date: string
  expenseCount: number
  totalAmount: number
}

export interface ExpenseAnalyticsData {
  meta: ExpenseAnalyticsMeta
  portfolio: ExpensePortfolioData
  byProperty: ExpensePropertyBreakdown[]
  byCategory: ExpenseCategoryBreakdown[]
  timeline: ExpenseTimelinePoint[]
}

export interface ExpenseAnalyticsResponse {
  status: 'success' | 'failed'
  data: ExpenseAnalyticsData
  message?: string
}

// --- Drilldown Request ---

export interface ExpenseDrilldownRequest {
  dateRange: DateRange
  propertyIds?: string[]
  categories?: string[]
  paymentStatuses?: string[]
  paidByIds?: string[]
  paymentMethods?: string[]
  isReimbursable?: boolean | null
  isTaxDeductible?: boolean | null
  page?: number
  limit?: number
}

// --- Drilldown Response ---

export interface ExpenseLineItem {
  id: string
  description: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface DrilldownExpense {
  id: string
  propertyId: string | null
  propertyName: string
  expenseDate: string
  amount: number
  category: string
  vendorName: string | null
  description: string | null
  isReimbursable: boolean
  isTaxDeductible: boolean
  paymentMethod: string | null
  paymentStatus: PaymentStatus
  paidById: string | null
  paidByType: string | null
  taxBreakdown: {
    gst: number
    pst: number
    hst: number
    total: number
  }
  lineItems: ExpenseLineItem[]
  createdAt: string
}

export interface DrilldownPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ExpenseDrilldownData {
  meta: {
    dateRange: DateRange
    filters: {
      propertyIds: string[] | null
      categories: string[] | null
      paymentStatuses: string[] | null
      paidByIds: string[] | null
      paymentMethods: string[] | null
      isReimbursable: boolean | null
      isTaxDeductible: boolean | null
    }
    generatedAt: string
  }
  expenses: DrilldownExpense[]
  pagination: DrilldownPagination
}

export interface ExpenseDrilldownResponse {
  status: 'success' | 'failed'
  data: ExpenseDrilldownData
  message?: string
}

// --- Transformed Chart Data ---

export interface ExpenseChartDataPoint {
  date: string
  label: string
  totalAmount: number
  expenseCount: number
  [categoryCode: string]: string | number
}
