'use client'

import {
  HomeIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
  CalendarDaysIcon,
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
  ]

  return (
    <div className="flex flex-wrap gap-3">
      {metricCards.map((card, index) => (
        <div
          key={card.title}
          className={`w-full sm:w-[calc(50%-0.375rem)] ${
            index < 3 ? 'lg:w-[calc(33.333%-0.5rem)]' : 'lg:w-[calc(50%-0.375rem)]'
          }`}
        >
          <MetricCard
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            bgColor={card.bgColor}
            iconBg={card.iconBg}
            iconColor={card.iconColor}
            borderColor={card.borderColor}
            index={index}
          />
        </div>
      ))}
    </div>
  )
}
