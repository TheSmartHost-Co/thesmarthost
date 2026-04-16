'use client'

import { motion } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { ChartBarSquareIcon } from '@heroicons/react/24/solid'
import { useBookingTimeline, getPeriodDateRange } from './useBookingTimeline'
import BookingTimelineFilters from './BookingTimelineFilters'
import BookingTimelineRenderer from './BookingTimelineRenderer'
import BookingKPIRow from './BookingKPIRow'
import BookingBreakdownTabs from './BookingBreakdownTabs'
import BookingInlineTable from './BookingInlineTable'
import type { Property } from '@/services/types/property'
import type { ChartType } from './constants'

interface ClientOption {
  id: string
  name: string
}

interface BookingTimelineChartProps {
  userId: string
  properties?: Property[]
  clients?: ClientOption[]
  height?: number
  className?: string
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'bar',
    label: 'Bar',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <rect x="1" y="8" width="4" height="7" rx="1" />
        <rect x="6" y="4" width="4" height="11" rx="1" />
        <rect x="11" y="1" width="4" height="14" rx="1" />
      </svg>
    ),
  },
  {
    value: 'area',
    label: 'Area',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M1 12 L4 7 L8 9 L12 3 L15 5 L15 15 L1 15 Z" opacity="0.4" />
        <path d="M1 12 L4 7 L8 9 L12 3 L15 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

export default function BookingTimelineChart({
  userId,
  properties = [],
  clients = [],
  height = 320,
  className = '',
}: BookingTimelineChartProps) {
  const {
    filters,
    setDateRange,
    setPropertyIds,
    setChannels,
    setClientIds,
    setSources,
    setFinancialReadiness,
    setBookingStatus,
    setGranularity,
    crossFilter,
    handleCrossFilter,
    clearCrossFilter,
    chartType,
    setChartType,
    timelineMetric,
    setTimelineMetric,
    activeBreakdownTab,
    setActiveBreakdownTab,
    chartData,
    rawData,
    metricDescriptions,
    drilldownData,
    setDrilldownPage,
    isDrilldownLoading,
    isLoading,
    error,
    refresh,
  } = useBookingTimeline(userId)

  const handleTimelinePointClick = (date: string) => {
    const dateRange = getPeriodDateRange(date, filters.granularity)
    handleCrossFilter({ source: 'timeline', dateRange })
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {/* Premium Dark Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/25">
              <ChartBarSquareIcon className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Booking Analytics</h3>
              <p className="text-[10px] text-gray-400">KPIs, timeline &amp; breakdowns</p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Chart Type Toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5">
            {CHART_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setChartType(opt.value)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  chartType === opt.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
                title={opt.label}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded-lg bg-white/10 p-1.5 text-gray-300 transition-all hover:bg-white/20 hover:text-white disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading bar */}
        {isLoading && (
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full w-1/3 rounded-full bg-blue-400"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <BookingTimelineFilters
        dateRange={filters.dateRange}
        propertyIds={filters.propertyIds}
        channels={filters.channels}
        clientIds={filters.clientIds}
        sources={filters.sources}
        financialReadiness={filters.financialReadiness}
        bookingStatus={filters.bookingStatus}
        granularity={filters.granularity}
        properties={properties}
        clients={clients}
        onDateRangeChange={setDateRange}
        onPropertyIdsChange={setPropertyIds}
        onChannelsChange={setChannels}
        onClientIdsChange={setClientIds}
        onSourcesChange={setSources}
        onFinancialReadinessChange={setFinancialReadiness}
        onBookingStatusChange={setBookingStatus}
        onGranularityChange={setGranularity}
      />

      {/* KPI Row */}
      <BookingKPIRow
        portfolio={rawData?.portfolio ?? null}
        metricDescriptions={metricDescriptions}
        isLoading={isLoading}
      />

      {/* Timeline Chart */}
      <div className="px-4 pb-4">
        {error && !isLoading ? (
          <div
            style={{ height }}
            className="flex items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50/50"
          >
            <div className="text-center">
              <p className="text-sm font-medium text-red-600">Failed to load</p>
              <p className="mt-1 text-xs text-red-400">{error}</p>
              <button
                onClick={refresh}
                className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <BookingTimelineRenderer
            data={chartData}
            chartType={chartType}
            timelineMetric={timelineMetric}
            onMetricChange={setTimelineMetric}
            crossFilter={crossFilter}
            onPointClick={handleTimelinePointClick}
            isLoading={isLoading}
            height={height}
          />
        )}
      </div>

      {/* Breakdowns (4-tab) */}
      <BookingBreakdownTabs
        byProperty={rawData?.byProperty ?? []}
        byChannel={rawData?.byChannel ?? []}
        bySource={rawData?.bySource ?? []}
        byClient={rawData?.byClient ?? []}
        crossFilter={crossFilter}
        onCrossFilter={handleCrossFilter}
        activeTab={activeBreakdownTab}
        onTabChange={setActiveBreakdownTab}
        isLoading={isLoading}
      />

      {/* Inline Booking Table */}
      <BookingInlineTable
        data={drilldownData}
        isLoading={isDrilldownLoading}
        crossFilter={crossFilter}
        onClearCrossFilter={clearCrossFilter}
        onPageChange={setDrilldownPage}
      />
    </div>
  )
}
