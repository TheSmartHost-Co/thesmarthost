'use client'

import { useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'
import { getAnalytics } from '@/services/analyticsService'
import type { Property } from '@/services/types/property'

// Shared components
import { KPIGrid, KPIGridCompact } from './shared/KPIGrid'
import { TimelineChart, TimelineChartCompact } from './shared/TimelineChart'
import { BreakdownTabs } from './shared/BreakdownTabs'
import { AIInsightsCard } from './shared/AIInsightsCard'
import { AnalyticsFilters } from './shared/AnalyticsFilters'
import { DrillDownModal } from './DrillDownModal'

interface AnalyticsWidgetProps {
  properties: Property[]
  compact?: boolean
  showFilters?: boolean
  showBreakdowns?: boolean
  showAIInsights?: boolean
  showTimeline?: boolean
  stickyFilters?: boolean
  className?: string
}

export function AnalyticsWidget({
  properties,
  compact = false,
  showFilters = true,
  showBreakdowns = true,
  showAIInsights = true,
  showTimeline = true,
  stickyFilters = false,
  className = '',
}: AnalyticsWidgetProps) {
  const {
    filters,
    granularity,
    analyticsData,
    isLoading,
    error,
    drillDown,
    setAnalyticsData,
    setLoading,
    setError,
    setDrillDown,
    clearDrillDown,
  } = useAnalyticsStore()

  const [showDrillDown, setShowDrillDown] = useState(false)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!properties || properties.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const request = {
        dateRange: filters?.dateRange,
        propertyIds: filters?.propertyIds?.length > 0 ? filters.propertyIds : undefined,
        channels: filters?.channels?.length > 0 ? filters.channels : undefined,
        comparison: filters?.comparison ?? true,
        granularity,
      }

      console.log('Fetching analytics with request:', request)
      const res = await getAnalytics(request)
      console.log('Analytics response:', res)

      if (res.status === 'success') {
        setAnalyticsData(res.data)
      } else {
        setError(res.message || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }, [properties?.length, filters?.dateRange?.startDate, filters?.dateRange?.endDate, filters?.propertyIds, filters?.channels, filters?.comparison, granularity, setAnalyticsData, setLoading, setError])

  // Initial load only - runs once when properties are available
  useEffect(() => {
    if (!hasInitialLoad && properties && properties.length > 0) {
      setHasInitialLoad(true)
      fetchAnalytics()
    }
  }, [properties])

  // Handle drill-down
  const handlePropertyClick = (propertyId: string, propertyName: string) => {
    setDrillDown({ type: 'property', propertyId, propertyName })
    setShowDrillDown(true)
  }

  const handleChannelClick = (channel: string) => {
    setDrillDown({ type: 'channel', channel })
    setShowDrillDown(true)
  }

  const handleTimelineClick = (point: any) => {
    if (point?.date) {
      setDrillDown({ type: 'date', date: point.date })
      setShowDrillDown(true)
    }
  }

  const handleCloseDrillDown = () => {
    setShowDrillDown(false)
    clearDrillDown()
  }

  // Extract unique channels from data
  const availableChannels = analyticsData?.byChannel?.map((c) => c.channel) || []

  // Loading state
  if (isLoading && !analyticsData) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="animate-pulse flex gap-4">
              <div className="h-10 w-40 bg-gray-200 rounded-xl" />
              <div className="h-10 w-32 bg-gray-200 rounded-xl" />
              <div className="h-10 w-32 bg-gray-200 rounded-xl" />
            </div>
          </div>
        )}
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25"
            >
              <ChartBarIcon className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !analyticsData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-red-200 bg-red-50/50">
          <p className="text-red-600 font-medium">Error loading analytics</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // No data state
  if (!analyticsData && hasInitialLoad) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <AnalyticsFilters
              properties={properties}
              channels={availableChannels}
              onFiltersChange={fetchAnalytics}
              compact={compact}
            />
          </div>
        )}
        <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <p className="text-gray-500">No analytics data available for the selected period</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div
          className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${
            stickyFilters ? 'sticky top-0 z-20' : ''
          }`}
        >
          <div className="px-4">
            <AnalyticsFilters
              properties={properties}
              channels={availableChannels.length > 0 ? availableChannels : undefined}
              onFiltersChange={fetchAnalytics}
              compact={compact}
            />
          </div>
          {isLoading && (
            <div className="h-0.5 bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      {compact ? (
        <KPIGridCompact data={analyticsData?.portfolio || null} isLoading={isLoading} />
      ) : (
        <KPIGrid data={analyticsData?.portfolio || null} isLoading={isLoading} />
      )}

      {/* Timeline Chart */}
      {showTimeline && (
        compact ? (
          <TimelineChartCompact
            data={analyticsData?.timeline || []}
            granularity={granularity}
            isLoading={isLoading}
          />
        ) : (
          <TimelineChart
            data={analyticsData?.timeline || []}
            granularity={granularity}
            isLoading={isLoading}
            onPointClick={handleTimelineClick}
          />
        )
      )}

      {/* AI Insights - placed below charts as requested */}
      {showAIInsights && !compact && (
        <AIInsightsCard />
      )}

      {/* Breakdowns */}
      {showBreakdowns && !compact && (
        <BreakdownTabs
          byProperty={analyticsData?.byProperty || []}
          byChannel={analyticsData?.byChannel || []}
          isLoading={isLoading}
          onPropertyClick={handlePropertyClick}
          onChannelClick={handleChannelClick}
        />
      )}

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={showDrillDown}
        onClose={handleCloseDrillDown}
      />
    </div>
  )
}

// Export compact version for dashboard
export function AnalyticsWidgetCompact({ properties, className = '' }: { properties: Property[]; className?: string }) {
  return (
    <AnalyticsWidget
      properties={properties}
      compact={true}
      showFilters={false}
      showBreakdowns={false}
      showAIInsights={false}
      showTimeline={true}
      className={className}
    />
  )
}
