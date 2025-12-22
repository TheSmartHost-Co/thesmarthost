'use client'

import { useState, useEffect } from 'react'
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
import { ActionBar } from '@/components/dashboard/ActionBar/ActionBar'
import { AlertsZone } from '@/components/dashboard/AlertsZone/AlertsZone'
import { MetricsGrid } from '@/components/dashboard/MetricsZone/MetricsGrid'
import { InsightsSection } from '@/components/dashboard/MetricsZone/InsightsSection'
import { ActivityFeed } from '@/components/dashboard/MetricsZone/ActivityFeed'

// Modals
import GenerateReportModal from '@/components/report/generate/generateReportModal'
import ViewReportModal from '@/components/report/view/viewReportModal'
import CreateClientModal from '@/components/client/create/createClientModal'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'

export default function DashboardPage() {
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

  const isLoading = loadingProperties || loadingAlerts || loadingMetrics || loadingInsights || loadingActivities

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.fullName}</p>
      </div>

      {/* Zone 1: Action Center */}
      <ActionBar
        onGenerateReport={() => setShowGenerateModal(true)}
        onNewClient={() => setShowCreateClientModal(true)}
        onNewProperty={() => setShowCreatePropertyModal(true)}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && (
        <>
          {/* Zone 2: Needs Attention */}
          {alerts && (
            <AlertsZone
              missingBookings={alerts.missingBookings}
              missingReports={alerts.missingReports}
              showQuickActions={showQuickActions}
            />
          )}

          {/* Zone 3: Operational Pulse */}
          <div className="space-y-6 mt-8">
            {/* Health Metrics */}
            {metrics && <MetricsGrid metrics={metrics} />}

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
        </>
      )}

      {/* Modals */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onReportGenerated={handleReportGenerated}
        properties={properties}
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
