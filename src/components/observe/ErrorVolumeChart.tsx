'use client'
// Observe console — the error volume chart: one bar per bucket, stacked by
// source or by the top error groups. Clicking a bar selects that slice for
// drill-down (the page then loads /observe/errors/range for it).
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ErrorsData, WindowKey } from '@/services/types/observe'
import { axisProps, tooltipProps, legendStyle, C } from './chartTheme'
import { fmtDateTime, tickFormatterFor } from './format'

export type VolumeMode = 'source' | 'group'

interface Props {
  series: ErrorsData['series']
  groups: ErrorsData['groups']
  windowKey: WindowKey
  mode: VolumeMode
  selectedTs: string | null
  onSelect: (ts: string | null) => void
  height?: number
}

const short = (m: string) => (m.length > 28 ? m.slice(0, 27) + '…' : m)

export default function ErrorVolumeChart({ series, groups, windowKey, mode, selectedTs, onSelect, height = 220 }: Props) {
  const tick = tickFormatterFor(windowKey)
  const top = groups.slice(0, 5)
  const data = series.map((p, i) => {
    const row: Record<string, string | number> = { ts: p.ts, server: p.server, client: p.client, total: p.server + p.client }
    for (const g of top) row[g.fingerprint] = g.spark[i] ?? 0
    return row
  })
  const bars =
    mode === 'source'
      ? [
          { key: 'server', label: 'server', color: C.bad },
          { key: 'client', label: 'browser', color: C.pink },
        ]
      : top.map((g, i) => ({ key: g.fingerprint, label: short(g.message), color: C.series[i % C.series.length] }))

  return (
    <div style={{ width: '100%', height }} className="cursor-pointer">
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          onClick={(state) => {
            const label = state && (state as { activeLabel?: string | number }).activeLabel
            if (typeof label === 'string') onSelect(label === selectedTs ? null : label)
          }}
        >
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="ts" tickFormatter={tick} minTickGap={32} {...axisProps} />
          <YAxis allowDecimals={false} width={40} {...axisProps} />
          <Tooltip {...tooltipProps} cursor={{ fill: 'rgba(245,158,11,0.08)' }} labelFormatter={(v) => `${fmtDateTime(String(v))} · click to inspect`} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.label} stackId="e" fill={b.color} isAnimationActive={false} radius={[2, 2, 0, 0]}>
              {data.map((row) => (
                <Cell
                  key={String(row.ts)}
                  fillOpacity={selectedTs && row.ts !== selectedTs ? 0.3 : 1}
                  stroke={row.ts === selectedTs ? '#111827' : undefined}
                  strokeWidth={row.ts === selectedTs ? 1 : 0}
                />
              ))}
            </Bar>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
