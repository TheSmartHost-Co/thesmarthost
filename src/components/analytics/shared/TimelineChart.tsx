'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  ChartBarIcon,
  ChartBarSquareIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import type { TimelinePoint, Granularity } from '@/services/types/analytics'

type ChartType = 'line' | 'area' | 'bar'
type MetricType = 'totalPayout' | 'netEarnings' | 'avgNightlyRate' | 'bookingCount' | 'totalNights'

interface TimelineChartProps {
  data: TimelinePoint[]
  granularity: Granularity
  isLoading?: boolean
  height?: number
  onPointClick?: (point: TimelinePoint) => void
  className?: string
}

const METRIC_CONFIG: Record<MetricType, { label: string; color: string; format: 'currency' | 'number' }> = {
  totalPayout: { label: 'Total Payout', color: '#10b981', format: 'currency' },
  netEarnings: { label: 'Net Earnings', color: '#3b82f6', format: 'currency' },
  avgNightlyRate: { label: 'Avg Rate', color: '#8b5cf6', format: 'currency' },
  bookingCount: { label: 'Bookings', color: '#f59e0b', format: 'number' },
  totalNights: { label: 'Nights', color: '#ec4899', format: 'number' },
}

const CHART_TYPES: { type: ChartType; icon: React.ReactNode; label: string }[] = [
  { type: 'line', icon: <PresentationChartLineIcon className="w-4 h-4" />, label: 'Line' },
  { type: 'area', icon: <ChartBarSquareIcon className="w-4 h-4" />, label: 'Area' },
  { type: 'bar', icon: <ChartBarIcon className="w-4 h-4" />, label: 'Bar' },
]

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

const formatNumber = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-4 min-w-[180px]"
    >
      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
        {label}
      </p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => {
          const config = METRIC_CONFIG[entry.dataKey as MetricType]
          const formattedValue = config?.format === 'currency'
            ? `$${entry.value.toLocaleString()}`
            : entry.value.toLocaleString()

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">{config?.label || entry.dataKey}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export function TimelineChart({
  data,
  granularity,
  isLoading,
  height = 320,
  onPointClick,
  className = '',
}: TimelineChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area')
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['totalPayout', 'netEarnings'])
  const [containerReady, setContainerReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Wait for container to have valid dimensions before rendering chart
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

    // Check immediately
    if (checkContainer()) return

    // If not ready, poll until it is (handles SSR/dynamic sizing)
    const interval = setInterval(() => {
      if (checkContainer()) {
        clearInterval(interval)
      }
    }, 50)

    // Also use ResizeObserver for more reliable detection
    const observer = new ResizeObserver(() => {
      checkContainer()
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [data])

  // Format dates for display
  const chartData = useMemo(() => {
    return data.map((point) => {
      const date = new Date(point.date)
      let label = point.date

      if (granularity === 'daily') {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (granularity === 'weekly') {
        label = `W${Math.ceil(date.getDate() / 7)}`
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short' })
      }

      return { ...point, label }
    })
  }, [data, granularity])

  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        // Don't allow removing last metric
        if (prev.length === 1) return prev
        return prev.filter((m) => m !== metric)
      }
      return [...prev, metric]
    })
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex justify-between mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-gray-200 rounded-lg" />
              <div className="h-8 w-20 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  // Debug: log what data we're receiving
  console.log('TimelineChart data:', { dataLength: data?.length, data, containerReady })

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50
          ${className}
        `}
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">No timeline data available</p>
      </motion.div>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
      onClick: onPointClick ? (e: any) => e && onPointClick(e.activePayload?.[0]?.payload) : undefined,
    }

    const xAxisProps = {
      dataKey: 'label',
      axisLine: false,
      tickLine: false,
      tick: { fill: '#9ca3af', fontSize: 11 },
      dy: 10,
    }

    const yAxisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fill: '#9ca3af', fontSize: 11 },
      tickFormatter: (value: number) => {
        const firstMetric = selectedMetrics[0]
        return METRIC_CONFIG[firstMetric]?.format === 'currency'
          ? formatCurrency(value)
          : formatNumber(value)
      },
      width: 60,
    }

    const gridProps = {
      strokeDasharray: '3 3',
      stroke: '#e5e7eb',
      vertical: false,
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={METRIC_CONFIG[metric].color}
                strokeWidth={2.5}
                dot={{ fill: METRIC_CONFIG[metric].color, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              {selectedMetrics.map((metric) => (
                <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={METRIC_CONFIG[metric].color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={METRIC_CONFIG[metric].color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetrics.map((metric) => (
              <Area
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={METRIC_CONFIG[metric].color}
                strokeWidth={2}
                fill={`url(#gradient-${metric})`}
              />
            ))}
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {selectedMetrics.map((metric) => (
              <Bar
                key={metric}
                dataKey={metric}
                fill={METRIC_CONFIG[metric].color}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Metric Toggles */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(METRIC_CONFIG) as MetricType[]).map((metric) => {
              const config = METRIC_CONFIG[metric]
              const isSelected = selectedMetrics.includes(metric)

              return (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.color, opacity: isSelected ? 1 : 0.5 }}
                  />
                  {config.label}
                </button>
              )
            })}
          </div>

          {/* Chart Type Switcher */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {CHART_TYPES.map(({ type, icon, label }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                  transition-all duration-200
                  ${chartType === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div
          ref={containerRef}
          style={{ height, width: '100%', position: 'relative' }}
        >
          {containerReady ? (
            <motion.div
              key={chartType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%', width: '100%' }}
            >
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse bg-gray-100 rounded-lg w-full h-full" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Compact version for dashboard
export function TimelineChartCompact({
  data,
  granularity,
  isLoading,
  className = '',
}: Omit<TimelineChartProps, 'height' | 'onPointClick'>) {
  return (
    <TimelineChart
      data={data}
      granularity={granularity}
      isLoading={isLoading}
      height={200}
      className={className}
    />
  )
}
