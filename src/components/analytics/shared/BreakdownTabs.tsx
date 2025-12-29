'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  HomeModernIcon,
  SignalIcon,
  TableCellsIcon,
  ChartBarIcon,
  ChartPieIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import type { PropertyBreakdown, ChannelBreakdown } from '@/services/types/analytics'

type TabType = 'property' | 'channel'
type ViewType = 'table' | 'bar' | 'pie'

interface BreakdownTabsProps {
  byProperty: PropertyBreakdown[]
  byChannel: ChannelBreakdown[]
  isLoading?: boolean
  onPropertyClick?: (propertyId: string, propertyName: string) => void
  onChannelClick?: (channel: string) => void
  className?: string
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16']

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 p-4"
    >
      <p className="font-medium text-gray-900 mb-2">{data.name}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Payout:</span>
          <span className="font-medium">${data.totalPayout?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Net:</span>
          <span className="font-medium">${data.netEarnings?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Share:</span>
          <span className="font-medium">{data.contributionPct?.toFixed(1) || data.payoutSharePct?.toFixed(1)}%</span>
        </div>
      </div>
    </motion.div>
  )
}

function DeltaBadge({ percentage }: { percentage: number }) {
  const isPositive = percentage > 0
  const isNegative = percentage < 0

  return (
    <span
      className={`
        inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium
        ${isPositive ? 'bg-emerald-50 text-emerald-700' : ''}
        ${isNegative ? 'bg-rose-50 text-rose-700' : ''}
        ${!isPositive && !isNegative ? 'bg-gray-50 text-gray-500' : ''}
      `}
    >
      {isPositive && <ArrowUpIcon className="w-3 h-3" />}
      {isNegative && <ArrowDownIcon className="w-3 h-3" />}
      {Math.abs(percentage).toFixed(1)}%
    </span>
  )
}

function PropertyTable({
  data,
  onRowClick,
}: {
  data: PropertyBreakdown[]
  onRowClick?: (propertyId: string, propertyName: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Property
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payout
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Net Earnings
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Share
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Change
            </th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((property, index) => (
            <motion.tr
              key={property.propertyId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onRowClick?.(property.propertyId, property.propertyName)}
              className={`
                border-b border-gray-50 last:border-0
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
              `}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-gray-900 text-sm">{property.propertyName}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-sm text-gray-900 font-medium">
                {formatCurrency(property.current.totalPayout)}
              </td>
              <td className="py-3 px-4 text-right text-sm text-gray-600">
                {formatCurrency(property.current.netEarnings)}
              </td>
              <td className="py-3 px-4 text-right text-sm text-gray-600">
                {property.current.contributionPct.toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right">
                {property.delta && (
                  <DeltaBadge percentage={property.delta.totalPayout.percentage} />
                )}
              </td>
              <td className="py-3 px-4">
                {onRowClick && (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChannelTable({
  data,
  onRowClick,
}: {
  data: ChannelBreakdown[]
  onRowClick?: (channel: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Channel
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payout
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bookings
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Share
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Change
            </th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((channel, index) => (
            <motion.tr
              key={channel.channel}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onRowClick?.(channel.channel)}
              className={`
                border-b border-gray-50 last:border-0
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
              `}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-gray-900 text-sm">{channel.channel}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-sm text-gray-900 font-medium">
                {formatCurrency(channel.current.totalPayout)}
              </td>
              <td className="py-3 px-4 text-right text-sm text-gray-600">
                {channel.current.bookingCount}
              </td>
              <td className="py-3 px-4 text-right text-sm text-gray-600">
                {channel.current.payoutSharePct.toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right">
                {channel.delta && (
                  <DeltaBadge percentage={channel.delta.totalPayout.percentage} />
                )}
              </td>
              <td className="py-3 px-4">
                {onRowClick && (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BarChartView({ data }: { data: Array<{ name: string; totalPayout: number; netEarnings: number }> }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
          <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#374151', fontSize: 12 }}
            width={120}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalPayout" name="Total Payout" fill="#10b981" radius={[0, 4, 4, 0]} />
          <Bar dataKey="netEarnings" name="Net Earnings" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PieChartView({
  data,
}: {
  data: Array<{ name: string; value: number; contributionPct?: number; payoutSharePct?: number }>
}) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BreakdownTabs({
  byProperty,
  byChannel,
  isLoading,
  onPropertyClick,
  onChannelClick,
  className = '',
}: BreakdownTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('property')
  const [viewType, setViewType] = useState<ViewType>('table')

  // Transform data for charts
  const propertyChartData = byProperty.map((p) => ({
    name: p.propertyName,
    totalPayout: p.current.totalPayout,
    netEarnings: p.current.netEarnings,
    contributionPct: p.current.contributionPct,
    value: p.current.totalPayout,
  }))

  const channelChartData = byChannel.map((c) => ({
    name: c.channel,
    totalPayout: c.current.totalPayout,
    netEarnings: c.current.netEarnings,
    payoutSharePct: c.current.payoutSharePct,
    value: c.current.totalPayout,
  }))

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex gap-4 mb-6">
            <div className="h-10 w-32 bg-gray-200 rounded-lg" />
            <div className="h-10 w-32 bg-gray-200 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
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
          {/* Tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('property')}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${activeTab === 'property'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <HomeModernIcon className="w-4 h-4" />
              By Property
              <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-xs">
                {byProperty.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('channel')}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${activeTab === 'channel'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <SignalIcon className="w-4 h-4" />
              By Channel
              <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-xs">
                {byChannel.length}
              </span>
            </button>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewType('table')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-all duration-200
                ${viewType === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <TableCellsIcon className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setViewType('bar')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-all duration-200
                ${viewType === 'bar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <ChartBarIcon className="w-4 h-4" />
              Bar
            </button>
            <button
              onClick={() => setViewType('pie')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-all duration-200
                ${viewType === 'pie'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <ChartPieIcon className="w-4 h-4" />
              Pie
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${viewType}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'property' ? (
              viewType === 'table' ? (
                <PropertyTable data={byProperty} onRowClick={onPropertyClick} />
              ) : viewType === 'bar' ? (
                <BarChartView data={propertyChartData} />
              ) : (
                <PieChartView data={propertyChartData} />
              )
            ) : (
              viewType === 'table' ? (
                <ChannelTable data={byChannel} onRowClick={onChannelClick} />
              ) : viewType === 'bar' ? (
                <BarChartView data={channelChartData} />
              ) : (
                <PieChartView data={channelChartData} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
