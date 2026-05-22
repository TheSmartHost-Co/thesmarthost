'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon, BanknotesIcon, ArrowDownTrayIcon, CheckCircleIcon,
  PencilSquareIcon, TrashIcon, XCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import { formatHours, formatMoney } from '@/lib/format'
import { formatInTz, formatLocal, zoneAbbrev } from '@/lib/datetime'
import {
  getPayPeriod, approveAllInPeriod,
} from '@/services/payPeriodService'
import type { PayPeriodDetail, PayPeriod } from '@/services/types/payPeriod'
import type { TimeEntry, TimeEntryStatus } from '@/services/types/timeEntry'

import ReviewOverCapModal from '@/components/time-entry/approve/ReviewOverCapModal'
import EditTimeEntryModal from '@/components/time-entry/edit/EditTimeEntryModal'
import EditPayPeriodModal from '@/components/pay-period/edit/EditPayPeriodModal'
import DeletePayPeriodModal from '@/components/pay-period/delete/DeletePayPeriodModal'
import MarkPaidConfirmModal from '@/components/pay-period/mark-paid/MarkPaidConfirmModal'
import ExportPayPeriodModal from '@/components/pay-period/export/ExportPayPeriodModal'
import PayPeriodStatusBadge from '@/components/pay-period/shared/PayPeriodStatusBadge'

const STATUS_BADGE: Record<TimeEntryStatus, string> = {
  open:     'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
}

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  open: 'Open', approved: 'Approved', pending: 'Pending', rejected: 'Rejected',
}

export default function PayPeriodDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayPeriodDetailInner />
    </Suspense>
  )
}

