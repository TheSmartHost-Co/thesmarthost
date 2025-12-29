'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { getAIInsights, getWeekRange } from '@/services/analyticsService'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'

interface AIInsightsCardProps {
  className?: string
  maxWeeksBack?: number  // How many weeks to try before giving up
}

const MAX_WEEKS_TO_TRY = 8  // Try up to 8 weeks back

export function AIInsightsCard({ className = '', maxWeeksBack = MAX_WEEKS_TO_TRY }: AIInsightsCardProps) {
  const { aiInsights, isLoadingAI, aiError, setAIInsights, setLoadingAI, setAIError } = useAnalyticsStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [noDataAvailable, setNoDataAvailable] = useState(false)
  const fetchAttemptedRef = useRef(false)

  const fetchInsights = async (startFromWeek: number = 0) => {
    setLoadingAI(true)
    setAIError(null)
    setNoDataAvailable(false)

    let weekOffset = startFromWeek

    try {
      // Try fetching from current week, then go back if unavailable
      while (weekOffset < maxWeeksBack) {
        const { startDate, endDate } = getWeekRange(weekOffset)
        console.log(`[AI Insights] Trying week ${weekOffset}: ${startDate} to ${endDate}`)

        const res = await getAIInsights(startDate, endDate)

        if (res.status === 'success') {
          if (res.data.available === true) {
            // Found data - save it and stop
            console.log(`[AI Insights] Found data at week ${weekOffset}`)
            setAIInsights(res.data)
            setCurrentWeekOffset(weekOffset)
            setLoadingAI(false)
            setHasFetched(true)
            return
          } else {
            // No data for this week, try previous
            console.log(`[AI Insights] No data for week ${weekOffset}, trying previous week`)
            weekOffset++
          }
        } else {
          // API error - stop trying
          setAIError(res.message || 'Failed to load insights')
          setLoadingAI(false)
          setHasFetched(true)
          return
        }
      }

      // Exhausted all weeks without finding data
      console.log(`[AI Insights] No data found after checking ${maxWeeksBack} weeks`)
      setNoDataAvailable(true)
      setLoadingAI(false)
      setHasFetched(true)
    } catch (err) {
      console.error('Error fetching AI insights:', err)
      setAIError('Network error occurred')
      setLoadingAI(false)
      setHasFetched(true)
    }
  }

  useEffect(() => {
    // Only fetch once on mount
    if (!fetchAttemptedRef.current && !aiInsights) {
      fetchAttemptedRef.current = true
      fetchInsights()
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={`relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-purple-50/50 to-indigo-50/80 ${className}`}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-200/30 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <div
        className="relative flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">AI Weekly Insights</h3>
              <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-violet-100 text-violet-700 rounded">
                Beta
              </span>
            </div>
            {aiInsights && aiInsights.available && (
              <p className="text-xs text-gray-500 mt-0.5">
                {aiInsights.period.label}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              fetchInsights()
            }}
            disabled={isLoadingAI}
            className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoadingAI ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg transition-colors">
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="relative px-4 pb-4">
              {isLoadingAI ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Searching for insights...</p>
                  </div>
                </div>
              ) : aiError ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <ExclamationTriangleIcon className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Unable to load insights</p>
                    <button
                      onClick={() => fetchInsights(0)}
                      className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : noDataAvailable ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <CalendarDaysIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No booking data found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      AI insights require at least one complete week of bookings
                    </p>
                  </div>
                </div>
              ) : aiInsights && aiInsights.available ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-violet-400">
                  {currentWeekOffset > 0 && (
                    <div className="mb-3 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-amber-700 flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        Showing insights from {currentWeekOffset} {currentWeekOffset === 1 ? 'week' : 'weeks'} ago (most recent available)
                      </p>
                    </div>
                  )}
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold text-gray-900 mb-3">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1.5">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="text-sm text-gray-600 space-y-1 my-2 pl-4">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="relative pl-2">
                          <span className="absolute -left-2 text-violet-400">•</span>
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">{children}</strong>
                      ),
                    }}
                  >
                    {aiInsights.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">No insights available for this period</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {aiInsights && aiInsights.available && (
              <div className="relative px-4 pb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-violet-100">
                  <span>
                    Covering {aiInsights.meta.propertyCount} {aiInsights.meta.propertyCount === 1 ? 'property' : 'properties'}
                  </span>
                  <span>
                    Generated {new Date(aiInsights.meta.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
