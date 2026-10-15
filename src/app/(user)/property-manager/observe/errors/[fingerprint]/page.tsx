'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getErrorGroup } from '@/services/observeService'
import Panel from '@/components/observe/Panel'
import Tile from '@/components/observe/Tile'
import TimeSeriesChart from '@/components/observe/TimeSeriesChart'
import StateBlock from '@/components/observe/StateBlock'
import UserChip from '@/components/observe/UserChip'
import CopyButton from '@/components/observe/CopyButton'
import ErrorOccurrenceRow from '@/components/observe/ErrorOccurrenceRow'
import { buildGroupReport } from '@/components/observe/errorReport'
import { SourcePill, TenantPill } from '@/components/observe/pills'
import { C } from '@/components/observe/chartTheme'
import { useObserveLinks } from '@/components/observe/paths'
import { fmtDateTime, fmtNum, timeAgo } from '@/components/observe/format'

export default function ObserveErrorGroupPage({ params }: { params: Promise<{ fingerprint: string }> }) {
  const { fingerprint } = use(params)
  const { data, error, refetch, window } = useObserveQuery((w) => getErrorGroup(fingerprint, w), [fingerprint])
  const [openStack, setOpenStack] = useState<number | null>(0)
  const links = useObserveLinks()
  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />
  if (!data) return <StateBlock kind="loading" />
  const d = data

  return (
    <div className="space-y-4">
      <Link href={links.errors} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeftIcon className="h-4 w-4" /> Errors
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SourcePill source={d.group.source} />
            <span className="font-mono text-[11px] text-gray-400">{d.group.fingerprint}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 break-words">{d.group.message}</h2>
          <p className="font-mono text-sm text-gray-500 mt-1">{d.group.location ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton primary label="Copy report for Claude" copiedLabel="Report copied" text={() => buildGroupReport(d)} />
          {d.group.sampleStack && <CopyButton label="Copy latest stack" text={() => d.group.sampleStack ?? ''} />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Occurrences" value={fmtNum(d.group.count)} tone="bad" spark={d.series.map((p) => p.count)} />
        <Tile label="Affected users" value={fmtNum(d.group.users)} />
        <Tile label="First seen" value={timeAgo(d.group.firstSeen)} sub={fmtDateTime(d.group.firstSeen)} />
        <Tile label="Last seen" value={timeAgo(d.group.lastSeen)} sub={fmtDateTime(d.group.lastSeen)} />
      </div>

      <Panel title="Over time" subtitle={`last ${window}`}>
        <TimeSeriesChart
          data={d.series}
          windowKey={window}
          height={180}
          showLegend={false}
          series={[{ key: 'count', label: 'occurrences', color: C.bad, kind: 'bar' }]}
        />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Occurrences" subtitle="Latest 100 · click to expand the stack" padded={false}>
          <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto border-t border-gray-100">
            {d.occurrences.map((o, i) => (
              <ErrorOccurrenceRow key={i} occurrence={o} open={openStack === i} onToggle={() => setOpenStack(openStack === i ? null : i)} />
            ))}
            {d.occurrences.length === 0 && (
              <li>
                <StateBlock kind="empty" message="No occurrences in this window" />
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="Affected users" subtitle="In window">
          <ul className="space-y-2.5">
            {d.affectedUsers.map((a, i) => (
              <li key={a.user?.id ?? `anon-${i}`} className="flex items-center gap-3 text-sm">
                <span className="font-mono font-semibold text-rose-600 tabular-nums w-8 text-right shrink-0">{a.count}</span>
                <span className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <UserChip user={a.user} />
                  {a.user?.tenantName && (
                    <span className="pl-8">
                      <TenantPill tenant={a.user.tenantName} />
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-gray-500 shrink-0">{timeAgo(a.lastSeen)}</span>
              </li>
            ))}
            {d.affectedUsers.length === 0 && <li className="text-xs text-gray-500 text-center py-4">No signed-in users affected</li>}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
