'use client'
import Link from 'next/link'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getOverview } from '@/services/observeService'
import Tile from '@/components/observe/Tile'
import Panel from '@/components/observe/Panel'
import TimeSeriesChart from '@/components/observe/TimeSeriesChart'
import BarList from '@/components/observe/BarList'
import LiveFeed from '@/components/observe/LiveFeed'
import StateBlock from '@/components/observe/StateBlock'
import { SourcePill } from '@/components/observe/pills'
import { C } from '@/components/observe/chartTheme'
import { useObserveLinks } from '@/components/observe/paths'
import { deltaRatio, fmtMs, fmtNum, fmtPct, timeAgo } from '@/components/observe/format'

export default function ObserveOverviewPage() {
  const { data, error, loading, refetch, window } = useObserveQuery(getOverview)
  const links = useObserveLinks()

  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />

  const busy = loading && !data
  const t = data?.tiles
  // prev is null when retention can't cover the previous period (14d) — hide deltas.
  const p = data?.prev ?? null
  const s = data?.series ?? []
  const spark = (k: 'requests' | 'errors' | 'activeUsers' | 'p95Ms') => s.map((x) => x[k])
  const errorTone = !t ? 'neutral' : t.errorRate >= 0.05 ? 'bad' : t.errorRate >= 0.01 ? 'warn' : 'good'
  const prevSub = p ? undefined : data ? 'no previous period' : undefined

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile label="Online now" value={fmtNum(t?.onlineNow)} tone={t && t.onlineNow > 0 ? 'good' : 'neutral'} sub="seen in last 10 min" loading={busy} />
        <Tile label="Active users" value={fmtNum(t?.activeUsers)} delta={t && p ? deltaRatio(t.activeUsers, p.activeUsers) : null} sub={prevSub} spark={spark('activeUsers')} loading={busy} />
        <Tile label="Requests" value={fmtNum(t?.requests)} delta={t && p ? deltaRatio(t.requests, p.requests) : null} sub={prevSub} spark={spark('requests')} loading={busy} />
        <Tile
          label="Error rate"
          value={fmtPct(t?.errorRate)}
          delta={t && p ? deltaRatio(t.errorRate, p.errorRate) : null}
          deltaGoodWhen="down"
          spark={spark('errors')}
          tone={errorTone}
          sub={t ? `${fmtNum(t.errors)} × 5xx` : undefined}
          loading={busy}
        />
        <Tile
          label="Client errors"
          value={fmtNum(t?.clientErrors)}
          delta={t && p ? deltaRatio(t.clientErrors, p.clientErrors) : null}
          deltaGoodWhen="down"
          tone={t && t.requests > 0 && t.clientErrors / t.requests >= 0.1 ? 'warn' : 'neutral'}
          sub="4xx responses"
          loading={busy}
        />
        <Tile
          label="p95 latency"
          value={fmtMs(t?.p95Ms)}
          delta={t && p ? deltaRatio(t.p95Ms, p.p95Ms) : null}
          deltaGoodWhen="down"
          spark={spark('p95Ms')}
          tone={t && t.p95Ms > 2000 ? 'warn' : 'neutral'}
          loading={busy}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Traffic" subtitle={`Requests, errors and active users · last ${window}`}>
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <TimeSeriesChart
              data={s}
              windowKey={window}
              height={260}
              series={[
                { key: 'requests', label: 'requests', color: C.primary, kind: 'area' },
                { key: 'errors', label: '5xx', color: C.bad, kind: 'bar' },
                { key: 'activeUsers', label: 'active users', color: C.sky, kind: 'line', yAxisId: 'right' },
              ]}
            />
          )}
        </Panel>
        <Panel title="Live feed" subtitle="Latest requests · dashed avatar = unverified token">
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <div className="max-h-[300px] overflow-y-auto -mx-5">
              <LiveFeed items={data?.feed ?? []} />
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel
          title="Top features"
          subtitle="By requests"
          actions={
            <Link href={links.features} className="text-xs font-medium text-amber-700 hover:text-amber-800 hover:underline underline-offset-4">
              All features
            </Link>
          }
        >
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <BarList
              items={(data?.topFeatures ?? []).map((f) => ({
                key: f.feature,
                label: f.feature,
                value: f.requests,
                sub: `${f.users} users · ${f.errors} errors · p95 ${fmtMs(f.p95Ms)}`,
                href: links.features,
              }))}
            />
          )}
        </Panel>
        <Panel
          title="Top errors"
          subtitle="Grouped by cause"
          actions={
            <Link href={links.errors} className="text-xs font-medium text-amber-700 hover:text-amber-800 hover:underline underline-offset-4">
              All errors
            </Link>
          }
        >
          {busy ? (
            <StateBlock kind="loading" />
          ) : (data?.topErrors.length ?? 0) === 0 ? (
            <StateBlock kind="ok" message={`No errors in the last ${window}`} />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data!.topErrors.map((e) => (
                <li key={e.fingerprint}>
                  <Link href={links.errorGroup(e.fingerprint)} className="flex items-center gap-3 py-2.5 group">
                    <span className="text-lg font-bold text-rose-600 tabular-nums w-10 text-right shrink-0">{e.count}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate group-hover:text-gray-900">{e.message}</p>
                      <p className="text-[11px] text-gray-500 truncate font-mono">
                        {e.location ?? '—'} · {e.users} users · {timeAgo(e.lastSeen)}
                      </p>
                    </div>
                    <SourcePill source={e.source} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
