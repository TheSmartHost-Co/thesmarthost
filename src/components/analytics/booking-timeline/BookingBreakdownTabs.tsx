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
  Cell,
} from 'recharts'
import type {
  BookingPropertyBreakdown,
  BookingChannelBreakdown,
  BookingSourceBreakdown,
  BookingClientBreakdown,
} from '@/services/types/bookingAnalytics'
import type { CrossFilter } from './useBookingTimeline'
import { BREAKDOWN_TABS, BREAKDOWN_COLORS, type BreakdownTab } from './constants'
import { getChannelDisplayName } from '@/services/channelUtils'

interface BookingBreakdownTabsProps {
  byProperty: BookingPropertyBreakdown[]
  byChannel: BookingChannelBreakdown[]
  bySource: BookingSourceBreakdown[]
  byClient: BookingClientBreakdown[]
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
  activeTab: BreakdownTab
  onTabChange: (tab: BreakdownTab) => void
  isLoading: boolean
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export default function BookingBreakdownTabs({
  byProperty,
  byChannel,
  bySource,
  byClient,
  crossFilter,
  onCrossFilter,
  activeTab,
  onTabChange,
  isLoading,
}: BookingBreakdownTabsProps) {
  if (isLoading) {
    return (
      <div className="px-5 pb-5">
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-gray-200" style={{ width: `${80 - i * 15}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-5">
      {/* Tab strip */}
      <div className="mb-3 flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
        {BREAKDOWN_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'property' && (
        <PropertyBreakdownChart
          data={byProperty}
          crossFilter={crossFilter}
          onCrossFilter={onCrossFilter}
        />
      )}
      {activeTab === 'channel' && (
        <ChannelBreakdownChart
          data={byChannel}
          crossFilter={crossFilter}
          onCrossFilter={onCrossFilter}
        />
      )}
      {activeTab === 'source' && (
        <SourceBreakdownChart
          data={bySource}
          crossFilter={crossFilter}
          onCrossFilter={onCrossFilter}
        />
      )}
      {activeTab === 'client' && (
        <ClientBreakdownChart
          data={byClient}
          crossFilter={crossFilter}
          onCrossFilter={onCrossFilter}
        />
      )}
    </div>
  )
}

// --- Property Breakdown ---

function PropertyBreakdownChart({
  data,
  crossFilter,
  onCrossFilter,
}: {
  data: BookingPropertyBreakdown[]
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
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
    () => [...data].sort((a, b) => (b.current.contribution_pct ?? 0) - (a.current.contribution_pct ?? 0)),
    [data]
  )

  const chartHeight = Math.max(200, sorted.length * 36 + 40)

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
        <p className="text-sm text-gray-400">No property data</p>
      </div>
    )
  }

