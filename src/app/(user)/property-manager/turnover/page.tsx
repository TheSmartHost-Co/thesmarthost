'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { getProperties } from '@/services/propertyService'
import { getCleaners } from '@/services/cleanerService'
import type { Property } from '@/services/types/property'
import type { Cleaner } from '@/services/types/cleaner'
import TurnoverCalendar from '@/components/turnover/TurnoverCalendar'
import SyncCleaningModal from '@/components/cleaning-project/sync/SyncCleaningModal'
import { useDeepLink, type DeepLinkResult, type DeepLinkSection } from '@/hooks/useDeepLink'

/**
 * Inner component that reads search params (requires Suspense boundary).
 * Passes deep-link data down to TurnoverCalendar as props.
 */
function TurnoverCalendarWithDeepLink({
  properties,
  cleaners,
  refreshKey,
  forcedProjectId,
}: {
  properties: Property[]
  cleaners: Cleaner[]
  refreshKey: number
  forcedProjectId: string | null
}) {
  const [calendarReady, setCalendarReady] = useState(false)
  const [deepLink, setDeepLink] = useState<DeepLinkResult>({
    projectId: null,
    section: null,
    view: null,
  })

  const handleDeepLink = useCallback((result: DeepLinkResult) => {
    setDeepLink(result)
  }, [])

  useDeepLink(handleDeepLink, calendarReady)

  return (
    <TurnoverCalendar
      key={refreshKey}
      initialProperties={properties}
      initialCleaners={cleaners}
      deepLinkProjectId={forcedProjectId ?? deepLink.projectId}
      deepLinkSection={deepLink.section}
      deepLinkView={deepLink.view}
      onCalendarReady={() => setCalendarReady(true)}
    />
  )
}

export default function TurnoverPage() {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { t } = useTranslation('turnover')
  usePermissionGuard('turnover')
  const { effectiveUserId, canWrite } = usePermissions()

  const [properties, setProperties] = useState<Property[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncOpen, setSyncOpen] = useState(false)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [forcedProjectId, setForcedProjectId] = useState<string | null>(null)

  const handleSyncComplete = useCallback(
    (createdCount: number) => {
      if (createdCount > 0) {
        showNotification(
          `Created ${createdCount} cleaning project${createdCount === 1 ? '' : 's'}`,
          'success'
        )
        // Clear before bump so the post-sync remount doesn't re-open a stale project.
        setForcedProjectId(null)
        setCalendarRefreshKey((k) => k + 1)
      }
    },
    [showNotification]
  )

  const handleOpenProjectFromSync = useCallback((projectId: string) => {
    setSyncOpen(false)
    setForcedProjectId(projectId)
    // Remount the calendar so its deep-link effect fires for the new projectId.
    setCalendarRefreshKey((k) => k + 1)
  }, [])

  // Fetch properties and cleaners on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveUserId) return

      setLoading(true)
      setError(null)

      try {
        const [propertiesRes, cleanersRes] = await Promise.all([
          getProperties(effectiveUserId),
          getCleaners(effectiveUserId),
        ])

        if (propertiesRes.status === 'success') {
          setProperties(propertiesRes.data)
        } else {
          throw new Error(propertiesRes.message || 'Failed to fetch properties')
        }

        if (cleanersRes.status === 'success') {
          setCleaners(cleanersRes.data)
        } else {
          throw new Error(cleanersRes.message || 'Failed to fetch cleaners')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data'
        setError(message)
        showNotification(message, 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [effectiveUserId, showNotification])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Calendar Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="h-10 w-64 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 w-48 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="h-96 bg-gray-50 animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingData')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Empty state - no properties
  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <CalendarDaysIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noPropertiesYet')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Add properties to your account to start scheduling turnover projects for cleanings.
          </p>
          <motion.a
            href="/property-manager/properties"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 mt-6 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Properties
          </motion.a>
        </motion.div>
      </div>
    )
  }

  // Empty state - no cleaners
  if (cleaners.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <CalendarDaysIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noCleanersYet')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Add cleaners to your team to start assigning turnover projects.
          </p>
          <motion.a
            href="/property-manager/cleaners"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 mt-6 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Cleaners
          </motion.a>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-2 sm:space-y-3 pt-4 sm:pt-6">
      {/* Header - compact inline */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{t('title')}</h1>
          <span className="text-sm text-gray-400 hidden sm:inline">—</span>
          <p className="text-sm text-gray-400 hidden sm:block">{t('subtitle')}</p>
        </div>
        {canWrite('turnover') && (
          <motion.button
            type="button"
            onClick={() => setSyncOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Sync Cleaning</span>
            <span className="sm:hidden">Sync</span>
          </motion.button>
        )}
      </div>

      {/* Calendar with deep-link support (Suspense required for useSearchParams) */}
      <Suspense fallback={null}>
        <TurnoverCalendarWithDeepLink
          properties={properties}
          cleaners={cleaners}
          refreshKey={calendarRefreshKey}
          forcedProjectId={forcedProjectId}
        />
      </Suspense>

      {effectiveUserId && (
        <SyncCleaningModal
          isOpen={syncOpen}
          onClose={() => setSyncOpen(false)}
          userId={effectiveUserId}
          properties={properties}
          onSyncComplete={handleSyncComplete}
          onOpenProject={handleOpenProjectFromSync}
        />
      )}
    </div>
  )
}
