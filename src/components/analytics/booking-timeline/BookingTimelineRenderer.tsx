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
import type { BookingChartDataPoint } from '@/services/types/bookingAnalytics'
import type { CrossFilter } from './useBookingTimeline'
import type { ChartType, TimelineMetric } from './constants'
import { BOOKING_CHART_COLORS, TIMELINE_METRIC_OPTIONS } from './constants'

interface BookingTimelineRendererProps {
  data: BookingChartDataPoint[]
  chartType: ChartType
  timelineMetric: TimelineMetric
  onMetricChange: (metric: TimelineMetric) => void
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

const formatNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(0)
}

export default function BookingTimelineRenderer({
  data,
  chartType,
  timelineMetric,
  onMetricChange,
  crossFilter,
  onPointClick,
  isLoading,
  height = 360,
}: BookingTimelineRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerReady, setContainerReady] = useState(false)

  const metricConfig = TIMELINE_METRIC_OPTIONS.find(m => m.value === timelineMetric)
  const isCurrencyMetric = metricConfig?.format === 'currency'
  const tickFormatter = isCurrencyMetric ? formatCurrency : formatNumber

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
          <p className="text-sm font-medium text-gray-500">No booking data</p>
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
      <linearGradient id="gradBooking" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BOOKING_CHART_COLORS.primary} stopOpacity={0.4} />
        <stop offset="100%" stopColor={BOOKING_CHART_COLORS.primary} stopOpacity={0} />
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
        const point = payload[0].payload as BookingChartDataPoint
        return (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
            <p className="mb-1 font-medium text-gray-900">{label}</p>
            <p className="text-gray-600">
              Payout: <span className="font-medium text-gray-900">{formatCurrency(point.total_payout)}</span>
            </p>
            <p className="text-gray-600">
              Net: <span className="font-medium text-gray-900">{formatCurrency(point.net_earnings)}</span>
            </p>
            <p className="text-gray-600">
              Bookings: <span className="font-medium text-gray-900">{point.booking_count}</span>
            </p>
            <p className="text-gray-600">
              Nights: <span className="font-medium text-gray-900">{point.total_nights}</span>
            </p>
            <p className="mt-1 text-[10px] text-gray-400">Click to filter table</p>
          </div>
        )
      }}
      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
    />
  )

  const isTimelineCrossFilter = crossFilter?.source === 'timeline'
  const activeCrossFilterDate = crossFilter?.dateRange?.startDate

  return (
    <div>
      {/* Metric selector */}
      <div className="mb-2 flex flex-wrap gap-1">
        {TIMELINE_METRIC_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onMetricChange(opt.value)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all ${
              timelineMetric === opt.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} style={{ height }} className="w-full">
        {containerReady && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${chartType}-${timelineMetric}`}
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
                    <YAxis width={60} tickFormatter={tickFormatter} {...sharedAxisProps} />
                    {tooltipContent}
                    <Bar
                      dataKey={timelineMetric}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      animationDuration={800}
                      animationEasing="ease-out"
                      name={metricConfig?.label || 'Value'}
                    >
                      {data.map(entry => {
                        const isActive = isTimelineCrossFilter && activeCrossFilterDate === entry.date
                        const isDimmed = isTimelineCrossFilter && activeCrossFilterDate !== entry.date
                        return (
                          <Cell
                            key={entry.date}
                            fill={isActive ? '#1D4ED8' : BOOKING_CHART_COLORS.primary}
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
                    <YAxis width={60} tickFormatter={tickFormatter} {...sharedAxisProps} />
                    {tooltipContent}
                    <Area
                      dataKey={timelineMetric}
                      stroke={BOOKING_CHART_COLORS.primary}
                      fill="url(#gradBooking)"
                      strokeWidth={2}
                      type="monotone"
                      animationDuration={800}
                      animationEasing="ease-out"
                      name={metricConfig?.label || 'Value'}
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
