'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { CLEANER_PALETTE, OTHER_CLEANER_COLOR, MAX_CLEANER_STACKS } from './constants'
import type { CleanerBreakdown } from '@/services/types/cleanerAnalytics'

type DistributionMode = 'spend' | 'count'

interface CleanerDistributionChartProps {
  byCleaner: CleanerBreakdown[]
  isLoading: boolean
  height?: number
}

interface SliceData {
  name: string
  value: number
  color: string
  [key: string]: unknown
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function getCleanerSpend(c: CleanerBreakdown): number {
  return (
    c.current.paidInvoicesAmount +
    c.current.unpaidInvoicesAmount +
    c.current.uninvoicedCompletedAmount
  )
}

function getCleanerCount(c: CleanerBreakdown): number {
  return c.current.completedProjects + c.current.pendingProjects
}

// Custom label with connector line from slice to cleaner name outside
function renderOuterLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  percent?: number
  name?: string
  fill?: string
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = '', fill = '#000' } = props
  if (percent < 0.04) return null // Skip tiny slices
  const RADIAN = Math.PI / 180

  // Point on the outer edge of the slice
  const sx = cx + outerRadius * Math.cos(-midAngle * RADIAN)
  const sy = cy + outerRadius * Math.sin(-midAngle * RADIAN)

  // Point a bit further out (end of the straight line)
  const mx = cx + (outerRadius + 16) * Math.cos(-midAngle * RADIAN)
  const my = cy + (outerRadius + 16) * Math.sin(-midAngle * RADIAN)

  // Horizontal endpoint for the elbow
  const isRight = Math.cos(-midAngle * RADIAN) >= 0
  const ex = mx + (isRight ? 20 : -20)

  return (
    <g>
      {/* Connector line: straight from slice edge */}
      <path
        d={`M${sx},${sy} L${mx},${my} L${ex},${my}`}
        stroke={fill}
        strokeWidth={1.5}
        fill="none"
        opacity={0.6}
      />
      {/* Dot at the elbow */}
      <circle cx={mx} cy={my} r={2} fill={fill} opacity={0.6} />
      {/* Cleaner name */}
      <text
        x={ex + (isRight ? 4 : -4)}
        y={my}
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 500, fill: '#374151' }}
      >
        {name}
      </text>
      {/* Percentage */}
      <text
        x={ex + (isRight ? 4 : -4)}
        y={my + 13}
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: 10, fontWeight: 600, fill }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  )
}

// Tooltip content
function DistributionTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean
  payload?: Array<{ payload: SliceData }>
  mode: DistributionMode
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
        <span className="text-xs font-semibold text-gray-900">{d.name}</span>
      </div>
      <p className="mt-1 text-xs tabular-nums text-gray-600">
        {mode === 'spend' ? formatCurrency(d.value) : `${d.value} cleaning${d.value !== 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

export default function CleanerDistributionChart({
  byCleaner,
  isLoading,
  height = 260,
}: CleanerDistributionChartProps) {
  const [mode, setMode] = useState<DistributionMode>('spend')

  const { slices, total } = useMemo(() => {
    if (!byCleaner?.length) return { slices: [] as SliceData[], total: 0 }

    // Compute value per cleaner
    const getValue = mode === 'spend' ? getCleanerSpend : getCleanerCount
    const valued = byCleaner
      .map(c => ({ name: c.cleanerName, value: getValue(c) }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)

    const total = valued.reduce((sum, c) => sum + c.value, 0)

    if (valued.length <= MAX_CLEANER_STACKS) {
      return {
        slices: valued.map((c, i) => ({
          ...c,
          color: CLEANER_PALETTE[i % CLEANER_PALETTE.length],
        })),
        total,
      }
    }

    // Top N + "Other"
    const top = valued.slice(0, MAX_CLEANER_STACKS)
    const otherValue = valued.slice(MAX_CLEANER_STACKS).reduce((sum, c) => sum + c.value, 0)

    const slices: SliceData[] = top.map((c, i) => ({
      ...c,
      color: CLEANER_PALETTE[i % CLEANER_PALETTE.length],
    }))

    if (otherValue > 0) {
      slices.push({ name: 'Other', value: otherValue, color: OTHER_CLEANER_COLOR })
    }

    return { slices, total }
  }, [byCleaner, mode])

  if (isLoading) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <div className="h-40 w-40 animate-pulse rounded-full bg-gray-200" />
      </div>
    )
  }

  if (slices.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">No cleaner data</p>
          <p className="mt-1 text-xs text-gray-400">Adjust filters or date range</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
          {([
            { value: 'spend' as const, label: 'Spend ($)' },
            { value: 'count' as const, label: 'Cleanings (#)' },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                mode === opt.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pie chart with connector labels */}
      <div style={{ height: height + 100 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="45%"
              innerRadius="22%"
              paddingAngle={2}
              animationDuration={800}
              label={renderOuterLabel}
              labelLine={false}
            >
              {slices.map((slice, i) => (
                <Cell key={i} fill={slice.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<DistributionTooltip mode={mode} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary legend below */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
        {slices.map(slice => {
          const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'
          return (
            <div
              key={slice.name}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-xs text-gray-700">{slice.name}</span>
              <span className="ml-auto text-xs font-medium tabular-nums text-gray-900">
                {mode === 'spend' ? formatCurrency(slice.value) : slice.value}
              </span>
              <span className="text-[11px] tabular-nums text-gray-400">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
