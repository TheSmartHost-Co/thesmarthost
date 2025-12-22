'use client'

import { motion } from 'framer-motion'
import type { AnalyticsSummaryData } from '@/store/useAnalyticsStore'
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  MoonIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ReceiptPercentIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

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
  icon: React.ElementType
  bgColor: string
  iconBg: string
  iconColor: string
  borderColor: string
  index: number
}

function MetricCard({
  title,
  value,
  changeText,
  isPositive,
  isLoading,
  icon: Icon,
  bgColor,
  iconBg,
  iconColor,
  borderColor,
  index
}: MetricCardProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`${bgColor} border ${borderColor} rounded-2xl p-5`}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div className={`w-12 h-12 ${iconBg} rounded-xl`}></div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${bgColor} border ${borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>

          {changeText && (
            <div className={`flex items-center gap-1 mt-1.5 text-sm ${
              isPositive === true ? 'text-green-600' :
              isPositive === false ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {isPositive === true && <ArrowUpIcon className="w-3.5 h-3.5" />}
              {isPositive === false && <ArrowDownIcon className="w-3.5 h-3.5" />}
              <span className="font-medium">{changeText}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  )
}

export function PerformanceSnapshot({ data, isLoading, error }: PerformanceSnapshotProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <CurrencyDollarIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Unable to load performance data</h3>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
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
      changeText: changes ? formatChangeText(changes.revenue_change) : undefined,
      isPositive: changes ? getChangeDirection(changes.revenue_change) : undefined,
      icon: CurrencyDollarIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      title: 'Net Earnings',
      value: snapshot ? formatCurrency(snapshot.net_earnings) : '$0',
      changeText: snapshot && snapshot.total_revenue > 0
        ? `${((snapshot.net_earnings / snapshot.total_revenue) * 100).toFixed(1)}% of gross`
        : undefined,
      isPositive: undefined,
      icon: BanknotesIcon,
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100'
    },
    {
      title: 'Nights Booked',
      value: snapshot ? snapshot.nights_booked.toLocaleString() : '0',
      changeText: changes ? formatChangeText(changes.nights_change) : undefined,
      isPositive: changes ? getChangeDirection(changes.nights_change) : undefined,
      icon: MoonIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Occupancy Rate',
      value: snapshot ? formatPercentage(snapshot.occupancy_rate) : '0%',
      changeText: snapshot && data?.filters ? 'Portfolio average' : undefined,
      isPositive: undefined,
      icon: ChartBarIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      title: 'ADR (Avg Nightly Rate)',
      value: snapshot ? formatCurrency(snapshot.adr) : '$0',
      changeText: changes ? formatChangeText(changes.adr_change) : undefined,
      isPositive: changes ? getChangeDirection(changes.adr_change) : undefined,
      icon: ArrowTrendingUpIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100'
    },
    {
      title: 'Avg Revenue per Stay',
      value: snapshot ? formatCurrency(snapshot.avg_revenue_per_stay) : '$0',
      changeText: snapshot ? `${snapshot.total_reservations} reservations` : undefined,
      isPositive: undefined,
      icon: ReceiptPercentIcon,
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          changeText={metric.changeText}
          isPositive={metric.isPositive}
          isLoading={isLoading}
          icon={metric.icon}
          bgColor={metric.bgColor}
          iconBg={metric.iconBg}
          iconColor={metric.iconColor}
          borderColor={metric.borderColor}
          index={index}
        />
      ))}
    </div>
  )
}
