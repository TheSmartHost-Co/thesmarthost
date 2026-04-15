'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { MonthlyTrendPoint } from '@/services/types/cleanerEarnings'

interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[]
  isLoading?: boolean
}

function formatCAD(value: number): string {
  return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-900 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            ${entry.value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  )
}

const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data, isLoading }) => {
  const { t } = useTranslation('dashboard')

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-[280px] bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!data || data.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        {t('cleanerEarnings.monthlyTrend')}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tickFormatter={formatCAD}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          />
          <Bar
            dataKey="completedEarnings"
            name={t('cleanerEarnings.completedEarnings')}
            fill="#10b981"
            stackId="earnings"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="expectedEarnings"
            name={t('cleanerEarnings.expectedEarnings')}
            fill="#3b82f6"
            stackId="earnings"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="unassignedCost"
            name={t('cleanerEarnings.unassignedCost')}
            fill="#f59e0b"
            stackId="earnings"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MonthlyTrendChart
