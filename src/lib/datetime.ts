// src/lib/datetime.ts
//
// Small timezone-aware helpers for the Time-Sheet feature.
// Built on Intl.DateTimeFormat — no external dependency.
//
// Convention:
//   - Backend stores instants as TIMESTAMPTZ; frontend always receives ISO-8601.
//   - Default rendering uses the *viewer's* browser timezone — that's the right
//     answer for "when did this happen for me."
//   - For PM-only views (Pending Approvals queue, payroll exports), use
//     `formatInTz(iso, profile.timezone)` so the PM sees their own zone.

const ZONE_ABBREV_FALLBACK: Record<string, string> = {
  'America/Toronto':   'ET',
  'America/New_York':  'ET',
  'America/Chicago':   'CT',
  'America/Denver':    'MT',
  'America/Edmonton':  'MT',
  'America/Vancouver': 'PT',
  'America/Los_Angeles': 'PT',
  'UTC':               'UTC',
}

/** Get a short label for a zone, e.g. "ET", "PT", or the IANA name as a fallback. */
export function zoneAbbrev(tz: string): string {
  return ZONE_ABBREV_FALLBACK[tz] || tz
}

/** Format an ISO instant in the viewer's local zone, e.g. "May 6, 2026, 3:46 PM". */
export function formatLocal(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

/** Format only the date portion in the viewer's local zone. */
export function formatLocalDate(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/** Format only the time portion in the viewer's local zone. */
export function formatLocalTime(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Format an ISO instant in a specific IANA timezone (e.g. PM's reporting zone). */
export function formatInTz(iso: string | Date | null | undefined, tz: string): string {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: tz,
  })
}

/** "yyyy-MM-dd" string in the given zone — useful for date pickers / export ranges. */
export function isoDateInTz(d: Date, tz: string): string {
  // sv-SE locale yields "yyyy-mm-dd hh:mm:ss"; we just take the date part.
  return d.toLocaleString('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).slice(0, 10)
}

/** Human-friendly elapsed duration. e.g. "2h 03m 17s". */
export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

/**
 * Compute the start of the week (Monday 00:00) in the given zone, returned
 * as a UTC instant (Date object). Useful for forming `weekStart` / `weekEnd`
 * params for the backend.
 */
export function startOfWeekInTz(date: Date, tz: string): Date {
  const isoLocal = date.toLocaleString('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  // Approximate day-of-week from the formatted output:
  const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  const wkMatch = isoLocal.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/)
  const offsetDays = wkMatch ? dayMap[wkMatch[1]] : 0

  // Get yyyy-mm-dd in zone
  const ymd = isoDateInTz(date, tz)
  // Build a Date for that local-zone midnight by parsing in the zone
  // The trick: `${date}T00:00:00` is interpreted as local; offset back via Intl
  const [y, m, d] = ymd.split('-').map(Number)
  // Use UTC arithmetic to subtract offsetDays
  const utc = new Date(Date.UTC(y, m - 1, d) - offsetDays * 86_400_000)
  // Now utc is the Monday of the local week, at 00:00 UTC. We need 00:00
  // in the local zone, which is generally not 00:00 UTC. So we calculate the
  // zone offset for that Monday and subtract it.
  const offsetMin = getZoneOffsetMinutes(utc, tz)
  return new Date(utc.getTime() - offsetMin * 60_000)
}

/** Zone offset in minutes (relative to UTC) for the given moment in the given zone. */
export function getZoneOffsetMinutes(date: Date, tz: string): number {
  // Format the same instant once as if reading the zone, then re-parse as UTC
  // and diff. This avoids needing a TZ database in the browser.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'
  const asUtc = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')) % 24,
    Number(get('minute')),
    Number(get('second')),
  )
  return Math.round((asUtc - date.getTime()) / 60_000)
}

/** End of week (next Monday 00:00) in the same zone, returned as UTC instant. */
export function endOfWeekInTz(date: Date, tz: string): Date {
  const start = startOfWeekInTz(date, tz)
  return new Date(start.getTime() + 7 * 86_400_000)
}
