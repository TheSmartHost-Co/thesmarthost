'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ClockIcon, CurrencyDollarIcon, UsersIcon, ExclamationTriangleIcon,
  ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getTeamTimeSummary, getTimeEntries, deleteTimeEntry, bulkApproveTimeEntries,
} from '@/services/timeEntryService'
import type {
  TeamTimeSummaryData, TeamTimeSummaryRow, TimeEntry, TimeEntryStatus,
} from '@/services/types/timeEntry'
import { formatHours, formatMoney } from '@/lib/format'
import { formatInTz, zoneAbbrev, isoDateInTz } from '@/lib/datetime'
import { LOCKED_PAYSTUB_STATUSES, PAYSTUB_STATUS_INFO } from '@/services/types/paystub'
import ReviewOverCapModal from '@/components/time-entry/approve/ReviewOverCapModal'
import EditTimeEntryModal from '@/components/time-entry/edit/EditTimeEntryModal'
import ExportPayrollModal from '@/components/time-entry/export/ExportPayrollModal'
import WageSettingsModal from '@/components/team-member/wage-settings/WageSettingsModal'
import TimeSheetWeekView, { startOfWeek } from '@/components/time-entry/calendar/TimeSheetWeekView'

const STATUS_BADGE: Record<TimeEntryStatus, string> = {
  open:     'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
}

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  open: 'Open', approved: 'Approved', pending: 'Pending', rejected: 'Rejected',
}

export default function TeamTimeSheetPage() {
  return (
    <Suspense fallback={<div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />}>
      <TeamTimeSheetPageInner />
    </Suspense>
  )
}

function TeamTimeSheetPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPM, effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore(s => s.showNotification)

  const [summary, setSummary] = useState<TeamTimeSummaryData | null>(null)
  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<TimeEntry | null>(null)
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [editingWageMember, setEditingWageMember] = useState<TeamTimeSummaryRow | null>(null)
  // Entries section (always visible) — filter by team member; week is driven by calendar
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [filterMemberId, setFilterMemberId] = useState<string>('') // '' = all
  // Calendar week (Monday 00:00 in PM zone, as UTC instant). Initialized lazily once summary loads.
  const [weekStart, setWeekStart] = useState<Date | null>(null)
  // Entries-section filter: a date range (YYYY-MM-DD in PM tz).
  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')
  // Pending Approvals — multi-select for bulk approve
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)

  // Non-PMs land here → bounce to their own time sheet
  useEffect(() => {
    if (effectiveUserId == null) return
    if (!isPM) router.replace('/property-manager/time-sheet')
  }, [isPM, effectiveUserId, router])

  const loadSummary = async () => {
    if (!effectiveUserId) return
    try {
      const [sumRes, pendingRes] = await Promise.all([
        getTeamTimeSummary(effectiveUserId),
        getTimeEntries({ userId: effectiveUserId, status: 'pending' }),
      ])
      if (sumRes.status === 'success') {
        setSummary(sumRes.data)
        // Initialize visible week to current Monday in PM zone (only on first load)
        const tz = sumRes.data.pmTimezone
        const monday = startOfWeek(new Date(), tz)
        setWeekStart((prev) => prev ?? monday)
        // Default the entries filter to the current Mon→Sun window in PM tz.
        setDateStart((prev) => prev || isoDateInTz(monday, tz))
        setDateEnd((prev) => prev || isoDateInTz(new Date(monday.getTime() + 6 * 86_400_000), tz))
      }
      if (pendingRes.status === 'success') setPendingEntries(pendingRes.data)
    } catch (err: any) {
      showNotification(err?.message || 'Failed to load team time data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSummary() /* eslint-disable-next-line */ }, [effectiveUserId])

  // If URL has ?tab=pending, scroll to that section
  useEffect(() => {
    if (searchParams?.get('tab') === 'pending') {
      const el = document.getElementById('pending-approvals')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchParams, loading])

  // Apply date-range filter (in PM tz) on top of the team-member filter the
  // server already applied. Both ends inclusive.
  const visibleEntries = useMemo(() => {
    if (!summary || !dateStart || !dateEnd) return entries
    return entries.filter(e => {
      const day = isoDateInTz(new Date(e.startedAt), summary.pmTimezone)
      return day >= dateStart && day <= dateEnd
    })
  }, [entries, dateStart, dateEnd, summary])

  // Range totals — hours + $ grouped by currency from the filtered entries.
  const rangeTotals = useMemo(() => {
    let hours = 0
    const dollars = new Map<string, number>()
    for (const e of visibleEntries) {
      if (e.hoursWorked != null) hours += e.hoursWorked
      if (e.hoursWorked != null && e.hourlyRateAtEntry != null) {
        const cur = e.currencyAtEntry || 'CAD'
        dollars.set(cur, (dollars.get(cur) || 0) + e.hoursWorked * e.hourlyRateAtEntry)
      }
    }
    return { hours, dollars }
  }, [visibleEntries])

  const totals = useMemo(() => {
    if (!summary) return null
    let totalHoursApproved = 0
    let pendingCount = 0
    let clockedInCount = 0
    const dollarsByCurrency = new Map<string, number>()
    for (const r of summary.rows) {
      totalHoursApproved += r.hoursApproved
      pendingCount += r.pendingEntryCount
      if (r.isCurrentlyClockedIn) clockedInCount++
      const cur = r.currency || 'CAD'
      dollarsByCurrency.set(cur, (dollarsByCurrency.get(cur) || 0) + r.dollarsApproved)
    }
    return { totalHoursApproved, pendingCount, clockedInCount, dollarsByCurrency }
  }, [summary])

  // Always-visible entries section — refetch when the filter changes
  useEffect(() => {
    if (!effectiveUserId) return
    let cancelled = false
    setEntriesLoading(true)
    ;(async () => {
      try {
        const res = await getTimeEntries({
          userId: effectiveUserId,
          teamMemberId: filterMemberId || undefined,
        })
        if (cancelled) return
        if (res.status === 'success') setEntries(res.data)
      } catch (err: any) {
        if (!cancelled) showNotification(err?.message || 'Failed to load entries.', 'error')
      } finally {
        if (!cancelled) setEntriesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [effectiveUserId, filterMemberId, showNotification])

  const handleDateStartChange = (v: string) => { setDateStart(v) }
  const handleDateEndChange = (v: string) => { setDateEnd(v) }
  const handleClearRange = () => {
    if (!summary) return
    const tz = summary.pmTimezone
    const monday = startOfWeek(new Date(), tz)
    setDateStart(isoDateInTz(monday, tz))
    setDateEnd(isoDateInTz(new Date(monday.getTime() + 6 * 86_400_000), tz))
  }

  // Selecting a team-table row jumps the filter to that member and scrolls
  // the entries section into view.
  const focusMemberInEntries = (member: TeamTimeSummaryRow) => {
    setFilterMemberId(member.teamMemberId)
    requestAnimationFrame(() => {
      document.getElementById('entries-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleResolved = (updated: TimeEntry) => {
    setPendingEntries(list => list.filter(e => e.id !== updated.id || updated.status === 'pending'))
    setEntries(list => list.map(e => e.id === updated.id ? updated : e))
    loadSummary()
  }

  const handleEdited = (updated: TimeEntry) => {
    setPendingEntries(list => updated.status === 'pending'
      ? list.map(e => e.id === updated.id ? updated : e)
      : list.filter(e => e.id !== updated.id))
    setEntries(list => list.map(e => e.id === updated.id ? updated : e))
    loadSummary()
  }

  const togglePendingSelected = (id: string, checked: boolean) => {
    setSelectedPending((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }

  const allPendingSelected = pendingEntries.length > 0
    && pendingEntries.every(e => selectedPending.has(e.id))

  const toggleAllPending = (checked: boolean) => {
    setSelectedPending(checked ? new Set(pendingEntries.map(e => e.id)) : new Set())
  }

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedPending)
    if (ids.length === 0) return
    setBulkApproving(true)
    try {
      const res = await bulkApproveTimeEntries(ids)
      if (res.status === 'success') {
        const approved = new Set(res.data.approvedIds)
        setPendingEntries(list => list.filter(e => !approved.has(e.id)))
        setEntries(list => list.map(e => approved.has(e.id) ? { ...e, status: 'approved' as const } : e))
        setSelectedPending(new Set())
        showNotification(`Approved ${res.data.approvedCount} entr${res.data.approvedCount === 1 ? 'y' : 'ies'}.`, 'success')
        loadSummary()
      } else {
        showNotification(res.message || 'Bulk approve failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Bulk approve failed.', 'error')
    } finally {
      setBulkApproving(false)
    }
  }

  const handleDeleteEntry = async (entry: TimeEntry) => {
    if (!confirm('Delete this time entry?')) return
    try {
      const res = await deleteTimeEntry(entry.id)
      if (res.status === 'success') {
        setPendingEntries(list => list.filter(e => e.id !== entry.id))
        setEntries(list => list.filter(e => e.id !== entry.id))
        showNotification('Deleted.', 'success')
        loadSummary()
      } else {
        showNotification(res.message || 'Delete failed.', 'error')
      }
    } catch (err: any) {
      showNotification(err?.message || 'Delete failed.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!summary) return null

  const tzAbbrev = zoneAbbrev(summary.pmTimezone)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClockIcon className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Time Sheet</h1>
            <p className="text-gray-500 text-sm">Track team hours, approve over-cap requests, and export payroll.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export Payroll
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Hours This Week" value={formatHours(totals?.totalHoursApproved ?? 0)} icon={<ClockIcon className="w-5 h-5" />} accent="blue" />
        <KPI
          title="$ Committed"
          value={renderDollarTotals(totals?.dollarsByCurrency)}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          accent="emerald"
        />
        <KPI title="Currently Clocked In" value={String(totals?.clockedInCount ?? 0)} icon={<UsersIcon className="w-5 h-5" />} accent="blue" />
        <KPI title="Pending Approvals" value={String(totals?.pendingCount ?? 0)} icon={<ExclamationTriangleIcon className="w-5 h-5" />} accent={(totals?.pendingCount ?? 0) > 0 ? 'amber' : 'gray'} />
      </div>

      {/* Pending approvals */}
      {pendingEntries.length > 0 && (
        <section id="pending-approvals" className="bg-white rounded-2xl border border-amber-200 shadow-sm">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/40 rounded-t-2xl flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
              <p className="text-sm text-gray-500">Times shown in {tzAbbrev} ({summary.pmTimezone}).</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={(e) => toggleAllPending(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Select all
              </label>
              {selectedPending.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  disabled={bulkApproving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {bulkApproving ? 'Approving…' : `Approve ${selectedPending.size}`}
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingEntries.map((e) => {
              const isOverCap = e.pendingKind === 'over_cap'
              const kindBadge = isOverCap ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
              const kindLabel = isOverCap ? 'Over cap' : 'Submission'
              const checked = selectedPending.has(e.id)
              const earned = (e.hoursWorked != null && e.hourlyRateAtEntry != null)
                ? e.hoursWorked * e.hourlyRateAtEntry
                : null
              return (
                <div key={e.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(ev) => togglePendingSelected(e.id, ev.target.checked)}
                    className="rounded border-gray-300"
                    aria-label="Select for bulk approve"
                  />
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{e.teamMemberName}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${kindBadge}`}>{kindLabel}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatInTz(e.startedAt, summary.pmTimezone)} → {formatInTz(e.endedAt, summary.pmTimezone)}
                      <span className="ml-2 font-medium text-gray-900">{formatHours(e.hoursWorked)}</span>
                      {earned != null && (
                        <span className="ml-2 font-semibold text-emerald-700 tabular-nums">
                          {formatMoney(earned, e.currencyAtEntry || 'CAD')}
                        </span>
                      )}
                      {earned == null && e.hoursWorked != null && (
                        <span className="ml-2 italic text-gray-400">Rate pending</span>
                      )}
                    </div>
                    {e.pendingReason && (
                      <div className="mt-1 text-sm italic text-gray-700">&ldquo;{e.pendingReason}&rdquo;</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(e)}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                      title="Edit before deciding"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setReviewing(e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => setReviewing(e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium"
                    >
                      <XCircleIcon className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Per-member table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Team this week</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Hours</th>
                <th className="px-6 py-3">Cap</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">$ Committed</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.rows.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">No active team members yet. Invite someone from the Team Members page.</td></tr>
              ) : summary.rows.map((r) => {
                const totalHours = r.hoursApproved + r.hoursPending
                const pct = r.weeklyMaxHours ? Math.min(100, (totalHours / r.weeklyMaxHours) * 100) : 0
                // No red tier — over-cap routes through PM approval, so the bar
                // maxes out at amber rather than signalling a violation.
                const barColor = pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
                return (
                  <tr
                    key={r.teamMemberId}
                    onClick={() => focusMemberInEntries(r)}
                    className="hover:bg-blue-50/40 cursor-pointer"
                    title="View entries below"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.teamMemberName}</div>
                      <div className="text-xs text-gray-500">{r.teamMemberEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      {r.isCurrentlyClockedIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Clocked in
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">Off</span>
                      )}
                      {r.isOverCap && (
                        <span className="ml-2 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-700">Over cap</span>
                      )}
                    </td>
                    <td className="px-6 py-4 tabular-nums text-sm">
                      <div className="text-gray-900 font-medium">{formatHours(r.hoursApproved)}</div>
                      {r.hoursPending > 0 && <div className="text-xs text-amber-700">+{formatHours(r.hoursPending)} pending</div>}
                    </td>
                    <td className="px-6 py-4 tabular-nums text-sm text-gray-700">
                      {r.weeklyMaxHours != null ? `${r.weeklyMaxHours.toFixed(2)} hrs` : <span className="text-gray-400 italic">No cap</span>}
                    </td>
                    <td className="px-6 py-4">
                      {r.weeklyMaxHours != null ? (
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 tabular-nums text-sm text-gray-900">{formatMoney(r.dollarsApproved, r.currency)}</td>
                    <td className="px-6 py-4 tabular-nums text-sm text-gray-700">
                      {r.hourlyRate != null ? formatMoney(r.hourlyRate, r.currency) + '/hr' : <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingWageMember(r) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm"
                        title="Edit wage settings"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar — week grid; navigate weeks, click an entry to edit */}
      {weekStart && (
        <TimeSheetWeekView
          entries={entries}
          timezone={summary.pmTimezone}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          onEntryClick={setEditing}
          colorByMember={true}
        />
      )}

      {/* Entries (always visible, filterable by team member + date range + pay period) */}
      <div id="entries-section" className="bg-white rounded-2xl border border-gray-100 shadow-sm scroll-mt-4">
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Entries</h2>
              <p className="text-sm text-gray-500">Times shown in {tzAbbrev} ({summary.pmTimezone}).</p>
            </div>
            <div className="text-right">
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
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Team member</label>
              <select
                value={filterMemberId}
                onChange={(e) => setFilterMemberId(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">All team members</option>
                {summary.rows.map(r => (
                  <option key={r.teamMemberId} value={r.teamMemberId}>{r.teamMemberName}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => handleDateStartChange(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <label className="text-sm font-medium text-gray-700">To</label>
              <input
                type="date"
                value={dateEnd}
                min={dateStart || undefined}
                onChange={(e) => handleDateEndChange(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <button
              onClick={handleClearRange}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset to this week
            </button>
          </div>
        </div>

        {entriesLoading ? (
          <div className="px-6 py-10 text-center text-gray-400">Loading entries…</div>
        ) : visibleEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {filterMemberId
              ? 'No entries for this team member in this range.'
              : 'No entries in this range.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Start ({tzAbbrev})</th>
                  <th className="px-6 py-3">End</th>
                  <th className="px-6 py-3">Hours</th>
                  <th className="px-6 py-3">Earned</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Paystub</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleEntries.map(e => {
                  const earned = e.hoursWorked != null && e.hourlyRateAtEntry != null
                    ? e.hoursWorked * e.hourlyRateAtEntry
                    : null
                  const locked = e.paystubStatus != null && LOCKED_PAYSTUB_STATUSES.includes(e.paystubStatus)
                  const lockTooltip = locked
                    ? `Locked — on ${PAYSTUB_STATUS_INFO[e.paystubStatus!].label.toLowerCase()} paystub ${e.paystubNumber ?? ''}`.trim()
                    : null
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setEditing(e)}
                      className="hover:bg-gray-50/40 cursor-pointer"
                      title={locked ? lockTooltip! : 'Edit entry'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{e.teamMemberName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatInTz(e.startedAt, summary.pmTimezone)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{e.endedAt ? formatInTz(e.endedAt, summary.pmTimezone) : <span className="text-blue-600 font-medium">Open</span>}</td>
                      <td className="px-6 py-4 text-sm tabular-nums text-gray-900">{e.hoursWorked != null ? formatHours(e.hoursWorked) : '—'}</td>
                      <td className="px-6 py-4 text-sm tabular-nums">
                        {earned != null
                          ? formatMoney(earned, e.currencyAtEntry || 'CAD')
                          : <span className="italic text-gray-400">Rate pending</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_BADGE[e.status]}`}>
                          {STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
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
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                          <button
                            onClick={() => { if (!locked) setEditing(e) }}
                            disabled={locked}
                            className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed"
                            title={locked ? lockTooltip! : 'Edit'}
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (!locked) handleDeleteEntry(e) }}
                            disabled={locked}
                            className="p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed"
                            title={locked ? lockTooltip! : 'Delete'}
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReviewOverCapModal
        isOpen={!!reviewing}
        onClose={() => setReviewing(null)}
        entry={reviewing}
        pmTimezone={summary.pmTimezone}
        onResolved={handleResolved}
      />

      <EditTimeEntryModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        entry={editing}
        onUpdate={handleEdited}
        pmEditMode={true}
        onDelete={(entryId) => {
          setPendingEntries(list => list.filter(e => e.id !== entryId))
          setEntries(list => list.filter(e => e.id !== entryId))
          loadSummary()
        }}
      />

      <ExportPayrollModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        userId={effectiveUserId!}
        pmTimezone={summary.pmTimezone}
        teamMembers={summary.rows.map(r => ({ teamMemberId: r.teamMemberId, teamMemberName: r.teamMemberName }))}
      />

      <WageSettingsModal
        isOpen={!!editingWageMember}
        onClose={() => setEditingWageMember(null)}
        member={editingWageMember}
        onSaved={() => loadSummary()}
      />
    </div>
  )
}

// ---- Small subcomponents ----------------------------------------------------

const ACCENT: Record<'blue' | 'emerald' | 'amber' | 'gray', string> = {
  blue:    'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50 text-amber-700',
  gray:    'bg-gray-50 text-gray-600',
}

interface KPIProps { title: string; value: React.ReactNode; icon: React.ReactNode; accent: 'blue'|'emerald'|'amber'|'gray' }
const KPI: React.FC<KPIProps> = ({ title, value, icon, accent }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-500">{title}</span>
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${ACCENT[accent]}`}>{icon}</span>
    </div>
    <div className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
  </div>
)

function renderDollarTotals(byCurrency?: Map<string, number>): React.ReactNode {
  if (!byCurrency || byCurrency.size === 0) return formatMoney(0, 'CAD')
  const entries = Array.from(byCurrency.entries())
  if (entries.length === 1) {
    const [cur, total] = entries[0]
    return formatMoney(total, cur)
  }
  return (
    <div className="text-base leading-tight">
      {entries.map(([cur, total]) => (
        <div key={cur}>{formatMoney(total, cur)}</div>
      ))}
    </div>
  )
}
