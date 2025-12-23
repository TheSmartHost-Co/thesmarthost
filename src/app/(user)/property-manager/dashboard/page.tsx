'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import {
  getDashboardAlerts,
  getDashboardMetrics,
  getDashboardInsights,
  getDashboardActivity,
} from '@/services/dashboardService'
import type { Property } from '@/services/types/property'
import type {
  DashboardAlerts,
  DashboardMetrics,
  PerformanceInsight,
  DashboardActivity,
} from '@/services/types/dashboard'

// Dashboard components
import { AlertsZone } from '@/components/dashboard/AlertsZone/AlertsZone'
import { MetricsGrid } from '@/components/dashboard/MetricsZone/MetricsGrid'
import { InsightsSection } from '@/components/dashboard/MetricsZone/InsightsSection'
import { ActivityFeed } from '@/components/dashboard/MetricsZone/ActivityFeed'
import { PropertyAnalyticsSection } from '@/components/dashboard/PropertyAnalytics/PropertyAnalyticsSection'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'

// Modals
import GenerateReportModal from '@/components/report/generate/generateReportModal'
import ViewReportModal from '@/components/report/view/viewReportModal'
import CreateClientModal from '@/components/client/create/createClientModal'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'

export default function DashboardPage() {
  const router = useRouter()
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [insights, setInsights] = useState<PerformanceInsight[]>([])
  const [activities, setActivities] = useState<DashboardActivity[]>([])

  // Loading states
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)

  // UI state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showViewReportModal, setShowViewReportModal] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState('')
  const [showCreateClientModal, setShowCreateClientModal] = useState(false)
  const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [preSelectedPropertyId, setPreSelectedPropertyId] = useState<string | null>(null)

  // Load all dashboard data
  useEffect(() => {
    if (profile?.id) {
      loadAllData()
    }
  }, [profile])

  const loadAllData = async () => {
    await Promise.all([
      loadProperties(),
      loadAlerts(),
      loadMetrics(),
      loadInsights(),
      loadActivities(),
    ])
  }

  const loadProperties = async () => {
    try {
      setLoadingProperties(true)
      const res = await getProperties(profile!.id)
      if (res.status === 'success') {
        setProperties(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load properties', 'error')
      }
    } catch (err) {
      console.error('Error loading properties:', err)
    } finally {
      setLoadingProperties(false)
    }
  }

  const loadAlerts = async () => {
    try {
      setLoadingAlerts(true)
      const res = await getDashboardAlerts()
      if (res.status === 'success') {
        setAlerts(res.data)
      } else {
        showNotification(res.message || 'Failed to load alerts', 'error')
      }
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
      if (res.status === 'success') {
        setMetrics(res.data)
      } else {
        showNotification(res.message || 'Failed to load metrics', 'error')
      }
    } catch (err) {
      console.error('Error loading metrics:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const loadInsights = async () => {
    try {
      setLoadingInsights(true)
      const res = await getDashboardInsights(5)
      if (res.status === 'success') {
        setInsights(res.data.insights || [])
      } else {
        showNotification(res.message || 'Failed to load insights', 'error')
      }
    } catch (err) {
      console.error('Error loading insights:', err)
    } finally {
      setLoadingInsights(false)
    }
  }

  const loadActivities = async () => {
    try {
      setLoadingActivities(true)
      const res = await getDashboardActivity(20)
      if (res.status === 'success') {
        setActivities(res.data.activities || [])
      } else {
        showNotification(res.message || 'Failed to load activities', 'error')
      }
    } catch (err) {
      console.error('Error loading activities:', err)
    } finally {
      setLoadingActivities(false)
    }
  }

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

  const isLoading = loadingProperties || loadingAlerts || loadingMetrics || loadingInsights || loadingActivities

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {profile?.fullName}</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.fullName}</p>
        </div>
      </div>

      {/* Zone 1: Health Metrics */}
      {metrics && <MetricsGrid metrics={metrics} />}

      {/* Zone 2: Property Analytics */}
      {profile?.id && properties.length > 0 && (
        <PropertyAnalyticsSection
          availableProperties={properties}
          userId={profile.id}
        />
      )}

      {/* Zone 3: Needs Attention */}
      {alerts && (
        <AlertsZone
          missingBookings={alerts.missingBookings}
          missingReports={alerts.missingReports}
          showQuickActions={showQuickActions}
          onGenerateReport={handleGenerateReportForProperty}
        />
      )}

      {/* Zone 4: Insights & Activity */}
      <div className="space-y-6">
        {/* Performance Insights */}
        {insights.length > 0 && (
          <InsightsSection insights={insights} />
        )}

        {/* Recent Activity Feed */}
        <ActivityFeed
          activities={activities}
          onViewReport={handleViewReport}
        />
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onUploadCSV={() => router.push('/property-manager/upload-bookings')}
        onGenerateReport={() => setShowGenerateModal(true)}
        onNewClient={() => setShowCreateClientModal(true)}
        onNewProperty={() => setShowCreatePropertyModal(true)}
      />

      {/* Modals */}
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
    </div>
  )
}
