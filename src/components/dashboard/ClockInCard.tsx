'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClockIcon, ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import { getMyTimeEntries } from '@/services/timeEntryService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { MyTimeEntriesData, TimeEntry, TimeEntryStatus } from '@/services/types/timeEntry'
import {
  startOfWeekInTz,
  isoDateInTz,
  formatLocalDate,
  formatLocalTime,
} from '@/lib/datetime'
import { formatHours, formatMoney } from '@/lib/format'
import LogHoursModal from '@/components/time-entry/log/LogHoursModal'
import { getMonthlyEarnings, getMyPaystubs } from '@/services/paystubService'
import type { MonthlyEarnings, Paystub } from '@/services/types/paystub'
import { PAYSTUB_STATUS_INFO, LOCKED_PAYSTUB_STATUSES } from '@/services/types/paystub'

interface ClockInCardProps {
  /**
   * Optional: parent-managed data. When provided, the card is "controlled"
   * — it skips its own fetch and renders whatever the parent passes. This
   * is what the time-sheet page does so its calendar + entries-table share
   * a single source of truth. The dashboard renders the card without this
   * prop, and the card self-fetches as a self-contained widget.
   */
  data?: MyTimeEntriesData | null

  /**
   * Fired with the newly-submitted entry after a successful Log Hours
   * submission. Pages that render ClockInCard alongside other views of
   * the same data pass this so they can keep their state in sync.
   */
  onEntrySubmitted?: (entry: TimeEntry) => void

  /**
   * 'recent' (default) shows last 3 entries + a "View time sheet" link
   * (used on the dashboard). 'all' replaces those with a filterable
   * scrollable entries table (used on the time-sheet page).
   */
  entriesMode?: 'recent' | 'all'

  /**
   * Required when entriesMode='all'. Called when a row in the entries
   * table is clicked — parent typically opens its EditTimeEntryModal.
   */
  onEntryClicked?: (entry: TimeEntry) => void
}

const STATUS_BADGE: Record<TimeEntryStatus, string> = {
  open:     'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
}

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  open: 'Open', approved: 'Approved', pending: 'Pending', rejected: 'Rejected',
}

type StatusPreset = 'all' | 'pending' | 'approved' | 'rejected'

/**
 * Dashboard / Time-Sheet card. The unified "Log hours" model replaces
 * the live clock-in/out timer: a single primary button opens
 * `LogHoursModal` where the team member specifies start/end times.
 */
const ClockInCard: React.FC<ClockInCardProps> = ({
  data: dataProp,
  onEntrySubmitted,
  entriesMode = 'recent',
  onEntryClicked,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)

  // Controlled if a `data` prop was passed (even null). Uncontrolled mode
  // self-fetches and tracks its own state.
  const isControlled = dataProp !== undefined

  const [internalData, setInternalData]   = useState<MyTimeEntriesData | null>(null)
  const [internalLoading, setInternalLoading] = useState(true)

  const data    = isControlled ? dataProp ?? null : internalData
  const loading = isControlled ? false            : internalLoading

  const [showLog, setShowLog] = useState(false)

  const loadData = async () => {
    try {
      const res = await getMyTimeEntries()
      if (res.status === 'success') setInternalData(res.data)
    } catch (err) {
      console.warn('ClockInCard: getMyTimeEntries failed', err)
    } finally {
      setInternalLoading(false)
    }
  }

  // Self-fetch only in uncontrolled mode.
  useEffect(() => {
    if (!isControlled) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled])

  const onSubmitted = (entry: TimeEntry) => {
    if (!isControlled) {
      setInternalData(d => d ? { ...d, entries: [entry, ...d.entries] } : d)
      // Background refresh to pull canonical state.
      loadData()
    }
    onEntrySubmitted?.(entry)
    showNotification('Submitted for approval.', 'success')
  }

  // Hours this week (approved + pending) in PM's zone — drives the progress bar.
  const hoursThisWeek = useMemo(() => {
    if (!data) return 0
    const tz = data.teamMember.pmTimezone
    const start = startOfWeekInTz(new Date(), tz).getTime()
    const end   = start + 7 * 86_400_000
    let total = 0
    for (const e of data.entries) {
      if (e.status !== 'approved' && e.status !== 'pending') continue
      if (e.hoursWorked == null) continue
      const ts = new Date(e.startedAt).getTime()
      if (ts >= start && ts < end) total += e.hoursWorked
    }
    return total
  }, [data])

  const cap = data?.teamMember.weeklyMaxHours ?? null
  const progressPct = cap ? Math.min(100, Math.round((hoursThisWeek / cap) * 100)) : 0
  const progressColor = progressPct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 w-1/3 bg-gray-200 rounded mb-4" />
        <div className="h-12 w-40 bg-gray-200 rounded" />
      </div>
    )
  }
  if (!data) return null

  const rateUnset = data.teamMember.hourlyRate == null
  const tz = data.teamMember.pmTimezone

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {rateUnset && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Your hourly rate hasn&rsquo;t been set yet. Your manager will configure it; in the meantime,
            log your hours and they&rsquo;ll be approved as usual.
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
              <ClockIcon className="w-4 h-4" />
              <span>Time Sheet</span>
            </div>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900">Log your hours</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pick a date and your start/end times — your manager reviews each entry.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-sm
                       bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <PlusIcon className="w-5 h-5" />
            Log hours
          </button>
        </div>

        {/* Weekly progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">This week (approved + pending)</span>
            <span className="text-gray-900 font-semibold tabular-nums">
              {formatHours(hoursThisWeek)}
              {cap != null && <span className="text-gray-500 font-normal"> / {cap.toFixed(2)} hrs</span>}
            </span>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all`}
              style={{ width: cap ? `${progressPct}%` : '0%' }}
            />
          </div>
        </div>

        {/* Bottom half: 'recent' (default) vs 'all' (filterable entries) */}
        {entriesMode === 'all' ? (
          <EntriesList
            data={data}
            timezone={tz}
            onEntryClicked={onEntryClicked}
          />
        ) : (
          <RecentList data={data} />
        )}
      </div>

      <LogHoursModal
        isOpen={showLog}
        onClose={() => setShowLog(false)}
        onSubmitted={onSubmitted}
      />
    </>
  )
}

