'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { getClientPortalDashboard } from '@/services/clientPortalService'
import { ClientMetricsGrid } from '@/components/client-portal/dashboard/ClientMetricsGrid'
import { RecentBookingsList } from '@/components/client-portal/dashboard/RecentBookingsList'
import { UpcomingCleaningList } from '@/components/client-portal/dashboard/UpcomingCleaningList'
import type {
  ClientPortalDashboardStats,
  ClientPortalBookingSummary,
  ClientPortalCleaningSummary,
} from '@/services/types/clientPortal'

export default function ClientDashboardPage() {
  const { t } = useTranslation('clientPortal')
  const profile = useUserStore((s) => s.profile)
  const [stats, setStats] = useState<ClientPortalDashboardStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<ClientPortalBookingSummary[]>([])
  const [upcomingCleaning, setUpcomingCleaning] = useState<ClientPortalCleaningSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getClientPortalDashboard()
        if (res.status === 'success') {
          setStats(res.data.stats)
          setRecentBookings(res.data.recentBookings)
          setUpcomingCleaning(res.data.upcomingCleaning)
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">{t('loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white shadow-lg"
      >
        <h1 className="text-2xl font-bold">
          {t('welcomeBack', { name: profile?.fullName?.split(' ')[0] || 'there' })}
        </h1>
        <p className="mt-1 text-emerald-100 text-sm">
          {t('dashboardOverview')}
        </p>
      </motion.div>

      {/* Metrics Grid */}
      {stats && <ClientMetricsGrid stats={stats} />}

      {/* Two-column: Recent Bookings + Upcoming Cleaning */}
      <div className="grid lg:grid-cols-2 gap-5">
        <RecentBookingsList bookings={recentBookings} />
        <UpcomingCleaningList cleanings={upcomingCleaning} />
      </div>
    </div>
  )
}
