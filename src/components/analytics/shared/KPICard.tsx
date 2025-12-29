'use client'

import { motion } from 'framer-motion'
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid'
import type { MetricDelta } from '@/services/types/analytics'

export type MetricFormat = 'currency' | 'number' | 'percent'

export interface KPICardProps {
  label: string
  value: number
  previousValue?: number | null
  delta?: MetricDelta | null
  format: MetricFormat
  icon?: React.ReactNode
  accentColor?: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'slate'
  size?: 'default' | 'compact'
  delay?: number
  onClick?: () => void
}

const formatValue = (value: number, format: MetricFormat): string => {
  switch (format) {
    case 'currency':
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`
      }
      if (value >= 10000) {
        return `$${(value / 1000).toFixed(1)}K`
      }
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      }
      if (value >= 10000) {
        return `${(value / 1000).toFixed(1)}K`
      }
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
}

const accentStyles = {
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    border: 'border-emerald-100',
    icon: 'text-emerald-600',
    glow: 'hover:shadow-emerald-100',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-blue-100',
    icon: 'text-blue-600',
    glow: 'hover:shadow-blue-100',
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
    border: 'border-violet-100',
    icon: 'text-violet-600',
    glow: 'hover:shadow-violet-100',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    border: 'border-amber-100',
    icon: 'text-amber-600',
    glow: 'hover:shadow-amber-100',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50',
    border: 'border-rose-100',
    icon: 'text-rose-600',
    glow: 'hover:shadow-rose-100',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-50 to-gray-50',
    border: 'border-slate-100',
    icon: 'text-slate-600',
    glow: 'hover:shadow-slate-100',
  },
}

export function KPICard({
  label,
  value,
  delta,
  format,
  icon,
  accentColor = 'slate',
  size = 'default',
  delay = 0,
  onClick,
}: KPICardProps) {
  const styles = accentStyles[accentColor]
  const isPositive = delta && delta.percentage > 0
  const isNegative = delta && delta.percentage < 0
  const isNeutral = !delta || delta.percentage === 0

  const isCompact = size === 'compact'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg}
        ${isCompact ? 'p-4' : 'p-5'}
        transition-all duration-300
        ${onClick ? `cursor-pointer hover:shadow-lg ${styles.glow}` : ''}
      `}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`
            font-medium tracking-wide uppercase
            ${isCompact ? 'text-[10px]' : 'text-xs'}
            text-gray-500
          `}>
            {label}
          </span>
          {icon && (
            <div className={`${styles.icon} opacity-60`}>
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className={`
          font-bold tracking-tight text-gray-900
          ${isCompact ? 'text-2xl' : 'text-3xl'}
        `}>
          {formatValue(value, format)}
        </div>

        {/* Delta */}
        {delta && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.2 }}
            className={`
              flex items-center gap-1.5 mt-2
              ${isCompact ? 'text-xs' : 'text-sm'}
            `}
          >
            <span
              className={`
                inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium
                ${isPositive ? 'bg-emerald-100 text-emerald-700' : ''}
                ${isNegative ? 'bg-rose-100 text-rose-700' : ''}
                ${isNeutral ? 'bg-gray-100 text-gray-600' : ''}
              `}
            >
              {isPositive && <ArrowUpIcon className="w-3 h-3" />}
              {isNegative && <ArrowDownIcon className="w-3 h-3" />}
              {isNeutral && <MinusIcon className="w-3 h-3" />}
              {Math.abs(delta.percentage).toFixed(1)}%
            </span>
            <span className="text-gray-400">
              vs prev period
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// Skeleton loader for KPI Card
export function KPICardSkeleton({ size = 'default' }: { size?: 'default' | 'compact' }) {
  const isCompact = size === 'compact'

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50
        ${isCompact ? 'p-4' : 'p-5'}
      `}
    >
      <div className="animate-pulse">
        <div className={`h-3 w-20 bg-gray-200 rounded mb-3`} />
        <div className={`${isCompact ? 'h-7' : 'h-8'} w-28 bg-gray-200 rounded mb-2`} />
        <div className="h-5 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
