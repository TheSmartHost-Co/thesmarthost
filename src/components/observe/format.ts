// Observe console — number/time formatting. Times render in the viewer's own
// timezone and locale (no hard-coded zone); the Activity heatmap is bucketed
// server-side in the timezone the API reports.
import type { WindowKey } from '@/services/types/observe'

// undefined = the browser's locale / timezone
const LOCALE: string | undefined = undefined

export const fmtNum = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString(LOCALE)
}

export const fmtPct = (r: number | null | undefined, digits = 1): string => `${((r ?? 0) * 100).toFixed(digits)}%`

export const fmtMs = (ms: number | null | undefined): string => {
  const v = ms ?? 0
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`
}

export const timeAgo = (iso: string | null | undefined, now = Date.now()): string => {
  if (!iso) return 'never'
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export const fmtDateTime = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString(LOCALE, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : '—'

export const tickFormatterFor = (window: WindowKey) => (iso: string): string => {
  const d = new Date(iso)
  if (window === '1h' || window === '24h')
    return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (window === '7d') {
    const day = d.toLocaleDateString(LOCALE, { weekday: 'short' })
    const hour = d.toLocaleTimeString(LOCALE, { hour: '2-digit', hour12: false })
    return `${day} ${hour}h`
  }
  return d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })
}

// Signed relative change for a delta badge; null when there is no baseline.
export const deltaRatio = (now: number, prev: number): number | null =>
  prev > 0 ? (now - prev) / prev : now > 0 ? null : 0

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// '15 minutes' (the API's bucket label) -> 900000
export const bucketToMs = (bucket: string): number => {
  const [n, unit = ''] = bucket.split(' ')
  const base = unit.startsWith('minute')
    ? 60_000
    : unit.startsWith('hour')
      ? 3_600_000
      : unit.startsWith('day')
        ? 86_400_000
        : 1000
  return (parseInt(n, 10) || 1) * base
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'admin',
  'PROPERTY-MANAGER': 'property manager',
  TEAM_MEMBER: 'team member',
  CLIENT: 'client',
  CLEANER: 'cleaner',
  CONTRACTOR: 'contractor',
  unknown: 'unknown',
  anonymous: 'anonymous',
}
export const roleLabel = (role: string | null | undefined): string =>
  role ? (ROLE_LABEL[role] ?? role.toLowerCase()) : 'unknown'
