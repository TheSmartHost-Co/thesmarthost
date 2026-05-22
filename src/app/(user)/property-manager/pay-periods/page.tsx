'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BanknotesIcon, Cog6ToothIcon, PlusIcon, EyeIcon, ArrowDownTrayIcon,
  CheckCircleIcon, TrashIcon, ClockIcon, CurrencyDollarIcon, ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import { formatHours, formatMoney } from '@/lib/format'
import TabBar from '@/components/shared/TabBar'
import {
  getPayScheduleSettings,
  listPayPeriods,
  getMyPayPeriods,
} from '@/services/payPeriodService'
import { getTeamMembers } from '@/services/teamMemberService'
import type {
  PayPeriod,
  PayPeriodRow,
  PayScheduleSettings,
} from '@/services/types/payPeriod'
import type { TeamMember } from '@/services/types/teamMember'

import PayScheduleSettingsModal from '@/components/pay-period/setup/PayScheduleSettingsModal'
import CreatePayPeriodModal from '@/components/pay-period/create/CreatePayPeriodModal'
import DeletePayPeriodModal from '@/components/pay-period/delete/DeletePayPeriodModal'
import MarkPaidConfirmModal from '@/components/pay-period/mark-paid/MarkPaidConfirmModal'
import ExportPayPeriodModal from '@/components/pay-period/export/ExportPayPeriodModal'
import PayPeriodStatusBadge from '@/components/pay-period/shared/PayPeriodStatusBadge'

type StatusFilter = 'open' | 'paid' | 'all'

const formatPeriodNumber = (n: number) => '#' + String(n).padStart(2, '0')

export default function PayPeriodsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayPeriodsPageInner />
    </Suspense>
  )
}

