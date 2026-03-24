'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { getClientPortalBookings } from '@/services/clientPortalService'
import type { ClientPortalBooking } from '@/services/types/clientPortal'

export default function ClientBookingsPage() {
  const [bookings, setBookings] = useState<ClientPortalBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const filters: { startDate?: string; endDate?: string } = {}
        if (startDate) filters.startDate = startDate
        if (endDate) filters.endDate = endDate
        const res = await getClientPortalBookings(filters)
        if (res.status === 'success') {
          setBookings(res.data)
        }
      } catch (err) {
        console.error('Failed to load bookings:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  const filtered = useMemo(() => {
    if (!search) return bookings
    const q = search.toLowerCase()
    return bookings.filter(
      (b) => b.guestName?.toLowerCase().includes(q) ?? false
    )
  }, [bookings, search])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const statusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">View all bookings across your properties</p>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by guest name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Property</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Guest</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Check-in</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Check-out</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Nights</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Platform</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Payout</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{b.propertyName}</td>
                    <td className="px-4 py-3 text-gray-600">{b.guestName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(b.checkInDate)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(b.checkOutDate)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.numNights ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{b.platform || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {b.totalPayout != null ? `$${b.totalPayout.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(b.bookingStatus)}`}>
                        {b.bookingStatus || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
