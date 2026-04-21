'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getCleanerAnalytics, getCleanerLineItems } from '@/services/cleanerAnalyticsService'
import { getCurrentMonthRange } from '@/services/analyticsService'
import type {
  DateRange,
  CleanerGranularity,
  CleanerProjectStatus,
  InvoiceStatus,
  CleanerAnalyticsData,
  CleanerLineItem,
  SpendChartDataPoint,
  WorkloadCleanerBar,
} from '@/services/types/cleanerAnalytics'
import type { AnalyticsTab, BreakdownView } from './constants'
import { CLEANER_PALETTE, MAX_CLEANER_STACKS, OTHER_CLEANER_COLOR } from './constants'
import { useNotificationStore } from '@/store/useNotificationStore'

export interface CleanerInfo {
  cleanerId: string
  cleanerName: string
  colorHex: string
}

export interface CleanerFiltersState {
  dateRange: DateRange
  cleanerId: string | null
  propertyIds: string[]
  statuses: CleanerProjectStatus[]
  invoiceStatuses: InvoiceStatus[]
  granularity: CleanerGranularity
  comparison: boolean
}

const DEFAULT_FILTERS: CleanerFiltersState = {
  dateRange: getCurrentMonthRange(),
  cleanerId: null,
  propertyIds: [],
  statuses: [],
  invoiceStatuses: [],
  granularity: 'daily',
  comparison: true,
}

