'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useCleanerEarningsStore } from '@/store/useCleanerEarningsStore'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { motion } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { getProperties } from '@/services/propertyService'
import { getCleaners } from '@/services/cleanerService'
import { getClientsByParentId } from '@/services/clientService'
import type { Cleaner } from '@/services/types/cleaner'
import type { Client } from '@/services/types/client'
import {
  getDashboardAlerts,
  getDashboardMetrics,
  getDashboardActivity,
  clearDashboardCache,
} from '@/services/dashboardService'
import type { Property } from '@/services/types/property'
import type {
  DashboardAlerts,
  DashboardMetrics,
  DashboardActivity,
} from '@/services/types/dashboard'

// Dashboard components
import { AlertsZone } from '@/components/dashboard/AlertsZone/AlertsZone'
import { MetricsGrid } from '@/components/dashboard/MetricsZone/MetricsGrid'
import { ActivityFeed } from '@/components/dashboard/MetricsZone/ActivityFeed'
import RadialActionWheel, {
  getDefaultDashboardActions,
} from '@/components/dashboard/RadialActionWheel/RadialActionWheel'

// Timeline Charts
import { ExpenseTimelineChart } from '@/components/analytics/expense-timeline'
import { CleanerAnalyticsWidget } from '@/components/analytics/cleaner-timeline'
import { BookingTimelineChart } from '@/components/analytics/booking-timeline'

