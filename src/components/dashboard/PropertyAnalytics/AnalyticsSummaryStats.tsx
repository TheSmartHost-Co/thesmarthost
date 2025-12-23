'use client'

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface AggregateSummary {
  totalRevenue: number
  totalPayout: number
  totalBookings: number
  avgRevenuePerProperty: number
  avgPayoutPerProperty: number
  topPerformer: {
    propertyId: string
    propertyName: string
    revenue: number
  } | null
}

interface TrendData {
  revenue: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
  payout: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
  bookings: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
  adr: { change: number; changePct: number; direction: 'up' | 'down' | 'flat' }
}

interface AnalyticsSummaryStatsProps {
  aggregate: AggregateSummary
  trend: TrendData
  activeMetric: 'revenue' | 'payout' | 'bookings' | 'adr'
  selectedPropertyCount: number
}

export function AnalyticsSummaryStats({
  aggregate,
  trend,
  activeMetric,
  selectedPropertyCount
}: AnalyticsSummaryStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-CA').format(value)
  }

  const formatPercent = (value: number) => {
    if (!isFinite(value)) return 'N/A'
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getMetricDisplay = () => {
    switch (activeMetric) {
      case 'revenue':
        return {
          label: 'Total Revenue',
          value: formatCurrency(aggregate.totalRevenue),
          avgLabel: 'Avg per Property',
          avgValue: formatCurrency(aggregate.avgRevenuePerProperty),
          trend: trend.revenue
        }
      case 'payout':
        return {
          label: 'Total Payout',
          value: formatCurrency(aggregate.totalPayout),
          avgLabel: 'Avg per Property',
          avgValue: formatCurrency(aggregate.avgPayoutPerProperty),
          trend: trend.payout
        }
      case 'bookings':
        return {
          label: 'Total Bookings',
          value: formatNumber(aggregate.totalBookings),
          avgLabel: 'Avg per Property',
          avgValue: (aggregate.totalBookings / (selectedPropertyCount || 1)).toFixed(1),
          trend: trend.bookings
        }
      case 'adr':
        return {
          label: 'Average Nightly Rate',
          value: formatCurrency(trend.adr.change / (selectedPropertyCount || 1)),
          avgLabel: 'Overall ADR',
          avgValue: formatCurrency(trend.adr.change / (selectedPropertyCount || 1)),
          trend: trend.adr
        }
    }
  }

  const metricDisplay = getMetricDisplay()
  const TrendIcon = metricDisplay.trend.direction === 'up'
    ? ArrowTrendingUpIcon
    : ArrowTrendingDownIcon

  const trendColor = metricDisplay.trend.direction === 'up'
    ? 'text-green-600'
    : metricDisplay.trend.direction === 'down'
    ? 'text-red-600'
    : 'text-gray-600'

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Total */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-700 font-medium mb-1">
            {metricDisplay.label}
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {metricDisplay.value}
          </div>
          {metricDisplay.trend.changePct !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{formatPercent(metricDisplay.trend.changePct)} vs previous period</span>
            </div>
          )}
        </div>

        {/* Average per Property */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-purple-700 font-medium mb-1">
            {metricDisplay.avgLabel}
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {metricDisplay.avgValue}
          </div>
          <div className="text-xs text-purple-600 mt-2">
            Across {selectedPropertyCount || 'all'} {selectedPropertyCount === 1 ? 'property' : 'properties'}
          </div>
        </div>

        {/* Top Performer */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="text-sm text-amber-700 font-medium mb-1">
            Top Performer
          </div>
          <div className="text-lg font-bold text-amber-900 truncate">
            {aggregate.topPerformer?.propertyName || '-'}
          </div>
          <div className="text-sm text-amber-700 mt-2">
            {formatCurrency(aggregate.topPerformer?.revenue || 0)} revenue
          </div>
        </div>
      </div>
    </div>
  )
}