export function useCleanerTimeline(userId: string) {
  const showNotification = useNotificationStore(s => s.showNotification)

  // --- Tab & view state ---
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('spend')
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('byCleaner')
  const [showProjections, setShowProjections] = useState(false)

  // --- Filters (shared across tabs) ---
  const [filters, setFilters] = useState<CleanerFiltersState>(() => ({ ...DEFAULT_FILTERS }))

  // --- Data ---
  const [rawData, setRawData] = useState<CleanerAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Line items (lazy loaded) ---
  const [lineItems, setLineItems] = useState<CleanerLineItem[]>([])
  const [lineItemsLoading, setLineItemsLoading] = useState(false)

  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Active cleaners (top N by total projects, for workload chart colors) ---
  const activeCleaners = useMemo<CleanerInfo[]>(() => {
    if (!rawData?.byCleaner?.length) return []

    const sorted = [...rawData.byCleaner].sort((a, b) => {
      const aTotal = a.current.completedProjects + a.current.pendingProjects
      const bTotal = b.current.completedProjects + b.current.pendingProjects
      return bTotal - aTotal
    })

    const result: CleanerInfo[] = []
    for (let i = 0; i < sorted.length && i < MAX_CLEANER_STACKS; i++) {
      result.push({
        cleanerId: sorted[i].cleanerId,
        cleanerName: sorted[i].cleanerName,
        colorHex: CLEANER_PALETTE[i % CLEANER_PALETTE.length],
      })
    }
    if (sorted.length > MAX_CLEANER_STACKS) {
      result.push({
        cleanerId: 'OTHER',
        cleanerName: 'Other',
        colorHex: OTHER_CLEANER_COLOR,
      })
    }
    return result
  }, [rawData?.byCleaner])

  // --- Spend chart data ---
  const spendChartData = useMemo<SpendChartDataPoint[]>(() => {
    if (!rawData?.timeline) return []

    const today = new Date().toISOString().slice(0, 10)

    return rawData.timeline.map(point => {
      const isPast = point.date < today
      const projected = point.projectedInvoiceAmountForPendingProjects
      return {
        date: point.date,
        label: formatDateLabel(point.date, filters.granularity),
        paidInvoicesAmount: point.paidInvoicesAmount,
        unpaidInvoicesAmount: point.unpaidInvoicesAmount,
        uninvoicedCompletedAmount: point.uninvoicedCompletedAmount,
        upcomingAmount: isPast ? 0 : projected,
        overdueAmount: isPast ? projected : 0,
        completedProjects: point.completedProjects,
        pendingProjects: point.pendingProjects,
      }
    })
  }, [rawData?.timeline, filters.granularity])

  // --- Overdue / upcoming totals (derived from timeline) ---
  const overdueTotals = useMemo(() => {
    let overdueAmount = 0
    let overdueCount = 0
    let upcomingAmount = 0
    let upcomingCount = 0
    const today = new Date().toISOString().slice(0, 10)

    for (const point of rawData?.timeline ?? []) {
      if (point.date < today) {
        overdueAmount += point.projectedInvoiceAmountForPendingProjects
        overdueCount += point.pendingProjects
      } else {
        upcomingAmount += point.projectedInvoiceAmountForPendingProjects
        upcomingCount += point.pendingProjects
      }
    }
    return { overdueAmount, overdueCount, upcomingAmount, upcomingCount }
  }, [rawData?.timeline])

  // --- Workload bars ---
  const workloadBars = useMemo<WorkloadCleanerBar[]>(() => {
    if (!rawData?.byCleaner) return []

    return [...rawData.byCleaner]
      .map(c => ({
        cleanerId: c.cleanerId,
        cleanerName: c.cleanerName,
        completedProjects: c.current.completedProjects,
        pendingProjects: c.current.pendingProjects,
        totalProjects: c.current.completedProjects + c.current.pendingProjects,
        totalHoursWorked: c.current.totalHoursWorked,
        projectsPerWeek: c.current.projectsPerWeek,
        properties: c.properties
          .filter(p => p.completedProjects > 0 || p.pendingProjects > 0)
          .map(p => p.propertyName),
      }))
      .sort((a, b) => b.totalProjects - a.totalProjects)
  }, [rawData?.byCleaner])

  // --- Fetch analytics ---
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await getCleanerAnalytics({
        dateRange: filters.dateRange,
        cleanerId: filters.cleanerId,
        propertyIds: filters.propertyIds.length > 0 ? filters.propertyIds : null,
        statuses: filters.statuses.length > 0 ? filters.statuses : null,
        invoiceStatuses: filters.invoiceStatuses.length > 0 ? filters.invoiceStatuses : null,
        comparison: filters.comparison,
        granularity: filters.granularity,
      })

      if (res.status === 'success') {
        setRawData(res.data)
      } else {
        setError(res.message || 'Failed to load cleaner analytics')
        showNotification(res.message || 'Failed to load cleaner analytics', 'error')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setError(msg)
      showNotification(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [userId, filters, showNotification])

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(fetchAnalytics, 300)
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    }
  }, [fetchAnalytics])

  // --- Fetch line items (on demand) — returns items for caller caching ---
  const fetchLineItems = useCallback(
    async (cleanerId?: string | null, propertyIds?: string[] | null): Promise<CleanerLineItem[]> => {
      if (!userId) return []
      setLineItemsLoading(true)

      try {
        const res = await getCleanerLineItems({
          dateRange: filters.dateRange,
          cleanerId: cleanerId ?? filters.cleanerId,
          propertyIds: propertyIds ?? (filters.propertyIds.length > 0 ? filters.propertyIds : null),
          invoiceStatuses: filters.invoiceStatuses.length > 0 ? filters.invoiceStatuses : null,
        })

        if (res.status === 'success') {
          setLineItems(res.data.items)
          return res.data.items
        } else {
          showNotification(res.message || 'Failed to load line items', 'error')
          return []
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        showNotification(msg, 'error')
        return []
      } finally {
        setLineItemsLoading(false)
      }
    },
    [userId, filters.dateRange, filters.cleanerId, filters.propertyIds, filters.invoiceStatuses, showNotification]
  )

  // --- Filter setters ---
  const setDateRange = useCallback((dateRange: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange }))
  }, [])

  const setCleanerId = useCallback((cleanerId: string | null) => {
    setFilters(prev => ({ ...prev, cleanerId }))
  }, [])

  const setPropertyIds = useCallback((propertyIds: string[]) => {
    setFilters(prev => ({ ...prev, propertyIds }))
  }, [])

  const setStatuses = useCallback((statuses: CleanerProjectStatus[]) => {
    setFilters(prev => ({ ...prev, statuses }))
  }, [])

  const setInvoiceStatuses = useCallback((invoiceStatuses: InvoiceStatus[]) => {
    setFilters(prev => ({ ...prev, invoiceStatuses }))
  }, [])

  const setGranularity = useCallback((granularity: CleanerGranularity) => {
    setFilters(prev => ({ ...prev, granularity }))
  }, [])

  const toggleComparison = useCallback(() => {
    setFilters(prev => ({ ...prev, comparison: !prev.comparison }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
  }, [])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.cleanerId !== null ||
      filters.propertyIds.length > 0 ||
      filters.statuses.length > 0 ||
      filters.invoiceStatuses.length > 0
    )
  }, [filters.cleanerId, filters.propertyIds, filters.statuses, filters.invoiceStatuses])

  const toggleProjections = useCallback(() => {
    setShowProjections(prev => !prev)
  }, [])

  return {
    // Tab state
    activeTab,
    setActiveTab,
    breakdownView,
    setBreakdownView,
    showProjections,
    toggleProjections,

    // Filters
    filters,
    setDateRange,
    setCleanerId,
    setPropertyIds,
    setStatuses,
    setInvoiceStatuses,
    setGranularity,
    toggleComparison,
    clearFilters,
    hasActiveFilters,

    // Data
    rawData,
    spendChartData,
    overdueTotals,
    workloadBars,
    activeCleaners,

    // Line items
    lineItems,
    lineItemsLoading,
    fetchLineItems,

    // Loading
    isLoading,
    error,
    refresh: fetchAnalytics,
  }
}

// --- Helpers ---

function formatDateLabel(date: string, granularity: CleanerGranularity): string {
  const d = new Date(date + 'T00:00:00')
  switch (granularity) {
    case 'daily':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'weekly':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'monthly':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    default:
      return date
  }
}
