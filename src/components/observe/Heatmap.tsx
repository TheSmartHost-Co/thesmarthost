// Observe console — weekday × hour grid, bucketed server-side in the timezone
// the Activity API reports. Colour steps along an amber-100 → amber-600 ramp.
import { DOW } from './format'
import StateBlock from './StateBlock'

// amber-100, 200, 300, 400, 500, 600
const RAMP = ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706']

export default function Heatmap({ cells }: { cells: { dow: number; hour: number; requests: number; users?: number }[] }) {
  const grid = new Map<string, { requests: number; users?: number }>()
  let max = 0
  for (const c of cells) {
    grid.set(`${c.dow}-${c.hour}`, { requests: c.requests, users: c.users })
    max = Math.max(max, c.requests)
  }
  if (max === 0) return <StateBlock kind="empty" />
  const order = [1, 2, 3, 4, 5, 6, 0]
  const colour = (v: number) => {
    if (v === 0) return '#f9fafb'
    const idx = Math.min(RAMP.length - 1, Math.floor(Math.sqrt(v / max) * RAMP.length))
    return RAMP[idx]
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid" style={{ gridTemplateColumns: '40px repeat(24, minmax(0, 1fr))', gap: 3 }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-[9px] text-gray-400 text-center tabular-nums">
              {h % 3 === 0 ? `${h}`.padStart(2, '0') : ''}
            </div>
          ))}
          {order.map((d) => (
            <div key={d} className="contents">
              <div className="text-[10px] text-gray-500 flex items-center">{DOW[d]}</div>
              {Array.from({ length: 24 }, (_, h) => {
                const cell = grid.get(`${d}-${h}`)
                const v = cell?.requests ?? 0
                return (
                  <div
                    key={h}
                    title={`${DOW[d]} ${`${h}`.padStart(2, '0')}:00 — ${v} requests${cell?.users !== undefined ? ` · ${cell.users} users` : ''}`}
                    className={`h-5 rounded-[4px] ${v === 0 ? 'ring-1 ring-inset ring-gray-100' : ''}`}
                    style={{ background: colour(v) }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-gray-500">
          <span>less</span>
          {RAMP.map((c) => (
            <span key={c} className="h-2.5 w-4 rounded-sm" style={{ background: c }} />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  )
}