// =============================================================================
// "Recent" — last 3 entries (used on dashboard)
// =============================================================================

const RecentList: React.FC<{ data: MyTimeEntriesData }> = ({ data }) => {
  const recent = data.entries.slice(0, 3)
  const currency = data.teamMember.currency || 'CAD'
  return (
    <>
      {recent.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent</div>
          <ul className="space-y-1.5">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {new Date(e.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' · '}
                  <span className="text-gray-500">{e.hoursWorked != null ? formatHours(e.hoursWorked) : '—'}</span>
                </span>
                <StatusPill status={e.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <MyPaystubSummary currency={currency} />
      <div className="mt-5 flex items-center justify-end text-sm">
        <Link
          href="/property-manager/time-sheet"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
        >
          View time sheet <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </>
  )
}

// =============================================================================
// "My Paystubs" — latest paystub status + current-month earnings + link
// =============================================================================

const MyPaystubSummary: React.FC<{ currency: string }> = ({ currency }) => {
  const [earnings, setEarnings] = useState<MonthlyEarnings | null>(null)
  const [latest, setLatest] = useState<Paystub | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [earningsRes, listRes] = await Promise.all([
          getMonthlyEarnings(),
          getMyPaystubs(),
        ])
        if (cancelled) return
        if (earningsRes.status === 'success') setEarnings(earningsRes.data)
        if (listRes.status === 'success') {
          // The list is sorted by backend; the first item is the most recent.
          setLatest(listRes.data[0] ?? null)
        }
      } catch {
        // Non-fatal — section just stays empty.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="mt-5 pt-5 border-t border-gray-100">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  const cm = earnings?.currentMonth
  const hasEarnings = cm && (cm.paid + cm.approved + cm.pending) > 0
  if (!latest && !hasEarnings) return null

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My paystubs</div>
        <Link
          href="/property-manager/paystubs"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          View all
        </Link>
      </div>

      {latest && (
        <Link
          href={`/property-manager/paystubs?paystubId=${latest.id}`}
          className="flex items-center justify-between text-sm py-1.5 hover:bg-gray-50 -mx-2 px-2 rounded"
        >
          <span className="text-gray-700">
            <span className="font-medium text-gray-900">{latest.paystubNumber}</span>
            <span className="text-gray-500"> · {formatMoney(latest.totalAmountSnapshot ?? latest.total, latest.currencyAtPayment ?? latest.currency)}</span>
          </span>
          <PaystubStatusPill status={latest.status} />
        </Link>
      )}

      {hasEarnings && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          {cm!.paid > 0 && (
            <EarningsCell label="Paid" amount={cm!.paid} currency={currency} tone="emerald" />
          )}
          {cm!.approved > 0 && (
            <EarningsCell label="Approved" amount={cm!.approved} currency={currency} tone="blue" />
          )}
          {cm!.pending > 0 && (
            <EarningsCell label="Pending" amount={cm!.pending} currency={currency} tone="amber" />
          )}
        </div>
      )}
      {hasEarnings && (
        <div className="text-[10px] text-gray-500 mt-1">{cm!.label}</div>
      )}
    </div>
  )
}

const EARNINGS_TONE: Record<'emerald' | 'blue' | 'amber', string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue:    'bg-blue-50 text-blue-700',
  amber:   'bg-amber-50 text-amber-700',
}

const EarningsCell: React.FC<{ label: string; amount: number; currency: string; tone: 'emerald' | 'blue' | 'amber' }> = ({
  label, amount, currency, tone,
}) => (
  <div className={`rounded-lg px-2 py-1.5 ${EARNINGS_TONE[tone]}`}>
    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
    <div className="text-sm font-semibold tabular-nums">{formatMoney(amount, currency)}</div>
  </div>
)

