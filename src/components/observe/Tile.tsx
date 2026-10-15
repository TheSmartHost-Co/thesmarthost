'use client'
// Observe console — a headline figure with a sparkline and a change against
// the previous window. Tone colours only the bar on the left so a scan lands
// on what needs attention; the number itself stays gray-900.
import TrendSparkline from './TrendSparkline'
import { C } from './chartTheme'

export type TileTone = 'neutral' | 'good' | 'warn' | 'bad'
const BAR: Record<TileTone, string> = { neutral: 'bg-gray-200', good: 'bg-emerald-500', warn: 'bg-orange-400', bad: 'bg-rose-500' }
const SPARK: Record<TileTone, string> = { neutral: C.primary, good: C.good, warn: C.warn, bad: C.bad }

interface TileProps {
  label: string
  value: string
  /** null/undefined hides the badge (e.g. when there is no previous period). */
  delta?: number | null
  /** Which direction counts as good for the delta badge. */
  deltaGoodWhen?: 'up' | 'down'
  spark?: number[]
  tone?: TileTone
  sub?: string
  loading?: boolean
}

export default function Tile({ label, value, delta, deltaGoodWhen = 'up', spark, tone = 'neutral', sub, loading }: TileProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta)
  const good = hasDelta && (deltaGoodWhen === 'up' ? delta >= 0 : delta <= 0)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm pl-4 pr-3 pt-3 pb-2">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${BAR[tone]}`} aria-hidden />
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      {loading ? (
        <span className="block h-7 w-16 mt-1 rounded-md bg-gray-100 animate-pulse" />
      ) : (
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 tabular-nums leading-tight">{value}</p>
      )}
      <div className="mt-1 flex items-center gap-2 text-[11px] h-4">
        {hasDelta && (
          <span
            className={`rounded-full px-1.5 py-px font-semibold tabular-nums ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
            title="vs previous period"
          >
            {delta >= 0 ? '+' : '−'}
            {Math.abs(delta * 100).toFixed(0)}%
          </span>
        )}
        {sub && <span className="text-gray-500 truncate">{sub}</span>}
      </div>
      {spark && spark.length > 1 && (
        <div className="-mx-1 mt-1">
          <TrendSparkline data={spark} color={SPARK[tone]} height={36} />
        </div>
      )}
    </div>
  )
}
