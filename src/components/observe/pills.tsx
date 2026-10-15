// Observe console — small coloured labels. Colour is semantic (see chartTheme).
import type { ErrorSource, ObserveRole } from '@/services/types/observe'
import { roleLabel } from './format'

const base = 'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset whitespace-nowrap'

export const StatusPill = ({ status }: { status: number }) => {
  const cls =
    status >= 500
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : status >= 400
        ? 'bg-orange-50 text-orange-700 ring-orange-200'
        : status >= 300
          ? 'bg-gray-50 text-gray-600 ring-gray-200'
          : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return <span className={`${base} font-mono ${cls}`}>{status}</span>
}

export const MethodTag = ({ method }: { method: string }) => (
  <span className={`${base} font-mono bg-gray-50 text-gray-600 ring-gray-200`}>{method}</span>
)

const ROLE: Record<ObserveRole, string> = {
  ADMIN: 'bg-amber-50 text-amber-700 ring-amber-200',
  'PROPERTY-MANAGER': 'bg-sky-50 text-sky-700 ring-sky-200',
  TEAM_MEMBER: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  CLIENT: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CLEANER: 'bg-purple-50 text-purple-700 ring-purple-200',
  CONTRACTOR: 'bg-orange-50 text-orange-700 ring-orange-200',
  unknown: 'bg-gray-50 text-gray-600 ring-gray-200',
  anonymous: 'bg-gray-50 text-gray-500 ring-gray-200',
}
export const RolePill = ({ role }: { role: ObserveRole | null }) =>
  role ? (
    <span className={`${base} uppercase ${ROLE[role] ?? 'bg-gray-50 text-gray-600 ring-gray-200'}`}>{roleLabel(role)}</span>
  ) : null

/** The owning property manager's company. */
export const TenantPill = ({ tenant }: { tenant: string | null }) =>
  tenant ? (
    <span className={`${base} bg-white text-gray-600 ring-gray-200 max-w-[180px]`} title={tenant}>
      <span className="truncate">{tenant}</span>
    </span>
  ) : null

export const SourcePill = ({ source }: { source: ErrorSource }) => (
  <span
    className={`${base} uppercase ${
      source === 'server' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-pink-50 text-pink-700 ring-pink-200'
    }`}
  >
    {source === 'client' ? 'browser' : source}
  </span>
)

export const ImpersonationMark = () => (
  <span className={`${base} uppercase bg-violet-50 text-violet-700 ring-violet-200`} title="A PM / team member acting as this portal user">
    acting as
  </span>
)
