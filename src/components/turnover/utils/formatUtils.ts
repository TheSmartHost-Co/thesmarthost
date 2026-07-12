// Shared display formatters for the PM project-detail sections. Extracted from
// ProjectDetailModal so the decomposed section components can reuse them.

import { parseLocalDate } from '@/utils/dateUtils'

/** "Monday, July 8, 2026" from a date-only "YYYY-MM-DD" string (parsed local). */
export function formatProjectDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** "1:30 PM" from a "HH:MM[:SS]" string; `notSetLabel` when empty. */
export function formatProjectTime(time: string | null | undefined, notSetLabel: string): string {
  if (!time) return notSetLabel
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

/** Badge classes for a project status color; overdue always renders red. */
export function getStatusBadgeClasses(statusColor: string, overdue: boolean): string {
  if (overdue) return 'bg-red-100 text-red-700 border-red-200'
  return STATUS_BADGE_COLORS[statusColor] || STATUS_BADGE_COLORS.gray
}
