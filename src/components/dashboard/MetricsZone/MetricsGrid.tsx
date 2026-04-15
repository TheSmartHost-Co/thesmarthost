'use client'

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

  const primaryMetrics = [
    {
      title: 'Properties',
      value: metrics.properties.active,
      subtitle: `${metrics.properties.total} total · ${metrics.properties.inactive} inactive`,
    },
    {
      title: 'Clients',
      value: metrics.clients.total,
      subtitle: `${Object.keys(metrics.clients.byStatus).length} status types`,
    },
    {
      title: 'CSV Uploads',
      value: metrics.csvUploads.thisMonth,
      subtitle: `${formatChange(metrics.csvUploads.change)} vs last month`,
    },
    {
      title: 'Reports',
      value: metrics.reportsGenerated.thisMonth,
      subtitle: `${formatChange(metrics.reportsGenerated.change)} vs last month`,
    },
    {
      title: 'Bookings',
      value: metrics.bookings.thisMonth,
      subtitle: `${formatChange(metrics.bookings.change)} vs last month`,
    },
  ]

  const operationsMetrics = metrics.cleaningProjects ? [
    {
      title: 'Revenue',
      value: metrics.revenue.thisMonth,
      subtitle: `${formatChange(metrics.revenue.change)} vs last month`,
      isCurrency: true,
    },
    {
      title: 'Completed Cleanings',
      value: metrics.cleaningProjects.thisMonth,
      subtitle: `${formatChange(metrics.cleaningProjects.change)} vs last month`,
    },
    {
      title: 'Invoiced',
      value: metrics.invoices.thisMonthTotal,
      subtitle: `${formatChange(metrics.invoices.change)} vs last month`,
      isCurrency: true,
      secondaryLine: `$${metrics.invoices.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding`,
    },
    {
      title: 'Expenses',
      value: metrics.expenses.thisMonth,
      subtitle: `${formatChange(metrics.expenses.change)} vs last month`,
      isCurrency: true,
    },
    {
      title: 'Active Cleaners',
      value: metrics.activeCleaners.count,
      subtitle: 'This month',
    },
  ] : null

  const rowClass = "bg-white border border-gray-200 rounded-lg grid grid-cols-2 sm:grid-cols-5"

  return (
    <div className="space-y-2">
      <div className={rowClass}>
        {primaryMetrics.map((card) => (
          <MetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
          />
        ))}
      </div>
      {operationsMetrics && (
        <div className={rowClass}>
          {operationsMetrics.map((card) => (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              isCurrency={card.isCurrency}
              secondaryLine={card.secondaryLine}
            />
          ))}
        </div>
      )}
    </div>
  )
}
