'use client'

import {
  HomeModernIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { ClientMetricCard } from './ClientMetricCard'
import type { ClientPortalDashboardStats } from '@/services/types/clientPortal'

interface ClientMetricsGridProps {
  stats: ClientPortalDashboardStats
}

function formatDelta(current: number, previous: number): string {
  const diff = current - previous
  if (previous === 0 && current === 0) return 'No change'
  if (previous === 0) return `+${current} new`

  const prefix = diff >= 0 ? '+' : ''
  return `${prefix}${diff} vs last month`
}

export const ClientMetricsGrid: React.FC<ClientMetricsGridProps> = ({ stats }) => {
  // Default all stats to 0 to handle missing fields from API
  const s = {
    propertyCount: stats.propertyCount ?? 0,
    upcomingBookings: stats.upcomingBookings ?? 0,
    bookingsThisMonth: stats.bookingsThisMonth ?? 0,
    bookingsLastMonth: stats.bookingsLastMonth ?? 0,
    activeCleaningProjects: stats.activeCleaningProjects ?? 0,
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
      title: 'Active Cleaning',
      value: s.activeCleaningProjects,
      subtitle: 'projects scheduled',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
      icon: SparklesIcon,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((metric, i) => (
        <ClientMetricCard key={metric.title} {...metric} index={i} />
      ))}
    </div>
  )
}