const PaystubStatusPill: React.FC<{ status: Paystub['status'] }> = ({ status }) => {
  const info = PAYSTUB_STATUS_INFO[status]
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${info.pill}`}>
      {info.label}
    </span>
  )
}

// =============================================================================
// "All" — filterable, scrollable entries list (used on the time-sheet page)
// =============================================================================

interface EntriesListProps {
  data: MyTimeEntriesData
  timezone: string
  onEntryClicked?: (entry: TimeEntry) => void
}

const EntriesList: React.FC<EntriesListProps> = ({ data, timezone, onEntryClicked }) => {
  const [statusFilter, setStatusFilter] = useState<StatusPreset>('all')
  // Date range (YYYY-MM-DD in PM tz) + optional pay-period preset.
  // Picking a period auto-fills the dates; editing a date clears the period.
  const initial = useMemo(() => {
    const monday = startOfWeekInTz(new Date(), timezone)
    return {
      start: isoDateInTz(monday, timezone),
      end:   isoDateInTz(new Date(monday.getTime() + 6 * 86_400_000), timezone),
    }
  }, [timezone])
  const [dateStart, setDateStart] = useState<string>(initial.start)
  const [dateEnd,   setDateEnd]   = useState<string>(initial.end)

  const filtered = useMemo(() => {
    return data.entries.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (!dateStart || !dateEnd) return true
      const day = isoDateInTz(new Date(e.startedAt), timezone)
      return day >= dateStart && day <= dateEnd
    })
  }, [data.entries, statusFilter, dateStart, dateEnd, timezone])

  // Range totals — hours + $ grouped by currency.
  const rangeTotals = useMemo(() => {
    let hours = 0
    const dollars = new Map<string, number>()
    for (const e of filtered) {
      if (e.hoursWorked != null) hours += e.hoursWorked
      if (e.hoursWorked != null && e.hourlyRateAtEntry != null) {
        const cur = e.currencyAtEntry || data.teamMember.currency || 'CAD'
        dollars.set(cur, (dollars.get(cur) || 0) + e.hoursWorked * e.hourlyRateAtEntry)
      }
    }
    return { hours, dollars }
  }, [filtered, data.teamMember.currency])

  const handleDateStartChange = (v: string) => { setDateStart(v) }
  const handleDateEndChange   = (v: string) => { setDateEnd(v) }
  const handleResetRange = () => {
    setDateStart(initial.start)
    setDateEnd(initial.end)
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      {/* Totals row */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 tabular-nums">
            {formatHours(rangeTotals.hours)}
            {rangeTotals.dollars.size > 0 && (
              <span className="ml-2 text-emerald-700">
                · {Array.from(rangeTotals.dollars.entries())
                    .map(([cur, amt]) => formatMoney(amt, cur))
                    .join(' · ')}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">in selected range</div>
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
          {(['all', 'pending', 'approved', 'rejected'] as StatusPreset[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => handleDateStartChange(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To</label>
          <input
            type="date"
            value={dateEnd}
            min={dateStart || undefined}
            onChange={(e) => handleDateEndChange(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <button
          onClick={handleResetRange}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Reset to this week
        </button>
      </div>

      {/* Entries table — fixed max height, internal scroll */}
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">No entries in this range.</div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 sticky top-0 z-10">
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Start</th>
                  <th className="px-4 py-2">End</th>
                  <th className="px-4 py-2">Hours</th>
                  <th className="px-4 py-2">Earned</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Paystub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => {
                  const earned = e.hoursWorked != null && e.hourlyRateAtEntry != null
                    ? e.hoursWorked * e.hourlyRateAtEntry
                    : null
                  const locked = e.paystubStatus != null && LOCKED_PAYSTUB_STATUSES.includes(e.paystubStatus)
                  const rowTitle = locked
                    ? `Locked — on ${PAYSTUB_STATUS_INFO[e.paystubStatus!].label.toLowerCase()} paystub ${e.paystubNumber ?? ''}`.trim()
                    : 'Open entry'
                  return (
                    <tr
                      key={e.id}
                      onClick={() => { if (!locked) onEntryClicked?.(e) }}
                      className={locked ? 'cursor-not-allowed opacity-70' : 'hover:bg-blue-50/40 cursor-pointer'}
                      title={rowTitle}
                    >
                      <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{formatLocalDate(e.startedAt)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{formatLocalTime(e.startedAt)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{e.endedAt ? formatLocalTime(e.endedAt) : <span className="text-blue-600 font-medium">Open</span>}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 tabular-nums">{e.hoursWorked != null ? formatHours(e.hoursWorked) : '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 tabular-nums whitespace-nowrap">
                        {earned != null
                          ? formatMoney(earned, e.currencyAtEntry || data.teamMember.currency || 'CAD')
                          : <span className="italic text-gray-400">Rate pending</span>}
                      </td>
                      <td className="px-4 py-2">
                        <StatusPill status={e.status} />
                      </td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">
                        {e.paystubId && e.paystubNumber ? (
                          <Link
                            href={`/property-manager/paystubs?paystubId=${e.paystubId}`}
                            onClick={(ev) => ev.stopPropagation()}
                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                          >
                            {e.paystubNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

const StatusPill: React.FC<{ status: TimeEntryStatus }> = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${STATUS_BADGE[status]}`}>
    {STATUS_LABEL[status]}
  </span>
)

export default ClockInCard
