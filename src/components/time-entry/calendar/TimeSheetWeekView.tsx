'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { TimeEntry } from '@/services/types/timeEntry'
import { isoDateInTz, formatLocalTime } from '@/lib/datetime'
import { formatHours } from '@/lib/format'

interface TimeSheetWeekViewProps {
  entries: TimeEntry[]
  /** Bucket times in this zone (PM zone for admin, browser zone is fine for team-member). */
  timezone: string
  /** Monday 00:00 in `timezone`, as a UTC instant. */
  weekStart: Date
  onWeekChange: (newWeekStart: Date) => void
  onEntryClick: (entry: TimeEntry) => void
  /** Omit on admin — admins can't log hours on a member's behalf. */
  onSlotClick?: (dateIso: string, timeHHmm: string) => void
  /** false = color by status (team-member view); true = color by member id (admin view). */
  colorByMember?: boolean
}

const HOUR_HEIGHT = 40                            // px per hour row
const TOTAL_HEIGHT = HOUR_HEIGHT * 24             // 960
const SCROLL_TO_HOUR = 6                          // initially scroll to 6am
const VISIBLE_HEIGHT = 600                        // px of scrollable viewport
const MIN_BLOCK_HEIGHT = 20                       // px

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MEMBER_PALETTE = [
  // Each tuple: solid (approved), tint (pending), darker text-on-light
  { name: 'blue',    solid: 'bg-blue-500    text-white',   tint: 'bg-blue-200    text-blue-900',    border: 'border-blue-600' },
  { name: 'emerald', solid: 'bg-emerald-500 text-white',   tint: 'bg-emerald-200 text-emerald-900', border: 'border-emerald-600' },
  { name: 'violet',  solid: 'bg-violet-500  text-white',   tint: 'bg-violet-200  text-violet-900',  border: 'border-violet-600' },
  { name: 'orange',  solid: 'bg-orange-500  text-white',   tint: 'bg-orange-200  text-orange-900',  border: 'border-orange-600' },
  { name: 'pink',    solid: 'bg-pink-500    text-white',   tint: 'bg-pink-200    text-pink-900',    border: 'border-pink-600' },
  { name: 'teal',    solid: 'bg-teal-500    text-white',   tint: 'bg-teal-200    text-teal-900',    border: 'border-teal-600' },
  { name: 'indigo',  solid: 'bg-indigo-500  text-white',   tint: 'bg-indigo-200  text-indigo-900',  border: 'border-indigo-600' },
  { name: 'amber',   solid: 'bg-amber-500   text-gray-900', tint: 'bg-amber-200  text-amber-900',  border: 'border-amber-600' },
] as const

/** Hash a string id to a stable index in [0, MEMBER_PALETTE.length). */
function paletteIndexFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i) | 0
  return Math.abs(hash) % MEMBER_PALETTE.length
}

/**
 * Greedy interval-coloring: for each entry on a single day, assign the
 * leftmost lane (column index) it can fit in without overlapping the
 * existing entries in that lane. Returns laneIndex + total lanes used,
 * which the caller uses to compute width and left offset.
 */
function layoutLanes<T extends { startMs: number; endMs: number }>(
  items: T[],
): Array<T & { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs)
  const laneEnds: number[] = [] // ms when each lane is free again
  const out: Array<T & { lane: number }> = []
  for (const it of sorted) {
    let lane = laneEnds.findIndex(t => t <= it.startMs)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(it.endMs)
    } else {
      laneEnds[lane] = it.endMs
    }
    out.push({ ...it, lane })
  }
  const lanes = laneEnds.length || 1
  return out.map(o => ({ ...o, lanes }))
}

interface PositionedEntry {
  entry: TimeEntry
  startMs: number
  endMs: number
  /** Minutes from 00:00 to start, in the configured timezone. */
  startMinutesInDay: number
  /** Hours of the entry, derived (clamped). */
  durationMinutes: number
  /** yyyy-mm-dd in the configured zone. */
  dayKey: string
  lane: number
  lanes: number
}

/** Get hours/minutes-in-day for an instant, viewed in a specific IANA zone. */
function minutesInDayInTz(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || '0')
  const h = get('hour') % 24
  const m = get('minute')
  const s = get('second')
  return h * 60 + m + s / 60
}

