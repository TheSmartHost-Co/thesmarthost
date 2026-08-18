'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationTriangleIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { getBookingOnDate, getNextVacantDates } from '@/services/maintenanceTaskService'
import { parseLocalDate } from '@/utils/dateUtils'
import type { BookingOnDateResponse } from '@/services/types/maintenanceTask'

export interface ReservationAwarenessProps {
  propertyId: string | null | undefined
  date: string
  onSelectDate: (date: string) => void
}

type BookingOnDate = NonNullable<BookingOnDateResponse['data']>

function formatDisplayDate(dateStr: string): string {
  const datePart = dateStr.split('T')[0]
  const parsed = parseLocalDate(datePart)
  if (isNaN(parsed.getTime())) return datePart
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Amber warning banner shown under the date field when the selected
 * property+date falls inside an active reservation. Offers the next vacant
 * dates as clickable chips. Debounces the booking lookup (~300ms).
 */
export default function ReservationAwareness({ propertyId, date, onSelectDate }: ReservationAwarenessProps) {
  const { t } = useTranslation('turnover')

  const [booking, setBooking] = useState<BookingOnDate | null>(null)
  const [vacantDates, setVacantDates] = useState<string[]>([])
  const [loadingVacant, setLoadingVacant] = useState(false)
  const [vacantChecked, setVacantChecked] = useState(false)

  // Debounced booking-on-date lookup
  useEffect(() => {
    setVacantDates([])
    setVacantChecked(false)
    setLoadingVacant(false)

    if (!propertyId || !date) {
      setBooking(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await getBookingOnDate(propertyId, date)
        if (cancelled) return
        if (res.status === 'success') {
          setBooking(res.data)
        } else {
          setBooking(null)
        }
      } catch (err) {
        console.error('Error checking booking on date:', err)
        if (!cancelled) setBooking(null)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [propertyId, date])

  const handleFindVacant = async () => {
    if (!propertyId || loadingVacant) return
    setLoadingVacant(true)
    try {
      const res = await getNextVacantDates(propertyId, date, 3)
      if (res.status === 'success') {
        setVacantDates(res.data)
      } else {
        setVacantDates([])
      }
    } catch (err) {
      console.error('Error fetching vacant dates:', err)
      setVacantDates([])
    } finally {
      setLoadingVacant(false)
      setVacantChecked(true)
    }
  }

  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  {booking.guestName || t('taskGuest')}
                  {booking.checkInDate && booking.checkOutDate && (
                    <span className="font-normal text-amber-700">
                      {' '}· {formatDisplayDate(booking.checkInDate)} → {formatDisplayDate(booking.checkOutDate)}
                    </span>
                  )}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {t('duringReservationWarning')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFindVacant}
              disabled={loadingVacant}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {loadingVacant ? (
                <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              ) : (
                <CalendarDaysIcon className="w-4 h-4" />
              )}
              {t('findVacantTime')}
            </button>

            {vacantChecked && (
              vacantDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {vacantDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onSelectDate(d)}
                      className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-sm rounded-full hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors"
                    >
                      {formatDisplayDate(d)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700">{t('noVacantDatesFound')}</p>
              )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
