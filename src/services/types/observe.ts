// Observe console — response shapes of GET /api/observe/* (backend:
// controllers/observe.controller.js). Every payload is wrapped in the usual
// { status: 'success', data } envelope. Timestamps are ISO strings; series
// arrive pre-bucketed and zero-filled by the server.

export type WindowKey = '1h' | '24h' | '7d' | '14d'

export interface ObserveWindow {
  key: WindowKey
  from: string
  to: string
  /** Postgres interval text, e.g. "15 minutes", "4 hours" */
  bucket: string
}

export type ObserveRole =
  | 'ADMIN'
  | 'PROPERTY-MANAGER'
  | 'TEAM_MEMBER'
  | 'CLIENT'
  | 'CLEANER'
  | 'CONTRACTOR'
  | 'unknown'
  | 'anonymous'

export interface ObserveUserRef {
  id: string
  name: string
  email: string | null
  role: ObserveRole | null
  /** The owning property manager's id */
  tenantId: string | null
  /** The PM's company name (or full name) */
  tenantName: string | null
}

export interface ObserveAccess {
  isPlatformAdmin: boolean
}

export interface ObserveTiles {
  activeUsers: number
  requests: number
  /** 5xx responses */
  errors: number
  /** 4xx responses */
  clientErrors: number
  /** errors / requests, 0..1 */
  errorRate: number
  p95Ms: number
}

export interface SeriesPoint {
  ts: string
  requests: number
  errors: number
  clientErrors: number
  activeUsers: number
  p95Ms: number
}

export interface RequestRow {
  ts: string
  requestId: string | null
  method: string
  /** Templated route, e.g. /api/properties/:id */
  route: string
  path: string
  status: number
  durationMs: number
  errorMessage: string | null
  /** false = identity decoded from an unverified token (route without auth) */
  verified: boolean
  /** true = a PM/team member acting as a client/cleaner/contractor */
  impersonated: boolean
}

export interface FeedItem extends RequestRow {
  user: ObserveUserRef | null
}

export interface FeatureSummary {
  feature: string
  requests: number
  users: number
  errors: number
  p95Ms: number
}

export interface TopError {
  fingerprint: string
  source: ErrorSource
  location: string | null
  message: string
  count: number
  users: number
  lastSeen: string
}

export interface OverviewData {
  window: ObserveWindow
  tiles: ObserveTiles & { onlineNow: number }
  /** Previous equal-length period; null when retention can't cover it (14d) */
  prev: ObserveTiles | null
  series: SeriesPoint[]
  topFeatures: FeatureSummary[]
  topErrors: TopError[]
  feed: FeedItem[]
}

export interface ActivityData {
  window: ObserveWindow
  /** IANA timezone the heatmap is bucketed in */
  timezone: string
  series: { ts: string; requests: number; activeUsers: number }[]
  byTenant: { tenantId: string; tenantName: string | null; users: number; requests: number }[]
  byRole: { role: ObserveRole; users: number; requests: number }[]
  /** dow: 0 = Sunday .. 6 = Saturday */
  heatmap: { dow: number; hour: number; requests: number; users: number }[]
}

export interface ObserveUserRow extends ObserveUserRef {
  lastSeenAt: string | null
  lastLoginAt: string | null
  onlineNow: boolean
  requests: number
  errors: number
  topFeature: string | null
}

export interface UsersData {
  window: ObserveWindow
  users: ObserveUserRow[]
}

export interface UserDetailData {
  window: ObserveWindow
  user: ObserveUserRef & {
    lastSeenAt: string | null
    lastLoginAt: string | null
    createdAt: string | null
  }
  series: { ts: string; requests: number; errors: number }[]
  features: { feature: string; requests: number; errors: number }[]
  recentRequests: RequestRow[]
  recentErrors: {
    ts: string
    source: ErrorSource
    fingerprint: string
    location: string | null
    message: string
    requestId: string | null
  }[]
}

export interface FeatureRoute {
  method: string
  route: string
  requests: number
  errors: number
  p95Ms: number
}

export interface FeaturesData {
  window: ObserveWindow
  features: (FeatureSummary & { errorRate: number; routes: FeatureRoute[] })[]
  /** One point per bucket: { ts, [feature]: requests } for each key in seriesKeys */
  series: ({ ts: string } & Record<string, number | string>)[]
  seriesKeys: string[]
}

export type ErrorSource = 'server' | 'client'

export interface ErrorGroup {
  fingerprint: string
  source: ErrorSource
  /** Route (server) or page (client) */
  location: string | null
  message: string
  count: number
  users: number
  firstSeen: string
  lastSeen: string
  sampleStack: string | null
  sampleRequestId: string | null
}

export interface ErrorRow {
  ts: string
  source: ErrorSource
  fingerprint: string
  location: string | null
  message: string
  status: number | null
  requestId: string | null
  user: ObserveUserRef | null
}

export interface ErrorsData {
  window: ObserveWindow
  groups: (ErrorGroup & { spark: number[] })[]
  recent: ErrorRow[]
  series: { ts: string; server: number; client: number }[]
}

export interface ErrorsRangeData {
  from: string
  to: string
  errors: (ErrorRow & { stack: string | null })[]
  groups: { fingerprint: string; source: ErrorSource; location: string | null; message: string; count: number }[]
}

export interface ErrorGroupData {
  window: ObserveWindow
  group: ErrorGroup
  series: { ts: string; count: number }[]
  occurrences: {
    ts: string
    source: ErrorSource
    location: string | null
    message: string
    stack: string | null
    requestId: string | null
    status: number | null
    user: ObserveUserRef | null
  }[]
  affectedUsers: { user: ObserveUserRef | null; count: number; lastSeen: string }[]
}
