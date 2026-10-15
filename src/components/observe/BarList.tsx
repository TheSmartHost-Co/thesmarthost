// Observe console — ranked horizontal bars.
import Link from 'next/link'
import { ReactNode } from 'react'
import { C } from './chartTheme'
import { fmtNum } from './format'
import StateBlock from './StateBlock'

export interface BarItem {
  label: ReactNode
  value: number
  sub?: ReactNode
  href?: string
  color?: string
  key?: string
}

export default function BarList({
  items,
  valueFormatter = fmtNum,
  color = C.primary,
}: {
  items: BarItem[]
  valueFormatter?: (n: number) => string
  color?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <StateBlock kind="empty" />
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const row = (
          <div className="group">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-800 group-hover:text-gray-900">{it.label}</span>
              <span className="font-mono text-xs text-gray-700 tabular-nums shrink-0">{valueFormatter(it.value)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? color }}
              />
            </div>
            {it.sub && <div className="mt-0.5 text-[11px] text-gray-500">{it.sub}</div>}
          </div>
        )
        return <li key={it.key ?? i}>{it.href ? <Link href={it.href}>{row}</Link> : row}</li>
      })}
    </ul>
  )
}
