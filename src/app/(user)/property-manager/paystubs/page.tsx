'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BanknotesIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { type ActionItem } from '@/components/shared/TableActionsDropdown'
import {
  approvePaystub,
  markPaystubPaid,
  deletePaystub,
  changePaystubStatus,
} from '@/services/paystubService'
import { usePermissions } from '@/hooks/usePermissions'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { formatMoney } from '@/lib/format'
import {
  getPaystubs,
  getMyPaystubs,
  getPaystubSummary,
  getMonthlyEarnings,
  exportPaystubsCsv,
} from '@/services/paystubService'
import type {
  Paystub,
  PaystubStatus,
  PaystubSummary,
  MonthlyEarnings,
} from '@/services/types/paystub'
import { PAYSTUB_STATUS_INFO } from '@/services/types/paystub'
import type { TeamMember } from '@/services/types/teamMember'
import { getTeamMembers } from '@/services/teamMemberService'
import CreatePaystubModal from '@/components/paystub/create/CreatePaystubModal'
import PMTeamMemberPickerModal from '@/components/paystub/create/PMTeamMemberPickerModal'
import ViewPaystubModal from '@/components/paystub/view/ViewPaystubModal'

type StatusFilter = 'all' | PaystubStatus

export default function PaystubsPage() {
  // The page is wrapped in Suspense for useSearchParams
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaystubsPageInner />
    </Suspense>
  )
}

