import type { Booking } from '@/services/types/booking'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { timeToFraction, minutesToDayFraction } from './calendarDateUtils'

export interface PositionedBooking {
  booking: Booking
  startColIndex: number    // index into allDates (can be < 0 if before range)
  endColIndex: number      // exclusive end column
  checkinOffset: number    // 0-1 fraction of check-in time within day
  checkoutOffset: number   // 0-1 fraction of checkout time within day
}

export interface PositionedProject {
  project: CleaningProject
  colIndex: number         // index into allDates (-1 if not visible)
  startOffset: number      // 0-1 fraction within day for checkout time (bar start)
  endOffset: number        // 0-1 fraction within day for checkin time (bar end)
}

// Compute positioned bookings relative to allDates columns
export function layoutBookings(
  bookings: Booking[],
  allDates: string[],
): PositionedBooking[] {
  if (allDates.length === 0) return []

  const dateIndex = new Map<string, number>()
  allDates.forEach((d, i) => dateIndex.set(d, i))

  const rangeStart = allDates[0]
  const rangeEnd = allDates[allDates.length - 1]

  return bookings
    .map(booking => {
      const checkIn = booking.checkInDate.slice(0, 10)
      const checkOut = booking.checkOutDate?.slice(0, 10) || checkIn

      // Skip if booking doesn't overlap the rendered range at all
      if (checkOut < rangeStart || checkIn > rangeEnd) return null

      // Compute column indices (may be outside allDates range)
      let startIdx = dateIndex.get(checkIn)
      if (startIdx === undefined) {
        // Booking starts before our range
        startIdx = checkIn < rangeStart ? 0 : allDates.length
      }

      let endIdx = dateIndex.get(checkOut)
      if (endIdx === undefined) {
        // Booking ends after our range
        endIdx = checkOut > rangeEnd ? allDates.length - 1 : -1
      }

      return {
        booking,
        startColIndex: startIdx,
        endColIndex: endIdx + 1, // exclusive
        checkinOffset: timeToFraction(booking.defaultCheckinTime, 15 / 24),
        checkoutOffset: timeToFraction(booking.defaultCheckoutTime, 11 / 24),
      }
    })
    .filter((b): b is PositionedBooking => b !== null)
}

// Compute positioned projects relative to allDates columns
export function layoutProjects(
  projects: CleaningProject[],
  allDates: string[],
): PositionedProject[] {
  const dateIndex = new Map<string, number>()
  allDates.forEach((d, i) => dateIndex.set(d, i))

  return projects
    .map(project => {
      // Bug fix: normalize date to YYYY-MM-DD (backend may return with time component)
      const colIndex = dateIndex.get(project.scheduledDate.slice(0, 10)) ?? -1
      let startOffset = timeToFraction(project.checkoutTime, 11 / 24)
      let endOffset = timeToFraction(project.checkinTime, 15 / 24)

      // Duration-aware widening: if estimatedDurationMinutes gives a wider bar, use it
      if (
        project.estimatedDurationMinutes &&
        !project.isSameDayTurnover
      ) {
        const durationFraction = minutesToDayFraction(project.estimatedDurationMinutes)
        const naturalSpan = endOffset - startOffset
        if (durationFraction > naturalSpan && naturalSpan > 0) {
          const midpoint = (startOffset + endOffset) / 2
          startOffset = Math.max(0, midpoint - durationFraction / 2)
          endOffset = Math.min(1, midpoint + durationFraction / 2)
        }
      }

      return {
        project,
        colIndex,
        startOffset,
        endOffset,
      }
    })
    .filter(p => p.colIndex !== -1)
}

// Helpers for variable-width columns (used by click-to-expand feature)
export function getColumnLeft(
  colIndex: number,
  allDates: string[],
  expandedDate: string | null,
  slotWidth: number,
): number {
  let left = 0
  for (let i = 0; i < colIndex && i < allDates.length; i++) {
    left += allDates[i] === expandedDate ? slotWidth * 4 : slotWidth
  }
  return left
}

export function getColumnWidth(
  dateStr: string,
  expandedDate: string | null,
  slotWidth: number,
): number {
  return dateStr === expandedDate ? slotWidth * 4 : slotWidth
}
