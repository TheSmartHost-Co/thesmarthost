'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { PropertyTimeseries } from '@/store/useAnalyticsStore'

interface PropertyAnalyticsChartProps {
  properties: PropertyTimeseries[]
  isLoading: boolean
  onMetricChange?: (metric: 'revenue' | 'payout' | 'bookings' | 'adr') => void
}

const PROPERTY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
]

type MetricType = 'revenue' | 'payout' | 'bookings' | 'adr'

export function PropertyAnalyticsChart({
  properties,
  isLoading,
  onMetricChange
}: PropertyAnalyticsChartProps) {
  const [activeTab, setActiveTab] = useState<MetricType>('revenue')

  const handleTabChange = (tab: MetricType) => {
    setActiveTab(tab)
    onMetricChange?.(tab)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-CA').format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              {activeTab === 'revenue' || activeTab === 'payout' || activeTab === 'adr'
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Transform data for Recharts
  const getChartData = () => {
    if (!properties || properties.length === 0) return []

    // Get all unique dates across all properties
    const allDates = new Set<string>()
    properties.forEach(property => {
      property.timeseries.forEach(point => {
        allDates.add(point.date)
      })
    })

    // Sort dates
    const sortedDates = Array.from(allDates).sort()

    // Build chart data
    return sortedDates.map(date => {
      const dataPoint: any = {
        date,
        displayLabel: properties[0]?.timeseries.find(t => t.date === date)?.displayLabel || date
      }

      properties.forEach(property => {
        const timePoint = property.timeseries.find(t => t.date === date)
        dataPoint[property.propertyName] = timePoint?.[activeTab] || 0
      })

      return dataPoint
    })
  }

  const chartData = getChartData()

  const tabs = [
    { id: 'revenue', label: 'Revenue', description: 'Gross revenue over time' },
    { id: 'payout', label: 'Payout', description: 'Net payout to owners' },
    { id: 'bookings', label: 'Bookings', description: 'Number of bookings' },
    { id: 'adr', label: 'Avg Nightly Rate', description: 'Average daily rate' }
  ] as const

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm mt-1">Select properties and adjust date range to view analytics</p>
          </div>
        </div>
      )
    }

    const yAxisFormatter = (activeTab === 'revenue' || activeTab === 'payout' || activeTab === 'adr')
      ? formatCurrency
      : formatNumber

    return (
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="displayLabel"
              className="text-sm"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={yAxisFormatter}
              className="text-sm"
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            {properties.map((property, index) => (
              <Line
                key={property.propertyId}
                type="monotone"
                dataKey={property.propertyName}
                stroke={PROPERTY_COLORS[index % PROPERTY_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name={property.propertyName}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-100">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div>
                <div>{tab.label}</div>
                <div className="text-xs text-gray-400 mt-1">{tab.description}</div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        {renderChart()}
      </div>
    </div>
  )
}
