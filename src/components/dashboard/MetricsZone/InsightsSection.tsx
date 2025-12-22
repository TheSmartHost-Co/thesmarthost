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
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Performance Insights</h3>
            <p className="text-xs text-gray-600">Properties with significant changes</p>
          </div>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
            {insights.length}
          </span>
        </div>
        {insights.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
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
