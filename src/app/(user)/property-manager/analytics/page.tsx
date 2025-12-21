'use client'

import { useEffect, useState } from 'react'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading user profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Context Bar - Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlobalContextBar onFiltersChange={handleFiltersChange} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* 1. Performance Snapshot */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Snapshot</h2>
          <PerformanceSnapshot 
            data={summaryData} 
            isLoading={isLoading}
            error={errors.summary}
          />
        </section>

        {/* 2. Performance Explanation */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Explanation</h2>
          <PerformanceExplanation 
            data={summaryData}
            isLoading={isLoading}
            error={errors.summary}
          />
        </section>

        {/* 3. Visual Exploration */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Visual Exploration</h2>
          <VisualExploration 
            summaryData={summaryData}
            timeseriesData={timeseriesData}
            isLoading={isLoading}
            timeseriesError={errors.timeseries}
            summaryError={errors.summary}
          />
        </section>

        {/* 4. Operational Reality */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Operational Reality</h2>
          <OperationalReality 
            data={bookingsData}
            isLoading={isLoading}
            error={errors.bookings}
          />
        </section>

        {/* 5. Drill-Down Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Booking Details</h2>
          <DrillDownSection 
            data={bookingsData}
            isLoading={isLoading}
            error={errors.bookings}
            onLoadMore={(page) => {
              // Handle pagination if needed
            }}
          />
        </section>
      </div>
    </div>
  )
}