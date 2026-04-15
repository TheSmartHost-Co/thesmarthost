'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import PremiumTooltip from './PremiumTooltip'
import type { WorkloadCleanerBar } from '@/services/types/cleanerAnalytics'
import type { CleanerInfo } from './useCleanerTimeline'
import { WORKLOAD_COLORS } from './constants'

interface WorkloadChartProps {
  bars: WorkloadCleanerBar[]
  activeCleaners: CleanerInfo[]
  isLoading: boolean
  height?: number
}

export default function WorkloadChart({
  bars,
  isLoading,
  height = 320,
}: WorkloadChartProps) {
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
  }, [bars])

  if (isLoading) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="w-full space-y-3 px-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div
                className="h-6 animate-pulse rounded-md bg-gray-200"
                style={{ width: `${30 + Math.random() * 50}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!bars || bars.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">No workload data</p>
          <p className="mt-1 text-xs text-gray-400">Adjust filters or date range</p>
        </div>
      </div>
    )
  }

  // Dynamic height based on number of cleaners
  const dynamicHeight = Math.max(height, bars.length * 50 + 60)

  return (
    <div>
      {/* Legend */}
      <div className="mb-2 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WORKLOAD_COLORS.completed }} />
          <span className="text-[11px] text-gray-500">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WORKLOAD_COLORS.pending }} />
          <span className="text-[11px] text-gray-500">Upcoming</span>
        </div>
      </div>

      <div ref={containerRef} style={{ height: dynamicHeight }} className="w-full">
        {containerReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="cleanerName"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#374151', fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  content={<PremiumTooltip activeTab="workload" granularity="monthly" />}
                  cursor={{ fill: 'rgba(15,23,42,0.05)' }}
                />
                <Bar
                  dataKey="completedProjects"
                  stackId="workload"
                  fill={WORKLOAD_COLORS.completed}
                  radius={[0, 0, 0, 0]}
                  animationDuration={800}
                  name="Completed"
                />
                <Bar
                  dataKey="pendingProjects"
                  stackId="workload"
                  fill={WORKLOAD_COLORS.pending}
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                  name="Upcoming"
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </div>
  )
}
