'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type {
  ExpensePropertyBreakdown,
  ExpenseCategoryBreakdown,
} from '@/services/types/expenseAnalytics'
import type { CrossFilter, CategoryInfo } from './useExpenseTimeline'
import { MAX_CATEGORY_STACKS, OTHER_CATEGORY_COLOR, EXPENSE_CHART_COLORS } from './constants'

interface ExpenseBreakdownRowProps {
  byProperty: ExpensePropertyBreakdown[]
  byCategory: ExpenseCategoryBreakdown[]
  categoryMap: Map<string, CategoryInfo>
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
  isLoading: boolean
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export default function ExpenseBreakdownRow({
  byProperty,
  byCategory,
  categoryMap,
  crossFilter,
  onCrossFilter,
  isLoading,
}: ExpenseBreakdownRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-5 pb-5 lg:grid-cols-2">
      <PropertyBarChart
        data={byProperty}
        crossFilter={crossFilter}
        onCrossFilter={onCrossFilter}
        isLoading={isLoading}
      />
      <CategoryDonutChart
        data={byCategory}
        categoryMap={categoryMap}
        crossFilter={crossFilter}
        onCrossFilter={onCrossFilter}
        isLoading={isLoading}
      />
    </div>
  )
}

// --- Property Horizontal Bar Chart ---

function PropertyBarChart({
  data,
  crossFilter,
  onCrossFilter,
  isLoading,
}: {
  data: ExpensePropertyBreakdown[]
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
  isLoading: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const check = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        setReady(true)
        return true
      }
      return false
    }
    if (check()) return
    const interval = setInterval(() => { if (check()) clearInterval(interval) }, 50)
    return () => clearInterval(interval)
  }, [data])

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.current.totalAmount - a.current.totalAmount),
    [data]
  )

  const chartHeight = Math.max(200, sorted.length * 36 + 40)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-gray-200" style={{ width: `${80 - i * 15}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
        <p className="text-sm text-gray-400">No property data</p>
      </div>
    )
  }

  const chartData = sorted.map(item => ({
    name: item.propertyName.length > 20 ? item.propertyName.slice(0, 18) + '…' : item.propertyName,
    fullName: item.propertyName,
    amount: item.current.totalAmount,
    propertyId: item.propertyId,
    contributionPct: item.current.contributionPct,
    delta: item.delta?.totalAmount?.percentage ?? null,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-100 bg-white p-4"
    >
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        By Property
      </h4>
      <div ref={containerRef} style={{ height: chartHeight }}>
        {ready && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(e: any) => {
                const payload = e?.activePayload?.[0]?.payload
                if (payload?.propertyId) {
                  onCrossFilter({ source: 'property', propertyId: payload.propertyId })
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={isMobile ? 80 : 120} tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Amount']}
                contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar
                dataKey="amount"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
                animationDuration={600}
              >
                {chartData.map(entry => {
                  const isActive = crossFilter?.source === 'property' && crossFilter.propertyId === entry.propertyId
                  const isDimmed = crossFilter?.source === 'property' && crossFilter.propertyId !== entry.propertyId
                  return (
                    <Cell
                      key={entry.propertyId ?? entry.name}
                      fill={isActive ? '#059669' : EXPENSE_CHART_COLORS.actual}
                      opacity={isDimmed ? 0.3 : 1}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}

// --- Category Donut Chart ---

function CategoryDonutChart({
  data,
  categoryMap,
  crossFilter,
  onCrossFilter,
  isLoading,
}: {
  data: ExpenseCategoryBreakdown[]
  categoryMap: Map<string, CategoryInfo>
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
  isLoading: boolean
}) {
  const [ready, setReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        setReady(true)
        return true
      }
      return false
    }
    if (check()) return
    const interval = setInterval(() => { if (check()) clearInterval(interval) }, 50)
    return () => clearInterval(interval)
  }, [data])

  const donutData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.current.sharePct - a.current.sharePct)
    const result: { code: string; label: string; value: number; sharePct: number; colorHex: string }[] = []
    let otherValue = 0
    let otherPct = 0

    for (let i = 0; i < sorted.length; i++) {
      const cat = sorted[i]
      const info = categoryMap.get(cat.category)
      if (i < MAX_CATEGORY_STACKS) {
        result.push({
          code: cat.category,
          label: info?.label || cat.category,
          value: cat.current.totalAmount,
          sharePct: cat.current.sharePct,
          colorHex: info?.colorHex || OTHER_CATEGORY_COLOR,
        })
      } else {
        otherValue += cat.current.totalAmount
        otherPct += cat.current.sharePct
      }
    }

    if (otherValue > 0) {
      result.push({
        code: 'OTHER',
        label: 'Other',
        value: otherValue,
        sharePct: otherPct,
        colorHex: OTHER_CATEGORY_COLOR,
      })
    }

    return result
  }, [data, categoryMap])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="flex items-center justify-center py-8">
          <div className="h-40 w-40 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>
    )
  }

  if (donutData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
        <p className="text-sm text-gray-400">No category data</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-gray-100 bg-white p-4"
    >
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        By Category
      </h4>
      <div ref={containerRef} className="flex flex-col items-center">
        {ready && (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  animationDuration={600}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(entry: any) => {
                    if (entry?.code && entry.code !== 'OTHER') {
                      onCrossFilter({ source: 'category', category: entry.code })
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {donutData.map(entry => {
                    const isActive = crossFilter?.source === 'category' && crossFilter.category === entry.code
                    const isDimmed = crossFilter?.source === 'category' && crossFilter.category !== entry.code
                    return (
                      <Cell
                        key={entry.code}
                        fill={entry.colorHex}
                        opacity={isDimmed ? 0.3 : isActive ? 1 : 0.85}
                        stroke={isActive ? entry.colorHex : 'transparent'}
                        strokeWidth={isActive ? 3 : 0}
                      />
                    )
                  })}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Amount']}
                  contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="mt-2 grid w-full grid-cols-2 gap-x-4 gap-y-1">
          {donutData.map(entry => (
            <button
              key={entry.code}
              onClick={() => {
                if (entry.code !== 'OTHER') {
                  onCrossFilter({ source: 'category', category: entry.code })
                }
              }}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-gray-50 ${
                crossFilter?.source === 'category' && crossFilter.category !== entry.code && entry.code !== 'OTHER'
                  ? 'opacity-40'
                  : ''
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.colorHex }}
              />
              <span className="flex-1 truncate text-gray-600">{entry.label}</span>
              <span className="shrink-0 text-gray-400">{entry.sharePct.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
