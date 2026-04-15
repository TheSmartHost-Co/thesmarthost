'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getExpenseAnalytics, getExpenseDrilldown } from '@/services/expenseAnalyticsService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import { getCurrentMonthRange } from '@/services/analyticsService'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/services/types/expenseCategories'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import type {
  DateRange,
  ExpenseGranularity,
  ExpenseAnalyticsData,
  ExpenseChartDataPoint,
  ExpenseDrilldownData,
} from '@/services/types/expenseAnalytics'
import type { ChartType } from './constants'
import { MAX_CATEGORY_STACKS, OTHER_CATEGORY_COLOR } from './constants'
import { useNotificationStore } from '@/store/useNotificationStore'

export interface CategoryInfo {
  code: string
  label: string
  colorHex: string
}

export interface ExpenseTimelineFilters {
  dateRange: DateRange
  propertyIds: string[]
  categories: string[]
  paymentStatuses: string[]
  paidByIds: string[]
  paymentMethods: string[]
  isReimbursable: boolean | null
  isTaxDeductible: boolean | null
  granularity: ExpenseGranularity
  comparison: boolean
}

export interface CrossFilter {
  source: 'timeline' | 'property' | 'category'
  propertyId?: string
  category?: string
  dateRange?: DateRange
}

export function useExpenseTimeline(userId: string) {
  const showNotification = useNotificationStore(s => s.showNotification)

  // --- Filters ---
  const [filters, setFilters] = useState<ExpenseTimelineFilters>(() => ({
    dateRange: getCurrentMonthRange(),
    propertyIds: [],
    categories: [],
    paymentStatuses: [],
    paidByIds: [],
    paymentMethods: [],
    isReimbursable: null,
    isTaxDeductible: null,
    granularity: 'monthly',
    comparison: true,
  }))

  // --- Cross-filter from chart clicks ---
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null)

  // --- Chart controls ---
  const [chartType, setChartType] = useState<ChartType>('bar')

  // --- Data ---
  const [rawData, setRawData] = useState<ExpenseAnalyticsData | null>(null)
  const [userCategories, setUserCategories] = useState<ExpenseCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Drilldown (inline table) ---
  const [drilldownData, setDrilldownData] = useState<ExpenseDrilldownData | null>(null)
  const [drilldownPage, setDrilldownPage] = useState(1)
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false)

  // Debounce refs
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drilldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Effective filters (primary + cross-filter for drilldown) ---
  const effectiveFilters = useMemo(() => {
    const base = { ...filters }
    if (crossFilter?.propertyId) {
      base.propertyIds = [crossFilter.propertyId]
    }
    if (crossFilter?.category) {
      base.categories = [crossFilter.category]
    }
    if (crossFilter?.dateRange) {
      base.dateRange = crossFilter.dateRange
    }
    return base
  }, [filters, crossFilter])

  // --- Category map ---
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryInfo>()
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      map.set(cat.code, { code: cat.code, label: cat.label, colorHex: cat.colorHex })
    }
    for (const cat of userCategories) {
      map.set(cat.code, { code: cat.code, label: cat.label, colorHex: cat.colorHex || '#6B7280' })
    }
    return map
  }, [userCategories])

  // --- Active categories for chart (sorted by sharePct, top N + Other) ---
  const activeCategories = useMemo(() => {
    if (!rawData?.byCategory) return []

    const sorted = [...rawData.byCategory].sort(
      (a, b) => b.current.sharePct - a.current.sharePct
    )

    const result: CategoryInfo[] = []
    let otherPct = 0

    for (let i = 0; i < sorted.length; i++) {
      const cat = sorted[i]
      if (i < MAX_CATEGORY_STACKS) {
        const info = categoryMap.get(cat.category)
        result.push({
          code: cat.category,
          label: info?.label || cat.category,
          colorHex: info?.colorHex || OTHER_CATEGORY_COLOR,
        })
      } else {
        otherPct += cat.current.sharePct
      }
    }

    if (otherPct > 0) {
      result.push({ code: 'OTHER', label: 'Other', colorHex: OTHER_CATEGORY_COLOR })
    }

    return result
  }, [rawData?.byCategory, categoryMap])

  // --- Transform timeline data for chart ---
  const chartData = useMemo((): ExpenseChartDataPoint[] => {
    if (!rawData?.timeline) return []

    return rawData.timeline.map(point => ({
      date: point.date,
      label: formatDateLabel(point.date, filters.granularity),
      totalAmount: point.totalAmount,
      expenseCount: point.expenseCount,
    }))
  }, [rawData, filters.granularity])

  // --- Fetch categories on mount ---
  useEffect(() => {
    if (!userId) return
    getCategoriesByUserId(userId)
      .then(res => {
        if (res.status === 'success') setUserCategories(res.data)
      })
      .catch(() => {})
  }, [userId])

  // --- Fetch analytics on filter change (debounced) ---
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await getExpenseAnalytics({
        dateRange: filters.dateRange,
        propertyIds: filters.propertyIds.length > 0 ? filters.propertyIds : undefined,
        categories: filters.categories.length > 0 ? filters.categories : undefined,
        paymentStatuses: filters.paymentStatuses.length > 0 ? filters.paymentStatuses : undefined,
        paidByIds: filters.paidByIds.length > 0 ? filters.paidByIds : undefined,
        paymentMethods: filters.paymentMethods.length > 0 ? filters.paymentMethods : undefined,
        isReimbursable: filters.isReimbursable,
        isTaxDeductible: filters.isTaxDeductible,
        comparison: filters.comparison,
        granularity: filters.granularity,
      })

      if (res.status === 'success') {
        setRawData(res.data)
      } else {
        setError(res.message || 'Failed to load expense analytics')
        showNotification(res.message || 'Failed to load expense analytics', 'error')
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

  // --- Fetch drilldown (inline table) on effective filters / page change ---
  const fetchDrilldown = useCallback(async () => {
    if (!userId) return
    setIsDrilldownLoading(true)

    try {
      const res = await getExpenseDrilldown({
        dateRange: effectiveFilters.dateRange,
        propertyIds: effectiveFilters.propertyIds.length > 0 ? effectiveFilters.propertyIds : undefined,
        categories: effectiveFilters.categories.length > 0 ? effectiveFilters.categories : undefined,
        paymentStatuses: effectiveFilters.paymentStatuses.length > 0 ? effectiveFilters.paymentStatuses : undefined,
        paidByIds: effectiveFilters.paidByIds.length > 0 ? effectiveFilters.paidByIds : undefined,
        paymentMethods: effectiveFilters.paymentMethods.length > 0 ? effectiveFilters.paymentMethods : undefined,
        isReimbursable: effectiveFilters.isReimbursable,
        isTaxDeductible: effectiveFilters.isTaxDeductible,
        page: drilldownPage,
        limit: 25,
      })

      if (res.status === 'success') {
        setDrilldownData(res.data)
      } else {
        showNotification(res.message || 'Failed to load expense details', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setIsDrilldownLoading(false)
    }
  }, [userId, effectiveFilters, drilldownPage, showNotification])

  useEffect(() => {
    if (drilldownTimeoutRef.current) clearTimeout(drilldownTimeoutRef.current)
    drilldownTimeoutRef.current = setTimeout(fetchDrilldown, 300)
    return () => {
      if (drilldownTimeoutRef.current) clearTimeout(drilldownTimeoutRef.current)
    }
  }, [fetchDrilldown])

  // Reset page when filters or cross-filter change
  useEffect(() => {
    setDrilldownPage(1)
  }, [filters, crossFilter])

  // --- Cross-filter actions ---
  const handleCrossFilter = useCallback((cf: CrossFilter) => {
    setCrossFilter(prev => {
      // Toggle off if clicking same filter
      if (prev?.source === cf.source) {
        if (cf.source === 'property' && prev.propertyId === cf.propertyId) return null
        if (cf.source === 'category' && prev.category === cf.category) return null
        if (cf.source === 'timeline' && prev.dateRange?.startDate === cf.dateRange?.startDate) return null
      }
      return cf
    })
  }, [])

  const clearCrossFilter = useCallback(() => {
    setCrossFilter(null)
  }, [])

  // --- Filter setters ---
  const setDateRange = useCallback((dateRange: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange }))
  }, [])

  const setPropertyIds = useCallback((propertyIds: string[]) => {
    setFilters(prev => ({ ...prev, propertyIds }))
  }, [])

  const setCategories = useCallback((categories: string[]) => {
    setFilters(prev => ({ ...prev, categories }))
  }, [])

  const setPaymentStatuses = useCallback((paymentStatuses: string[]) => {
    setFilters(prev => ({ ...prev, paymentStatuses }))
  }, [])

  const setPaidByIds = useCallback((paidByIds: string[]) => {
    setFilters(prev => ({ ...prev, paidByIds }))
  }, [])

  const setPaymentMethods = useCallback((paymentMethods: string[]) => {
    setFilters(prev => ({ ...prev, paymentMethods }))
  }, [])

  const setIsReimbursable = useCallback((isReimbursable: boolean | null) => {
    setFilters(prev => ({ ...prev, isReimbursable }))
  }, [])

  const setIsTaxDeductible = useCallback((isTaxDeductible: boolean | null) => {
    setFilters(prev => ({ ...prev, isTaxDeductible }))
  }, [])

  const setGranularity = useCallback((granularity: ExpenseGranularity) => {
    setFilters(prev => ({ ...prev, granularity }))
  }, [])

  const toggleComparison = useCallback(() => {
    setFilters(prev => ({ ...prev, comparison: !prev.comparison }))
  }, [])

  return {
    // Filters
    filters,
    setDateRange,
    setPropertyIds,
    setCategories,
    setPaymentStatuses,
    setPaidByIds,
    setPaymentMethods,
    setIsReimbursable,
    setIsTaxDeductible,
    setGranularity,
    toggleComparison,

    // Cross-filter
    crossFilter,
    handleCrossFilter,
    clearCrossFilter,
    effectiveFilters,

    // Chart controls
    chartType,
    setChartType,

    // Data
    chartData,
    rawData,
    categoryMap,
    activeCategories,

    // Drilldown (inline table)
    drilldownData,
    drilldownPage,
    setDrilldownPage,
    isDrilldownLoading,

    // Status
    isLoading,
    error,

    // Actions
    refresh: fetchAnalytics,
  }
}

// --- Helpers ---

export function formatDateLabel(date: string, granularity: ExpenseGranularity): string {
  const d = new Date(date + 'T00:00:00')
  switch (granularity) {
    case 'daily':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'weekly': {
      const weekStart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return weekStart
    }
    case 'monthly':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    default:
      return date
  }
}

export function getPeriodDateRange(date: string, granularity: ExpenseGranularity): DateRange {
  const d = new Date(date + 'T00:00:00')

  switch (granularity) {
    case 'daily':
      return { startDate: date, endDate: date }

    case 'weekly': {
      const monday = new Date(d)
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      monday.setDate(d.getDate() + diff)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return {
        startDate: toDateString(monday),
        endDate: toDateString(sunday),
      }
    }

    case 'monthly': {
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return {
        startDate: toDateString(first),
        endDate: toDateString(last),
      }
    }

    default:
      return { startDate: date, endDate: date }
  }
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}
