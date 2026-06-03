'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  XCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  listTimeChangeRequests,
  approveTimeChangeRequest,
  rejectTimeChangeRequest,
} from '@/services/timeChangeRequestService'
import type { TimeChangeRequestListItem } from '@/services/types/timeChangeRequest'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import Modal from '@/components/shared/modal'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import TimeChangeRequestRow from '@/components/turnover-request/TimeChangeRequestRow'

type TabKey = 'pending' | 'approved' | 'rejected' | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const PAGE_SIZE = 10

/** Lexicographic range test on YYYY-MM-DD strings (inclusive). */
function dateInRange(dateStr: string | null | undefined, from: string, to: string): boolean {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

/** Short label for a date string, e.g. "Jun 1". */
function shortDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Build a compact pager: [1, '…', 4, 5, 6, '…', 16]. */
function pageItems(current: number, total: number): (number | '…')[] {
  const out: (number | '…')[] = []
  const range: number[] = []
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) range.push(i)
  if (range[0] > 1) {
    out.push(1)
    if (range[0] > 2) out.push('…')
  }
  out.push(...range)
  const last = range[range.length - 1]
  if (last < total) {
    if (last < total - 1) out.push('…')
    out.push(total)
  }
  return out
}

export default function ScheduleRequestsPage() {
  const [requests, setRequests] = useState<TimeChangeRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters (stack with AND logic)
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [cleanerFilter, setCleanerFilter] = useState<string | null>(null)
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateMenu, setShowDateMenu] = useState(false)

  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Reject-with-notes modal
  const [rejectTarget, setRejectTarget] = useState<TimeChangeRequestListItem | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  const showNotification = useNotificationStore((state) => state.showNotification)
  usePermissionGuard('turnover')
  const { effectiveUserId, canWrite } = usePermissions()
  const canManage = canWrite('turnover')

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveUserId) return
      try {
        setLoading(true)
        setError(null)
        const res = await listTimeChangeRequests(effectiveUserId)
        if (res.status === 'success') {
          setRequests(res.data)
        } else {
          setError(res.message || 'Failed to load schedule requests')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule requests')
        console.error('Error loading schedule requests:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [effectiveUserId])

  // Dropdown options derived from the data itself (deduped).
  const cleanerOptions = useMemo<SearchableSelectOption[]>(() => {
    const map = new Map<string, string>()
    for (const r of requests) {
      if (r.cleanerId) map.set(r.cleanerId, r.cleanerName || 'Unknown cleaner')
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [requests])

  const propertyOptions = useMemo<SearchableSelectOption[]>(() => {
    const map = new Map<string, { label: string; secondaryLabel?: string }>()
    for (const r of requests) {
      if (r.propertyId && !map.has(r.propertyId)) {
        map.set(r.propertyId, {
          label: r.propertyName || 'Unnamed property',
          secondaryLabel: r.propertyAddress || undefined,
        })
      }
    }
    return Array.from(map, ([value, v]) => ({ value, ...v })).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [requests])

  const dateActive = !!(dateFrom || dateTo)

  // Everything except the status tab — used for both the visible list and the tab counts,
  // so the counts reflect the stacked filters.
  const baseFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return requests.filter((r) => {
      if (cleanerFilter && r.cleanerId !== cleanerFilter) return false
      if (propertyFilter && r.propertyId !== propertyFilter) return false
      if (dateActive && !dateInRange(r.currentProjectDate, dateFrom, dateTo) && !dateInRange(r.requestedProjectDate, dateFrom, dateTo)) {
        return false
      }
      if (term) {
        const hay = `${r.propertyName || ''} ${r.propertyAddress || ''} ${r.cleanerName || ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [requests, searchTerm, cleanerFilter, propertyFilter, dateActive, dateFrom, dateTo])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: baseFiltered.length }
    for (const r of baseFiltered) {
      if (r.status === 'pending') c.pending++
      else if (r.status === 'approved') c.approved++
      else if (r.status === 'rejected') c.rejected++
    }
    return c
  }, [baseFiltered])

  const filtered = useMemo(
    () => (activeTab === 'all' ? baseFiltered : baseFiltered.filter((r) => r.status === activeTab)),
    [baseFiltered, activeTab],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // Reset to page 1 whenever the result set changes shape.
  useEffect(() => {
    setPage(1)
  }, [activeTab, searchTerm, cleanerFilter, propertyFilter, dateFrom, dateTo])

  const hasStackedFilters = !!cleanerFilter || !!propertyFilter || dateActive

  const clearAll = () => {
    setCleanerFilter(null)
    setPropertyFilter(null)
    setDateFrom('')
    setDateTo('')
    setSearchTerm('')
  }

  // ─── Approve / reject ────────────────────────────────────────
  const patchRequest = (id: string, patch: Partial<TimeChangeRequestListItem>) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const handleApprove = async (request: TimeChangeRequestListItem) => {
    setBusyId(request.id)
    try {
      const res = await approveTimeChangeRequest(request.projectId, request.id)
      if (res.status === 'success') {
        patchRequest(request.id, {
          status: 'approved',
          resolvedAt: res.data.request.resolvedAt ?? new Date().toISOString(),
        })
        showNotification('Time change approved', 'success')
      } else {
        showNotification(res.message || 'Failed to approve', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const openReject = (request: TimeChangeRequestListItem) => {
    setRejectTarget(request)
    setRejectNotes('')
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    const target = rejectTarget
    setBusyId(target.id)
    try {
      const res = await rejectTimeChangeRequest(
        target.projectId,
        target.id,
        rejectNotes.trim() ? { pmNotes: rejectNotes.trim() } : undefined,
      )
      if (res.status === 'success') {
        patchRequest(target.id, {
          status: 'rejected',
          pmNotes: rejectNotes.trim() || null,
          resolvedAt: res.data.resolvedAt ?? new Date().toISOString(),
        })
        showNotification('Time change rejected', 'success')
        setRejectTarget(null)
      } else {
        showNotification(res.message || 'Failed to reject', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const Header = (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Schedule Requests</h1>
      <p className="text-gray-500 mt-1">
        Review and resolve cleaner requests to change a turnover&apos;s date or time.
      </p>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {Header}
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading requests…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {Header}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading requests</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const dateChipLabel =
    dateFrom && dateTo
      ? `${shortDate(dateFrom)} – ${shortDate(dateTo)}`
      : dateFrom
        ? `From ${shortDate(dateFrom)}`
        : dateTo
          ? `Until ${shortDate(dateTo)}`
          : 'Date range'

  return (
    <div className="space-y-5">
      {Header}

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative sm:w-72">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search property or cleaner…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchableSelect
              options={cleanerOptions}
              value={cleanerFilter}
              onChange={setCleanerFilter}
              placeholder="All cleaners"
              emptyText="No cleaners"
              className="w-full sm:w-52"
            />
            <SearchableSelect
              options={propertyOptions}
              value={propertyFilter}
              onChange={setPropertyFilter}
              placeholder="All properties"
              emptyText="No properties"
              className="w-full sm:w-60"
            />

            {/* Date range popover */}
            <div className="relative">
              <button
                onClick={() => setShowDateMenu((v) => !v)}
                className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${
                  dateActive
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                <CalendarDaysIcon className="h-5 w-5 shrink-0" />
                <span className="font-medium">{dateChipLabel}</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${showDateMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDateMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowDateMenu(false)} />
                  <div className="absolute z-30 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Cleaning date range
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Matches current or requested date.</p>
                    <div className="mt-3 space-y-3">
                      <label className="block">
                        <span className="text-xs font-medium text-gray-600">From</span>
                        <input
                          type="date"
                          value={dateFrom}
                          max={dateTo || undefined}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-gray-600">To</span>
                        <input
                          type="date"
                          value={dateTo}
                          min={dateFrom || undefined}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <button
                        onClick={() => {
                          setDateFrom('')
                          setDateTo('')
                        }}
                        className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowDateMenu(false)}
                        className="cursor-pointer px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 shrink-0">
            {filtered.length === 0
              ? 'No matching requests'
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
        </div>

        {/* Active filter chips */}
        {hasStackedFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {cleanerFilter && (
              <FilterChip
                label={cleanerOptions.find((o) => o.value === cleanerFilter)?.label || 'Cleaner'}
                onRemove={() => setCleanerFilter(null)}
              />
            )}
            {propertyFilter && (
              <FilterChip
                label={propertyOptions.find((o) => o.value === propertyFilter)?.label || 'Property'}
                onRemove={() => setPropertyFilter(null)}
              />
            )}
            {dateActive && (
              <FilterChip
                label={dateChipLabel}
                onRemove={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
              />
            )}
            <button
              onClick={clearAll}
              className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            {activeTab === 'pending' && !hasStackedFilters && !searchTerm ? (
              <CheckCircleIcon className="h-6 w-6 text-gray-400" />
            ) : (
              <ClockIcon className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <p className="font-semibold text-gray-900">
            {activeTab === 'pending' && !hasStackedFilters && !searchTerm
              ? 'No pending requests'
              : 'No matches'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'pending' && !hasStackedFilters && !searchTerm
              ? "You're all caught up — no time changes are awaiting your review."
              : 'Try adjusting or clearing your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((request) => (
            <TimeChangeRequestRow
              key={request.id}
              request={request}
              canWrite={canManage}
              isBusy={busyId === request.id}
              onApprove={handleApprove}
              onReject={openReject}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {pageItems(currentPage, totalPages).map((item, i) =>
            item === '…' ? (
              <span key={`gap-${i}`} className="px-1.5 text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={`cursor-pointer inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-semibold transition-colors ${
                  item === currentPage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item}
              </button>
            ),
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Reject modal */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} style="w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">Reject time change</h2>
          <p className="text-sm text-gray-500 mt-1">
            Optionally tell {rejectTarget?.cleanerName || 'the cleaner'} why. They&apos;ll be notified.
          </p>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={3}
            placeholder="Reason (optional)…"
            className="mt-4 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setRejectTarget(null)}
              className="cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              disabled={busyId === rejectTarget?.id}
              className="cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busyId === rejectTarget?.id ? 'Rejecting…' : 'Reject request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Small removable filter chip. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700">
      <span className="truncate max-w-[160px]">{label}</span>
      <button
        onClick={onRemove}
        className="cursor-pointer p-0.5 rounded-md hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}
