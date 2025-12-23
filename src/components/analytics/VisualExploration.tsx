'use client'

import { useState } from 'react'
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
  Legend
} from 'recharts'
import type { AnalyticsSummaryData, AnalyticsTimeseriesData } from '@/store/useAnalyticsStore'

interface VisualExplorationProps {
  summaryData: AnalyticsSummaryData | null
  timeseriesData: AnalyticsTimeseriesData | null
  isLoading: boolean
  timeseriesError: string | null
  summaryError: string | null
}

export function VisualExploration({ 
  summaryData, 
  timeseriesData, 
  isLoading, 
  timeseriesError, 
  summaryError 
}: VisualExplorationProps) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'channels' | 'properties'>('revenue')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-CA', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {formatDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.dataKey === 'revenue' || entry.dataKey === 'adr' 
                  ? formatCurrency(entry.value)
                  : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderRevenueChart = () => {
    if (timeseriesError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">Unable to load revenue chart: {timeseriesError}</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      )
    }

    if (!timeseriesData?.properties || timeseriesData.properties.length === 0) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No data available for the selected period</p>
          </div>
        </div>
      )
    }

    // Aggregate revenue across all properties by date
    const revenueByDate = new Map<string, { date: string; displayLabel: string; revenue: number }>()

    timeseriesData.properties.forEach(property => {
      property.timeseries.forEach(point => {
        const existing = revenueByDate.get(point.date)
        if (existing) {
          existing.revenue += point.revenue
        } else {
          revenueByDate.set(point.date, {
            date: point.date,
            displayLabel: point.displayLabel,
            revenue: point.revenue
          })
        }
      })
    })

    const chartData = Array.from(revenueByDate.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (chartData.length === 0) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No revenue data available</p>
            <p className="text-sm mt-2">Try selecting a different date range or uploading booking data</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="displayLabel"
              className="text-sm"
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              className="text-sm"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderChannelChart = () => {
    if (timeseriesError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">Unable to load channel chart: {timeseriesError}</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      )
    }

    // Channel time-series data not available in new API structure
    // Use channel_mix from summary data instead
    return (
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Channel revenue over time</p>
          <p className="text-sm mt-2">Time-series channel data not available</p>
          <p className="text-xs mt-1 text-gray-400">Use the Performance Breakdown section for channel mix analysis</p>
        </div>
      </div>
    )
  }

  const renderPropertyChart = () => {
    if (timeseriesError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">Unable to load property chart: {timeseriesError}</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading chart...</div>
        </div>
      )
    }

    if (!timeseriesData?.properties || timeseriesData.properties.length === 0) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No property data available</p>
          </div>
        </div>
      )
    }

    // Use property summaries from timeseries data
    const propertyData = timeseriesData.properties.map(property => ({
      property_name: property.propertyName,
      revenue: property.summary.totalRevenue
    })).sort((a, b) => b.revenue - a.revenue)

    const hasRevenue = propertyData.some(p => p.revenue > 0)

    if (!hasRevenue) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No property revenue data available</p>
            <p className="text-sm mt-2">Try selecting a different date range or uploading booking data</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={propertyData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value)}
              className="text-sm"
            />
            <YAxis
              type="category"
              dataKey="property_name"
              className="text-sm"
              width={120}
            />
            <Tooltip
              formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Revenue']}
              labelStyle={{ color: '#374151' }}
            />
            <Bar
              dataKey="revenue"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const tabs = [
    { id: 'revenue', label: 'Revenue Over Time', description: 'Track revenue trends' },
    { id: 'channels', label: 'Channel Mix', description: 'Revenue by platform' },
    { id: 'properties', label: 'Property Comparison', description: 'Performance by property' }
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
        {activeTab === 'revenue' && renderRevenueChart()}
        {activeTab === 'channels' && renderChannelChart()}
        {activeTab === 'properties' && renderPropertyChart()}
      </div>
    </div>
  )
}