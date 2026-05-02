'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { getProperties } from '@/services/propertyService'
import {
  getExpenses,
  getExpenseSummary,
  deleteExpense,
  detachReceipt,
  bulkUpdateExpenses,
  exportExpenses,
  formatCurrency,
  formatExpenseDate,
} from '@/services/expenseService'
import {
  getFilterPresets,
  createFilterPreset,
  deleteFilterPreset,
} from '@/services/expenseFilterPresetService'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import type { Property } from '@/services/types/property'
import type {
  Expense,
  ExpenseFilters,
  ExpenseTotals,
  PaymentStatus,
  QbSyncStatus,
  ReceiptStatus,
  AttachReceiptResponse,
} from '@/services/types/expense'
import type { ExpenseCategory } from '@/services/types/expenseCategories'
import { getCategoryByCode } from '@/services/types/expenseCategories'
import type {
  ExpenseFilterPreset,
  ExpenseFilterState,
  HasReceiptFilter,
  DateRangePreset,
} from '@/services/types/expenseFilterPreset'
import {
  DEFAULT_EXPENSE_FILTER_STATE,
  resolveDateRange,
} from '@/services/types/expenseFilterPreset'
import {
  PlusIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  ClockIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon,
  ReceiptRefundIcon,
  CameraIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XMarkIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import { SiQuickbooks } from 'react-icons/si'
import CreateExpenseModal from '@/components/expenses/create/CreateExpenseModal'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import ExpenseCategoriesModal from '@/components/expenses/categories/ExpenseCategoriesModal'
import QbIntegrationModal from '@/components/quickbooks/QbIntegrationModal'
import ScanReceiptModal from '@/components/expenses/scan/ScanReceiptModal'
import BulkImportExpenseModal from '@/components/expense/import/BulkImportExpenseModal'
import BulkUploadReceiptModal from '@/components/receipt/upload/BulkUploadReceiptModal'
import BulkDeleteExpensesModal from '@/components/expenses/delete/BulkDeleteExpensesModal'
import ExpenseStatusBadges from '@/components/expenses/ExpenseStatusBadges'
import ExpensesFilterBar from '@/components/expenses/filters/ExpensesFilterBar'
import SavedViewsDropdown from '@/components/expenses/filters/SavedViewsDropdown'
import SaveFilterPresetDialog from '@/components/expenses/filters/SaveFilterPresetDialog'
import ColumnsToggle, {
  loadVisibleColumns,
  saveVisibleColumns,
  type ExpenseColumnDef,
} from '@/components/expenses/filters/ColumnsToggle'
import BulkActionsToolbar, { type BulkAction } from '@/components/shared/BulkActionsToolbar'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import { getConnection as getQbConnection } from '@/services/quickbooksService'
import type { QbConnection } from '@/services/types/quickbooks'
import SendToQbModal from '@/components/quickbooks/SendToQbModal'
import SendToQbWizard from '@/components/quickbooks/SendToQbWizard/SendToQbWizard'
import AttachReceiptModal from '@/components/expenses/attach/AttachReceiptModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'

const QB_WIZARD_MAX_SELECTION = 50

// ─── Column registry ────────────────────────────────────────────

const COLUMN_DEFS: ExpenseColumnDef[] = [
  { key: 'date',     label: 'Date',     required: true },
  { key: 'amount',   label: 'Amount',   required: true },
  { key: 'category', label: 'Category' },
  { key: 'property', label: 'Property / Booking' },
  { key: 'vendor',   label: 'Vendor' },
  { key: 'paidBy',   label: 'Paid By' },
  { key: 'status',   label: 'Status (payment + QB sync)' },
  { key: 'receipt',  label: 'Receipt' },
]
const ALL_COLUMN_KEYS = COLUMN_DEFS.map((c) => c.key)

// ─── URL state serialization ────────────────────────────────────

function joinArr(arr: string[]): string | null {
  return arr.length === 0 ? null : arr.join(',')
}

function splitArr(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

function stringifyFilters(state: ExpenseFilterState): URLSearchParams {
  const p = new URLSearchParams()
  const set = (k: string, v: string | null) => { if (v !== null && v !== '') p.set(k, v) }
  set('q', state.search)
  set('properties', joinArr(state.propertyIds))
  set('categories', joinArr(state.categories))
  set('paymentStatuses', joinArr(state.paymentStatuses))
  set('qbSyncStatuses', joinArr(state.qbSyncStatuses))
  set('receiptStatuses', joinArr(state.receiptStatuses))
  if (state.hasReceipt !== 'any') p.set('hasReceipt', state.hasReceipt)
  if (state.dateRange.preset !== 'thisMonth') p.set('preset', state.dateRange.preset)
  if (state.dateRange.preset === 'custom') {
    if (state.dateRange.customStart) p.set('start', state.dateRange.customStart)
    if (state.dateRange.customEnd) p.set('end', state.dateRange.customEnd)
  }
  return p
}

function parseFiltersFromURL(sp: URLSearchParams): ExpenseFilterState {
  const presetRaw = sp.get('preset') as DateRangePreset | null
  const validPreset: DateRangePreset = presetRaw && ['allTime', 'thisMonth', 'lastMonth', 'thisQuarter', 'ytd', 'custom'].includes(presetRaw)
    ? presetRaw
    : 'thisMonth'
  const hasReceiptRaw = sp.get('hasReceipt') as HasReceiptFilter | null
  const hasReceipt: HasReceiptFilter = hasReceiptRaw && ['any', 'yes', 'no'].includes(hasReceiptRaw)
    ? hasReceiptRaw
    : 'any'

  return {
    search: sp.get('q') || '',
    propertyIds: splitArr(sp.get('properties')),
    categories: splitArr(sp.get('categories')),
    paymentStatuses: splitArr(sp.get('paymentStatuses')) as PaymentStatus[],
    qbSyncStatuses: splitArr(sp.get('qbSyncStatuses')) as QbSyncStatus[],
    receiptStatuses: splitArr(sp.get('receiptStatuses')) as ReceiptStatus[],
    hasReceipt,
    dateRange: {
      preset: validPreset,
      customStart: validPreset === 'custom' ? sp.get('start') : null,
      customEnd: validPreset === 'custom' ? sp.get('end') : null,
    },
  }
}

// ─── Page shell (Suspense for useSearchParams) ──────────────────

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <ExpensesContent />
    </Suspense>
  )
}

