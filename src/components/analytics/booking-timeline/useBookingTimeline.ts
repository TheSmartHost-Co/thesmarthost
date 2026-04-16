'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getBookingAnalytics, getBookingDrilldown } from '@/services/bookingAnalyticsService'
import { getCurrentMonthRange } from '@/services/analyticsService'
import type {
  DateRange,
  BookingGranularity,
  BookingAnalyticsData,
  BookingChartDataPoint,
  BookingDrilldownData,
  MetricDescription,
} from '@/services/types/bookingAnalytics'
import type { BreakdownTab, ChartType, TimelineMetric } from './constants'
import { useNotificationStore } from '@/store/useNotificationStore'

export interface BookingTimelineFilters {
  dateRange: DateRange
  propertyIds: string[]
  channels: string[]
  clientIds: string[]
  sources: string[]
  financialReadiness: string[]
  bookingStatus: string[]
  granularity: BookingGranularity
  comparison: boolean
}

export interface CrossFilter {
  source: 'timeline' | 'property' | 'channel' | 'sourceType' | 'client'
  propertyId?: string
  channel?: string
  sourceValue?: string
  clientId?: string
  dateRange?: DateRange
}

export function useBookingTimeline(userId: string) {
  const showNotification = useNotificationStore(s => s.showNotification)

  // --- Filters ---
  const [filters, setFilters] = useState<BookingTimelineFilters>(() => ({
    dateRange: getCurrentMonthRange(),
    propertyIds: [],
    channels: [],
    clientIds: [],
    sources: [],
    financialReadiness: [],
    bookingStatus: [],
    granularity: 'monthly',
    comparison: true,
  }))

  // --- Cross-filter from chart clicks ---
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null)

  // --- Chart controls ---
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [timelineMetric, setTimelineMetric] = useState<TimelineMetric>('total_payout')

  // --- Breakdown tab ---
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<BreakdownTab>('property')

  // --- Data ---
  const [rawData, setRawData] = useState<BookingAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Drilldown (inline table) ---
  const [drilldownData, setDrilldownData] = useState<BookingDrilldownData | null>(null)
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
    if (crossFilter?.channel) {
      base.channels = [crossFilter.channel]
    }
    if (crossFilter?.sourceValue) {
      base.sources = [crossFilter.sourceValue]
    }
    if (crossFilter?.clientId) {
      base.clientIds = [crossFilter.clientId]
    }
    if (crossFilter?.dateRange) {
      base.dateRange = crossFilter.dateRange
    }
    return base
  }, [filters, crossFilter])

  // --- Metric descriptions from API meta ---
  const metricDescriptions = useMemo((): Record<string, MetricDescription> => {
    return rawData?.meta?.metricDescriptions ?? {}
  }, [rawData?.meta?.metricDescriptions])

  // --- Transform timeline data for chart ---
  const chartData = useMemo((): BookingChartDataPoint[] => {
    if (!rawData?.timeline) return []

    return rawData.timeline.map(point => ({
      date: point.date,
      label: formatDateLabel(point.date, filters.granularity),
      total_payout: point.total_payout,
      net_earnings: point.net_earnings,
      booking_count: point.booking_count,
      total_nights: point.total_nights,
      avg_nightly_rate: point.avg_nightly_rate,
    }))
  }, [rawData, filters.granularity])

  // --- Fetch analytics on filter change (debounced) ---
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await getBookingAnalytics({
        dateRange: filters.dateRange,
        propertyIds: filters.propertyIds.length > 0 ? filters.propertyIds : undefined,
        channels: filters.channels.length > 0 ? filters.channels : undefined,
        clientIds: filters.clientIds.length > 0 ? filters.clientIds : undefined,
        sources: filters.sources.length > 0 ? filters.sources : undefined,
        financialReadiness: filters.financialReadiness.length > 0 ? filters.financialReadiness : undefined,
        bookingStatus: filters.bookingStatus.length > 0 ? filters.bookingStatus : undefined,
        comparison: filters.comparison,
        granularity: filters.granularity,
      })

      if (res.status === 'success') {
        setRawData(res.data)
      } else {
        setError(res.message || 'Failed to load booking analytics')
        showNotification(res.message || 'Failed to load booking analytics', 'error')
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
      const res = await getBookingDrilldown({
        dateRange: effectiveFilters.dateRange,
        propertyIds: effectiveFilters.propertyIds.length > 0 ? effectiveFilters.propertyIds : undefined,
        channels: effectiveFilters.channels.length > 0 ? effectiveFilters.channels : undefined,
        clientIds: effectiveFilters.clientIds.length > 0 ? effectiveFilters.clientIds : undefined,
        sources: effectiveFilters.sources.length > 0 ? effectiveFilters.sources : undefined,
        financialReadiness: effectiveFilters.financialReadiness.length > 0 ? effectiveFilters.financialReadiness : undefined,
        bookingStatus: effectiveFilters.bookingStatus.length > 0 ? effectiveFilters.bookingStatus : undefined,
        page: drilldownPage,
        limit: 25,
      })

      if (res.status === 'success') {
        setDrilldownData(res.data)
      } else {
        showNotification(res.message || 'Failed to load booking details', 'error')
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
      if (prev?.source === cf.source) {
        if (cf.source === 'property' && prev.propertyId === cf.propertyId) return null
        if (cf.source === 'channel' && prev.channel === cf.channel) return null
        if (cf.source === 'sourceType' && prev.sourceValue === cf.sourceValue) return null
        if (cf.source === 'client' && prev.clientId === cf.clientId) return null
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

  const setChannels = useCallback((channels: string[]) => {
    setFilters(prev => ({ ...prev, channels }))
  }, [])

  const setClientIds = useCallback((clientIds: string[]) => {
    setFilters(prev => ({ ...prev, clientIds }))
  }, [])

  const setSources = useCallback((sources: string[]) => {
    setFilters(prev => ({ ...prev, sources }))
  }, [])

  const setFinancialReadiness = useCallback((financialReadiness: string[]) => {
    setFilters(prev => ({ ...prev, financialReadiness }))
  }, [])

  const setBookingStatus = useCallback((bookingStatus: string[]) => {
    setFilters(prev => ({ ...prev, bookingStatus }))
  }, [])

  const setGranularity = useCallback((granularity: BookingGranularity) => {
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
    setChannels,
    setClientIds,
    setSources,
    setFinancialReadiness,
    setBookingStatus,
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
    timelineMetric,
    setTimelineMetric,

    // Breakdown
    activeBreakdownTab,
    setActiveBreakdownTab,

    // Data
    chartData,
    rawData,
    metricDescriptions,

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

export function formatDateLabel(date: string, granularity: BookingGranularity): string {
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

export function getPeriodDateRange(date: string, granularity: BookingGranularity): DateRange {
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
