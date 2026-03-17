'use client'

import { useDraggable } from '@dnd-kit/core'
import type { Booking } from '@/services/types/booking'
import { parseLocalDate } from '@/utils/dateUtils'
import type { BookingDragData } from './types'

function computeNumNights(booking: Booking): number {
  if (!booking.checkOutDate) return booking.numNights
  const checkIn = parseLocalDate(booking.checkInDate)
  const checkOut = parseLocalDate(booking.checkOutDate)
  const diff = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : booking.numNights
}

interface DraggableBookingProps {
  booking: Booking
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: (e: React.MouseEvent) => void
  isActivated?: boolean
  onOpenModal?: () => void
}

export default function DraggableBooking({
  booking,
  children,
  style,
  className,
  onClick,
  isActivated = false,
  onOpenModal,
}: DraggableBookingProps) {
  const dragData: BookingDragData = {
    type: 'booking',
    booking,
    numNights: computeNumNights(booking),
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: dragData,
    disabled: !isActivated,
  })

  return (
    <div
      ref={setNodeRef}
      {...(isActivated ? listeners : {})}
      {...(isActivated ? attributes : {})}
      data-dnd-item
      data-no-drag
      className={className}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        cursor: isActivated ? 'grab' : 'pointer',
      }}
      onClick={onClick}
    >
      {children}
      {isActivated && onOpenModal && (
        <button
          className="absolute top-0.5 right-0.5 z-10 w-5 h-5 flex items-center justify-center rounded bg-white/80 shadow-sm border border-gray-200 hover:bg-white text-gray-500 hover:text-gray-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onOpenModal()
          }}
          title="Open details"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
