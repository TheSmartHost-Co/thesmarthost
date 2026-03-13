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
}

export default function DraggableBooking({
  booking,
  children,
  style,
  className,
  onClick,
}: DraggableBookingProps) {
  const dragData: BookingDragData = {
    type: 'booking',
    booking,
    numNights: computeNumNights(booking),
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-dnd-item
      data-no-drag
      className={className}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
