'use client'

import { useRouter } from 'next/navigation'
import type { PerformanceInsight } from '@/services/types/dashboard'
import { TrendIndicator } from '../shared/TrendIndicator'
import { Sparkline } from '../shared/Sparkline'

interface InsightCardProps {
  insight: PerformanceInsight
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const router = useRouter()

  const handleViewAnalytics = () => {
    router.push(`/property-manager/analytics?propertyId=${insight.propertyId}`)
  }

  const handleViewBookings = () => {
    router.push(`/property-manager/bookings?propertyId=${insight.propertyId}`)
  }

  const isPositive = insight.direction === 'up'
  const metricLabel =
    insight.metric === 'revenue' ? 'Revenue' :
    insight.metric === 'adr' ? 'ADR' :
    'Nights'

  return (
    <div className="bg-white border-l-4 border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">{insight.propertyName}</h4>
            <TrendIndicator
              direction={insight.direction}
              percentChange={Math.abs(insight.percentChange)}
            />
          </div>

          <p className="text-sm text-gray-700 mb-3">
            <span className="font-medium">{metricLabel}</span> {isPositive ? 'up' : 'down'}{' '}
            <span className="font-semibold">
              ${insight.currentValue.toLocaleString()}
            </span>{' '}
            (was ${insight.previousValue.toLocaleString()})
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Revenue:</span> ${insight.currentRevenue.toLocaleString()} → ${insight.previousRevenue.toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Nights:</span> {insight.currentNights} → {insight.previousNights}
            </div>
            <div>
              <span className="font-medium">ADR:</span> ${insight.currentAdr.toFixed(0)} → ${insight.previousAdr.toFixed(0)}
            </div>
          </div>

          {/* Sparkline */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Trend:</span>
            <Sparkline
              currentValue={insight.currentValue}
              previousValue={insight.previousValue}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleViewAnalytics}
            className="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            View Analytics
          </button>
          {insight.metric === 'revenue' && (
            <button
              onClick={handleViewBookings}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              View Bookings
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
