'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  AreaChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import PremiumTooltip from './PremiumTooltip'
import type { SpendChartDataPoint } from '@/services/types/cleanerAnalytics'
import type { ChartType } from './constants'
import { SPEND_COLORS } from './constants'

interface SpendTimelineChartProps {
  data: SpendChartDataPoint[]
  granularity: string
  isLoading: boolean
  height?: number
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'bar',
    label: 'Bar',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <rect x="1" y="8" width="4" height="7" rx="1" />
        <rect x="6" y="4" width="4" height="11" rx="1" />
        <rect x="11" y="1" width="4" height="14" rx="1" />
      </svg>
    ),
  },
  {
    value: 'area',
    label: 'Area',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M1 12 L4 7 L8 9 L12 3 L15 5 L15 15 L1 15 Z" opacity="0.4" />
        <path d="M1 12 L4 7 L8 9 L12 3 L15 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

export default function SpendTimelineChart({
  data,
  granularity,
  isLoading,
  height = 320,
}: SpendTimelineChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerReady, setContainerReady] = useState(false)

  useEffect(() => {
    const checkContainer = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        if (clientWidth > 0 && clientHeight > 0) {
          setContainerReady(true)
          return true
        }
      }
      return false
    }

    if (checkContainer()) return
    const interval = setInterval(() => {
      if (checkContainer()) clearInterval(interval)
    }, 50)

    const observer = new ResizeObserver(() => checkContainer())
    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [data])

  if (isLoading) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="w-full space-y-3 px-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-end gap-2">
              <div
                className="animate-pulse rounded-md bg-gray-200"
                style={{ width: `${30 + Math.random() * 60}%`, height: 20 + Math.random() * 30 }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">No spending data</p>
          <p className="mt-1 text-xs text-gray-400">Adjust filters or date range</p>
        </div>
      </div>
    )
  }

  const gradientDefs = (
    <defs>
      <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SPEND_COLORS.paid} stopOpacity={0.4} />
        <stop offset="100%" stopColor={SPEND_COLORS.paid} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gradOwed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SPEND_COLORS.owed} stopOpacity={0.3} />
        <stop offset="100%" stopColor={SPEND_COLORS.owed} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gradNotBilled" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SPEND_COLORS.notBilled} stopOpacity={0.3} />
        <stop offset="100%" stopColor={SPEND_COLORS.notBilled} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gradUpcoming" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SPEND_COLORS.upcoming} stopOpacity={0.2} />
        <stop offset="100%" stopColor={SPEND_COLORS.upcoming} stopOpacity={0} />
      </linearGradient>
      {/* Hatched pattern for upcoming bars */}
      <pattern id="hatchUpcoming" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="2" height="6" fill={SPEND_COLORS.upcoming} opacity="0.3" />
      </pattern>
    </defs>
  )

  const sharedAxisProps = {
    axisLine: false as const,
    tickLine: false as const,
    tick: { fill: '#9ca3af', fontSize: 11 },
  }

  const tooltipContent = (
    <Tooltip
      content={<PremiumTooltip activeTab="spend" granularity={granularity} />}
      cursor={{ fill: 'rgba(15,23,42,0.05)' }}
    />
  )

  // Legend
  const legend = (
    <div className="mb-2 flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {[
          { color: SPEND_COLORS.paid, label: 'Paid' },
          { color: SPEND_COLORS.owed, label: 'Owed' },
          { color: SPEND_COLORS.notBilled, label: 'Not Billed' },
          { color: SPEND_COLORS.upcoming, label: 'Upcoming' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      {/* Chart type toggle */}
      <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
        {CHART_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setChartType(opt.value)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              chartType === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={opt.label}
          >
            {opt.icon}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {legend}
      <div ref={containerRef} style={{ height }} className="w-full">
        {containerReady && (
          <AnimatePresence mode="wait">
            <motion.div
              key={chartType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    {gradientDefs}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" {...sharedAxisProps} />
                    <YAxis width={60} tickFormatter={formatCurrency} {...sharedAxisProps} />
                    {tooltipContent}
                    <Bar
                      dataKey="paidInvoicesAmount"
                      stackId="spend"
                      fill={SPEND_COLORS.paid}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                      animationDuration={800}
                      name="Paid"
                    />
                    <Bar
                      dataKey="unpaidInvoicesAmount"
                      stackId="spend"
                      fill={SPEND_COLORS.owed}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                      animationDuration={800}
                      name="Owed"
                    />
                    <Bar
                      dataKey="uninvoicedCompletedAmount"
                      stackId="spend"
                      fill={SPEND_COLORS.notBilled}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                      animationDuration={800}
                      name="Not Billed"
                    />
                    <Bar
                      dataKey="upcomingAmount"
                      stackId="spend"
                      fill="url(#hatchUpcoming)"
                      stroke={SPEND_COLORS.upcoming}
                      strokeWidth={1}
                      strokeDasharray="4 2"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      animationDuration={800}
                      name="Upcoming"
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    {gradientDefs}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" {...sharedAxisProps} />
                    <YAxis width={60} tickFormatter={formatCurrency} {...sharedAxisProps} />
                    {tooltipContent}
                    <Area
                      dataKey="paidInvoicesAmount"
                      stackId="spend"
                      stroke={SPEND_COLORS.paidStroke}
                      fill="url(#gradPaid)"
                      strokeWidth={2}
                      type="monotone"
                      animationDuration={800}
                      name="Paid"
                    />
                    <Area
                      dataKey="unpaidInvoicesAmount"
                      stackId="spend"
                      stroke={SPEND_COLORS.owedStroke}
                      fill="url(#gradOwed)"
                      strokeWidth={2}
                      type="monotone"
                      animationDuration={800}
                      name="Owed"
                    />
                    <Area
                      dataKey="uninvoicedCompletedAmount"
                      stackId="spend"
                      stroke={SPEND_COLORS.notBilledStroke}
                      fill="url(#gradNotBilled)"
                      strokeWidth={2}
                      type="monotone"
                      animationDuration={800}
                      name="Not Billed"
                    />
                    <Area
                      dataKey="upcomingAmount"
                      stackId="spend"
                      stroke={SPEND_COLORS.upcomingStroke}
                      fill="url(#gradUpcoming)"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      type="monotone"
                      animationDuration={800}
                      name="Upcoming"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
