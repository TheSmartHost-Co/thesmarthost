'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { SparklesIcon, CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { getClientPortalCleaningProjects, getClientPortalProperties, getClientPortalBookings } from '@/services/clientPortalService'
import type { ClientPortalCleaningProject, ClientPortalProperty, ClientPortalBooking } from '@/services/types/clientPortal'
import { formatLocalDate } from '@/utils/dateUtils'
import ClientCalendarHeader from '@/components/client-portal/cleaning/ClientCalendarHeader'
import ClientCalendar from '@/components/client-portal/cleaning/ClientCalendar'
import PreviewClientBookingModal from '@/components/client-portal/booking/PreviewClientBookingModal'

function getMonday(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'in_progress':
      return 'bg-amber-100 text-amber-700'
    case 'assigned':
      return 'bg-blue-100 text-blue-700'
    case 'cancelled':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function ClientCleaningPage() {
  const { t } = useTranslation('clientPortal')
  // Calendar state
  const [startDate, setStartDate] = useState<Date>(() => getMonday(new Date()))
  const [zoomDays, setZoomDays] = useState(14)

  const endDate = useMemo(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + zoomDays - 1)
    return d
  }, [startDate, zoomDays])

  // Data state
  const [properties, setProperties] = useState<ClientPortalProperty[]>([])
  const [bookings, setBookings] = useState<ClientPortalBooking[]>([])
  const [cleaningProjects, setCleaningProjects] = useState<ClientPortalCleaningProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<ClientPortalBooking | null>(null)

  // Fetch data when date range changes
  const fetchData = useCallback(async (start: Date, end: Date) => {
    setLoading(true)
    try {
      const startStr = formatLocalDate(start)
      const endStr = formatLocalDate(end)

      const [propsRes, bookingsRes, cleaningRes] = await Promise.all([
        getClientPortalProperties(),
        getClientPortalBookings({ startDate: startStr, endDate: endStr }),
        getClientPortalCleaningProjects({ startDate: startStr, endDate: endStr }),
      ])

      if (propsRes.status === 'success') setProperties(propsRes.data)
      if (bookingsRes.status === 'success') setBookings(bookingsRes.data)
      if (cleaningRes.status === 'success') setCleaningProjects(cleaningRes.data)
    } catch (err) {
      console.error('Failed to load schedule data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(startDate, endDate)
  }, [startDate, endDate, fetchData])

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setStartDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - zoomDays)
      return d
    })
  }, [zoomDays])

  const handleNext = useCallback(() => {
    setStartDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + zoomDays)
      return d
    })
  }, [zoomDays])

  const handleToday = useCallback(() => {
    setStartDate(getMonday(new Date()))
  }, [])

  const handleZoomChange = useCallback((days: number) => {
    setZoomDays(days)
  }, [])

  // Sort cleaning projects by date for the list below
  const sortedCleanings = useMemo(() => {
    return [...cleaningProjects].sort((a, b) => {
      const dateA = a.projectDate.split('T')[0]
      const dateB = b.projectDate.split('T')[0]
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return (a.projectStartTime || '').localeCompare(b.projectStartTime || '')
    })
  }, [cleaningProjects])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('scheduleTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('scheduleSubtitle')}
        </p>
      </div>

      {/* Calendar Header */}
      <ClientCalendarHeader
        startDate={startDate}
        endDate={endDate}
        zoomDays={zoomDays}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onZoomChange={handleZoomChange}
      />

      {/* Calendar */}
      {loading ? (
        <div className="flex items-center justify-center h-64 rounded-xl bg-white border border-gray-100 shadow-sm">
          <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <ClientCalendar
          properties={properties}
          bookings={bookings}
          cleaningProjects={cleaningProjects}
          startDate={startDate}
          endDate={endDate}
          onBookingClick={setSelectedBooking}
        />
      )}

      {/* Cleaning Projects List */}
      {!loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('cleaningProjects')}
            </h2>
            <span className="text-sm text-gray-400">({sortedCleanings.length})</span>
          </div>

          {sortedCleanings.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400 rounded-xl bg-white border border-gray-100 shadow-sm">
              {t('noCleaningProjectsInRange')}
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedCleanings.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left content */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0 mt-0.5">
                        <SparklesIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Property + status */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {project.propertyName}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 capitalize ${statusBadgeClass(project.status)}`}
                          >
                            {project.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Address */}
                        {project.propertyAddress && (
                          <p className="text-xs text-gray-400 truncate">{project.propertyAddress}</p>
                        )}

                        {/* Date & time */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-3.5 w-3.5 text-gray-400" />
                            {formatDisplayDate(project.projectDate)}
                          </span>
                          {project.projectStartTime && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                              {formatTime12(project.projectStartTime)}
                              {project.projectEndTime ? ` - ${formatTime12(project.projectEndTime)}` : ''}
                            </span>
                          )}
                          {project.estimatedDurationMinutes != null && project.estimatedDurationMinutes > 0 && (
                            <span className="text-gray-400">
                              Est. {formatDuration(project.estimatedDurationMinutes)}
                            </span>
                          )}
                        </div>

                        {/* Cleaner */}
                        {project.cleanerName && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span>{project.cleanerName}</span>
                          </div>
                        )}

                        {/* Guest turnover context */}
                        {(project.previousBookingCheckOut || project.nextBookingCheckIn) && (
                          <div className="flex flex-col gap-0.5 text-[11px] text-gray-400 border-t border-gray-100 pt-2 mt-1">
                            {project.previousBookingCheckOut && (
                              <span>
                                Guest checking out: {formatDisplayDate(project.previousBookingCheckOut)}
                              </span>
                            )}
                            {project.nextBookingCheckIn && (
                              <span>
                                Next guest{project.nextBookingGuestName ? `: ${project.nextBookingGuestName}` : ''} checking in: {formatDisplayDate(project.nextBookingCheckIn)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* PM Notes */}
                        {project.pmNotes && (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-1">
                            <span className="font-medium text-gray-600">Note:</span> {project.pmNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Preview Modal */}
      {selectedBooking && (
        <PreviewClientBookingModal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          booking={selectedBooking}
        />
      )}
    </div>
  )
}
