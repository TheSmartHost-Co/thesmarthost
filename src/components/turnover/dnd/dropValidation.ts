import type { ProjectDragData, BookingDragData, InvalidDropInfo } from './types'
import type { Booking } from '@/services/types/booking'
import { toLocalDateStr, addDays } from '../utils/calendarDateUtils'
import { formatLocalDate } from '@/utils/dateUtils'

function todayStr(): string {
  return formatLocalDate(new Date())
}

/**
 * Validate a cleaning project drop. Returns InvalidDropInfo if invalid, null if valid.
 */
export function validateProjectDrop(
  projectData: ProjectDragData,
  targetDate: string,
): InvalidDropInfo | null {
  const itemName = projectData.project.propertyName || 'Cleaning'

  // Past date check
  if (targetDate < todayStr()) {
    return { itemName, targetDate, reason: 'past_date', boundaryDate: todayStr() }
  }

  // Before previous checkout
  if (projectData.previousBookingCheckOut && targetDate < projectData.previousBookingCheckOut) {
    return { itemName, targetDate, reason: 'before_checkout', boundaryDate: projectData.previousBookingCheckOut }
  }

  // After next check-in — use > (not >=) so check-in day IS allowed for same-day turnover
  if (projectData.nextBookingCheckIn && targetDate > projectData.nextBookingCheckIn) {
    return { itemName, targetDate, reason: 'after_checkin', boundaryDate: projectData.nextBookingCheckIn }
  }

  return null
}

/**
 * Validate a project drop in cleaner view — only reassignment (same date) is allowed.
 */
export function validateCleanerViewDrop(
  projectData: ProjectDragData,
  targetDate: string,
  sourceDate: string,
): InvalidDropInfo | null {
  if (targetDate !== sourceDate) {
    return {
      itemName: projectData.project.propertyName || 'Cleaning',
      targetDate,
      reason: 'date_change_not_allowed',
      boundaryDate: sourceDate,
    }
  }
  return null
}

/**
 * Validate a booking drop. Returns InvalidDropInfo if invalid, null if valid.
 */
export function validateBookingDrop(
  bookingData: BookingDragData,
  targetDate: string,
  allBookings: Booking[],
): InvalidDropInfo | null {
  const itemName = bookingData.booking.guestName || 'Booking'

  // Past date check
  if (targetDate < todayStr()) {
    return { itemName, targetDate, reason: 'past_date', boundaryDate: todayStr() }
  }

  // Overlap check — compute new date range
  const newCheckIn = targetDate
  const newCheckOut = addDays(targetDate, bookingData.numNights)

  // Find sibling bookings on the same property (excluding self)
  const siblings = allBookings.filter(
    b => b.propertyId === bookingData.booking.propertyId && b.id !== bookingData.booking.id
  )

  for (const sib of siblings) {
    const sibCheckIn = toLocalDateStr(sib.checkInDate)
    const sibCheckOut = sib.checkOutDate ? toLocalDateStr(sib.checkOutDate) : addDays(sibCheckIn, sib.numNights)

    // Half-open interval overlap: newCheckIn < sibCheckOut && sibCheckIn < newCheckOut
    if (newCheckIn < sibCheckOut && sibCheckIn < newCheckOut) {
      return {
        itemName,
        targetDate,
        reason: 'booking_overlap',
        boundaryDate: sibCheckIn,
        conflictingBookingName: sib.guestName,
      }
    }
  }

  return null
}