const TimeSheetWeekView: React.FC<TimeSheetWeekViewProps> = ({
  entries, timezone, weekStart, onWeekChange,
  onEntryClick, onSlotClick, colorByMember = false,
}) => {
  // Build the 7 day labels from weekStart.
  // weekStart is the UTC instant equivalent to Monday 00:00 in `timezone`.
  // For each offset 0..6, advance by 24h and read the date in the zone.
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(weekStart.getTime() + i * 86_400_000)
      const dateIso = isoDateInTz(dayDate, timezone)
      const [yyyy, mm, dd] = dateIso.split('-').map(Number)
      const display = new Date(Date.UTC(yyyy, mm - 1, dd))
      return {
        dateIso,
        weekday: WEEKDAY_LABELS[i],
        dayOfMonth: dd,
        monthShort: display.toLocaleString(undefined, { month: 'short', timeZone: 'UTC' }),
      }
    })
  }, [weekStart, timezone])

  const todayIso = useMemo(() => isoDateInTz(new Date(), timezone), [timezone])

  // Filter entries to this week, project them onto day columns with lane layout.
  const positionedByDay = useMemo(() => {
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000)
    const dayMap = new Map<string, PositionedEntry[]>()
    for (const day of days) dayMap.set(day.dateIso, [])

    for (const e of entries) {
      if (!e.endedAt) continue // skip 'open' (legacy)
      const startMs = new Date(e.startedAt).getTime()
      const endMs   = new Date(e.endedAt).getTime()
      if (startMs >= weekEnd.getTime()) continue
      if (endMs <= weekStart.getTime()) continue
      const dayKey = isoDateInTz(new Date(startMs), timezone)
      if (!dayMap.has(dayKey)) continue

      const startMinutesInDay = minutesInDayInTz(new Date(startMs), timezone)
      // Duration in minutes. If shift technically spans midnight in zone,
      // clamp to end-of-day. (Practically, our LogHoursModal forbids this.)
      const rawMinutes = (endMs - startMs) / 60_000
      const durationMinutes = Math.max(1, Math.min(rawMinutes, 1440 - startMinutesInDay))

      dayMap.get(dayKey)!.push({
        entry: e, startMs, endMs, dayKey,
        startMinutesInDay, durationMinutes,
        lane: 0, lanes: 1,
      })
    }

    // Apply lane layout per day
    const result = new Map<string, PositionedEntry[]>()
    for (const [day, list] of dayMap) {
      const laid = layoutLanes(list)
      result.set(day, laid)
    }
    return result
  }, [entries, days, weekStart, timezone])

  // Member palette legend (admin only)
  const memberLegend = useMemo(() => {
    if (!colorByMember) return [] as Array<{ id: string; name: string; palette: typeof MEMBER_PALETTE[number] }>
    const seen = new Map<string, string>()
    for (const e of entries) seen.set(e.teamMemberId, e.teamMemberName || 'Member')
    return Array.from(seen.entries()).map(([id, name]) => ({
      id, name, palette: MEMBER_PALETTE[paletteIndexFor(id)],
    }))
  }, [colorByMember, entries])

  // Total hours visible this week (for header summary)
  const weekTotalHours = useMemo(() => {
    let total = 0
    for (const list of positionedByDay.values()) {
      for (const p of list) {
        if (p.entry.status !== 'approved' && p.entry.status !== 'pending') continue
        total += p.durationMinutes / 60
      }
    }
    return total
  }, [positionedByDay])

  // Scroll to ~6am on first render
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_HEIGHT
    }
  }, [])

  const goPrev   = () => onWeekChange(new Date(weekStart.getTime() - 7 * 86_400_000))
  const goNext   = () => onWeekChange(new Date(weekStart.getTime() + 7 * 86_400_000))
  const goToday  = () => {
    // Compute the Monday containing now, in `timezone`.
    onWeekChange(startOfWeek(new Date(), timezone))
  }

  // Header label: "Mon Mar 4 – Sun Mar 10, 2026"
  const headerLabel = useMemo(() => {
    if (days.length === 0) return ''
    const first = days[0], last = days[6]
    const fy = Number(first.dateIso.split('-')[0])
    const ly = Number(last.dateIso.split('-')[0])
    const yearStr = fy === ly ? `, ${fy}` : `, ${fy}–${ly}`
    return `${first.monthShort} ${first.dayOfMonth} – ${last.monthShort} ${last.dayOfMonth}${yearStr}`
  }, [days])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100" aria-label="Previous week">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Today
          </button>
          <button onClick={goNext} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100" aria-label="Next week">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <h3 className="ml-2 text-base font-semibold text-gray-900">{headerLabel}</h3>
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900 tabular-nums">{formatHours(weekTotalHours)}</span> this week
        </div>
      </div>

      {/* Member legend (admin) */}
      {colorByMember && memberLegend.length > 0 && (
        <div className="px-5 py-2 border-b border-gray-100 flex flex-wrap gap-3 text-xs">
          {memberLegend.map(m => (
            <div key={m.id} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded ${m.palette.solid.split(' ')[0]}`} />
              <span className="text-gray-700">{m.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Day-of-week header row (sticky inside the scroll container) */}
      <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-gray-100 bg-gray-50/50">
        <div /> {/* spacer for time gutter */}
        {days.map(day => {
          const isToday = day.dateIso === todayIso
          return (
            <div key={day.dateIso} className={`py-2 text-center text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
              <div>{day.weekday}</div>
              <div className={`mt-0.5 text-base ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>{day.dayOfMonth}</div>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: VISIBLE_HEIGHT }}>
        <div
          className="relative grid grid-cols-[60px_repeat(7,minmax(0,1fr))]"
          style={{ height: TOTAL_HEIGHT }}
        >
          {/* Time gutter labels (left column) */}
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 -translate-y-2 pr-2 text-right text-[10px] font-semibold text-gray-400"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const positioned = positionedByDay.get(day.dateIso) || []
            return (
              <div key={day.dateIso} className="relative border-l border-gray-100">
                {/* Hour gridlines */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half-hour gridlines (lighter) */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={`half-${h}`}
                    className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                    style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Empty-slot click overlay (only when onSlotClick is provided) */}
                {onSlotClick && (
                  // 48 slots per day (every 30 min)
                  Array.from({ length: 48 }, (_, slot) => {
                    const minutes = slot * 30
                    const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
                    const mm = String(minutes % 60).padStart(2, '0')
                    return (
                      <button
                        key={`slot-${slot}`}
                        type="button"
                        className="absolute left-0 right-0 hover:bg-blue-50/30 cursor-pointer focus:outline-none focus:bg-blue-100/50 z-0"
                        style={{ top: minutes / (24 * 60) * TOTAL_HEIGHT, height: HOUR_HEIGHT / 2 }}
                        onClick={() => onSlotClick(day.dateIso, `${hh}:${mm}`)}
                        aria-label={`Log hours starting at ${hh}:${mm} on ${day.dateIso}`}
                      />
                    )
                  })
                )}

                {/* Entry blocks */}
                {positioned.map((p) => {
                  const top    = (p.startMinutesInDay / 1440) * TOTAL_HEIGHT
                  const heightPx = Math.max(MIN_BLOCK_HEIGHT, (p.durationMinutes / 1440) * TOTAL_HEIGHT)
                  const widthPct = 100 / p.lanes
                  const leftPct  = p.lane * widthPct
                  const cls = blockClasses(p.entry, colorByMember)
                  const hours = p.durationMinutes / 60
                  return (
                    <button
                      key={p.entry.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEntryClick(p.entry) }}
                      className={`absolute z-10 rounded-md border-l-4 px-1.5 py-1 text-left overflow-hidden hover:brightness-110 transition cursor-pointer ${cls}`}
                      style={{
                        top,
                        height: heightPx,
                        left:   `calc(${leftPct}% + 1px)`,
                        width:  `calc(${widthPct}% - 2px)`,
                      }}
                      title={`${formatLocalTime(p.entry.startedAt)} – ${formatLocalTime(p.entry.endedAt!)} · ${formatHours(hours)} · ${p.entry.status}`}
                    >
                      <div className="text-xs font-semibold leading-tight tabular-nums">{hours.toFixed(2)}h</div>
                      {colorByMember && p.entry.teamMemberName && (
                        <div className="text-[11px] leading-tight truncate">{p.entry.teamMemberName}</div>
                      )}
                      {!colorByMember && (
                        <div className="text-[10px] leading-tight uppercase tracking-wider opacity-80">{p.entry.status}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Compute the styling for a single block, given color mode and status. */
function blockClasses(entry: TimeEntry, colorByMember: boolean): string {
  if (colorByMember) {
    const p = MEMBER_PALETTE[paletteIndexFor(entry.teamMemberId)]
    if (entry.status === 'approved') return `${p.solid} ${p.border}`
    if (entry.status === 'pending')  return `${p.tint}  ${p.border}`
    if (entry.status === 'rejected') return `${p.tint}  ${p.border} opacity-50 line-through`
    return `${p.solid} ${p.border}`
  }
  // Status-based (team-member view)
  switch (entry.status) {
    case 'approved': return 'bg-emerald-500 text-white border-emerald-700'
    case 'pending':  return 'bg-amber-300   text-amber-900 border-amber-600'
    case 'rejected': return 'bg-rose-300    text-rose-900  border-rose-600 opacity-60 line-through'
    case 'open':     return 'bg-blue-500    text-white     border-blue-700'
    default:         return 'bg-gray-200    text-gray-700  border-gray-400'
  }
}

/** Compute the Monday 00:00 (in `tz`) containing `date`, returned as UTC instant. */
export function startOfWeek(date: Date, tz: string): Date {
  // Walk back day-by-day until we hit a Monday (in tz).
  // We use Intl to detect day-of-week consistently.
  const wkLong = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date)
  const dowMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  const offset = dowMap[wkLong] ?? 0
  // Anchor at midnight in tz: get yyyy-mm-dd in tz, then construct that local midnight as UTC.
  const ymd = isoDateInTz(date, tz)
  const [y, m, d] = ymd.split('-').map(Number)
  // Approximate: assume tz offset is constant for that day; we use Intl to find local-midnight UTC.
  // Build "yyyy-mm-ddT00:00:00" in `tz`, find its UTC equivalent.
  const tentative = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  // Now adjust by the zone offset for that moment
  const fakeUtcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(tentative)
  const get = (t: string) => Number(fakeUtcParts.find(p => p.type === t)?.value || '0')
  const localized = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
  const offsetMs = localized - tentative.getTime()
  const localMidnight = new Date(tentative.getTime() - offsetMs)
  // Step back `offset` days to reach Monday
  return new Date(localMidnight.getTime() - offset * 86_400_000)
}

export default TimeSheetWeekView
