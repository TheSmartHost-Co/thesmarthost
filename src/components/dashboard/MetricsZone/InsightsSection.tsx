'use client'

import { useState } from 'react'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import type { PerformanceInsight } from '@/services/types/dashboard'
import { InsightCard } from './InsightCard'

interface InsightsSectionProps {
  insights: PerformanceInsight[]
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ insights }) => {
  const [showAll, setShowAll] = useState(false)

  if (insights.length === 0) {
    return null
  }

  const visibleInsights = showAll ? insights : insights.slice(0, 3)

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
            {insights.length}
          </span>
        </div>
        {insights.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Show Less' : `See More (${insights.length - 3})`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {visibleInsights.map((insight) => (
          <InsightCard key={insight.propertyId} insight={insight} />
        ))}
      </div>
    </div>
  )
}
