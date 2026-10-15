'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getUsers } from '@/services/observeService'
import type { ObserveRole, ObserveUserRow } from '@/services/types/observe'
import Panel from '@/components/observe/Panel'
import DataTable, { Column } from '@/components/observe/DataTable'
import StateBlock from '@/components/observe/StateBlock'
import { RolePill, TenantPill } from '@/components/observe/pills'
import { useObserveLinks } from '@/components/observe/paths'
import { fmtNum, roleLabel, timeAgo } from '@/components/observe/format'

export default function ObserveUsersPage() {
  const router = useRouter()
  const { data, error, loading, refetch, window } = useObserveQuery(getUsers)
  const links = useObserveLinks()
  const [q, setQ] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [role, setRole] = useState<ObserveRole | ''>('')

  const roles = useMemo(() => {
    const set = new Set<ObserveRole>()
    for (const u of data?.users ?? []) if (u.role) set.add(u.role)
    return [...set].sort()
  }, [data])

  const rows = useMemo(() => {
    const all = data?.users ?? []
    const needle = q.trim().toLowerCase()
    return all.filter(
      (u) =>
        (!onlyActive || u.requests > 0) &&
        (!role || u.role === role) &&
        (!needle ||
          u.name.toLowerCase().includes(needle) ||
          (u.email ?? '').toLowerCase().includes(needle) ||
          (u.tenantName ?? '').toLowerCase().includes(needle))
    )
  }, [data, q, onlyActive, role])

  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />

  const online = (data?.users ?? []).filter((u) => u.onlineNow).length
  const active = (data?.users ?? []).filter((u) => u.requests > 0).length

  const columns: Column<ObserveUserRow>[] = [
    {
      key: 'name',
      header: 'User',
      sortValue: (u) => u.name.toLowerCase(),
      render: (u) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${u.onlineNow ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-gray-200'}`}
            title={u.onlineNow ? 'Online now' : 'Offline'}
          />
          <div className="min-w-0">
            <p className="text-gray-900 font-medium truncate">{u.name}</p>
            <p className="text-[11px] text-gray-500 truncate">{u.email ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortValue: (u) => u.role, render: (u) => <RolePill role={u.role} /> },
    { key: 'tenant', header: 'Tenant', sortValue: (u) => u.tenantName?.toLowerCase() ?? null, render: (u) => <TenantPill tenant={u.tenantName} /> },
    {
      key: 'lastSeen',
      header: 'Last seen',
      sortValue: (u) => (u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : null),
      render: (u) => <span className="text-gray-700 tabular-nums whitespace-nowrap">{timeAgo(u.lastSeenAt)}</span>,
    },
    {
      key: 'lastLogin',
      header: 'Last login',
      sortValue: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : null),
      render: (u) => <span className="text-gray-500 tabular-nums whitespace-nowrap">{timeAgo(u.lastLoginAt)}</span>,
    },
    {
      key: 'requests',
      header: `Requests (${window})`,
      align: 'right',
      sortValue: (u) => u.requests,
      render: (u) => <span className="font-mono tabular-nums text-gray-800">{fmtNum(u.requests)}</span>,
    },
    {
      key: 'errors',
      header: 'Errors',
      align: 'right',
      sortValue: (u) => u.errors,
      render: (u) => <span className={`font-mono tabular-nums ${u.errors > 0 ? 'text-rose-600 font-semibold' : 'text-gray-300'}`}>{u.errors}</span>,
    },
    {
      key: 'top',
      header: 'Top feature',
      sortValue: (u) => u.topFeature,
      render: (u) => <span className="text-gray-500">{u.topFeature ?? '—'}</span>,
    },
  ]

  return (
    <Panel
      title="Users"
      subtitle={data ? `${online} online · ${active} active in the last ${window} · ${data.users.length} accounts` : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="accent-amber-500" />
            active only
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ObserveRole | '')}
            className="py-1.5 pl-2 pr-7 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, tenant"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 w-56"
            />
          </div>
        </div>
      }
    >
      {loading && !data ? (
        <StateBlock kind="loading" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          onRowClick={(u) => router.push(links.user(u.id))}
          initialSort={{ key: 'lastSeen', dir: 'desc' }}
          empty="No users match"
          maxHeight="calc(100dvh - 300px)"
        />
      )}
    </Panel>
  )
}
