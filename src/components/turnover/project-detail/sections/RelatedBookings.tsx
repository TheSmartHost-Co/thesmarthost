'use client'

import { useTranslation } from 'react-i18next'
import { UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { formatProjectDate } from '../../utils/formatUtils'
import type { RelatedBookingsProps } from '../types'

interface BookingCardProps {
  variant: 'departing' | 'arriving'
  bookingId: string | null | undefined
  guestName: string | null | undefined
  checkIn: string | null | undefined
  checkOut: string | null | undefined
  numGuests: number | null | undefined
  hasPets: boolean | null | undefined
  loadingBookingId: string | null
  onView: (bookingId: string) => void
}

const CARD_TONES = {
  departing: {
    labelKey: 'departingGuest',
    accent: 'border-amber-400',
    hover: 'hover:bg-amber-50/50',
    label: 'text-amber-600',
    action: 'text-amber-500',
  },
  arriving: {
    labelKey: 'arrivingGuest',
    accent: 'border-blue-400',
    hover: 'hover:bg-blue-50/50',
    label: 'text-blue-600',
    action: 'text-blue-500',
  },
} as const

function BookingCard({ variant, bookingId, guestName, checkIn, checkOut, numGuests, hasPets, loadingBookingId, onView }: BookingCardProps) {
  const { t } = useTranslation('turnover')
  const tone = CARD_TONES[variant]

  if (!bookingId) {
    return (
      <div className={`bg-gray-50 rounded-xl p-4 border-l-4 ${tone.accent}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tone.label}`}>{t(tone.labelKey)}</p>
        <p className="text-sm text-gray-400 italic">{t('noBookingLinked')}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onView(bookingId)}
      disabled={!!loadingBookingId}
      className={`group bg-gray-50 ${tone.hover} rounded-xl p-4 border-l-4 ${tone.accent} text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tone.label}`}>{t(tone.labelKey)}</p>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-gray-900">{guestName || t('guestDefault')}</p>
        {checkIn && checkOut ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{formatProjectDate(checkIn)}</span>
            <ArrowRightIcon className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{formatProjectDate(checkOut)}</span>
          </div>
        ) : (
          <>
            {checkIn && (
              <p className="text-xs text-gray-500">{t('checkInLabel')}: {formatProjectDate(checkIn)}</p>
            )}
            {checkOut && (
              <p className="text-xs text-gray-500">{t('checkOutLabel')}: {formatProjectDate(checkOut)}</p>
            )}
          </>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {numGuests != null && numGuests > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
              <span>{numGuests} guest{numGuests !== 1 ? 's' : ''}</span>
            </div>
          )}
          {hasPets && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">🐾 Pet</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        {loadingBookingId === bookingId ? (
          <span className={`text-xs animate-pulse ${tone.action}`}>{t('loading')}</span>
        ) : (
          <span className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${tone.action}`}>{t('viewDetailsArrow')} &rarr;</span>
        )}
      </div>
    </button>
  )
}

/** Departing / arriving booking cards flanking this turnover. */
export default function RelatedBookings({ project, loadingBookingId, onViewBooking }: RelatedBookingsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <BookingCard
        variant="departing"
        bookingId={project.previousBookingId}
        guestName={project.previousBookingGuestName}
        checkIn={project.previousBookingCheckIn}
        checkOut={project.previousBookingCheckOut}
        numGuests={project.previousBookingNumGuests}
        hasPets={project.previousBookingHasPets}
        loadingBookingId={loadingBookingId}
        onView={onViewBooking}
      />
      <BookingCard
        variant="arriving"
        bookingId={project.nextBookingId}
        guestName={project.nextBookingGuestName}
        checkIn={project.nextBookingCheckIn}
        checkOut={project.nextBookingCheckOut}
        numGuests={project.nextBookingNumGuests}
        hasPets={project.nextBookingHasPets}
        loadingBookingId={loadingBookingId}
        onView={onViewBooking}
      />
    </div>
  )
}
