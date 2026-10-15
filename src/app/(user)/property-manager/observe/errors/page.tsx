'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getErrors, getErrorsRange } from '@/services/observeService'
import type { ErrorsRangeData, WindowKey } from '@/services/types/observe'
import Panel from '@/components/observe/Panel'
import TrendSparkline from '@/components/observe/TrendSparkline'
import StateBlock from '@/components/observe/StateBlock'
import UserChip from '@/components/observe/UserChip'
import CopyButton from '@/components/observe/CopyButton'
import ErrorOccurrenceRow from '@/components/observe/ErrorOccurrenceRow'
import SegmentedControl from '@/components/observe/SegmentedControl'
import ErrorVolumeChart, { VolumeMode } from '@/components/observe/ErrorVolumeChart'
import { buildSliceReport } from '@/components/observe/errorReport'
import { SourcePill, StatusPill } from '@/components/observe/pills'

const VOLUME_MODES: readonly VolumeMode[] = ['source', 'group']
import { C } from '@/components/observe/chartTheme'
import { useObserveLinks } from '@/components/observe/paths'
import { bucketToMs, fmtDateTime, fmtTime, timeAgo } from '@/components/observe/format'

function SlicePanel({ from, to, onClose }: { from: string; to: string; onClose: () => void }) {
  const [range, setRange] = useState<ErrorsRangeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const links = useObserveLinks()

  // Keyed by `from` in the parent, so a new slice remounts with fresh state.
  useEffect(() => {
    let alive = true
    getErrorsRange(from, to)
      .then((r) => {
        if (alive) setRange(r)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load')
      })
    return () => {
      alive = false
    }
  }, [from, to])

  return (
    <Panel
      className="ring-2 ring-amber-200"
      title={`Slice · ${fmtDateTime(from)} → ${fmtTime(to)}`}
      subtitle={range ? `${range.errors.length} errors across ${range.groups.length} groups in this slice` : 'Loading slice…'}
      actions={
        <div className="flex items-center gap-2">
          {range && range.errors.length > 0 && (
            <CopyButton primary label="Copy report for Claude" copiedLabel="Report copied" text={() => buildSliceReport(range)} />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            title="Close"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      }
      padded={false}
    >
      {error ? (
        <StateBlock kind="error" message={error} />
      ) : !range ? (
        <div className="px-5">
          <StateBlock kind="loading" />
        </div>
      ) : range.errors.length === 0 ? (
        <StateBlock kind="ok" message="No errors in this slice" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 border-t border-gray-100">
          <ul className="xl:col-span-2 divide-y divide-gray-100 border-b xl:border-b-0 xl:border-r border-gray-100">
            {range.groups.map((g) => (
              <li key={g.fingerprint}>
                <Link href={links.errorGroup(g.fingerprint)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-amber-50/40">
                  <span className="text-lg font-bold text-rose-600 tabular-nums w-8 text-right shrink-0">{g.count}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 truncate">{g.message}</p>
                    <p className="font-mono text-[11px] text-gray-500 truncate">{g.location ?? '—'}</p>
                  </div>
                  <SourcePill source={g.source} />
                </Link>
              </li>
            ))}
          </ul>
          <ul className="xl:col-span-3 divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
            {range.errors.map((e, i) => (
              <ErrorOccurrenceRow
                key={i}
                occurrence={e}
                open={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
                showSource
                timeFormat="time"
              />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

export default function ObserveErrorsPage() {
  const { data, error, loading, refetch, window } = useObserveQuery(getErrors)
  const [mode, setMode] = useState<VolumeMode>('source')
  const links = useObserveLinks()
  // Remember which window the slice was picked in; switching windows drops it.
  const [selection, setSelection] = useState<{ ts: string; window: WindowKey } | null>(null)
  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />
  const busy = loading && !data
  const groups = data?.groups ?? []
  // Sum the series, not the groups: the backend caps the group list at 50.
  const total = (data?.series ?? []).reduce((n, p) => n + p.server + p.client, 0)
  const selected = selection && selection.window === window ? selection.ts : null
  const bucketMs = data ? bucketToMs(data.window.bucket) : 0
  const sliceTo = selected ? new Date(new Date(selected).getTime() + bucketMs).toISOString() : null

  return (
    <div className="space-y-4">
      <Panel
        title="Error volume"
        subtitle={`${total} errors · last ${window} · click a bar to inspect that slice`}
        actions={
          <SegmentedControl options={VOLUME_MODES} value={mode} onChange={setMode} label={(m) => `by ${m}`} ariaLabel="Group errors" />
        }
      >
        {busy ? (
          <StateBlock kind="loading" />
        ) : total === 0 ? (
          <StateBlock kind="ok" message={`No errors in the last ${window}`} />
        ) : (
          <ErrorVolumeChart
            series={data?.series ?? []}
            groups={groups}
            windowKey={window}
            mode={mode}
            selectedTs={selected}
            onSelect={(ts) => setSelection(ts ? { ts, window } : null)}
          />
        )}
      </Panel>

      {selected && sliceTo && <SlicePanel key={selected} from={selected} to={sliceTo} onClose={() => setSelection(null)} />}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel className="xl:col-span-3" title="Error groups" subtitle={`${groups.length} groups · grouped by cause`} padded={false}>
          {busy ? (
            <div className="px-5">
              <StateBlock kind="loading" />
            </div>
          ) : groups.length === 0 ? (
            <StateBlock kind="ok" message={`No errors in the last ${window}`} />
          ) : (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {groups.map((g) => (
                <li key={g.fingerprint}>
                  <Link href={links.errorGroup(g.fingerprint)} className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/40 group">
                    <span className="text-xl font-bold text-rose-600 tabular-nums w-12 text-right shrink-0">{g.count}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">{g.message}</p>
                      <p className="text-[11px] text-gray-500 truncate font-mono mt-0.5">{g.location ?? '—'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {g.users} {g.users === 1 ? 'user' : 'users'} · first {timeAgo(g.firstSeen)} · last {timeAgo(g.lastSeen)}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 hidden sm:block">
                      <TrendSparkline data={g.spark} color={C.bad} height={32} />
                    </div>
                    <SourcePill source={g.source} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="xl:col-span-2" title="Recent" subtitle="Latest server and browser errors" padded={false}>
          {busy ? (
            <div className="px-5">
              <StateBlock kind="loading" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto border-t border-gray-100">
              {(data?.recent ?? []).map((e, i) => (
                <li key={`${e.requestId ?? i}-${e.ts}`} className="text-xs">
                  <Link href={links.errorGroup(e.fingerprint)} className="block px-5 py-2.5 hover:bg-amber-50/40">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-500 tabular-nums">{fmtTime(e.ts)}</span>
                      <SourcePill source={e.source} />
                      {e.status !== null && <StatusPill status={e.status} />}
                      <span className="ml-auto min-w-0">
                        <UserChip user={e.user} compact href={false} />
                      </span>
                    </div>
                    <p className="text-gray-800 truncate mt-1">{e.message}</p>
                    <p className="font-mono text-gray-400 truncate">{e.location ?? ''}</p>
                  </Link>
                </li>
              ))}
              {(data?.recent ?? []).length === 0 && (
                <li>
                  <StateBlock kind="empty" />
                </li>
              )}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
