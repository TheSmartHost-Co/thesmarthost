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

    if (!timeseriesData?.revenue_over_time || timeseriesData.revenue_over_time.length === 0) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No data available for the selected period</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeseriesData.revenue_over_time}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
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

    if (!timeseriesData?.channel_revenue_over_time || timeseriesData.channel_revenue_over_time.length === 0) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No channel data available</p>
          </div>
        </div>
      )
    }

    // Transform data for stacked area chart
    const transformedData = timeseriesData.revenue_over_time.map(timePoint => {
      const channelData = timeseriesData.channel_revenue_over_time.filter(
        channel => channel.date === timePoint.date
      )
      
      const result: any = { date: timePoint.date }
      channelData.forEach(channel => {
        result[channel.platform] = channel.revenue
      })
      
      return result
    })

    const platforms = [...new Set(timeseriesData.channel_revenue_over_time.map(item => item.platform))]
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={transformedData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-sm"
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              className="text-sm"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {platforms.map((platform, index) => (
              <Area
                key={platform}
                type="monotone"
                dataKey={platform}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.7}
                name={platform.toUpperCase()}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderPropertyChart = () => {
    if (summaryError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">Unable to load property chart: {summaryError}</p>
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

    if (!summaryData?.property_contribution || summaryData.property_contribution.length === 0) {
      return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No property data available</p>
          </div>
        </div>
      )
    }

    const sortedProperties = [...summaryData.property_contribution]
      .sort((a, b) => b.revenue - a.revenue)

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedProperties} layout="horizontal">
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
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
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