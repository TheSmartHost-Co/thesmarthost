'use client'

import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline'
import { KPICard, KPICardSkeleton } from './KPICard'
import type { PortfolioData } from '@/services/types/analytics'

interface KPIGridProps {
  data: PortfolioData | null
  isLoading?: boolean
  compact?: boolean
  className?: string
}

// Define which KPIs to show and in what order
const KPI_CONFIG = [
  {
    key: 'totalPayout' as const,
    label: 'Total Payout',
    format: 'currency' as const,
    accentColor: 'emerald' as const,
    icon: <BanknotesIcon className="w-5 h-5" />,
  },
  {
    key: 'netEarnings' as const,
    label: 'Net Earnings',
    format: 'currency' as const,
    accentColor: 'blue' as const,
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
  },
  {
    key: 'totalMgmtFee' as const,
    label: 'Management Fee',
    format: 'currency' as const,
    accentColor: 'violet' as const,
    icon: <BuildingOfficeIcon className="w-5 h-5" />,
  },
  {
    key: 'occupancyRate' as const,
    label: 'Occupancy Rate',
    format: 'percent' as const,
    accentColor: 'amber' as const,
    icon: <HomeModernIcon className="w-5 h-5" />,
  },
  {
    key: 'bookingCount' as const,
    label: 'Bookings',
    format: 'number' as const,
    accentColor: 'rose' as const,
    icon: <CalendarDaysIcon className="w-5 h-5" />,
  },
  {
    key: 'totalNights' as const,
    label: 'Total Nights',
    format: 'number' as const,
    accentColor: 'slate' as const,
    icon: <ClockIcon className="w-5 h-5" />,
  },
  {
    key: 'avgNightlyRate' as const,
    label: 'Avg Nightly Rate',
    format: 'currency' as const,
    accentColor: 'blue' as const,
    icon: <ChartBarIcon className="w-5 h-5" />,
  },
]

export function KPIGrid({ data, isLoading, compact, className = '' }: KPIGridProps) {
  const size = compact ? 'compact' : 'default'

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 ${className}`}>
        {KPI_CONFIG.map((config) => (
          <KPICardSkeleton key={config.key} size={size} />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          flex items-center justify-center p-8 rounded-2xl
          border border-dashed border-gray-200 bg-gray-50/50
          ${className}
        `}
      >
        <p className="text-gray-400 text-sm">No analytics data available</p>
      </motion.div>
    )
  }

  return (
    <div
      className={`
        grid gap-4
        ${compact
          ? 'grid-cols-2 md:grid-cols-4'
          : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
        }
        ${className}
      `}
    >
      {KPI_CONFIG.map((config, index) => (
        <KPICard
          key={config.key}
          label={config.label}
          value={data.current[config.key]}
          delta={data.delta?.[config.key] || null}
          format={config.format}
          icon={config.icon}
          accentColor={config.accentColor}
          size={size}
          delay={index * 0.05}
        />
      ))}
    </div>
  )
}

// Compact version for dashboard - shows only top 4 KPIs
export function KPIGridCompact({ data, isLoading, className = '' }: Omit<KPIGridProps, 'compact'>) {
  const TOP_KPIS = KPI_CONFIG.slice(0, 4)

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {TOP_KPIS.map((config) => (
          <KPICardSkeleton key={config.key} size="compact" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          flex items-center justify-center p-6 rounded-2xl
          border border-dashed border-gray-200 bg-gray-50/50
          ${className}
        `}
      >
        <p className="text-gray-400 text-sm">No analytics data available</p>
      </motion.div>
    )
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {TOP_KPIS.map((config, index) => (
        <KPICard
          key={config.key}
          label={config.label}
          value={data.current[config.key]}
          delta={data.delta?.[config.key] || null}
          format={config.format}
          icon={config.icon}
          accentColor={config.accentColor}
          size="compact"
          delay={index * 0.05}
        />
      ))}
    </div>
  )
}
