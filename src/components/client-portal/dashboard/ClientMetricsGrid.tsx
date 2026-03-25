'use client'

import {
  HomeModernIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { ClientMetricCard } from './ClientMetricCard'
import type { ClientPortalDashboardStats } from '@/services/types/clientPortal'

interface ClientMetricsGridProps {
  stats: ClientPortalDashboardStats
}

function formatDelta(current: number, previous: number, isCurrency = false): string {
  const diff = current - previous
  if (previous === 0 && current === 0) return 'No change'
  if (previous === 0) return isCurrency ? `+$${current.toFixed(0)} new` : `+${current} new`

  const prefix = diff >= 0 ? '+' : ''
  if (isCurrency) {
    return `${prefix}$${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 })} vs last month`
  }
  return `${prefix}${diff} vs last month`
}

export const ClientMetricsGrid: React.FC<ClientMetricsGridProps> = ({ stats }) => {
  // Default all stats to 0 to handle missing fields from API
  const s = {
    propertyCount: stats.propertyCount ?? 0,
    upcomingBookings: stats.upcomingBookings ?? 0,
    bookingsThisMonth: stats.bookingsThisMonth ?? 0,
    bookingsLastMonth: stats.bookingsLastMonth ?? 0,
    revenueThisMonth: stats.revenueThisMonth ?? 0,
    revenueLastMonth: stats.revenueLastMonth ?? 0,
    activeCleaningProjects: stats.activeCleaningProjects ?? 0,
    totalRevenue: stats.totalRevenue ?? 0,
    totalNights: stats.totalNights ?? 0,
    openIssues: stats.openIssues ?? 0,
  }

  const metrics = [
    {
      title: 'Properties',
      value: s.propertyCount,
      subtitle: 'in your portfolio',
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
      icon: HomeModernIcon,
    },
    {
      title: 'Upcoming Bookings',
      value: s.upcomingBookings,
      subtitle: 'scheduled',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
      icon: CalendarDaysIcon,
    },
    {
      title: 'Bookings This Month',
      value: s.bookingsThisMonth,
      subtitle: formatDelta(s.bookingsThisMonth, s.bookingsLastMonth),
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100',
      icon: ArrowTrendingUpIcon,
    },
    {
      title: 'Revenue This Month',
      value: s.revenueThisMonth,
      subtitle: formatDelta(s.revenueThisMonth, s.revenueLastMonth, true),
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
      icon: CurrencyDollarIcon,
      isCurrency: true,
    },
    {
      title: 'Active Cleaning',
      value: s.activeCleaningProjects,
      subtitle: 'projects scheduled',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
      icon: SparklesIcon,
    },
    {
      title: 'Total Revenue',
      value: s.totalRevenue,
      subtitle: `${s.totalNights.toLocaleString()} total nights`,
      bgColor: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-100',
      icon: MoonIcon,
      isCurrency: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((metric, i) => (
        <ClientMetricCard key={metric.title} {...metric} index={i} />
      ))}
    </div>
  )
}
