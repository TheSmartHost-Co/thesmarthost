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
  Cell,
} from 'recharts'
import type { ExpenseChartDataPoint } from '@/services/types/expenseAnalytics'
import type { CrossFilter } from './useExpenseTimeline'
import type { ChartType } from './constants'
import { EXPENSE_CHART_COLORS } from './constants'

interface ExpenseTimelineRendererProps {
  data: ExpenseChartDataPoint[]
  chartType: ChartType
  granularity: string
  crossFilter: CrossFilter | null
  onPointClick: (date: string) => void
  isLoading: boolean
  height?: number
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export default function ExpenseTimelineRenderer({
  data,
  chartType,
  granularity,
  crossFilter,
  onPointClick,
  isLoading,
  height = 360,
}: ExpenseTimelineRendererProps) {
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
        <div className="space-y-3 w-full px-6">
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
          <p className="text-sm font-medium text-gray-500">No expense data</p>
          <p className="mt-1 text-xs text-gray-400">Adjust filters or date range</p>
        </div>
      </div>
    )
  }

  const handleBarClick = (payload: Record<string, unknown>) => {
    const date = payload?.date as string
    if (date) onPointClick(date)
  }

  const gradientDefs = (
    <defs>
      <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={EXPENSE_CHART_COLORS.actual} stopOpacity={0.4} />
        <stop offset="100%" stopColor={EXPENSE_CHART_COLORS.actual} stopOpacity={0} />
      </linearGradient>
    </defs>
  )

  const sharedAxisProps = {
    axisLine: false as const,
    tickLine: false as const,
    tick: { fill: '#9ca3af', fontSize: 11 },
  }

  const tooltipContent = (
    <Tooltip
      content={({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const point = payload[0].payload as ExpenseChartDataPoint
        return (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
            <p className="font-medium text-gray-900 mb-1">{label}</p>
            <p className="text-gray-600">
              Amount: <span className="font-medium text-gray-900">{formatCurrency(point.totalAmount)}</span>
            </p>
            <p className="text-gray-600">
              Count: <span className="font-medium text-gray-900">{point.expenseCount}</span>
            </p>
            <p className="mt-1 text-[10px] text-gray-400">Click to filter table</p>
          </div>
        )
      }}
      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
    />
  )

  // Determine if a bar is the active cross-filter target
  const isTimelineCrossFilter = crossFilter?.source === 'timeline'
  const activeCrossFilterDate = crossFilter?.dateRange?.startDate

  return (
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
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(e: any) => {
                    if (e?.activePayload?.[0]?.payload) handleBarClick(e.activePayload[0].payload)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {gradientDefs}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" {...sharedAxisProps} />
                  <YAxis width={60} tickFormatter={formatCurrency} {...sharedAxisProps} />
                  {tooltipContent}
                  <Bar
                    dataKey="totalAmount"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    animationDuration={800}
                    animationEasing="ease-out"
                    name="Expenses"
                  >
                    {data.map(entry => {
                      const isActive = isTimelineCrossFilter && activeCrossFilterDate === entry.date
                      const isDimmed = isTimelineCrossFilter && activeCrossFilterDate !== entry.date
                      return (
                        <Cell
                          key={entry.date}
                          fill={isActive ? '#059669' : EXPENSE_CHART_COLORS.actual}
                          opacity={isDimmed ? 0.3 : 1}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(e: any) => {
                    if (e?.activePayload?.[0]?.payload) handleBarClick(e.activePayload[0].payload)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {gradientDefs}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" {...sharedAxisProps} />
                  <YAxis width={60} tickFormatter={formatCurrency} {...sharedAxisProps} />
                  {tooltipContent}
                  <Area
                    dataKey="totalAmount"
                    stroke={EXPENSE_CHART_COLORS.actual}
                    fill="url(#gradExpense)"
                    strokeWidth={2}
                    type="monotone"
                    animationDuration={800}
                    animationEasing="ease-out"
                    name="Expenses"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
