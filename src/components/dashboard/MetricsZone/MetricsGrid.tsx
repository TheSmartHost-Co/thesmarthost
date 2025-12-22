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

  const metricCards = [
    {
      title: 'Properties',
      value: metrics.properties.active,
      subtitle: `${metrics.properties.total} total • ${metrics.properties.inactive} inactive`,
      icon: HomeIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Clients',
      value: metrics.clients.total,
      subtitle: `${Object.keys(metrics.clients.byStatus).length} status types`,
      icon: UserGroupIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
    {
      title: 'CSV Uploads',
      value: metrics.csvUploads.thisMonth,
      subtitle: `${formatChange(metrics.csvUploads.change)} vs last month`,
      icon: CloudArrowUpIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      title: 'Reports Generated',
      value: metrics.reportsGenerated.thisMonth,
      subtitle: `${formatChange(metrics.reportsGenerated.change)} vs last month`,
      icon: DocumentTextIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      title: 'Bookings',
      value: metrics.bookings.thisMonth,
      subtitle: `${formatChange(metrics.bookings.change)} vs last month`,
      icon: CalendarDaysIcon,
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100',
    },
    {
      title: 'Revenue',
      value: metrics.revenue.thisMonth,
      subtitle: `${formatChange(metrics.revenue.change)} vs last month`,
      icon: CurrencyDollarIcon,
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
      isCurrency: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metricCards.map((card, index) => (
        <MetricCard
          key={card.title}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          bgColor={card.bgColor}
          iconBg={card.iconBg}
          iconColor={card.iconColor}
          borderColor={card.borderColor}
          isCurrency={card.isCurrency}
          index={index}
        />
      ))}
    </div>
  )
}
