'use client'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { C, tooltipProps } from './chartTheme'
import { fmtNum } from './format'
import StateBlock from './StateBlock'

export default function Donut({
  data,
  centerLabel,
  centerValue,
  height = 180,
}: {
  data: { name: string; value: number }[]
  centerLabel?: string
  centerValue?: string
  height?: number
}) {
  const total = data.reduce((n, d) => n + d.value, 0)
  if (total === 0) return <StateBlock kind="empty" />
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="95%" paddingAngle={2} stroke="#fff" isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={C.series[i % C.series.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} formatter={(v) => (typeof v === 'number' ? fmtNum(v) : v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-gray-900 tabular-nums">{centerValue ?? fmtNum(total)}</span>
          {centerLabel && <span className="text-[10px] uppercase tracking-wider text-gray-500">{centerLabel}</span>}
        </div>
      </div>
      <ul className="space-y-1.5 min-w-0 w-full max-h-[200px] overflow-y-auto">
        {data.map((d, i) => (
          <li key={`${d.name}-${i}`} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: C.series[i % C.series.length] }} />
            <span className="text-gray-700 truncate">{d.name}</span>
            <span className="font-mono text-gray-500 ml-auto tabular-nums whitespace-nowrap">
              {fmtNum(d.value)} · {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
