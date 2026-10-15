'use client'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getActivity } from '@/services/observeService'
import Panel from '@/components/observe/Panel'
import TimeSeriesChart from '@/components/observe/TimeSeriesChart'
import Donut from '@/components/observe/Donut'
import Heatmap from '@/components/observe/Heatmap'
import StateBlock from '@/components/observe/StateBlock'
import { C } from '@/components/observe/chartTheme'
import { roleLabel } from '@/components/observe/format'

// Donut legends get unreadable past ~8 slices; fold the tail into "other".
function topN<T>(rows: T[], n: number, value: (r: T) => number, name: (r: T) => string) {
  const sorted = [...rows].sort((a, b) => value(b) - value(a))
  const head = sorted.slice(0, n).map((r) => ({ name: name(r), value: value(r) }))
  const rest = sorted.slice(n).reduce((sum, r) => sum + value(r), 0)
  return rest > 0 ? [...head, { name: `other (${sorted.length - n})`, value: rest }] : head
}

export default function ObserveActivityPage() {
  const { data, error, loading, refetch, window } = useObserveQuery(getActivity)
  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />
  const busy = loading && !data

  return (
    <div className="space-y-4">
      <Panel title="Active users" subtitle={`Distinct signed-in users per bucket · last ${window}`}>
        {busy ? (
          <StateBlock kind="loading" />
        ) : (
          <TimeSeriesChart
            data={(data?.series ?? [])}
            windowKey={window}
            height={240}
            series={[
              { key: 'activeUsers', label: 'active users', color: C.primary, kind: 'area' },
              { key: 'requests', label: 'requests', color: C.sky, kind: 'line', yAxisId: 'right' },
            ]}
          />
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="By tenant" subtitle="Users active in the window, by owning property manager">
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <Donut
              data={topN(data?.byTenant ?? [], 8, (t) => t.users, (t) => t.tenantName ?? `tenant ${t.tenantId.slice(0, 8)}`)}
              centerLabel="users"
            />
          )}
        </Panel>
        <Panel title="By role" subtitle="Users active in the window">
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <Donut data={(data?.byRole ?? []).map((r) => ({ name: roleLabel(r.role), value: r.users }))} centerLabel="users" />
          )}
        </Panel>
      </div>

      <Panel
        title="When people use SmartHost"
        subtitle={`Requests by weekday and hour${data?.timezone ? `, ${data.timezone} time` : ''}`}
      >
        {busy ? <StateBlock kind="loading" /> : <Heatmap cells={data?.heatmap ?? []} />}
      </Panel>
    </div>
  )
}