function PayPeriodsPageInner() {
  const router = useRouter()
  const { isPM, isTeamMember, effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore(s => s.showNotification)

  const [settings, setSettings] = useState<PayScheduleSettings | null>(null)
  const [rows, setRows] = useState<PayPeriodRow[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const currentYear = new Date().getUTCFullYear()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [yearFilter, setYearFilter] = useState<number>(currentYear)
  const [memberFilter, setMemberFilter] = useState<string>('')  // '' = all

  // Modal state (PM-only — kept lifted regardless so the JSX stays simple)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<PayPeriod | null>(null)
  const [markingPaid, setMarkingPaid] = useState<PayPeriodRow | null>(null)
  const [exporting, setExporting] = useState<PayPeriod | null>(null)

  // ---- Initial load ------------------------------------------------------
  // PM: load schedule settings + active team members.
  // Team member: skip settings (none of their business) and skip members list.
  useEffect(() => {
    if (effectiveUserId == null) return
    let cancelled = false
    ;(async () => {
      try {
        if (isPM) {
          const [settingsRes, membersRes] = await Promise.all([
            getPayScheduleSettings(),
            getTeamMembers(effectiveUserId),
          ])
          if (cancelled) return
          if (settingsRes.status === 'success') setSettings(settingsRes.data)
          if (membersRes.status === 'success') {
            setMembers(membersRes.data.filter(m => m.status !== 'inactive'))
          }
        }
        // Team members don't read PM settings; the soft banner uses
        // payPeriodId nullability as the signal instead.
      } catch (err) {
        if (!cancelled) {
          showNotification(err instanceof Error ? err.message : 'Network error', 'error')
        }
      } finally {
        if (!cancelled) setSettingsLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [isPM, effectiveUserId, showNotification])

  // ---- Periods load (role-branched) --------------------------------------
  const loadPeriods = async () => {
    try {
      const query = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        year: yearFilter,
      }
      const res = isPM
        ? await listPayPeriods({ ...query, teamMemberId: memberFilter || undefined })
        : await getMyPayPeriods(query)
      if (res.status === 'success') {
        setRows(res.data)
      } else {
        showNotification(res.message || 'Failed to load periods.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!settingsLoaded) return
    setLoading(true)
    loadPeriods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, statusFilter, yearFilter, memberFilter, isPM])

  // ---- Derived ----------------------------------------------------------
  const openCount = useMemo(
    () => rows.filter(r => r.status === 'open').length,
    [rows],
  )

  const kpis = useMemo(() => {
    let totalHours = 0
    let pendingCount = 0
    const dollars = new Map<string, number>()
    for (const r of rows) {
      totalHours += r.totals.hoursApproved + r.totals.hoursPending
      if (r.status === 'open') pendingCount += r.totals.pendingEntryCount
      const cur = r.totals.currency || settings?.currency || 'CAD'
      const total = r.totals.amountApproved + r.totals.amountPending
      dollars.set(cur, (dollars.get(cur) || 0) + total)
    }
    return { totalHours, pendingCount, dollars, openCount }
  }, [rows, settings, openCount])

  // ---- Mutation handlers -------------------------------------------------
  const handleScheduleSaved = (s: PayScheduleSettings) => {
    setSettings(s)
    setLoading(true)
    loadPeriods()
  }
  const handleCreated = () => { loadPeriods() }
  const handlePaid    = (p: PayPeriod) => setRows(list => list.map(r => r.id === p.id ? { ...r, ...p } : r))
  const handleDeleted = (id: string)   => setRows(list => list.filter(r => r.id !== id))

  if (!settingsLoaded || !effectiveUserId) return <PageSkeleton />

  const showNoScheduleBanner = isPM && !settings
  // For team members we use a softer signal: if every loaded row has 0 entries
  // bound, the member probably has no schedule yet. Cheaper: just always
  // surface a hint when rows is empty AND we're a team member.
  const showTeamMemberNoScheduleHint = isTeamMember && rows.length === 0 && !loading

  return (
    <div className="space-y-6">
      <PageHeader
        isPM={isPM}
        configured={!!settings}
        onOpenSettings={() => setShowSettings(true)}
        onCreate={() => setShowCreate(true)}
      />

      {/* Soft no-schedule banner (PM) */}
      {showNoScheduleBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900">No pay schedule configured</div>
            <div className="text-sm text-blue-800 mt-0.5">
              Time entries are still saved, but won&apos;t be grouped into periods until you set one.
              Each team member can also override the schedule individually.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            Configure schedule
          </button>
        </div>
      )}

      {/* Soft no-schedule hint (team member) */}
      {showTeamMemberNoScheduleHint && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            Your manager hasn&apos;t configured a pay schedule yet. Your hours are still being tracked
            — pay periods will appear here once a schedule is set up.
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title={isPM ? 'Open Periods' : 'My Open Periods'} value={String(openCount)} icon={<BanknotesIcon className="w-5 h-5" />} accent="blue" />
        <KPI title={isPM ? 'Hours This Year' : 'My Hours This Year'} value={formatHours(kpis.totalHours)} icon={<ClockIcon className="w-5 h-5" />} accent="blue" />
        <KPI
          title={isPM ? '$ Committed' : 'My Earnings'}
          value={renderDollarTotals(kpis.dollars, settings?.currency)}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          accent="emerald"
        />
        <KPI
          title="Pending Entries"
          value={String(kpis.pendingCount)}
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          accent={kpis.pendingCount > 0 ? 'amber' : 'gray'}
        />
      </div>

      {/* Filters + table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap px-2 pt-1">
          <div className="flex-1 min-w-[280px]">
            <TabBar
              tabs={[
                { key: 'open', label: 'Open', badge: openCount, badgeColor: 'bg-blue-500' },
                { key: 'paid', label: 'Paid' },
                { key: 'all',  label: 'All' },
              ]}
              activeTab={statusFilter}
              onTabChange={(k) => setStatusFilter(k as StatusFilter)}
            />
          </div>
          <div className="flex items-center gap-3 pr-4 pb-2 flex-wrap">
            {isPM && (
              <div className="flex items-center gap-2">
                <label htmlFor="member-select" className="text-sm font-medium text-gray-700">Member</label>
                <select
                  id="member-select"
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white max-w-[200px]"
                >
                  <option value="">All members</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-sm font-medium text-gray-700">Year</label>
              <select
                id="year-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {isPM && <th className="px-6 py-3">Member</th>}
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Start</th>
                <th className="px-6 py-3">End</th>
                <th className="px-6 py-3">Pay date</th>
                <th className="px-6 py-3">Length</th>
                <th className="px-6 py-3">Hours</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={isPM ? 10 : 9} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={isPM ? 10 : 9} className="px-6 py-12 text-center text-gray-500">
                    No {statusFilter === 'all' ? '' : statusFilter} periods
                    {memberFilter ? ' for this member' : ''} in {yearFilter}.
                    {' '}
                    <button
                      onClick={() => { setStatusFilter('all'); setYearFilter(currentYear); setMemberFilter('') }}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : rows.map((r) => {
                const totalHours = r.totals.hoursApproved + r.totals.hoursPending
                const totalAmount = r.totals.amountApproved + r.totals.amountPending
                const currency = r.totals.currency || settings?.currency || 'CAD'
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/property-manager/pay-periods/${r.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer"
                    title="View pay period"
                  >
                    {isPM && (
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{r.teamMemberName ?? '—'}</div>
                        {r.teamMemberEmail && (
                          <div className="text-xs text-gray-500">{r.teamMemberEmail}</div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 tabular-nums">{formatPeriodNumber(r.periodNumber)}</div>
                      <div className="text-xs text-gray-500">{r.periodYear}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 tabular-nums">{r.startDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 tabular-nums">{r.endDate}</td>
                    <td className="px-6 py-4 text-sm text-blue-700 tabular-nums font-medium">{r.payDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 tabular-nums">{r.periodLengthDays}d</td>
                    <td className="px-6 py-4 text-sm tabular-nums">
                      <div className="text-gray-900 font-medium">{formatHours(r.totals.hoursApproved)}</div>
                      {r.totals.hoursPending > 0 && (
                        <div className="text-xs text-amber-700">+{formatHours(r.totals.hoursPending)} pending</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums">
                      <div className="text-gray-900 font-medium">{formatMoney(totalAmount, currency)}</div>
                      {r.totals.hoursPending > 0 && (
                        <div className="text-xs text-gray-500">{formatHours(totalHours)} total</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <PayPeriodStatusBadge
                        status={r.status}
                        hasPending={r.totals.hasPending}
                        pendingCount={r.totals.pendingEntryCount}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <IconAction
                          title="View"
                          onClick={() => router.push(`/property-manager/pay-periods/${r.id}`)}
                          colorClass="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </IconAction>
                        <IconAction
                          title="Export CSV"
                          onClick={() => setExporting(r)}
                          colorClass="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </IconAction>
                        {isPM && r.status === 'open' && (
                          <>
                            <IconAction
                              title="Mark as paid"
                              onClick={() => setMarkingPaid(r)}
                              colorClass="text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </IconAction>
                            <IconAction
                              title="Delete"
                              onClick={() => setDeleting(r)}
                              colorClass="text-gray-500 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </IconAction>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals — only mounted for PM (they're never opened otherwise) */}
      {isPM && (
        <>
          <PayScheduleSettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            existing={settings}
            onSaved={handleScheduleSaved}
          />
          <CreatePayPeriodModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
          <DeletePayPeriodModal
            isOpen={!!deleting}
            onClose={() => setDeleting(null)}
            period={deleting}
            onDeleted={handleDeleted}
          />
          <MarkPaidConfirmModal
            isOpen={!!markingPaid}
            onClose={() => setMarkingPaid(null)}
            period={markingPaid}
            totals={markingPaid?.totals ?? null}
            defaultCurrency={settings?.currency ?? 'CAD'}
            onPaid={handlePaid}
          />
        </>
      )}
      {/* Export is available to both roles */}
      <ExportPayPeriodModal
        isOpen={!!exporting}
        onClose={() => setExporting(null)}
        period={exporting}
      />
    </div>
  )
}

// ---- Helpers / subcomponents ----------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  )
}

interface HeaderProps {
  isPM: boolean
  configured: boolean
  onOpenSettings: () => void
  onCreate: () => void
}

function PageHeader({ isPM, configured, onOpenSettings, onCreate }: HeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <BanknotesIcon className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isPM ? 'Pay Periods' : 'My Pay History'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isPM
              ? 'One period per team member per cycle. Approve, snapshot totals, and export CSVs.'
              : 'Your pay periods — see hours, totals, and download your own CSVs.'}
          </p>
        </div>
      </div>
      {isPM && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Cog6ToothIcon className="w-4 h-4" />
            {configured ? 'Schedule settings' : 'Configure schedule'}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25"
          >
            <PlusIcon className="w-5 h-5" />
            Create period
          </button>
        </div>
      )}
    </div>
  )
}

const ACCENT: Record<'blue' | 'emerald' | 'amber' | 'gray', string> = {
  blue:    'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50 text-amber-700',
  gray:    'bg-gray-50 text-gray-600',
}

interface KPIProps {
  title: string
  value: React.ReactNode
  icon: React.ReactNode
  accent: 'blue' | 'emerald' | 'amber' | 'gray'
}

function KPI({ title, value, icon, accent }: KPIProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${ACCENT[accent]}`}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
    </div>
  )
}

function renderDollarTotals(byCurrency: Map<string, number>, fallback = 'CAD'): React.ReactNode {
  if (byCurrency.size === 0) return formatMoney(0, fallback)
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

interface IconActionProps {
  title: string
  onClick: () => void
  colorClass: string
  children: React.ReactNode
}

function IconAction({ title, onClick, colorClass, children }: IconActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md ${colorClass}`}
    >
      {children}
    </button>
  )
}
