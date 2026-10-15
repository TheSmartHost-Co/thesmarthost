'use client'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getUser } from '@/services/observeService'
import Panel from '@/components/observe/Panel'
import Tile from '@/components/observe/Tile'
import TimeSeriesChart from '@/components/observe/TimeSeriesChart'
import BarList from '@/components/observe/BarList'
import StateBlock from '@/components/observe/StateBlock'
import LiveFeed from '@/components/observe/LiveFeed'
import { RolePill, SourcePill, TenantPill } from '@/components/observe/pills'
import { C } from '@/components/observe/chartTheme'
import { useObserveLinks } from '@/components/observe/paths'
import { fmtDateTime, fmtNum, fmtTime, timeAgo } from '@/components/observe/format'

export default function ObserveUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, error, refetch, window } = useObserveQuery((w) => getUser(id, w), [id])
  const links = useObserveLinks()
  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />
  if (!data) return <StateBlock kind="loading" />
  const d = data
  const requests = d.series.reduce((n, p) => n + p.requests, 0)
  const errors = d.series.reduce((n, p) => n + p.errors, 0)
  const recentlySeen =
    !!d.user.lastSeenAt && new Date(d.window.to).getTime() - new Date(d.user.lastSeenAt).getTime() < 600000

  return (
    <div className="space-y-4">
      <Link href={links.users} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeftIcon className="h-4 w-4" /> Users
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 truncate">{d.user.name}</h2>
          <p className="text-sm text-gray-500 flex flex-wrap items-center gap-2 mt-1">
            {d.user.email ?? 'no email'} <RolePill role={d.user.role} /> <TenantPill tenant={d.user.tenantName} />
          </p>
        </div>
        <p className="text-xs text-gray-500">Joined {fmtDateTime(d.user.createdAt)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Last seen" value={timeAgo(d.user.lastSeenAt)} tone={recentlySeen ? 'good' : 'neutral'} sub={fmtDateTime(d.user.lastSeenAt)} />
        <Tile label="Last login" value={timeAgo(d.user.lastLoginAt)} sub={fmtDateTime(d.user.lastLoginAt)} />
        <Tile label={`Requests (${window})`} value={fmtNum(requests)} spark={d.series.map((p) => p.requests)} />
        <Tile label="Errors" value={fmtNum(errors)} tone={errors > 0 ? 'bad' : 'good'} spark={d.series.map((p) => p.errors)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Activity" subtitle={`last ${window}`}>
          <TimeSeriesChart
            data={d.series}
            windowKey={window}
            height={200}
            series={[
              { key: 'requests', label: 'requests', color: C.primary, kind: 'area' },
              { key: 'errors', label: 'errors', color: C.bad, kind: 'bar' },
            ]}
          />
        </Panel>
        <Panel title="Features used" subtitle="Requests in window">
          <BarList
            items={d.features.map((f) => ({
              key: f.feature,
              label: f.feature,
              value: f.requests,
              sub: f.errors > 0 ? <span className="text-rose-600">{f.errors} errors</span> : undefined,
            }))}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Recent requests" subtitle="Latest 100" padded={false}>
          <div className="max-h-[420px] overflow-y-auto border-t border-gray-100">
            <LiveFeed items={d.recentRequests} showUser={false} empty="No requests recorded" />
          </div>
        </Panel>
        <Panel title="Errors hit" subtitle={`last ${window}`} padded={false}>
          <ul className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto border-t border-gray-100">
            {d.recentErrors.map((e, i) => (
              <li key={`${e.requestId ?? i}-${e.ts}`} className="text-xs">
                <Link href={links.errorGroup(e.fingerprint)} className="flex items-center gap-2 px-5 py-2 hover:bg-amber-50/40">
                  <span className="font-mono text-gray-500 tabular-nums w-16 shrink-0">{fmtTime(e.ts)}</span>
                  <SourcePill source={e.source} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-gray-800 truncate">{e.message}</span>
                    {e.location && <span className="block font-mono text-[11px] text-gray-400 truncate">{e.location}</span>}
                  </span>
                </Link>
              </li>
            ))}
            {d.recentErrors.length === 0 && (
              <li>
                <StateBlock kind="ok" message="No errors" />
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
