'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { PropertySelector } from './PropertySelector'
import { PropertyAnalyticsChart } from './PropertyAnalyticsChart'
import { AnalyticsSummaryStats } from './AnalyticsSummaryStats'
import { getAnalyticsTimeseries } from '@/services/analyticsService'
import type { Property } from '@/services/types/property'
import type { AnalyticsTimeseriesData } from '@/store/useAnalyticsStore'

interface PropertyAnalyticsSectionProps {
  availableProperties: Property[]
  userId: string
}

type TimeRangeOption = '3mo' | '6mo' | '12mo'
type GranularityOption = 'daily' | 'weekly' | 'monthly'
type MetricType = 'revenue' | 'payout' | 'bookings' | 'adr'

export function PropertyAnalyticsSection({
  availableProperties,
  userId
}: PropertyAnalyticsSectionProps) {
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('6mo')
  const [granularity, setGranularity] = useState<GranularityOption>('monthly')
  const [activeMetric, setActiveMetric] = useState<MetricType>('revenue')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsTimeseriesData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = (range: TimeRangeOption) => {
    const endDate = new Date()
    const startDate = new Date()

    switch (range) {
      case '3mo':
        startDate.setMonth(startDate.getMonth() - 3)
        break
      case '6mo':
        startDate.setMonth(startDate.getMonth() - 6)
        break
      case '12mo':
        startDate.setMonth(startDate.getMonth() - 12)
        break
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { startDate, endDate } = getDateRange(timeRange)

      const result = await getAnalyticsTimeseries({
        propertyIds: selectedPropertyIds,
        startDate,
        endDate,
        granularity,
        platforms: []
      })

      if (result.status === 'success' && result.data) {
        setAnalyticsData(result.data)
      } else {
        setError('Failed to load analytics data')
      }
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId && availableProperties.length > 0) {
      loadAnalyticsData()
    }
  }, [userId, selectedPropertyIds, timeRange, granularity, availableProperties])

  const handlePropertySelectionChange = (propertyIds: string[]) => {
    setSelectedPropertyIds(propertyIds)
  }

  const activePropertyCount = selectedPropertyIds.length === 0
    ? availableProperties.length
    : selectedPropertyIds.length

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Property Analytics</h2>
            <p className="text-sm text-gray-500 mt-0.5">Compare performance across your portfolio</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRangeOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="3mo">Last 3 months</option>
              <option value="6mo">Last 6 months</option>
              <option value="12mo">Last 12 months</option>
            </select>
          </div>

          {/* Granularity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Granularity
            </label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as GranularityOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Placeholder for alignment */}
          <div></div>
        </div>

        {/* Property Selector */}
        <PropertySelector
          properties={availableProperties}
          selectedPropertyIds={selectedPropertyIds}
          onSelectionChange={handlePropertySelectionChange}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Chart */}
        <PropertyAnalyticsChart
          properties={analyticsData?.properties || []}
          isLoading={isLoading}
          onMetricChange={setActiveMetric}
        />

        {/* Summary Stats */}
        {analyticsData && !isLoading && (
          <AnalyticsSummaryStats
            aggregate={analyticsData.aggregate}
            trend={analyticsData.trend}
            activeMetric={activeMetric}
            selectedPropertyCount={activePropertyCount}
          />
        )}
      </div>
    </motion.section>
  )
}
