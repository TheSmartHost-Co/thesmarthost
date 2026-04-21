// ============================================================================
// Cleaner Analytics API Types
// Matches POST /api/analytics/cleaners + POST /api/analytics/cleaners/line-items
// ============================================================================

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export type CleanerGranularity = 'daily' | 'weekly' | 'monthly'

export type CleanerProjectStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'

export type InvoiceStatus = 'paid' | 'unpaid' | 'uninvoiced'

// =========================
// POST /api/analytics/cleaners — Request
// =========================

export interface CleanerAnalyticsRequest {
  dateRange: DateRange
  cleanerId?: string | null
  propertyIds?: string[] | null
  statuses?: CleanerProjectStatus[] | null
  invoiceStatuses?: InvoiceStatus[] | null
  comparison?: boolean
  granularity?: CleanerGranularity
}

// =========================
// POST /api/analytics/cleaners — Response
// =========================

export interface CleanerDelta {
  absolute: number
  percentage: number | null
}

export interface MetricDescription {
  label: string
  description: string
  formula: string
}

export interface CleanerAnalyticsMeta {
  dateRange: DateRange
  comparisonPeriod: DateRange | null
  filters: {
    cleanerId: string | null
    propertyIds: string[] | null
    statuses: CleanerProjectStatus[]
    invoiceStatuses: InvoiceStatus[] | null
  }
  granularity: CleanerGranularity
  generatedAt: string
  cached: boolean
  metricDescriptions: Record<string, MetricDescription>
}

// --- Portfolio ---

export interface CleanerPortfolioMetrics {
  completedProjects: number
  pendingProjects: number
  unassignedProjects: number
  totalProjects: number
  projectedInvoiceAmountForCompletedProjects: number
  projectedInvoiceAmountForPendingProjects: number
  projectedInvoiceAmountForUnassignedProjects: number
  paidInvoicesAmount: number
  paidInvoicesCount: number
  unpaidInvoicesAmount: number
  unpaidInvoicesCount: number
  uninvoicedCompletedAmount: number
  uninvoicedCompletedCount: number
  totalHoursWorked: number
  activeCleanerCount: number
  avgPaidPerProject: number
}

export interface CleanerPortfolioData {
  current: CleanerPortfolioMetrics
  previous: CleanerPortfolioMetrics | null
  delta: Record<keyof CleanerPortfolioMetrics, CleanerDelta> | null
}

// --- By Cleaner ---

export interface CleanerBreakdownMetrics {
  completedProjects: number
  pendingProjects: number
  projectedInvoiceAmountForCompletedProjects: number
  projectedInvoiceAmountForPendingProjects: number
  paidInvoicesAmount: number
  paidInvoicesCount: number
  unpaidInvoicesAmount: number
  unpaidInvoicesCount: number
  uninvoicedCompletedAmount: number
  uninvoicedCompletedCount: number
  totalHoursWorked: number
  projectsPerWeek: number
}

export interface CleanerPropertyAssignment {
  propertyId: string
  propertyName: string
  rateType: 'flat' | 'hourly' | null
  rateAmount: number | null
  completedProjects: number
  pendingProjects: number
  projectedInvoiceAmountForCompletedProjects: number
  projectedInvoiceAmountForPendingProjects: number
  totalHoursWorked: number
  projectsPerWeek: number
}

export interface CleanerBreakdown {
  cleanerId: string
  cleanerName: string
  current: CleanerBreakdownMetrics
  previous: CleanerBreakdownMetrics | null
  delta: Record<keyof CleanerBreakdownMetrics, CleanerDelta> | null
  properties: CleanerPropertyAssignment[]
}

// --- By Property ---

export interface CleanerPropertyMetrics {
  completedProjects: number
  pendingProjects: number
  unassignedProjects: number
  projectedInvoiceAmountForCompletedProjects: number
  projectedInvoiceAmountForPendingProjects: number
  projectedInvoiceAmountForUnassignedProjects: number
  paidInvoicesAmount: number
  paidInvoicesCount: number
  unpaidInvoicesAmount: number
  unpaidInvoicesCount: number
  uninvoicedCompletedAmount: number
  uninvoicedCompletedCount: number
  projectCount: number
  cleanerCount: number
}

export interface CleanerPropertyBreakdown {
  propertyId: string
  propertyName: string
  current: CleanerPropertyMetrics
  previous: CleanerPropertyMetrics | null
  delta: Record<keyof CleanerPropertyMetrics, CleanerDelta> | null
}

// --- Timeline ---

export interface CleanerTimelinePoint {
  date: string
  completedProjects: number
  pendingProjects: number
  projectedInvoiceAmountForCompletedProjects: number
  projectedInvoiceAmountForPendingProjects: number
  paidInvoicesAmount: number
  paidInvoicesCount: number
  unpaidInvoicesAmount: number
  unpaidInvoicesCount: number
  uninvoicedCompletedAmount: number
  uninvoicedCompletedCount: number
  hoursWorked: number
}

// --- Top-level response ---

export interface CleanerAnalyticsData {
  meta: CleanerAnalyticsMeta
  portfolio: CleanerPortfolioData
  byCleaner: CleanerBreakdown[]
  byProperty: CleanerPropertyBreakdown[]
  timeline: CleanerTimelinePoint[]
}

export interface CleanerAnalyticsResponse {
  status: 'success' | 'failed'
  data: CleanerAnalyticsData
  message?: string
}

// =========================
// POST /api/analytics/cleaners/line-items
// =========================

export interface CleanerLineItemsRequest {
  dateRange: DateRange
  cleanerId?: string | null
  propertyIds?: string[] | null
  invoiceStatuses?: InvoiceStatus[] | null
}

export interface CleanerLineItem {
  projectId: string
  projectDate: string
  cleanerId: string
  cleanerName: string
  propertyId: string
  propertyName: string
  invoiceId: string | null
  invoiceNumber: string | null
  invoiceStatus: InvoiceStatus | null
  paidAt: string | null
  amount: number
  rateType: 'flat' | 'hourly' | null
  rateAmount: number | null
  durationMinutes: number | null
  isManualOverride: boolean
  bucket: 'paid' | 'unpaid' | 'uninvoiced'
}

export interface CleanerLineItemsResponse {
  status: 'success' | 'failed'
  data: {
    items: CleanerLineItem[]
    total: number
    hasMore: boolean
    meta: {
      dateRange: DateRange
      filters: {
        cleanerId: string | null
        propertyIds: string[] | null
        invoiceStatuses: InvoiceStatus[] | null
      }
      limit: number
    }
  }
  message?: string
}

// =========================
// Transformed Chart Data (frontend-only)
// =========================

export interface SpendChartDataPoint {
  date: string
  label: string
  paidInvoicesAmount: number
  unpaidInvoicesAmount: number
  uninvoicedCompletedAmount: number
  upcomingAmount: number
  overdueAmount: number
  completedProjects: number
  pendingProjects: number
}

export interface WorkloadCleanerBar {
  cleanerId: string
  cleanerName: string
  completedProjects: number
  pendingProjects: number
  totalProjects: number
  totalHoursWorked: number
  projectsPerWeek: number
  properties: string[]
}