// ─── Page content ───────────────────────────────────────────────

function ExpensesContent() {
  useUserStore() // keep store warm; profile not directly read here
  const { showNotification } = useNotificationStore()
  const { t } = useTranslation('expenses')
  usePermissionGuard('expenses')
  const { effectiveUserId, canWrite } = usePermissions()

  const router = useRouter()
  const searchParams = useSearchParams()

  // Filter state — initialized from URL on mount, synced back on every change
  const [filterState, setFilterState] = useState<ExpenseFilterState>(() =>
    parseFiltersFromURL(searchParams)
  )

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [totals, setTotals] = useState<ExpenseTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bulk-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  // QuickBooks connection (drives the visibility of the Send-to-QB bulk action).
  const [qbConnection, setQbConnection] = useState<QbConnection | null>(null)

  // Bulk-send wizard state (replaces the old fire-and-forget bulk-sync flow —
  // the wizard walks the user through each expense's QB fields before submitting).
  const [showQbWizard, setShowQbWizard] = useState(false)
  const [qbWizardExpenseIds, setQbWizardExpenseIds] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    getQbConnection()
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success') setQbConnection(res.data)
      })
      .catch(() => { /* non-fatal: just hides the bulk action */ })
    return () => { cancelled = true }
  }, [])

  // Saved views
  const [presets, setPresets] = useState<ExpenseFilterPreset[]>([])
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null)

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(ALL_COLUMN_KEYS)
  // Hydrate from localStorage AFTER mount to avoid SSR mismatch
  useEffect(() => {
    setVisibleColumns(loadVisibleColumns(ALL_COLUMN_KEYS))
  }, [])
  useEffect(() => {
    saveVisibleColumns(visibleColumns)
  }, [visibleColumns])

  // Pagination (client-side, like before)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal state for existing flows
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewerModal, setShowViewerModal] = useState(false)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [showQbIntegrationModal, setShowQbIntegrationModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showBulkReceiptsModal, setShowBulkReceiptsModal] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState('')
  const [sendingExpense, setSendingExpense] = useState<Expense | null>(null)

  // Attach/detach receipt state
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachTargetExpenseId, setAttachTargetExpenseId] = useState('')
  const [receiptDetailId, setReceiptDetailId] = useState<string | null>(null)
  const [ocrDiffData, setOcrDiffData] = useState<AttachReceiptResponse['data'] | null>(null)

  // ─── URL sync (debounced) ─────────────────────────────────────
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current)
    urlSyncTimer.current = setTimeout(() => {
      const next = stringifyFilters(filterState).toString()
      router.replace(next ? `?${next}` : '?', { scroll: false })
    }, 300)
    return () => { if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current) }
  }, [filterState, router])

  // ─── Compose API filters from filter state ────────────────────
  const buildApiFilters = useCallback(
    (state: ExpenseFilterState): ExpenseFilters => {
      const { startDate, endDate } = resolveDateRange(state.dateRange)
      return {
        userId: effectiveUserId!,
        propertyIds: state.propertyIds.length > 0 ? state.propertyIds : undefined,
        categories: state.categories.length > 0 ? state.categories : undefined,
        paymentStatuses: state.paymentStatuses.length > 0 ? state.paymentStatuses : undefined,
        qbSyncStatuses: state.qbSyncStatuses.length > 0 ? state.qbSyncStatuses : undefined,
        receiptStatuses: state.receiptStatuses.length > 0 ? state.receiptStatuses : undefined,
        hasReceipt: state.hasReceipt === 'yes' ? true : state.hasReceipt === 'no' ? false : undefined,
        search: state.search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }
    },
    [effectiveUserId]
  )

  // ─── Initial load (properties + categories + presets) ─────────
  useEffect(() => {
    if (!effectiveUserId) return
    (async () => {
      try {
        const [propertiesRes, categoriesRes] = await Promise.all([
          getProperties(effectiveUserId),
          getCategoriesByUserId(effectiveUserId),
        ])
        if (propertiesRes.status === 'success') setProperties(propertiesRes.data || [])
        if (categoriesRes.status === 'success') setCategories(categoriesRes.data || [])
      } catch (err) {
        console.error('Error loading static data:', err)
      }
    })()

    setPresetsLoading(true)
    getFilterPresets()
      .then((res) => {
        if (res.status === 'success') setPresets(res.data)
      })
      .catch((err) => {
        console.error('Error loading filter presets:', err)
      })
      .finally(() => setPresetsLoading(false))
  }, [effectiveUserId])

  // ─── Load expenses + totals on filter change ──────────────────
  const loadExpenses = useCallback(async () => {
    if (!effectiveUserId) return
    setLoading(true)
    setError(null)
    try {
      const apiFilters = buildApiFilters(filterState)
      const { startDate, endDate } = resolveDateRange(filterState.dateRange)
      const [expensesRes, summaryRes] = await Promise.all([
        getExpenses(apiFilters),
        // Summary only supports a single propertyId today — pass it only if exactly one is selected.
        getExpenseSummary(
          effectiveUserId,
          'category',
          filterState.propertyIds.length === 1 ? filterState.propertyIds[0] : undefined,
          startDate || undefined,
          endDate || undefined
        ),
      ])

      if (expensesRes.status === 'success') {
        setExpenses(expensesRes.data || [])
        setSelectedIds(new Set())
        setCurrentPage(1)
      } else {
        setError(expensesRes.message || 'Failed to load expenses')
      }
      if (summaryRes.status === 'success') {
        setTotals(summaryRes.data.totals)
      }
    } catch (err) {
      console.error('Error loading expenses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, filterState, buildApiFilters])

  useEffect(() => {
    if (effectiveUserId) loadExpenses()
  }, [effectiveUserId, loadExpenses])

  // ─── Saved views ──────────────────────────────────────────────
  const handleLoadPreset = (preset: ExpenseFilterPreset) => {
    setFilterState(preset.filters)
    showNotification(`Loaded view "${preset.name}"`, 'success')
  }

  const handleDeletePreset = async (preset: ExpenseFilterPreset) => {
    try {
      const res = await deleteFilterPreset(preset.id)
      if (res.status === 'success') {
        setPresets((prev) => prev.filter((p) => p.id !== preset.id))
        showNotification(`Deleted view "${preset.name}"`, 'success')
      } else {
        showNotification(res.message || 'Failed to delete view', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    }
  }

  const handleSavePreset = async (name: string) => {
    setSaveDialogError(null)
    try {
      const res = await createFilterPreset({ name, filters: filterState })
      if (res.status === 'success') {
        setPresets((prev) => [...prev, res.data].sort((a, b) => a.sortOrder - b.sortOrder))
        showNotification(`Saved view "${name}"`, 'success')
        setShowSaveDialog(false)
      } else {
        setSaveDialogError(res.message || 'Failed to save view')
      }
    } catch (err) {
      // Surface the 409 / network error inline rather than as a toast so the
      // user can fix the name without retyping.
      setSaveDialogError(err instanceof Error ? err.message : 'Network error')
    }
  }

  // ─── Bulk actions ─────────────────────────────────────────────
  const markPaymentStatus = async (status: PaymentStatus) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true)
    try {
      const res = await bulkUpdateExpenses(ids, { paymentStatus: status })
      if (res.status === 'success' && res.data) {
        const { summary } = res.data
        showNotification(
          summary.failed === 0
            ? `Marked ${summary.updated} as ${status}`
            : `Marked ${summary.updated} as ${status}, ${summary.failed} failed`,
          summary.failed === 0 ? 'success' : 'info'
        )
        loadExpenses()
      } else {
        showNotification(res.message || 'Bulk update failed', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  const exportSelectedRows = async (format: 'csv' | 'xlsx') => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || !effectiveUserId) return
    setBulkBusy(true)
    try {
      const result = await exportExpenses({ format, userId: effectiveUserId, expenseIds: ids })
      showNotification(`Exported ${result.rowCount} expense${result.rowCount === 1 ? '' : 's'}`, 'success')
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  // Opens the bulk-send wizard. Each step in the wizard mirrors the per-row
  // SendToQbModal so the user picks Customer/Class/Tax/etc. for every expense
  // before any QBO call fires. The actual sync happens in a single batch
  // request when the user hits "Send All".
  const openQbWizard = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (ids.length > QB_WIZARD_MAX_SELECTION) {
      showNotification(
        `Select ${QB_WIZARD_MAX_SELECTION} or fewer expenses to send at once`,
        'error'
      )
      return
    }
    setQbWizardExpenseIds(ids)
    setShowQbWizard(true)
  }

  const exportCurrent = async (format: 'csv' | 'xlsx') => {
    if (!effectiveUserId) return
    try {
      const result = await exportExpenses({ format, userId: effectiveUserId, filters: buildApiFilters(filterState) })
      showNotification(`Exported ${result.rowCount} expense${result.rowCount === 1 ? '' : 's'}`, 'success')
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Export failed', 'error')
    }
  }

  /**
   * Bulk actions registry. Adding a new action (e.g. "Send to QuickBooks" in
   * Next 3) is literally one new entry in this array — that's the registry.
   */
  const bulkActions: BulkAction[] = [
    { label: 'Mark as paid',      icon: CheckCircleIcon,    onClick: () => markPaymentStatus('paid'),    disabled: bulkBusy },
    { label: 'Mark as pending',   icon: ClockIcon,          onClick: () => markPaymentStatus('pending'), disabled: bulkBusy },
    { label: 'Export CSV',        icon: ArrowDownTrayIcon,  onClick: () => exportSelectedRows('csv'),    disabled: bulkBusy },
    { label: 'Export XLSX',       icon: ArrowDownTrayIcon,  onClick: () => exportSelectedRows('xlsx'),   disabled: bulkBusy },
    { label: 'Delete',            icon: TrashIcon,          variant: 'danger', onClick: () => setShowBulkDeleteModal(true), disabled: bulkBusy },
    ...(qbConnection?.connected && qbConnection.status !== 'expired'
      ? [{
          label: 'Send to QuickBooks',
          icon: ArrowUpTrayIcon,
          onClick: () => openQbWizard(),
          disabled: bulkBusy,
        } as BulkAction]
      : []),
  ]

  // ─── Row actions ──────────────────────────────────────────────
  const handleViewExpense = (id: string) => {
    setSelectedExpenseId(id)
    setShowViewerModal(true)
  }
  const getRowActions = (expense: Expense): ActionItem[] => [
    { label: 'View Details', icon: EyeIcon,    onClick: () => handleViewExpense(expense.id) },
    { label: 'Edit',         icon: PencilIcon, onClick: () => handleViewExpense(expense.id) },
    // Attach or detach receipt depending on current state
    ...(expense.receiptId
      ? [{
          label: t('detachReceipt'),
          icon: XMarkIcon,
          onClick: async () => {
            if (!confirm(t('confirmDetachReceipt'))) return
            try {
              const res = await detachReceipt(expense.id)
              if (res.status === 'success') {
                showNotification(t('receiptDetached'), 'success')
                loadExpenses()
              } else {
                showNotification(res.message || 'Failed to detach receipt', 'error')
              }
            } catch (err) {
              showNotification(err instanceof Error ? err.message : 'Error detaching receipt', 'error')
            }
          },
        }]
      : [{
          label: t('attachReceipt'),
          icon: LinkIcon,
          onClick: () => {
            setAttachTargetExpenseId(expense.id)
            setShowAttachModal(true)
          },
        }]
    ),
    {
      label: 'Delete',
      icon: TrashIcon,
      variant: 'danger',
      onClick: async () => {
        if (!confirm('Are you sure you want to delete this expense?')) return
        if (!effectiveUserId) return
        const res = await deleteExpense(expense.id, effectiveUserId)
        if (res.status === 'success') {
          showNotification('Expense deleted', 'success')
          loadExpenses()
        } else {
          showNotification(res.message || 'Failed to delete expense', 'error')
        }
      },
    },
  ]

  // ─── Pagination derived state ─────────────────────────────────
  const totalItems = expenses.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedExpenses = expenses.slice(startIndex, endIndex)

  // ─── Stats (computed from the FULL expenses list, ignoring column visibility) ─
  const pendingExpenses = useMemo(() => expenses.filter((e) => e.paymentStatus === 'pending'), [expenses])
  const pendingTotal = useMemo(
    () => pendingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [pendingExpenses]
  )

  const statCards = [
    {
      label: 'Total Expenses',
      value: formatCurrency(totals?.totalAmount || 0),
      subValue: `${totals?.totalCount || 0} expenses`,
      icon: CurrencyDollarIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Reimbursable',
      value: formatCurrency(totals?.reimbursableAmount || 0),
      subValue: 'Amount to recover',
      icon: ReceiptRefundIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Tax Deductible',
      value: formatCurrency(totals?.taxDeductibleAmount || 0),
      subValue: 'For tax purposes',
      icon: ReceiptPercentIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
    {
      label: 'Pending',
      value: formatCurrency(pendingTotal),
      subValue: `${pendingExpenses.length} pending`,
      icon: ClockIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
  ]

  // ─── Display helpers ──────────────────────────────────────────
  const getCategoryLabel = (code: string | undefined) => {
    if (!code) return null
    return getCategoryByCode(code, categories)?.label || code
  }
  const getCategoryColor = (code: string | undefined) => {
    if (!code) return '#6B7280'
    return getCategoryByCode(code, categories)?.colorHex || '#6B7280'
  }

  const showCol = (key: string) => visibleColumns.includes(key)

  // ─── Bulk-select header checkbox helpers ──────────────────────
  const allOnPageSelected = paginatedExpenses.length > 0 && paginatedExpenses.every((e) => selectedIds.has(e.id))
  const someOnPageSelected = paginatedExpenses.some((e) => selectedIds.has(e.id)) && !allOnPageSelected

  // ─── Render ───────────────────────────────────────────────────
  if (error && expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading expenses</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 mt-1">Track and manage property expenses</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canWrite('expenses') && (
            <motion.button
              onClick={() => setShowCategoriesModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Categories
            </motion.button>
          )}
          {canWrite('expenses') && qbConnection?.connected && (() => {
            const isExpired = qbConnection.status === 'expired'
            return (
              <motion.button
                onClick={() => { if (!isExpired) setShowQbIntegrationModal(true) }}
                disabled={isExpired}
                title={isExpired ? 'Reconnect QuickBooks to manage settings' : undefined}
                whileHover={!isExpired ? { scale: 1.02 } : undefined}
                whileTap={!isExpired ? { scale: 0.98 } : undefined}
                className={`inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-colors ${
                  isExpired
                    ? 'bg-indigo-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                QuickBooks Integration
              </motion.button>
            )
          })()}
          {canWrite('expenses') && (
            <motion.button
              onClick={() => setShowBulkImportModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-colors"
            >
              <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
              Import CSV
            </motion.button>
          )}
          {canWrite('expenses') && (
            <motion.button
              onClick={() => setShowBulkReceiptsModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-700 shadow-md transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Add from Receipts
            </motion.button>
          )}
          {canWrite('expenses') && (
            <motion.button
              onClick={() => setShowScanModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 shadow-md transition-colors"
            >
              <CameraIcon className="h-4 w-4 mr-2" />
              Scan Receipt
            </motion.button>
          )}
          {canWrite('expenses') && (
            <motion.button
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Expense
            </motion.button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.subValue}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar + saved views + columns + export */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <ExpensesFilterBar
          state={filterState}
          onChange={setFilterState}
          properties={properties}
          categories={categories}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SavedViewsDropdown
            presets={presets}
            loading={presetsLoading}
            onLoad={handleLoadPreset}
            onDelete={handleDeletePreset}
            onSaveCurrent={() => { setSaveDialogError(null); setShowSaveDialog(true) }}
          />
          <ColumnsToggle columns={COLUMN_DEFS} visibleKeys={visibleColumns} onChange={setVisibleColumns} />
          {/* Export split-button: CSV / XLSX */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => exportCurrent('csv')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
            </button>
            <div className="w-px h-6 bg-gray-200" />
            <button
              type="button"
              onClick={() => exportCurrent('xlsx')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Export XLSX
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {canWrite('expenses') && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          actions={bulkActions}
          onClear={() => setSelectedIds(new Set())}
          itemNoun="expense"
        />
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                {canWrite('expenses') && (
                  <th className="px-4 py-4 text-left w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all visible expenses"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(paginatedExpenses.map((x) => x.id)))
                        } else {
                          setSelectedIds(new Set())
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </th>
                )}
                {showCol('date') && <Th>Date</Th>}
                {showCol('amount') && <Th>Amount</Th>}
                {showCol('category') && <Th>Category</Th>}
                {showCol('property') && <Th>Property / Booking</Th>}
                {showCol('vendor') && <Th>Vendor</Th>}
                {showCol('paidBy') && <Th>Paid By</Th>}
                {showCol('status') && <Th>Status</Th>}
                {showCol('receipt') && <Th>Receipt</Th>}
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="px-6 py-16 text-center text-sm text-gray-500">
                    Loading expenses…
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense, index) => {
                  const isSelected = selectedIds.has(expense.id)
                  return (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${
                        isSelected ? 'bg-purple-50/50' : ''
                      }`}
                      onClick={() => handleViewExpense(expense.id)}
                    >
                      {canWrite('expenses') && (
                        <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select expense ${expense.id}`}
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(expense.id)
                                else next.delete(expense.id)
                                return next
                              })
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                      )}
                      {showCol('date') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{formatExpenseDate(expense.expenseDate)}</span>
                        </td>
                      )}
                      {showCol('amount') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(expense.amount, expense.currency)}
                          </span>
                        </td>
                      )}
                      {showCol('category') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {expense.category ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                              style={{
                                backgroundColor: getCategoryColor(expense.category) + '20',
                                color: getCategoryColor(expense.category),
                              }}
                            >
                              {getCategoryLabel(expense.category)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">
                              Needs Category
                            </span>
                          )}
                        </td>
                      )}
                      {showCol('property') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {expense.propertyName ? (
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-900 truncate max-w-[150px]">{expense.propertyName}</div>
                                {expense.bookingGuestName && (
                                  <div className="text-xs text-gray-500">{expense.bookingGuestName}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">General expense</span>
                          )}
                        </td>
                      )}
                      {showCol('vendor') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 truncate max-w-[140px] block">
                            {expense.vendorName || '—'}
                          </span>
                        </td>
                      )}
                      {showCol('paidBy') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 truncate max-w-[120px] block">
                            {expense.paidByName || '—'}
                          </span>
                        </td>
                      )}
                      {showCol('status') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ExpenseStatusBadges
                            paymentStatus={expense.paymentStatus}
                            qbSyncStatus={expense.qbSyncStatus}
                            layout="stacked"
                          />
                        </td>
                      )}
                      {showCol('receipt') && (
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {expense.receiptId ? (
                            <button
                              onClick={() => setReceiptDetailId(expense.receiptId!)}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                            >
                              <DocumentTextIcon className="w-4 h-4" />
                              {t('viewReceipt')}
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}
                      <td
                        className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {qbConnection?.connected &&
                            qbConnection.status !== 'expired' &&
                            expense.qbSyncStatus !== 'synced' && (
                              <button
                                type="button"
                                onClick={() => setSendingExpense(expense)}
                                title={
                                  expense.qbSyncStatus === 'failed'
                                    ? 'Retry sync to QuickBooks'
                                    : 'Send to QuickBooks'
                                }
                                aria-label="Send to QuickBooks"
                                className="p-1.5 rounded-lg text-[#2CA01C] hover:text-[#1F7A14] hover:bg-emerald-50 cursor-pointer transition-colors"
                              >
                                <SiQuickbooks className="w-5 h-5" />
                              </button>
                            )}
                          <TableActionsDropdown actions={getRowActions(expense)} itemId={expense.id} />
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Empty state */}
          {!loading && expenses.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No expenses found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Try adjusting your filters, or add your first expense.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {expenses.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{Math.min(startIndex + 1, totalItems)}</span> to{' '}
                  <span className="font-medium text-gray-700">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium text-gray-700">{totalItems}</span> expenses
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-gray-500">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={() => loadExpenses()}
      />

      <ExpenseViewerModal
        isOpen={showViewerModal}
        onClose={() => { setShowViewerModal(false); setOcrDiffData(null) }}
        expenseId={selectedExpenseId}
        onExpenseUpdated={() => { setOcrDiffData(null); loadExpenses() }}
        onExpenseDeleted={() => loadExpenses()}
        ocrDiffData={ocrDiffData ? { receipt: ocrDiffData.receipt, receiptLineItems: ocrDiffData.receiptLineItems } : undefined}
        onAttachReceipt={() => {
          setAttachTargetExpenseId(selectedExpenseId)
          setShowAttachModal(true)
        }}
      />

      <ExpenseCategoriesModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoryUpdate={() => {
          if (effectiveUserId) {
            getCategoriesByUserId(effectiveUserId).then((res) => {
              if (res.status === 'success') setCategories(res.data || [])
            })
          }
        }}
      />

      <QbIntegrationModal
        isOpen={showQbIntegrationModal}
        onClose={() => setShowQbIntegrationModal(false)}
        isConnected={!!qbConnection?.connected && qbConnection.status !== 'expired'}
      />

      <ScanReceiptModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onExpenseCreated={(expenseId: string) => {
          loadExpenses()
          setSelectedExpenseId(expenseId)
          setShowViewerModal(true)
        }}
      />

      <BulkImportExpenseModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImportComplete={() => loadExpenses()}
        properties={properties}
      />

      <BulkUploadReceiptModal
        isOpen={showBulkReceiptsModal}
        onClose={() => setShowBulkReceiptsModal(false)}
        onComplete={() => loadExpenses()}
        source="bulk_expense"
      />

      <BulkDeleteExpensesModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        expenseIds={Array.from(selectedIds)}
        onDeleted={() => {
          setSelectedIds(new Set())
          loadExpenses()
        }}
      />

      <SaveFilterPresetDialog
        isOpen={showSaveDialog}
        onClose={() => { setShowSaveDialog(false); setSaveDialogError(null) }}
        onSave={handleSavePreset}
        errorMessage={saveDialogError}
      />

      {sendingExpense && (
        <SendToQbModal
          isOpen={true}
          onClose={() => setSendingExpense(null)}
          expenseId={sendingExpense.id}
          vendorName={sendingExpense.vendorName ?? null}
          hasReceipt={!!sendingExpense.receiptId || !!sendingExpense.receiptPath}
          connectionDefaultEntityType={qbConnection?.defaultQbEntityType ?? 'purchase'}
          categoryCode={sendingExpense.category ?? null}
          expenseAmount={sendingExpense.amount}
          propertyId={sendingExpense.propertyId ?? null}
          primaryOwnerName={sendingExpense.primaryOwnerName ?? null}
          taxBreakdown={{
            gst: sendingExpense.taxGst ?? 0,
            pst: sendingExpense.taxPst ?? 0,
            hst: sendingExpense.taxHst ?? 0,
            qst: sendingExpense.taxQst ?? 0,
          }}
          expenseDescription={sendingExpense.description}
          onSynced={() => {
            setSendingExpense(null)
            loadExpenses()
          }}
        />
      )}

      {showQbWizard && (
        <SendToQbWizard
          isOpen={showQbWizard}
          expenseIds={qbWizardExpenseIds}
          onClose={() => {
            setShowQbWizard(false)
            setQbWizardExpenseIds([])
          }}
          onComplete={() => {
            setShowQbWizard(false)
            setQbWizardExpenseIds([])
            setSelectedIds(new Set())
            loadExpenses()
          }}
        />
      )}

      <AttachReceiptModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        expenseId={attachTargetExpenseId}
        onAttached={(data) => {
          setOcrDiffData(data)
          loadExpenses()
          // Open the viewer in edit mode so user sees OCR diff hints
          setSelectedExpenseId(data.expense.id)
          setShowViewerModal(true)
        }}
      />

      {receiptDetailId && (
        <ReceiptDetailModal
          isOpen={!!receiptDetailId}
          onClose={() => setReceiptDetailId(null)}
          receiptId={receiptDetailId}
          properties={properties}
          onUpdated={() => loadExpenses()}
          onDeleted={() => { setReceiptDetailId(null); loadExpenses() }}
        />
      )}
    </div>
  )
}

// ─── Tiny presentational helper ─────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  )
}
