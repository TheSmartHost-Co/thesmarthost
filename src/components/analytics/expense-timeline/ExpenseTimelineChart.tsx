'use client'

import { motion } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { ChartBarSquareIcon } from '@heroicons/react/24/solid'
import { useExpenseTimeline, getPeriodDateRange } from './useExpenseTimeline'
import ExpenseTimelineFilters from './ExpenseTimelineFilters'
import ExpenseTimelineRenderer from './ExpenseTimelineRenderer'
import ExpenseKPIRow from './ExpenseKPIRow'
import ExpenseBreakdownRow from './ExpenseBreakdownRow'
import ExpenseInlineTable from './ExpenseInlineTable'
import type { Property } from '@/services/types/property'
import type { ChartType } from './constants'

interface PaidByOption {
  id: string
  name: string
  type: string
}

interface ExpenseTimelineChartProps {
  userId: string
  properties?: Property[]
  paidByOptions?: PaidByOption[]
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

export default function ExpenseTimelineChart({
  userId,
  properties = [],
  paidByOptions = [],
  height = 320,
  className = '',
}: ExpenseTimelineChartProps) {
  const {
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
    crossFilter,
    handleCrossFilter,
    clearCrossFilter,
    chartType,
    setChartType,
    chartData,
    rawData,
    categoryMap,
    drilldownData,
    drilldownPage,
    setDrilldownPage,
    isDrilldownLoading,
    isLoading,
    error,
    refresh,
  } = useExpenseTimeline(userId)

  const handleTimelinePointClick = (date: string) => {
    const dateRange = getPeriodDateRange(date, filters.granularity)
    handleCrossFilter({ source: 'timeline', dateRange })
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {/* ── Premium Dark Header ── */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/25">
              <ChartBarSquareIcon className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Expense Analytics</h3>
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
              className="h-full w-1/3 rounded-full bg-emerald-400"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <ExpenseTimelineFilters
        dateRange={filters.dateRange}
        propertyIds={filters.propertyIds}
        categories={filters.categories}
        paymentStatuses={filters.paymentStatuses}
        paidByIds={filters.paidByIds}
        paymentMethods={filters.paymentMethods}
        isReimbursable={filters.isReimbursable}
        isTaxDeductible={filters.isTaxDeductible}
        granularity={filters.granularity}
        properties={properties}
        categoryMap={categoryMap}
        paidByOptions={paidByOptions}
        onDateRangeChange={setDateRange}
        onPropertyIdsChange={setPropertyIds}
        onCategoriesChange={setCategories}
        onPaymentStatusesChange={setPaymentStatuses}
        onPaidByIdsChange={setPaidByIds}
        onPaymentMethodsChange={setPaymentMethods}
        onIsReimbursableChange={setIsReimbursable}
        onIsTaxDeductibleChange={setIsTaxDeductible}
        onGranularityChange={setGranularity}
      />

      {/* ── KPI Row ── */}
      <ExpenseKPIRow
        portfolio={rawData?.portfolio ?? null}
        isLoading={isLoading}
      />

      {/* ── Timeline Chart ── */}
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
          <ExpenseTimelineRenderer
            data={chartData}
            chartType={chartType}
            granularity={filters.granularity}
            crossFilter={crossFilter}
            onPointClick={handleTimelinePointClick}
            isLoading={isLoading}
            height={height}
          />
        )}
      </div>

      {/* ── Breakdowns (Property + Category side by side) ── */}
      <ExpenseBreakdownRow
        byProperty={rawData?.byProperty ?? []}
        byCategory={rawData?.byCategory ?? []}
        categoryMap={categoryMap}
        crossFilter={crossFilter}
        onCrossFilter={handleCrossFilter}
        isLoading={isLoading}
      />

      {/* ── Inline Expense Table ── */}
      <ExpenseInlineTable
        data={drilldownData}
        isLoading={isDrilldownLoading}
        crossFilter={crossFilter}
        categoryMap={categoryMap}
        onClearCrossFilter={clearCrossFilter}
        onPageChange={setDrilldownPage}
      />
    </div>
  )
}