function PayPeriodDetailInner() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  const { isPM } = usePermissions()
  const showNotification = useNotificationStore(s => s.showNotification)

  const [detail, setDetail] = useState<PayPeriodDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvingAll, setApprovingAll] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [reviewing, setReviewing] = useState<TimeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // No role bounce — both PMs and TEAM_MEMBERs can view a period detail.
  // The backend role-gates writes; the UI hides PM-only actions for members.

  const load = async () => {
    try {
      const res = await getPayPeriod(id)
      if (res.status === 'success') {
        setDetail(res.data)
      } else {
        showNotification(res.message || 'Failed to load period.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ---- Mutations roll back into detail state ------------------------------

  const handlePeriodUpdated = (p: PayPeriod) => {
    setDetail(d => d ? { ...d, period: p } : d)
  }
  const handlePeriodPaid = (p: PayPeriod) => {
    setDetail(d => d ? { ...d, period: p } : d)
  }
  const handleDeleted = () => {
    router.replace('/property-manager/pay-periods')
  }

  // Entry-level resolutions — refresh detail so totals/byMember update too.
  const handleEntryResolved = (updated: TimeEntry) => {
    setDetail(d => d
      ? { ...d, entries: d.entries.map(e => e.id === updated.id ? updated : e) }
      : d)
    load()
  }
  const handleEntryEdited = (updated: TimeEntry) => {
    setDetail(d => d
      ? { ...d, entries: d.entries.map(e => e.id === updated.id ? updated : e) }
      : d)
    load()
  }
  const handleEntryDeleted = (entryId: string) => {
    setDetail(d => d
      ? { ...d, entries: d.entries.filter(e => e.id !== entryId) }
      : d)
    load()
  }

  const handleApproveAll = async () => {
    if (!detail) return
    setApprovingAll(true)
    try {
      const res = await approveAllInPeriod(detail.period.id)
      if (res.status === 'success') {
        const n = res.data.approvedCount
        showNotification(`Approved ${n} entr${n === 1 ? 'y' : 'ies'}.`, 'success')
        load()
      } else {
        showNotification(res.message || 'Approve-all failed.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setApprovingAll(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (!detail) return null

  const { period, totals, entries } = detail
  const currency = totals.currency || 'CAD'
  const liveTotalHours = totals.hoursApproved + totals.hoursPending
  const liveTotalAmount = totals.amountApproved + totals.amountPending
  const isPaid = period.status === 'paid'

  // Snapshot drift indicator (only for paid periods)
  const drift = isPaid && period.totalHoursSnapshot != null
    && Math.abs((period.totalHoursSnapshot ?? 0) - liveTotalHours) > 0.01

  // Render times in the entries' currency tz — we don't have a pmTimezone on
  // this response, so fall back to the viewer's local zone for the entry
  // start/end columns and use the explicit pmTimezone for the review modal
  // by deriving a sensible default from the first entry.
  // The backend uses Intl-formatted strings; the viewer's locale is fine here.
  const reviewTz = entries[0]?.startedAt
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'America/Toronto'
  const tzAbbrev = zoneAbbrev(reviewTz)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/property-manager/pay-periods"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All pay periods
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <BanknotesIcon className="w-7 h-7 text-blue-600" />
              <div>
                {period.teamMemberName && (
                  <div className="text-sm font-medium text-gray-700">
                    {period.teamMemberName}
                    {period.teamMemberEmail && (
                      <span className="ml-2 text-gray-400">· {period.teamMemberEmail}</span>
                    )}
                  </div>
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                  Period #{String(period.periodNumber).padStart(2, '0')}{' '}
                  <span className="text-gray-400 font-normal">·</span> {period.periodYear}
                </h1>
                <p className="text-sm text-gray-500">
                  {period.startDate} → {period.endDate} · {period.periodLengthDays} days · pay date{' '}
                  <span className="font-medium text-blue-700">{period.payDate}</span>
                </p>
              </div>
            </div>
            {period.notes && (
              <p className="mt-3 text-sm italic text-gray-600 max-w-xl">&ldquo;{period.notes}&rdquo;</p>
            )}
          </div>
          <div className="text-right">
            <PayPeriodStatusBadge
              status={period.status}
              hasPending={totals.hasPending}
              pendingCount={totals.pendingEntryCount}
            />
            <div className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">
              {formatMoney(liveTotalAmount, currency)}
            </div>
            <div className="text-sm text-gray-500 tabular-nums">{formatHours(liveTotalHours)} · {currency}</div>
          </div>
        </div>

        {/* Paid snapshot banner */}
        {isPaid && period.paidAt && period.totalHoursSnapshot != null && period.totalAmountSnapshot != null && (
          <div className={`mt-5 p-3 rounded-lg border text-sm ${
            drift ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-start gap-2">
              {drift
                ? <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                : <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <div className={`font-semibold ${drift ? 'text-amber-800' : 'text-emerald-800'}`}>
                  Paid on {formatLocal(period.paidAt)}
                </div>
                <div className={`mt-0.5 ${drift ? 'text-amber-700' : 'text-emerald-700'}`}>
                  Snapshot: {formatHours(period.totalHoursSnapshot)} ·{' '}
                  {formatMoney(period.totalAmountSnapshot, period.currencyAtPayment || currency)}
                  {drift && ' · live totals have shifted since payment'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        {isPM && (
          <button
            type="button"
            onClick={handleApproveAll}
            disabled={totals.pendingEntryCount === 0 || approvingAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {approvingAll
              ? 'Approving…'
              : `Approve all pending${totals.pendingEntryCount > 0 ? ` (${totals.pendingEntryCount})` : ''}`}
          </button>
        )}

        {isPM && !isPaid && (
          <button
            type="button"
            onClick={() => setShowMarkPaid(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <CheckCircleIcon className="w-4 h-4" />
            Mark as paid
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export CSV
        </button>

        {isPM && !isPaid && (
          <>
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit dates
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 font-medium"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Time Entries</h2>
          <p className="text-sm text-gray-500">
            All entries bound to this period. Times shown in {tzAbbrev}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Start ({tzAbbrev})</th>
                <th className="px-6 py-3">End</th>
                <th className="px-6 py-3">Hours</th>
                <th className="px-6 py-3">Earned</th>
                <th className="px-6 py-3">Status</th>
                {isPM && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr><td colSpan={isPM ? 6 : 5} className="px-6 py-12 text-center text-gray-500">No entries in this period.</td></tr>
              ) : entries.map(e => {
                const earned = e.hoursWorked != null && e.hourlyRateAtEntry != null
                  ? e.hoursWorked * e.hourlyRateAtEntry
                  : null
                return (
                  <tr
                    key={e.id}
                    onClick={isPM ? () => setEditingEntry(e) : undefined}
                    className={isPM ? 'hover:bg-gray-50/40 cursor-pointer' : ''}
                    title={isPM ? 'Edit entry' : undefined}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">{formatInTz(e.startedAt, reviewTz)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {e.endedAt
                        ? formatInTz(e.endedAt, reviewTz)
                        : <span className="text-blue-600 font-medium">Open</span>}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-gray-900">
                      {e.hoursWorked != null ? formatHours(e.hoursWorked) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums">
                      {earned != null
                        ? formatMoney(earned, e.currencyAtEntry || currency)
                        : <span className="italic text-gray-400">Rate pending</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_BADGE[e.status]}`}>
                        {STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    {isPM && (
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                          {e.status === 'pending' && (
                            <button
                              onClick={() => setReviewing(e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-medium"
                              title="Review (approve / reject)"
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => setEditingEntry(e)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isPM && (
        <>
          <EditPayPeriodModal
            isOpen={showEdit}
            onClose={() => setShowEdit(false)}
            period={period}
            onUpdated={handlePeriodUpdated}
          />
          <DeletePayPeriodModal
            isOpen={showDelete}
            onClose={() => setShowDelete(false)}
            period={period}
            onDeleted={handleDeleted}
          />
          <MarkPaidConfirmModal
            isOpen={showMarkPaid}
            onClose={() => setShowMarkPaid(false)}
            period={period}
            totals={totals}
            defaultCurrency={currency}
            onPaid={handlePeriodPaid}
          />
          <ReviewOverCapModal
            isOpen={!!reviewing}
            onClose={() => setReviewing(null)}
            entry={reviewing}
            pmTimezone={reviewTz}
            onResolved={handleEntryResolved}
          />
          <EditTimeEntryModal
            isOpen={!!editingEntry}
            onClose={() => setEditingEntry(null)}
            entry={editingEntry}
            onUpdate={handleEntryEdited}
            pmEditMode={true}
            onDelete={handleEntryDeleted}
          />
        </>
      )}
      {/* Export is available to both PM and team members */}
      <ExportPayPeriodModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        period={period}
      />
    </div>
  )
}

// ---- Helpers --------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  )
}

