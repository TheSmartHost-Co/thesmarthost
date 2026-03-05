// Parse YYYY-MM-DD without timezone distortion
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Format Date as YYYY-MM-DD
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Add N days to a YYYY-MM-DD string
export function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatLocalDate(d)
}

// Generate an array of YYYY-MM-DD strings from start for count days
export function generateDateRange(startStr: string, count: number): string[] {
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(addDays(startStr, i))
  }
  return result
}

// Convert "HH:MM" or "HH:MM:SS" to fraction of day (0-1)
export function timeToFraction(timeStr: string | null | undefined, fallback: number): number {
  if (!timeStr) return fallback
  const [h, m] = timeStr.split(':').map(Number)
  return (h + m / 60) / 24
}

// Format YYYY-MM-DD for column header display
export function formatColumnHeader(dateStr: string): { weekday: string; day: string; isWeekend: boolean } {
  const date = parseLocalDate(dateStr)
  const dow = date.getDay()
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(date.getDate()),
    isWeekend: dow === 0 || dow === 6,
  }
}

// Format hour for hour-mode column header
export function formatHourHeader(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}${ampm}`
}

// Check if a date string is today
export function isToday(dateStr: string): boolean {
  const now = new Date()
  return dateStr === formatLocalDate(now)
}

// Day subdivision hours (4 × 6hr blocks: midnight, 6AM, noon, 6PM)
export const DAY_SUBDIVISION_HOURS = [0, 6, 12, 18] as const

// Full 24-hour labels for 1-2 day zoom
export const DAY_FULL_HOURS = Array.from({ length: 24 }, (_, i) => i)

// Format subdivision hour label (compact)
export function formatSubdivisionLabel(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

// Convert minutes to fraction of a day (0-1)
export function minutesToDayFraction(minutes: number): number {
  return minutes / (24 * 60)
}

// Format duration in minutes to human-readable string
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Get number of days in a month
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// Get first day of month as YYYY-MM-DD
export function getMonthStart(date: Date): string {
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1))
}
