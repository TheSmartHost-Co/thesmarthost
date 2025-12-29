'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { AnalyticsWidget } from '@/components/analytics/AnalyticsWidget'

export default function AnalyticsPage() {
  const { profile } = useUserStore()
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)

  useEffect(() => {
    const loadProperties = async () => {
      if (!profile?.id) return

      try {
        setLoadingProperties(true)
        const res = await getProperties(profile.id)
        if (res.status === 'success') {
          setProperties(res.data)
        }
      } catch (error) {
        console.error('Failed to load properties:', error)
      } finally {
        setLoadingProperties(false)
      }
    }

    loadProperties()
  }, [profile?.id])

  // Loading state for user profile
  if (!profile?.id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25"
          >
            <ChartBarIcon className="w-8 h-8 text-white" />
          </motion.div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-gray-500">Loading your analytics...</p>
        </div>
      </div>
    )
  }

  // Loading properties
  if (loadingProperties) {
    return (
      <div className="space-y-6">
        <Header propertyCount={0} />
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading properties...</p>
          </div>
        </div>
      </div>
    )
  }

  // No properties
  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <Header propertyCount={0} />
        <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No properties found</p>
          <p className="text-sm text-gray-400 mt-1">Add some properties to see analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <Header propertyCount={properties.length} />

      <AnalyticsWidget
        properties={properties}
        compact={false}
        showFilters={true}
        showBreakdowns={true}
        showAIInsights={true}
        showTimeline={true}
        stickyFilters={true}
      />
    </div>
  )
}

function Header({ propertyCount }: { propertyCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Track performance and gain insights across your portfolio</p>
      </div>
      {propertyCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl"
        >
          <SparklesIcon className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            {propertyCount} {propertyCount === 1 ? 'Property' : 'Properties'}
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