// Modals
import GenerateReportModal from '@/components/report/generate/generateReportModal'
import ViewReportModal from '@/components/report/view/viewReportModal'
import CreateClientModal from '@/components/client/create/createClientModal'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'
import CreateCleanerModal from '@/components/cleaner/create/createCleanerModal'
import CreateTeamMemberModal from '@/components/team-member/create/CreateTeamMemberModal'
import CreateProjectModal from '@/components/turnover/create/CreateProjectModal'
import ScanReceiptModal from '@/components/expenses/scan/ScanReceiptModal'

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useTranslation('dashboard')
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()
  const cleanerEarningsStore = useCleanerEarningsStore()
  usePermissionGuard('dashboard')
  const { effectiveUserId, canWrite } = usePermissions()

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [activities, setActivities] = useState<DashboardActivity[]>([])

  // Loading states
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showViewReportModal, setShowViewReportModal] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState('')
  const [showCreateClientModal, setShowCreateClientModal] = useState(false)
  const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false)
  const [showCreateCleanerModal, setShowCreateCleanerModal] = useState(false)
  const [showCreateTeamMemberModal, setShowCreateTeamMemberModal] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false)
  const [preSelectedPropertyId, setPreSelectedPropertyId] = useState<string | null>(null)

  // ── Data Loading ──

  useEffect(() => {
    if (effectiveUserId) loadAllData()
  }, [profile, effectiveUserId])

  const loadAllData = async () => {
    await Promise.all([
      loadProperties(),
      loadCleaners(),
      loadClients(),
      loadAlerts(),
      loadMetrics(),
      loadActivities(),
    ])
    setLastRefreshed(new Date())
  }

  const loadProperties = async () => {
    try {
      setLoadingProperties(true)
      const res = await getProperties(effectiveUserId!)
      if (res.status === 'success') setProperties(res.data || [])
      else showNotification(res.message || t('failedToLoadProperties'), 'error')
    } catch (err) {
      console.error('Error loading properties:', err)
    } finally {
      setLoadingProperties(false)
    }
  }

  const loadCleaners = async () => {
    try {
      const res = await getCleaners(effectiveUserId!)
      if (res.status === 'success') setCleaners(res.data || [])
    } catch (err) {
      console.error('Error loading cleaners:', err)
    }
  }

  const loadClients = async () => {
    try {
      const res = await getClientsByParentId(effectiveUserId!)
      if (res.status === 'success') setClients(res.data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
    }
  }

  const loadAlerts = async () => {
    try {
      setLoadingAlerts(true)
      const res = await getDashboardAlerts()
      if (res.status === 'success') setAlerts(res.data)
      else showNotification(res.message || t('failedToLoadAlerts'), 'error')
    } catch (err) {
      console.error('Error loading alerts:', err)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const loadMetrics = async () => {
    try {
      setLoadingMetrics(true)
      const res = await getDashboardMetrics()
      if (res.status === 'success') setMetrics(res.data)
      else showNotification(res.message || t('failedToLoadMetrics'), 'error')
    } catch (err) {
      console.error('Error loading metrics:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const loadActivities = async () => {
    try {
      setLoadingActivities(true)
      const res = await getDashboardActivity(20)
      if (res.status === 'success') setActivities(res.data.activities || [])
      else showNotification(res.message || t('failedToLoadActivities'), 'error')
    } catch (err) {
      console.error('Error loading activities:', err)
    } finally {
      setLoadingActivities(false)
    }
  }

  // ── Handlers ──

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await clearDashboardCache()
      cleanerEarningsStore.reset()
      await loadAllData()
      showNotification(t('refreshed'), 'success')
    } catch (err) {
      console.error('Error refreshing dashboard:', err)
      showNotification(t('failedToRefresh'), 'error')
    } finally {
      setIsRefreshing(false)
    }
  }, [effectiveUserId])

  const handleReportGenerated = async () => {
    await loadActivities()
    await loadMetrics()
  }

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId)
    setShowViewReportModal(true)
  }

  const handleReportUpdated = async () => {
    await loadActivities()
    await loadMetrics()
  }

  const handleClientAdded = async () => {
    await loadActivities()
  }

  const handlePropertyAdded = async () => {
    await loadProperties()
    await loadActivities()
    await loadAlerts()
  }

  const handleGenerateReportForProperty = (propertyId: string) => {
    setPreSelectedPropertyId(propertyId)
    setShowGenerateModal(true)
  }

  const formatLastRefreshed = () => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastRefreshed.getTime()) / 60000)
    if (diff < 1) return 'Just now'
    if (diff === 1) return '1 min ago'
    return `${diff} min ago`
  }

  const SectionSkeleton = ({ height = 'h-48' }: { height?: string }) => (
    <div className={`${height} animate-pulse rounded-xl bg-gray-100`} />
  )

  // Analytics tab state
  const [analyticsTab, setAnalyticsTab] = useState<'both' | 'bookings' | 'expenses' | 'cleaners'>('both')

  // Map cleaners/clients to option shapes
  const cleanerOptions = cleaners.map(c => ({ id: c.id, name: c.name }))
  const clientOptions = clients.map(c => ({ id: c.id, name: c.name }))

  // Radial wheel actions
  const wheelActions = canWrite('dashboard')
    ? getDefaultDashboardActions({
        onAddClient: () => setShowCreateClientModal(true),
        onAddProperty: () => setShowCreatePropertyModal(true),
        onAddCleaner: () => setShowCreateCleanerModal(true),
        onAddTeamMember: () => setShowCreateTeamMemberModal(true),
        onGenerateReport: () => setShowGenerateModal(true),
        onCreateProject: () => setShowCreateProjectModal(true),
        onUploadCSV: () => router.push('/property-manager/upload-bookings'),
        onScanReceipt: () => setShowScanReceiptModal(true),
      })
    : []

  return (
    <div className="space-y-4 pb-8 sm:space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {t('welcomeBack', { name: profile?.fullName })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Updated {formatLastRefreshed()}</span>
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* ── Metrics Grid (full width) ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {loadingMetrics ? (
          <SectionSkeleton height="h-20" />
        ) : (
          metrics && <MetricsGrid metrics={metrics} />
        )}
      </motion.div>

      {/* ── Two-Column: Main + Sidebar ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Content — tabbed analytics + booking chart */}
        <div className="space-y-6">
          {/* Analytics tab strip */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {([
              { key: 'both', label: 'All Analytics' },
              { key: 'bookings', label: 'Bookings' },
              { key: 'expenses', label: 'Expenses' },
              { key: 'cleaners', label: 'Cleaners' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setAnalyticsTab(tab.key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  analyticsTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Cleaner Analytics (shown in 'both' and 'cleaners') */}
          {effectiveUserId && (analyticsTab === 'both' || analyticsTab === 'cleaners') && (
            <motion.div
              key={`cleaner-${analyticsTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <CleanerAnalyticsWidget
                userId={effectiveUserId}
                properties={properties}
                cleaners={cleanerOptions}
                height={320}
              />
            </motion.div>
          )}

          {/* Expense Timeline (shown in 'both' and 'expenses') */}
          {effectiveUserId && (analyticsTab === 'both' || analyticsTab === 'expenses') && (
            <motion.div
              key={`expense-${analyticsTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: analyticsTab === 'both' ? 0.2 : 0.1 }}
            >
              <ExpenseTimelineChart
                userId={effectiveUserId}
                properties={properties}
                height={320}
              />
            </motion.div>
          )}

          {/* Booking Analytics (shown in 'both' and 'bookings') */}
          {effectiveUserId && (analyticsTab === 'both' || analyticsTab === 'bookings') && (
            <motion.div
              key={`bookings-${analyticsTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: analyticsTab === 'both' ? 0.3 : 0.1 }}
            >
              <BookingTimelineChart
                userId={effectiveUserId}
                properties={properties}
                clients={clientOptions}
                height={320}
              />
            </motion.div>
          )}
        </div>

        {/* Sidebar — Alerts + Activity (sticky) */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {loadingAlerts ? (
            <SectionSkeleton height="h-32" />
          ) : (
            alerts && (
              <AlertsZone
                missingBookings={alerts.missingBookings}
                missingReports={alerts.missingReports}
                showQuickActions={false}
                onGenerateReport={handleGenerateReportForProperty}
              />
            )
          )}

          {loadingActivities ? (
            <SectionSkeleton height="h-48" />
          ) : (
            <ActivityFeed activities={activities} onViewReport={handleViewReport} />
          )}
        </div>
      </div>

      {/* ── Radial Action Wheel (FAB) ── */}
      {canWrite('dashboard') && <RadialActionWheel actions={wheelActions} />}

      {/* ── Modals ── */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false)
          setPreSelectedPropertyId(null)
        }}
        onReportGenerated={handleReportGenerated}
        properties={properties}
        initialPropertyIds={preSelectedPropertyId ? [preSelectedPropertyId] : []}
      />

      {selectedReportId && (
        <ViewReportModal
          isOpen={showViewReportModal}
          onClose={() => {
            setShowViewReportModal(false)
            setSelectedReportId('')
          }}
          reportId={selectedReportId}
          onReportUpdated={handleReportUpdated}
        />
      )}

      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onAdd={handleClientAdded}
      />

      <CreatePropertyModal
        isOpen={showCreatePropertyModal}
        onClose={() => setShowCreatePropertyModal(false)}
        onAdd={handlePropertyAdded}
      />

      <CreateCleanerModal
        isOpen={showCreateCleanerModal}
        onClose={() => setShowCreateCleanerModal(false)}
        onAdd={() => setShowCreateCleanerModal(false)}
      />

      <CreateTeamMemberModal
        isOpen={showCreateTeamMemberModal}
        onClose={() => setShowCreateTeamMemberModal(false)}
        onAdd={() => setShowCreateTeamMemberModal(false)}
      />

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onAdd={() => setShowCreateProjectModal(false)}
        properties={properties}
        cleaners={cleaners}
      />

      <ScanReceiptModal
        isOpen={showScanReceiptModal}
        onClose={() => setShowScanReceiptModal(false)}
        onExpenseCreated={() => setShowScanReceiptModal(false)}
      />
    </div>
  )
}