  const chartData = sorted.map((item, i) => ({
    name: item.propertyName.length > 20 ? item.propertyName.slice(0, 18) + '...' : item.propertyName,
    fullName: item.propertyName,
    amount: item.current.total_payout,
    propertyId: item.propertyId,
    contributionPct: item.current.contribution_pct,
    color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-4">
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
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-gray-900">{d.fullName}</p>
                      <p className="text-gray-600">Payout: <span className="font-medium">{formatCurrency(d.amount)}</span></p>
                      <p className="text-gray-600">Share: <span className="font-medium">{d.contributionPct?.toFixed(1)}%</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={600}>
                {chartData.map(entry => {
                  const isActive = crossFilter?.source === 'property' && crossFilter.propertyId === entry.propertyId
                  const isDimmed = crossFilter?.source === 'property' && crossFilter.propertyId !== entry.propertyId
                  return (
                    <Cell
                      key={entry.propertyId}
                      fill={isActive ? '#1D4ED8' : entry.color}
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

// --- Channel Breakdown ---

function ChannelBreakdownChart({
  data,
  crossFilter,
  onCrossFilter,
}: {
  data: BookingChannelBreakdown[]
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const check = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) { setReady(true); return true }
      return false
    }
    if (check()) return
    const interval = setInterval(() => { if (check()) clearInterval(interval) }, 50)
    return () => clearInterval(interval)
  }, [data])

  const sorted = useMemo(
    () => [...data].sort((a, b) => (b.current.payout_share_pct ?? 0) - (a.current.payout_share_pct ?? 0)),
    [data]
  )

  const chartHeight = Math.max(200, sorted.length * 36 + 40)

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
        <p className="text-sm text-gray-400">No channel data</p>
      </div>
    )
  }

  const chartData = sorted.map((item, i) => ({
    name: getChannelDisplayName(item.channel),
    channel: item.channel,
    amount: item.current.total_payout,
    sharePct: item.current.payout_share_pct,
    color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-4">
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
                if (payload?.channel) {
                  onCrossFilter({ source: 'channel', channel: payload.channel })
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={isMobile ? 80 : 120} tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <p className="text-gray-600">Payout: <span className="font-medium">{formatCurrency(d.amount)}</span></p>
                      <p className="text-gray-600">Share: <span className="font-medium">{d.sharePct?.toFixed(1)}%</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={600}>
                {chartData.map(entry => {
                  const isActive = crossFilter?.source === 'channel' && crossFilter.channel === entry.channel
                  const isDimmed = crossFilter?.source === 'channel' && crossFilter.channel !== entry.channel
                  return (
                    <Cell key={entry.channel} fill={isActive ? '#1D4ED8' : entry.color} opacity={isDimmed ? 0.3 : 1} />
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

// --- Source Breakdown ---

function SourceBreakdownChart({
  data,
  crossFilter,
  onCrossFilter,
}: {
  data: BookingSourceBreakdown[]
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const check = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) { setReady(true); return true }
      return false
    }
    if (check()) return
    const interval = setInterval(() => { if (check()) clearInterval(interval) }, 50)
    return () => clearInterval(interval)
  }, [data])

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.current.total_payout - a.current.total_payout),
    [data]
  )

  const chartHeight = Math.max(160, sorted.length * 36 + 40)

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
        <p className="text-sm text-gray-400">No source data</p>
      </div>
    )
  }

  const sourceLabels: Record<string, string> = { csv: 'CSV Import', ical: 'iCal Sync', webhook: 'Webhook', manual: 'Manual Entry' }

  const chartData = sorted.map((item, i) => ({
    name: sourceLabels[item.source] || item.source,
    sourceValue: item.source,
    amount: item.current.total_payout,
    bookings: item.current.booking_count,
    color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-4">
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
                if (payload?.sourceValue) {
                  onCrossFilter({ source: 'sourceType', sourceValue: payload.sourceValue })
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={isMobile ? 80 : 120} tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <p className="text-gray-600">Payout: <span className="font-medium">{formatCurrency(d.amount)}</span></p>
                      <p className="text-gray-600">Bookings: <span className="font-medium">{d.bookings}</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={600}>
                {chartData.map(entry => {
                  const isActive = crossFilter?.source === 'sourceType' && crossFilter.sourceValue === entry.sourceValue
                  const isDimmed = crossFilter?.source === 'sourceType' && crossFilter.sourceValue !== entry.sourceValue
                  return (
                    <Cell key={entry.sourceValue} fill={isActive ? '#1D4ED8' : entry.color} opacity={isDimmed ? 0.3 : 1} />
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

// --- Client Breakdown ---

function ClientBreakdownChart({
  data,
  crossFilter,
  onCrossFilter,
}: {
  data: BookingClientBreakdown[]
  crossFilter: CrossFilter | null
  onCrossFilter: (cf: CrossFilter) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const check = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) { setReady(true); return true }
      return false
    }
    if (check()) return
    const interval = setInterval(() => { if (check()) clearInterval(interval) }, 50)
    return () => clearInterval(interval)
  }, [data])

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.current.total_payout - a.current.total_payout),
    [data]
  )

  const chartHeight = Math.max(200, sorted.length * 36 + 40)

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8">
        <p className="text-sm text-gray-400">No client data</p>
      </div>
    )
  }

  const chartData = sorted.map((item, i) => ({
    name: item.clientName.length > 20 ? item.clientName.slice(0, 18) + '...' : item.clientName,
    fullName: item.clientName,
    clientId: item.clientId,
    amount: item.current.total_payout,
    bookings: item.current.booking_count,
    color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-100 bg-white p-4">
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
                if (payload?.clientId) {
                  onCrossFilter({ source: 'client', clientId: payload.clientId })
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={isMobile ? 80 : 120} tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-gray-900">{d.fullName}</p>
                      <p className="text-gray-600">Payout: <span className="font-medium">{formatCurrency(d.amount)}</span></p>
                      <p className="text-gray-600">Bookings: <span className="font-medium">{d.bookings}</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={600}>
                {chartData.map(entry => {
                  const isActive = crossFilter?.source === 'client' && crossFilter.clientId === entry.clientId
                  const isDimmed = crossFilter?.source === 'client' && crossFilter.clientId !== entry.clientId
                  return (
                    <Cell key={entry.clientId} fill={isActive ? '#1D4ED8' : entry.color} opacity={isDimmed ? 0.3 : 1} />
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
