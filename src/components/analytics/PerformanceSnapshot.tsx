'use client'

import type { AnalyticsSummaryData } from '@/store/useAnalyticsStore'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface PerformanceSnapshotProps {
  data: AnalyticsSummaryData | null
  isLoading: boolean
  error: string | null
}

interface MetricCardProps {
  title: string
  value: string
  change?: number
  changeText?: string
  isPositive?: boolean
  isLoading: boolean
}

function MetricCard({ title, value, change, changeText, isPositive, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      
      {changeText && (
        <div className={`flex items-center text-sm ${
          isPositive === true ? 'text-green-600' : 
          isPositive === false ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {isPositive === true && <ArrowUpIcon className="w-4 h-4 mr-1" />}
          {isPositive === false && <ArrowDownIcon className="w-4 h-4 mr-1" />}
          <span>{changeText}</span>
        </div>
      )}
    </div>
  )
}

export function PerformanceSnapshot({ data, isLoading, error }: PerformanceSnapshotProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-700">
            <h3 className="font-medium">Unable to load performance data</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatChangeText = (change: number, isPercentage = false) => {
    const absChange = Math.abs(change)
    const sign = change >= 0 ? '+' : '-'
    
    if (isPercentage) {
      return `${sign}${absChange.toFixed(1)}%`
    } else {
      return `${sign}${formatCurrency(absChange)} vs previous`
    }
  }

  const getChangeDirection = (change: number): boolean | undefined => {
    if (Math.abs(change) < 0.01) return undefined
    return change > 0
  }

  const snapshot = data?.snapshot
  const changes = data?.changes

  const metrics = [
    {
      title: 'Total Revenue',
      value: snapshot ? formatCurrency(snapshot.total_revenue) : '$0',
      change: changes?.revenue_change || 0,
      changeText: changes ? formatChangeText(changes.revenue_change) : undefined,
      isPositive: changes ? getChangeDirection(changes.revenue_change) : undefined
    },
    {
      title: 'Net Earnings', 
      value: snapshot ? formatCurrency(snapshot.net_earnings) : '$0',
      changeText: snapshot ? `${((snapshot.net_earnings / snapshot.total_revenue) * 100).toFixed(1)}% of gross` : undefined,
      isPositive: undefined
    },
    {
      title: 'Nights Booked',
      value: snapshot ? snapshot.nights_booked.toLocaleString() : '0',
      change: changes?.nights_change || 0,
      changeText: changes ? formatChangeText(changes.nights_change) : undefined,
      isPositive: changes ? getChangeDirection(changes.nights_change) : undefined
    },
    {
      title: 'Occupancy Rate',
      value: snapshot ? formatPercentage(snapshot.occupancy_rate) : '0%',
      changeText: snapshot && data.filters ? 'Portfolio average' : undefined,
      isPositive: undefined
    },
    {
      title: 'ADR (Avg Nightly Rate)',
      value: snapshot ? formatCurrency(snapshot.adr) : '$0',
      change: changes?.adr_change || 0,
      changeText: changes ? formatChangeText(changes.adr_change) : undefined,
      isPositive: changes ? getChangeDirection(changes.adr_change) : undefined
    },
    {
      title: 'Avg Revenue per Stay',
      value: snapshot ? formatCurrency(snapshot.avg_revenue_per_stay) : '$0',
      changeText: snapshot ? `${snapshot.total_reservations} reservations` : undefined,
      isPositive: undefined
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          changeText={metric.changeText}
          isPositive={metric.isPositive}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}