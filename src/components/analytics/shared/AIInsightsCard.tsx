'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { getAIInsights } from '@/services/analyticsService'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'
import type { AIInsightsData } from '@/services/types/analytics'

interface AIInsightsCardProps {
  className?: string
}

export function AIInsightsCard({ className = '' }: AIInsightsCardProps) {
  const { aiInsights, isLoadingAI, aiError, setAIInsights, setLoadingAI, setAIError } = useAnalyticsStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchInsights = async () => {
    setLoadingAI(true)
    setAIError(null)

    try {
      const res = await getAIInsights()
      if (res.status === 'success') {
        setAIInsights(res.data)
      } else {
        setAIError(res.message || 'Failed to load insights')
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err)
      setAIError('Network error occurred')
    } finally {
      setLoadingAI(false)
      setHasFetched(true)
    }
  }

  useEffect(() => {
    if (!hasFetched && !aiInsights) {
      fetchInsights()
    }
  }, [hasFetched, aiInsights])

  // Don't render if no insights are available
  if (!isLoadingAI && aiInsights && !aiInsights.available) {
    return null
  }

  // Don't render if there was an error and we've already tried
  if (hasFetched && aiError && !aiInsights) {
    return null
  }

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
                    <p className="text-sm text-gray-500">Generating insights...</p>
                  </div>
                </div>
              ) : aiError ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <ExclamationTriangleIcon className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Unable to load insights</p>
                    <button
                      onClick={fetchInsights}
                      className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : aiInsights && aiInsights.available ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-violet-400">
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
