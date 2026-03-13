import type { Booking } from '@/services/types/booking'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { toLocalDateStr } from './calendarDateUtils'

// Continuous fraction: hour/24 so 11AM = 11/24 ≈ 0.458
export function timeToFraction(timeStr: string | null | undefined, fallback: number): number {
  if (!timeStr) return fallback
  const parts = timeStr.split(':').map(Number)
  return (parts[0] + (parts[1] || 0) / 60) / 24
}

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
  startOffset: number      // 0-1 fraction within day for bar start
  endOffset: number        // 0-1 fraction within day for bar end
  stackIndex: number       // vertical stack position (0-based)
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
      const checkIn = toLocalDateStr(booking.checkInDate)
      const checkOut = booking.checkOutDate ? toLocalDateStr(booking.checkOutDate) : checkIn

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
        checkinOffset: timeToFraction(booking.defaultCheckinTime, 0.625),  // 3PM default
        checkoutOffset: timeToFraction(booking.defaultCheckoutTime, 0.458),  // 11AM default
      }
    })
    .filter((b): b is PositionedBooking => b !== null)
}

// Compute positioned projects relative to allDates columns
// stackIndex is left at 0; use applyProjectStacking() to compute stacking by grouping key
export function layoutProjects(
  projects: CleaningProject[],
  allDates: string[],
): PositionedProject[] {
  const dateIndex = new Map<string, number>()
  allDates.forEach((d, i) => dateIndex.set(d, i))

  return projects
    .map(project => {
      const colIndex = dateIndex.get(toLocalDateStr(project.projectDate)) ?? -1
      const startOffset = 0
      const endOffset = 1  // span entire day column

      return {
        project,
        colIndex,
        startOffset,
        endOffset,
        stackIndex: 0,
      }
    })
    .filter(p => p.colIndex !== -1)
}

// Apply vertical stacking to positioned projects.
// getGroupKey extracts the grouping key (e.g. propertyId or cleanerId) from a project.
// Projects on the same day within the same group get incremental stackIndex values.
export function applyProjectStacking(
  positioned: PositionedProject[],
  getGroupKey: (project: CleaningProject) => string,
): void {
  const stacks = new Map<string, number>()
  for (const pp of positioned) {
    const key = `${getGroupKey(pp.project)}:${pp.colIndex}`
    const idx = stacks.get(key) ?? 0
    pp.stackIndex = idx
    stacks.set(key, idx + 1)
  }
}

// Compute max stack depth per group across all dates (for dynamic row heights)
// getGroupKey extracts the grouping key from a project (e.g. propertyId or cleanerId)
export function computeMaxStacks(
  positionedProjects: PositionedProject[],
  getGroupKey: (project: CleaningProject) => string,
): Map<string, number> {
  const maxByGroup = new Map<string, number>()
  const countByKey = new Map<string, number>()

  for (const pp of positionedProjects) {
    const groupKey = getGroupKey(pp.project)
    const key = `${groupKey}:${pp.colIndex}`
    const count = (countByKey.get(key) ?? 0) + 1
    countByKey.set(key, count)

    const current = maxByGroup.get(groupKey) ?? 1
    if (count > current) maxByGroup.set(groupKey, count)
  }

  return maxByGroup
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
