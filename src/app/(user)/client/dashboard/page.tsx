'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HomeModernIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { getClientPortalDashboard } from '@/services/clientPortalService'
import type {
  ClientPortalDashboardStats,
  ClientPortalBookingSummary,
  ClientPortalCleaningSummary,
} from '@/services/types/clientPortal'

export default function ClientDashboardPage() {
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

  const statCards = [
    { label: 'Properties', value: stats?.propertyCount ?? 0, icon: HomeModernIcon, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Upcoming Bookings', value: stats?.upcomingBookings ?? 0, icon: CalendarDaysIcon, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Cleanings', value: stats?.activeCleaningProjects ?? 0, icon: SparklesIcon, color: 'bg-amber-50 text-amber-600' },
    { label: 'Open Issues', value: stats?.openIssues ?? 0, icon: ExclamationTriangleIcon, color: 'bg-red-50 text-red-600' },
  ]

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const statusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const cleaningStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'in_progress': return 'bg-amber-100 text-amber-700'
      case 'assigned': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white shadow-lg"
      >
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.fullName?.split(' ')[0] || 'there'}
        </h1>
        <p className="mt-1 text-emerald-100">
          Here is an overview of your properties and upcoming activity.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-white p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white shadow-sm border border-gray-100"
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-5 text-center text-sm text-gray-400">No recent bookings</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentBookings.slice(0, 5).map((b) => (
                <li key={b.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.propertyName}</p>
                    <p className="text-xs text-gray-500">
                      {b.guestName || 'No guest name'} &middot; {formatDate(b.checkInDate)} &ndash; {formatDate(b.checkOutDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {b.totalPayout != null && (
                      <span className="text-sm font-medium text-gray-900">${b.totalPayout.toFixed(2)}</span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(b.bookingStatus)}`}>
                      {b.bookingStatus || 'N/A'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Upcoming Cleaning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-white shadow-sm border border-gray-100"
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Cleaning</h2>
          </div>
          {upcomingCleaning.length === 0 ? (
            <div className="p-5 text-center text-sm text-gray-400">No upcoming cleaning projects</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcomingCleaning.slice(0, 5).map((c) => (
                <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.propertyName}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(c.projectDate)}
                      {c.projectStartTime ? ` at ${c.projectStartTime}` : ''}
                      {c.cleanerName ? ` \u00b7 ${c.cleanerName}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ml-3 ${cleaningStatusColor(c.status)}`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  )
}
