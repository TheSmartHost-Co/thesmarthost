'use client'

import { motion } from 'framer-motion'
import { useCallback } from 'react'
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { useCleanerTimeline } from './useCleanerTimeline'
import CleanerTimelineFilters, { type CleanerOption } from './CleanerTimelineFilters'
import SpendKPIStrip from './SpendKPIStrip'
import WorkloadKPIStrip from './WorkloadKPIStrip'
import SpendTimelineChart from './SpendTimelineChart'
import WorkloadChart from './WorkloadChart'
import BreakdownTable from './BreakdownTable'
import type { Property } from '@/services/types/property'
import type { InvoiceStatus } from '@/services/types/cleanerAnalytics'
import type { AnalyticsTab } from './constants'

interface CleanerAnalyticsWidgetProps {
  userId: string
  properties?: Property[]
  cleaners?: CleanerOption[]
  height?: number
  className?: string
}

const TAB_OPTIONS: { value: AnalyticsTab; label: string; icon: React.ReactNode }[] = [
  {
    value: 'spend',
    label: 'Spend',
    icon: <BanknotesIcon className="h-3.5 w-3.5" />,
  },
  {
    value: 'workload',
    label: 'Workload',
    icon: <ClipboardDocumentListIcon className="h-3.5 w-3.5" />,
  },
]

export default function CleanerAnalyticsWidget({
  userId,
  properties = [],
  cleaners = [],
  height = 320,
  className = '',
}: CleanerAnalyticsWidgetProps) {
  const {
    activeTab,
    setActiveTab,
    breakdownView,
    setBreakdownView,
    showProjections,
    toggleProjections,
    filters,
    setDateRange,
    setCleanerId,
    setPropertyIds,
    setStatuses,
    setInvoiceStatuses,
    setGranularity,
    clearFilters,
    hasActiveFilters,
    rawData,
    spendChartData,
    overdueTotals,
    workloadBars,
    activeCleaners,
    lineItems,
    lineItemsLoading,
    fetchLineItems,
    isLoading,
    error,
    refresh,
  } = useCleanerTimeline(userId)

  const portfolio = rawData?.portfolio ?? null
  const meta = rawData?.meta ?? null

  const handleKPIClick = useCallback(
    (status: InvoiceStatus | 'upcoming') => {
      if (status === 'upcoming') {
        // Line-items endpoint is completed-only, so filter main analytics to pending/confirmed
        setInvoiceStatuses([])
        setStatuses(['pending', 'confirmed'])
      } else {
        // Toggle: if same filter is active, clear it
        if (filters.invoiceStatuses.length === 1 && filters.invoiceStatuses[0] === status) {
          setInvoiceStatuses([])
        } else {
          setInvoiceStatuses([status])
          setStatuses([]) // Clear status filter when filtering by invoice status
        }
      }
    },
    [filters.invoiceStatuses, setInvoiceStatuses, setStatuses]
  )

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 shadow-lg shadow-teal-500/25">
              <BanknotesIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Cleaner Analytics</h3>
              <p className="text-[10px] text-slate-400">Spend &amp; workload</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Tab toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5">
            {TAB_OPTIONS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Projections toggle — only on Spend tab */}
          {activeTab === 'spend' && (
            <button
              onClick={toggleProjections}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                showProjections
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">{showProjections ? 'Projections ON' : 'Show Projections'}</span>
              <span className="sm:hidden">{showProjections ? 'Proj ON' : 'Proj'}</span>
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded-lg bg-white/10 p-1.5 text-slate-300 transition-all hover:bg-white/20 hover:text-white disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading && (
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full w-1/3 rounded-full bg-teal-400"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <CleanerTimelineFilters
        dateRange={filters.dateRange}
        cleanerId={filters.cleanerId}
        propertyIds={filters.propertyIds}
        statuses={filters.statuses}
        invoiceStatuses={filters.invoiceStatuses}
        granularity={filters.granularity}
        properties={properties}
        cleaners={cleaners}
        hasActiveFilters={hasActiveFilters}
        onDateRangeChange={setDateRange}
        onCleanerIdChange={setCleanerId}
        onPropertyIdsChange={setPropertyIds}
        onStatusesChange={setStatuses}
        onInvoiceStatusesChange={setInvoiceStatuses}
        onGranularityChange={setGranularity}
        onClearFilters={clearFilters}
      />

      {/* ── KPI Strip ── */}
      {portfolio && (
        <div className="border-b border-gray-100">
          {activeTab === 'spend' ? (
            <SpendKPIStrip
              portfolio={portfolio}
              metricDescriptions={meta?.metricDescriptions ?? {}}
              showProjections={showProjections}
              onCardClick={handleKPIClick}
              activeInvoiceStatuses={filters.invoiceStatuses}
              overdueTotals={overdueTotals}
            />
          ) : (
            <WorkloadKPIStrip portfolio={portfolio} />
          )}
        </div>
      )}

      {/* ── Chart ── */}
      <div className="px-4 pb-4 pt-2">
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
        ) : activeTab === 'spend' ? (
          <SpendTimelineChart
            data={spendChartData}
            byCleaner={rawData?.byCleaner ?? []}
            granularity={filters.granularity}
            isLoading={isLoading}
            height={height}
          />
        ) : (
          <WorkloadChart
            bars={workloadBars}
            activeCleaners={activeCleaners}
            isLoading={isLoading}
            height={height}
          />
        )}
      </div>

      {/* ── Breakdown Table ── */}
      {rawData && (
        <BreakdownTable
          activeTab={activeTab}
          breakdownView={breakdownView}
          onBreakdownViewChange={setBreakdownView}
          byCleaner={rawData.byCleaner}
          byProperty={rawData.byProperty}
          portfolio={rawData.portfolio}
          showProjections={activeTab === 'spend' && showProjections}
          lineItems={lineItems}
          lineItemsLoading={lineItemsLoading}
          onFetchLineItems={fetchLineItems}
          dateRange={filters.dateRange}
        />
      )}
    </div>
  )
}
