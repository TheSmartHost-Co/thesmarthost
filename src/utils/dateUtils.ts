/**
 * Parse a "YYYY-MM-DD" string as a local-timezone Date.
 * Avoids the UTC-midnight pitfall of `new Date("2026-03-02")` which
 * shifts back one day in negative-UTC timezones (all of North America).
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Format a Date to "YYYY-MM-DD" using local timezone values.
 * Replacement for `date.toISOString().split('T')[0]` which uses UTC.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
