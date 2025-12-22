'use client'

import {
  HomeIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import type { DashboardMetrics } from '@/services/types/dashboard'
import { MetricCard } from './MetricCard'

interface MetricsGridProps {
  metrics: DashboardMetrics
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const formatChange = (change: number) => {
    if (change > 0) return `+${change}`
    return change.toString()
  }

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Properties"
        value={metrics.properties.active}
        subtitle={`${metrics.properties.total} total • ${metrics.properties.inactive} inactive`}
        gradient="from-orange-50 to-white"
        icon={<HomeIcon className="w-5 h-5" />}
      />

      <MetricCard
        title="Clients"
        value={metrics.clients.total}
        subtitle={`${Object.keys(metrics.clients.byStatus).length} status types`}
        gradient="from-blue-50 to-white"
        icon={<UserGroupIcon className="w-5 h-5" />}
      />

      <MetricCard
        title="CSV Uploads"
        value={metrics.csvUploads.thisMonth}
        subtitle={`${formatChange(metrics.csvUploads.change)} vs last month`}
        gradient="from-green-50 to-white"
        icon={<CloudArrowUpIcon className="w-5 h-5" />}
      />

      <MetricCard
        title="Reports Generated"
        value={metrics.reportsGenerated.thisMonth}
        subtitle={`${formatChange(metrics.reportsGenerated.change)} vs last month`}
        gradient="from-purple-50 to-white"
        icon={<DocumentTextIcon className="w-5 h-5" />}
      />

      <MetricCard
        title="Bookings"
        value={metrics.bookings.thisMonth}
        subtitle={`${formatChange(metrics.bookings.change)} vs last month`}
        gradient="from-indigo-50 to-white"
        icon={<CalendarDaysIcon className="w-5 h-5" />}
      />

      <MetricCard
        title="Revenue"
        value={metrics.revenue.thisMonth}
        subtitle={`${formatChange(metrics.revenue.change)} vs last month`}
        gradient="from-emerald-50 to-white"
        icon={<CurrencyDollarIcon className="w-5 h-5" />}
        isCurrency={true}
      />
    </div>
  )
}
