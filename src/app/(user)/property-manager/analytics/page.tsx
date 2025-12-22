'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'
import { useUserStore } from '@/store/useUserStore'
import {
  getAnalyticsSummary,
  getAnalyticsTimeseries,
  getAnalyticsBookings
} from '@/services/analyticsService'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { GlobalContextBar } from '@/components/analytics/GlobalContextBar'
import { PerformanceSnapshot } from '@/components/analytics/PerformanceSnapshot'
import { PerformanceExplanation } from '@/components/analytics/PerformanceExplanation'
import { VisualExploration } from '@/components/analytics/VisualExploration'
import { OperationalReality } from '@/components/analytics/OperationalReality'
import { DrillDownSection } from '@/components/analytics/DrillDownSection'

interface SectionProps {
  icon: React.ElementType
  iconGradient: string
  shadowColor: string
  title: string
  description?: string
  delay?: number
  children: React.ReactNode
}

function Section({ icon: Icon, iconGradient, shadowColor, title, description, delay = 0, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${iconGradient} rounded-xl flex items-center justify-center ${shadowColor}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </motion.section>
  )
}

export default function AnalyticsPage() {
  const { profile: userProfile } = useUserStore()
  const {
    filters,
    summaryData,
    timeseriesData,
    bookingsData,
    granularity,
    isLoading,
    errors,
    setSummaryData,
    setTimeseriesData,
    setBookingsData,
    setLoading,
    setError,
    resetData,
    resetErrors
  } = useAnalyticsStore()

  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])

  useEffect(() => {
    const loadProperties = async () => {
      if (!userProfile?.id) return

      try {
        const res = await getProperties(userProfile.id)
        if (res.status === 'success') {
          setAvailableProperties(res.data)
        }
      } catch (error) {
        console.error('Failed to load properties:', error)
      }
    }

    loadProperties()
  }, [userProfile?.id])

  const loadAnalyticsData = async () => {
    if (!userProfile?.id || availableProperties.length === 0) return

    setLoading(true)
    resetErrors()

    const effectiveFilters = {
      ...filters,
      propertyIds: filters.propertyIds.length > 0
        ? filters.propertyIds
        : availableProperties.map(p => p.id)
    }

    try {
      const [summaryResult, timeseriesResult, bookingsResult] = await Promise.allSettled([
        getAnalyticsSummary(effectiveFilters),
        getAnalyticsTimeseries({ ...effectiveFilters, granularity }),
        getAnalyticsBookings({ ...effectiveFilters, page: 1, limit: 20 })
      ])

      if (summaryResult.status === 'fulfilled' && summaryResult.value.success) {
        setSummaryData(summaryResult.value.data)
      } else {
        const error = summaryResult.status === 'rejected'
          ? summaryResult.reason?.message || 'Network error'
          : 'Failed to load summary data'
        setError('summary', error)
        setSummaryData(null)
      }

      if (timeseriesResult.status === 'fulfilled' && timeseriesResult.value.success) {
        setTimeseriesData(timeseriesResult.value.data)
      } else {
        const error = timeseriesResult.status === 'rejected'
          ? timeseriesResult.reason?.message || 'Network error'
          : 'Failed to load timeseries data'
        setError('timeseries', error)
        setTimeseriesData(null)
      }

      if (bookingsResult.status === 'fulfilled' && bookingsResult.value.success) {
        setBookingsData(bookingsResult.value.data)
      } else {
        const error = bookingsResult.status === 'rejected'
          ? bookingsResult.reason?.message || 'Network error'
          : 'Failed to load bookings data'
        setError('bookings', error)
        setBookingsData(null)
      }
    } catch (error) {
      console.error('Unexpected error in loadAnalyticsData:', error)
    } finally {
      setLoading(false)
      setHasInitialLoad(true)
    }
  }

  useEffect(() => {
    if (!hasInitialLoad && availableProperties.length > 0) {
      loadAnalyticsData()
    }
  }, [userProfile?.id, hasInitialLoad, availableProperties])

  useEffect(() => {
    if (hasInitialLoad && availableProperties.length > 0) {
      loadAnalyticsData()
    }
  }, [filters, granularity, availableProperties])

  const handleFiltersChange = () => {
    resetData()
    loadAnalyticsData()
  }

  if (!userProfile?.id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25"
          >
            <ChartBarIcon className="w-8 h-8 text-white" />
          </motion.div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-gray-500">Loading your analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Track performance and gain insights across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl"
          >
            <SparklesIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              {availableProperties.length} {availableProperties.length === 1 ? 'Property' : 'Properties'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Global Context Bar - STICKY Filter Card */}
      <div className="sticky top-0 z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg shadow-gray-500/25">
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Filters & Date Range</h2>
                <p className="text-xs text-gray-500">Customize your analytics view</p>
              </div>
            </div>
          </div>
          <div className="px-4">
            <GlobalContextBar onFiltersChange={handleFiltersChange} />
          </div>
        </motion.div>
      </div>

      {/* 1. Performance Snapshot */}
      <Section
        icon={CurrencyDollarIcon}
        iconGradient="bg-gradient-to-br from-green-500 to-emerald-600"
        shadowColor="shadow-lg shadow-green-500/25"
        title="Performance Snapshot"
        description="Key metrics at a glance"
        delay={0.15}
      >
        <PerformanceSnapshot
          data={summaryData}
          isLoading={isLoading}
          error={errors.summary}
        />
      </Section>

      {/* 2. Performance Explanation */}
      <Section
        icon={ArrowTrendingUpIcon}
        iconGradient="bg-gradient-to-br from-blue-500 to-blue-600"
        shadowColor="shadow-lg shadow-blue-500/25"
        title="Performance Breakdown"
        description="Understanding your numbers"
        delay={0.2}
      >
        <PerformanceExplanation
          data={summaryData}
          isLoading={isLoading}
          error={errors.summary}
        />
      </Section>

      {/* 3. Visual Exploration */}
      <Section
        icon={ChartPieIcon}
        iconGradient="bg-gradient-to-br from-purple-500 to-purple-600"
        shadowColor="shadow-lg shadow-purple-500/25"
        title="Visual Exploration"
        description="Charts and trends"
        delay={0.25}
      >
        <VisualExploration
          summaryData={summaryData}
          timeseriesData={timeseriesData}
          isLoading={isLoading}
          timeseriesError={errors.timeseries}
          summaryError={errors.summary}
        />
      </Section>

      {/* 4. Operational Reality */}
      <Section
        icon={CalendarDaysIcon}
        iconGradient="bg-gradient-to-br from-amber-500 to-orange-600"
        shadowColor="shadow-lg shadow-amber-500/25"
        title="Operational Reality"
        description="Day-to-day operations"
        delay={0.3}
      >
        <OperationalReality
          data={bookingsData}
          isLoading={isLoading}
          error={errors.bookings}
        />
      </Section>

      {/* 5. Drill-Down Section */}
      <Section
        icon={ClipboardDocumentListIcon}
        iconGradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
        shadowColor="shadow-lg shadow-indigo-500/25"
        title="Booking Details"
        description="Individual booking data"
        delay={0.35}
      >
        <DrillDownSection
          data={bookingsData}
          isLoading={isLoading}
          error={errors.bookings}
          onLoadMore={() => {
            // Handle pagination if needed
          }}
        />
      </Section>

      {/* Footer spacer */}
      <div className="h-4" />
    </div>
  )
}