function PaystubsPageInner() {
  const { isPM, isTeamMember, effectiveUserId } = usePermissions()
  const profile = useUserStore(s => s.profile)
  const showNotification = useNotificationStore((s) => s.showNotification)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [paystubs, setPaystubs] = useState<Paystub[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<PaystubSummary | null>(null)
  const [earnings, setEarnings] = useState<MonthlyEarnings | null>(null)

  // PM-only: team-members for the dropdown filter + picker
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [search, setSearch] = useState('')

  // Modals
  const [showPicker, setShowPicker] = useState(false)
  const [createForMember, setCreateForMember] = useState<{ id: string; name: string } | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const loadList = async () => {
    setLoading(true)
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter
      const showArchived = includeArchived || statusFilter === 'archived'
      const listRes = isPM
        ? await getPaystubs(teamMemberFilter || undefined, status, showArchived)
        : await getMyPaystubs(status, showArchived)
      if (listRes.status === 'success') setPaystubs(listRes.data)
      else showNotification(listRes.message || 'Failed to load paystubs.', 'error')

      const sumRes = await getPaystubSummary(isPM ? teamMemberFilter || undefined : undefined)
      if (sumRes.status === 'success') setSummary(sumRes.data)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load list on mount and whenever filters change
  useEffect(() => {
    if (effectiveUserId == null) return
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId, isPM, statusFilter, teamMemberFilter, includeArchived])

  // PM: load team-members list once
  useEffect(() => {
    if (!isPM || !effectiveUserId) return
    ;(async () => {
      try {
        const res = await getTeamMembers(effectiveUserId)
        if (res.status === 'success') setTeamMembers(res.data.filter(m => m.status !== 'inactive'))
      } catch { /* dropdown stays empty */ }
    })()
  }, [isPM, effectiveUserId])

  // TM: load monthly earnings
  useEffect(() => {
    if (!isTeamMember) return
    ;(async () => {
      try {
        const res = await getMonthlyEarnings()
        if (res.status === 'success') setEarnings(res.data)
      } catch { /* non-fatal */ }
    })()
  }, [isTeamMember])

  // Deep-link via ?paystubId= — only triggers on first read, not on every filter change.
  // We use a ref-like state so subsequent ?paystubId reads (after manual close)
  // don't reopen the modal.
  const [deepLinkHandled, setDeepLinkHandled] = useState(false)
  useEffect(() => {
    if (deepLinkHandled) return
    const id = searchParams?.get('paystubId')
    if (id) {
      setViewingId(id)
      setDeepLinkHandled(true)
    }
  }, [searchParams, deepLinkHandled])

  const handleCloseView = () => {
    setViewingId(null)
    // Strip ?paystubId= from URL so closing doesn't leave the deep-link sticky.
    if (searchParams?.get('paystubId')) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('paystubId')
      const qs = next.toString()
      router.replace(`/property-manager/paystubs${qs ? `?${qs}` : ''}`)
    }
  }

  // PM row actions: status changes + delete
  const handleRowAction = async (paystub: Paystub, label: string, fn: () => Promise<{ status: 'success' | 'failed'; message?: string }>) => {
    try {
      const res = await fn()
      if (res.status === 'success') {
        showNotification(`${label} succeeded.`, 'success')
        loadList()
      } else {
        showNotification(res.message || `${label} failed.`, 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    }
  }

  const buildPMRowActions = (p: Paystub): ActionItem[] => {
    const actions: ActionItem[] = [
      { label: 'View', icon: EyeIcon, onClick: () => setViewingId(p.id) },
    ]
    if (p.status === 'pending') {
      actions.push({ label: 'Approve', icon: CheckIcon, onClick: () => handleRowAction(p, 'Approve', () => approvePaystub(p.id)), variant: 'highlight' })
    }
    if (p.status === 'approved') {
      actions.push({ label: 'Mark as paid', icon: BanknotesIcon, onClick: () => handleRowAction(p, 'Mark as paid', () => markPaystubPaid(p.id)), variant: 'highlight' })
    }
    if (p.status !== 'archived') {
      actions.push({ label: 'Archive', icon: XMarkIcon, onClick: () => handleRowAction(p, 'Archive', () => changePaystubStatus(p.id, 'archived')) })
    }
    actions.push({ label: 'Delete', icon: TrashIcon, onClick: () => handleRowAction(p, 'Delete', () => deletePaystub(p.id)), variant: 'danger' })
    return actions
  }

  // Client-side text filter on the server-fetched list
  const filteredPaystubs = useMemo(() => {
    if (!search.trim()) return paystubs
    const q = search.toLowerCase()
    return paystubs.filter(p =>
      p.paystubNumber.toLowerCase().includes(q) ||
      (p.teamMemberName?.toLowerCase().includes(q) ?? false) ||
      (p.teamMemberEmail?.toLowerCase().includes(q) ?? false)
    )
  }, [paystubs, search])

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportPaystubsCsv(
        teamMemberFilter || undefined,
        statusFilter === 'all' ? undefined : statusFilter,
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Export failed.', 'error')
    }
  }

  if (effectiveUserId == null) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        isPM={isPM}
        onNewPaystub={() => isPM ? setShowPicker(true) : setCreateForMember({ id: '', name: profile?.fullName || '' })}
        onExport={isPM ? handleExport : undefined}
        userName={profile?.fullName}
      />

      {/* TM banner: drafts ready to send */}
      {isTeamMember && summary && summary.draft > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900">
            You have <span className="font-semibold">{summary.draft}</span> draft paystub{summary.draft > 1 ? 's' : ''} ready to send. Open them and click Submit.
          </div>
        </div>
      )}

      {/* PM banners */}
      {isPM && summary && summary.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-semibold">{summary.pending}</span> paystub{summary.pending > 1 ? 's' : ''} awaiting your review.
            <span className="font-semibold ml-2">{formatMoney(summary.pendingTotal, 'CAD')}</span> total.
          </div>
        </div>
      )}
      {isPM && summary && summary.approved > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-emerald-900">
            <span className="font-semibold">{summary.approved}</span> approved paystub{summary.approved > 1 ? 's' : ''} ready to be paid.
            <span className="font-semibold ml-2">{formatMoney(summary.approvedTotal, 'CAD')}</span> total.
          </div>
        </div>
      )}

      {/* TM monthly earnings */}
      {isTeamMember && earnings && (
        <EarningsStrip earnings={earnings} currency="CAD" />
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isPM ? 'Search by paystub number or member…' : 'Search by paystub number…'}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
          {(['all', 'draft', 'pending', 'approved', 'rejected', 'paid'] as StatusFilter[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s}
              {summary && s !== 'all' && summary[s] > 0 && (
                <span className="ml-1 text-[10px] font-semibold opacity-70">{summary[s]}</span>
              )}
            </button>
          ))}
          {isPM && (
            <button
              type="button"
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                statusFilter === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              archived
            </button>
          )}
        </div>
        {isPM && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">Member</label>
            <select
              value={teamMemberFilter}
              onChange={(e) => setTeamMemberFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white max-w-[200px]"
            >
              <option value="">All members</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
        {isPM && statusFilter !== 'archived' && (
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded text-blue-600"
            />
            Include archived
          </label>
        )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
          Loading…
        </div>
      ) : filteredPaystubs.length === 0 ? (
        <EmptyState
          isTeamMember={isTeamMember}
          statusFilter={statusFilter}
          searchActive={search.trim().length > 0}
        />
      ) : isPM ? (
        <PMTable
          paystubs={filteredPaystubs}
          onView={setViewingId}
          buildActions={buildPMRowActions}
        />
      ) : (
        <TMCards paystubs={filteredPaystubs} onView={setViewingId} />
      )}

      {/* Modals */}
      {isPM && (
        <PMTeamMemberPickerModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          userId={effectiveUserId}
          onPicked={(m) => setCreateForMember({ id: m.id, name: m.name })}
        />
      )}
      {createForMember && (
        <CreatePaystubModal
          isOpen={!!createForMember}
          onClose={() => setCreateForMember(null)}
          teamMemberId={createForMember.id}
          teamMemberName={createForMember.name}
          isPM={isPM}
          userId={effectiveUserId}
          onCreated={(p) => {
            setCreateForMember(null)
            loadList()
            setViewingId(p.id)
          }}
        />
      )}
      <ViewPaystubModal
        isOpen={viewingId !== null}
        onClose={handleCloseView}
        paystubId={viewingId}
        role={isPM ? 'pm' : 'tm'}
        userId={effectiveUserId}
        onUpdated={loadList}
        onDeleted={loadList}
      />
    </div>
  )
}

