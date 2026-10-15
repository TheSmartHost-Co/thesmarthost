'use client'
import { Fragment, useState } from 'react'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { useObserveQuery } from '@/hooks/useObserveQuery'
import { getFeatures } from '@/services/observeService'
import Panel from '@/components/observe/Panel'
import TimeSeriesChart from '@/components/observe/TimeSeriesChart'
import BarList from '@/components/observe/BarList'
import StateBlock from '@/components/observe/StateBlock'
import { MethodTag } from '@/components/observe/pills'
import { C } from '@/components/observe/chartTheme'
import { fmtMs, fmtNum, fmtPct } from '@/components/observe/format'

const GRID = 'grid grid-cols-[minmax(0,1fr)_80px_70px_90px_80px_24px] gap-2'

export default function ObserveFeaturesPage() {
  const { data, error, loading, refetch, window } = useObserveQuery(getFeatures)
  const [open, setOpen] = useState<string | null>(null)
  if (error && !data) return <StateBlock kind="error" message={error} onRetry={refetch} />
  const busy = loading && !data
  const features = data?.features ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel className="xl:col-span-3" title="Usage over time" subtitle={`Top ${data?.seriesKeys.length ?? 0} features · last ${window}`}>
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <TimeSeriesChart
              data={(data?.series ?? [])}
              windowKey={window}
              height={280}
              series={(data?.seriesKeys ?? []).map((k, i) => ({
                key: k,
                label: k,
                color: C.series[i % C.series.length],
                kind: 'area' as const,
                stackId: 'f',
              }))}
            />
          )}
        </Panel>
        <Panel className="xl:col-span-2" title="Most used" subtitle="Requests in window">
          {busy ? (
            <StateBlock kind="loading" />
          ) : (
            <BarList
              items={features.slice(0, 10).map((f, i) => ({
                key: f.feature,
                label: f.feature,
                value: f.requests,
                color: C.series[i % C.series.length],
                sub: `${f.users} users · ${fmtPct(f.errorRate)} errors`,
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel title="All features" subtitle="Click a row for its routes" padded={false}>
        {busy ? (
          <div className="px-5">
            <StateBlock kind="loading" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ul className="divide-y divide-gray-100 min-w-[560px]">
              <li className={`${GRID} px-5 py-2 bg-gray-50 border-t border-gray-100 text-[10px] font-semibold uppercase tracking-wider text-gray-500`}>
                <span>Feature</span>
                <span className="text-right">Requests</span>
                <span className="text-right">Users</span>
                <span className="text-right">Errors</span>
                <span className="text-right">p95</span>
                <span />
              </li>
              {features.map((f) => (
                <Fragment key={f.feature}>
                  <li>
                    <button
                      type="button"
                      onClick={() => setOpen(open === f.feature ? null : f.feature)}
                      className={`w-full ${GRID} px-5 py-2.5 text-sm text-left hover:bg-amber-50/40 ${open === f.feature ? 'bg-amber-50/40' : ''}`}
                    >
                      <span className="text-gray-900 font-medium truncate">{f.feature}</span>
                      <span className="font-mono text-right tabular-nums text-gray-800">{fmtNum(f.requests)}</span>
                      <span className="font-mono text-right tabular-nums text-gray-500">{f.users}</span>
                      <span className={`font-mono text-right tabular-nums ${f.errors > 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                        {f.errors}
                        {f.errors > 0 && <span className="text-[10px] text-gray-400"> · {fmtPct(f.errorRate)}</span>}
                      </span>
                      <span className="font-mono text-right tabular-nums text-gray-500">{fmtMs(f.p95Ms)}</span>
                      <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${open === f.feature ? 'rotate-90' : ''}`} />
                    </button>
                  </li>
                  {open === f.feature && (
                    <li className="bg-gray-50">
                      <ul>
                        {f.routes.map((r) => (
                          <li key={`${r.method} ${r.route}`} className={`${GRID} px-5 py-1.5 text-xs`}>
                            <span className="flex items-center gap-2 min-w-0 pl-3">
                              <MethodTag method={r.method} />
                              <span className="font-mono text-gray-600 truncate" title={r.route}>
                                {r.route}
                              </span>
                            </span>
                            <span className="font-mono text-right tabular-nums text-gray-700">{fmtNum(r.requests)}</span>
                            <span />
                            <span className={`font-mono text-right tabular-nums ${r.errors > 0 ? 'text-rose-600' : 'text-gray-300'}`}>{r.errors}</span>
                            <span className="font-mono text-right tabular-nums text-gray-500">{fmtMs(r.p95Ms)}</span>
                            <span />
                          </li>
                        ))}
                        {f.routes.length === 0 && <li className="px-5 py-2 text-xs text-gray-400">No routes recorded</li>}
                      </ul>
                    </li>
                  )}
                </Fragment>
              ))}
              {features.length === 0 && (
                <li>
                  <StateBlock kind="empty" />
                </li>
              )}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  )
}