// ---- Page header ----------------------------------------------------------

interface HeaderProps {
  isPM: boolean
  onNewPaystub: () => void
  onExport?: () => void
  userName?: string | null
}

const PageHeader: React.FC<HeaderProps> = ({ isPM, onNewPaystub, onExport, userName }) => (
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div className="flex items-center gap-3">
      <BanknotesIcon className="w-7 h-7 text-blue-600" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isPM ? 'Paystubs' : 'My paystubs'}
        </h1>
        <p className="text-gray-500 text-sm">
          {isPM
            ? 'Team-member paystubs — review, approve, and mark paid.'
            : userName
              ? `Collect your time, expenses, and extras into a paystub and submit when ready, ${userName}.`
              : 'Collect your time, expenses, and extras into a paystub and submit when ready.'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export CSV
        </button>
      )}
      <button
        type="button"
        onClick={onNewPaystub}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/25"
      >
        <PlusIcon className="w-5 h-5" />
        {isPM ? 'New paystub' : 'Cash out'}
      </button>
    </div>
  </div>
)

// ---- TM monthly earnings strip --------------------------------------------

const EarningsStrip: React.FC<{ earnings: MonthlyEarnings; currency: string }> = ({ earnings, currency }) => {
  const cm = earnings.currentMonth
  const hasAny = cm.paid + cm.approved + cm.pending > 0
  if (!hasAny) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {cm.label}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cm.paid > 0 && (
          <EarningsCard label="Paid" amount={cm.paid} currency={currency} tone="emerald" />
        )}
        {cm.approved > 0 && (
          <EarningsCard label="Approved" amount={cm.approved} currency={currency} tone="blue" />
        )}
        {cm.pending > 0 && (
          <EarningsCard label="Pending" amount={cm.pending} currency={currency} tone="amber" />
        )}
      </div>
    </div>
  )
}

const EARNINGS_TONE: Record<'emerald' | 'blue' | 'amber', string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue:    'bg-blue-50 text-blue-700',
  amber:   'bg-amber-50 text-amber-700',
}

const EarningsCard: React.FC<{ label: string; amount: number; currency: string; tone: 'emerald' | 'blue' | 'amber' }> = ({
  label, amount, currency, tone,
}) => (
  <div className={`rounded-lg px-3 py-2 ${EARNINGS_TONE[tone]}`}>
    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
    <div className="text-lg font-semibold tabular-nums">{formatMoney(amount, currency)}</div>
  </div>
)

// ---- PM table --------------------------------------------------------------

interface PMListProps {
  paystubs: Paystub[]
  onView: (id: string) => void
  buildActions: (p: Paystub) => ActionItem[]
}
interface TMListProps {
  paystubs: Paystub[]
  onView: (id: string) => void
}

const PMTable: React.FC<PMListProps> = ({ paystubs, onView, buildActions }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50/50">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-6 py-3">Paystub</th>
            <th className="px-6 py-3">Member</th>
            <th className="px-6 py-3">Period</th>
            <th className="px-6 py-3">Items</th>
            <th className="px-6 py-3">Total</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paystubs.map(p => (
            <PaystubRow key={p.id} paystub={p} onView={() => onView(p.id)} actions={buildActions(p)} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const PaystubRow: React.FC<{ paystub: Paystub; onView: () => void; actions: ActionItem[] }> = ({ paystub, onView, actions }) => {
  const info = PAYSTUB_STATUS_INFO[paystub.status]
  const displayTotal = paystub.totalAmountSnapshot ?? paystub.total
  const currency = paystub.currencyAtPayment ?? paystub.currency
  return (
    <tr onClick={onView} className="hover:bg-blue-50/40 cursor-pointer">
      <td className="px-6 py-4">
        <div className="font-semibold text-gray-900 tabular-nums">{paystub.paystubNumber}</div>
        <div className="text-xs text-gray-500">{new Date(paystub.createdAt).toLocaleDateString()}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{paystub.teamMemberName ?? '—'}</div>
        {paystub.teamMemberEmail && (
          <div className="text-xs text-gray-500">{paystub.teamMemberEmail}</div>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-700 tabular-nums">
        {paystub.periodStart && paystub.periodEnd ? `${paystub.periodStart} → ${paystub.periodEnd}` : '—'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-700 tabular-nums">
        {paystub.itemCount ?? '—'}
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-900 tabular-nums">
        {formatMoney(displayTotal, currency)}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${info.pill}`}>
          {info.label}
        </span>
      </td>
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <TableActionsDropdown actions={actions} itemId={paystub.id} />
      </td>
    </tr>
  )
}

// ---- TM cards --------------------------------------------------------------

const TMCards: React.FC<TMListProps> = ({ paystubs, onView }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {paystubs.map(p => {
      const info = PAYSTUB_STATUS_INFO[p.status]
      const displayTotal = p.totalAmountSnapshot ?? p.total
      const currency = p.currencyAtPayment ?? p.currency
      return (
        <button
          key={p.id}
          type="button"
          onClick={() => onView(p.id)}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-500">Paystub</div>
              <div className="font-semibold text-gray-900">{p.paystubNumber}</div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${info.pill}`}>
              {info.label}
            </span>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {p.periodStart && p.periodEnd ? `${p.periodStart} → ${p.periodEnd}` : 'No period set'}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold text-gray-900 tabular-nums">
              {formatMoney(displayTotal, currency)}
            </span>
            <span className="text-xs text-gray-500">{p.itemCount ?? 0} item{(p.itemCount ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </button>
      )
    })}
  </div>
)

// ---- Empty state -----------------------------------------------------------

const EmptyState: React.FC<{ isTeamMember: boolean; statusFilter: StatusFilter; searchActive: boolean }> = ({ isTeamMember, statusFilter, searchActive }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 px-6 text-center">
    <BanknotesIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-gray-900 mb-1">
      {searchActive
        ? 'No matches'
        : statusFilter === 'all'
          ? (isTeamMember ? 'No paystubs yet' : 'No paystubs to review')
          : `No ${statusFilter} paystubs`}
    </h3>
    <p className="text-sm text-gray-500">
      {searchActive
        ? 'Try a different search term, or clear the search to see all paystubs.'
        : isTeamMember
          ? statusFilter === 'all'
            ? 'Click "Cash out" above to create your first paystub from your time entries and expenses.'
            : 'Try a different filter or create a new paystub.'
          : 'New paystubs from team members will appear here.'}
    </p>
  </div>
)

// ---- Loading skeleton ------------------------------------------------------

const PageSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
    <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
  </div>
)
