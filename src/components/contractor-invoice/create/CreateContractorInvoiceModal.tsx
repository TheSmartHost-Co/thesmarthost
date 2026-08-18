'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../../shared/modal'
import { createInvoice, getAvailableTasks } from '@/services/contractorInvoiceService'
import { getProperties } from '@/services/propertyService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import type { Contractor } from '@/services/types/contractor'
import type { ContractorInvoice, AvailableTask, ContractorExtraItemPayload } from '@/services/types/contractorInvoice'
import type { Property } from '@/services/types/property'
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { TAX_RATES, calcTax } from '@/constants/taxRates'
import { formatLocalDate } from '@/utils/dateUtils'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateContractorInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  contractor: Contractor
  onCreated: (invoice: ContractorInvoice) => void
}

// ─── Per-task override (editable before generating) ───────────────────────────

interface TaskOverride {
  amount: number
  amountManuallySet: boolean
  isTaxable: boolean
}

// ─── Local extra item with client-side ID ─────────────────────────────────────

interface LocalExtraItem extends ContractorExtraItemPayload {
  _id: string
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatTaskDate(dateStr: string): string {
  const date = new Date(dateStr.split('T')[0] + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Check if a date string falls within optional start/end bounds */
function isDateInRange(dateStr: string, start?: string, end?: string): boolean {
  if (!start && !end) return true
  const d = dateStr.split('T')[0]
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateContractorInvoiceModal: React.FC<CreateContractorInvoiceModalProps> = ({
  isOpen,
  onClose,
  contractor,
  onCreated,
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const profile = useUserStore((s) => s.profile)

  // ─── Global filters ──────────────────────────────────────────────────────

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Properties for filter + extra charge picker ─────────────────────────

  const [properties, setProperties] = useState<Property[]>([])

  // ─── Tasks section ────────────────────────────────────────────────────────

  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [taskOverrides, setTaskOverrides] = useState<Map<string, TaskOverride>>(new Map())
  const [loadingTasks, setLoadingTasks] = useState(false)

  // ─── Extra charges section ────────────────────────────────────────────────

  const [extraItems, setExtraItems] = useState<LocalExtraItem[]>([])
  const [extraDesc, setExtraDesc] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [extraDate, setExtraDate] = useState(() => formatLocalDate(new Date()))
  const [extraPropertyId, setExtraPropertyId] = useState('')
  const [extraTaxable, setExtraTaxable] = useState(false)

  // ─── Tax toggles ──────────────────────────────────────────────────────────

  const [taxHstEnabled, setTaxHstEnabled] = useState(contractor.taxHstEnabled || false)
  const [taxGstEnabled, setTaxGstEnabled] = useState(contractor.taxGstEnabled || false)
  const [taxQstEnabled, setTaxQstEnabled] = useState(contractor.taxQstEnabled || false)

  // ─── Cart & submit ────────────────────────────────────────────────────────

  const [cartExpanded, setCartExpanded] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false) // mobile-only; desktop always shows the panel
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // ─── Period date conflict (selections outside narrowed range) ─────────────

  const [periodConflict, setPeriodConflict] = useState<{
    tasks: AvailableTask[]
    extraItems: LocalExtraItem[]
  } | null>(null)

  // ─── Derived counts ───────────────────────────────────────────────────────

  const taskCount = selectedTaskIds.size
  const extraCount = extraItems.length
  const totalItemCount = taskCount + extraCount

  // Auto-dismiss confirmation if all items removed
  useEffect(() => {
    if (showConfirmation && totalItemCount === 0) setShowConfirmation(false)
  }, [showConfirmation, totalItemCount])

  // ─── Reset on modal open ──────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setPeriodStart(formatDateInput(first))
      setPeriodEnd(formatDateInput(now))
      setPropertyFilter('')
      setSearchQuery('')
      setSelectedTaskIds(new Set())
      setTaskOverrides(new Map())
      setExtraItems([])
      setExtraDesc('')
      setExtraAmount('')
      setExtraDate(formatLocalDate(new Date()))
      setExtraPropertyId('')
      setExtraTaxable(false)
      setCartExpanded(false)
      setShowConfirmation(false)
      setTaxHstEnabled(contractor.taxHstEnabled || false)
      setTaxGstEnabled(contractor.taxGstEnabled || false)
      setTaxQstEnabled(contractor.taxQstEnabled || false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ─── Load properties ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !profile?.id) return
    const parentId = profile.pmUserId || profile.id
    getProperties(parentId).then((res) => {
      if (res.status === 'success') setProperties(res.data)
    }).catch(console.error)
  }, [isOpen, profile?.id, profile?.pmUserId])

  // ─── Fetch tasks when filters change ──────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    if (!periodStart || !periodEnd) return
    const fetchTasks = async () => {
      setLoadingTasks(true)
      try {
        const res = await getAvailableTasks(
          contractor.id,
          periodStart || undefined,
          periodEnd || undefined,
          propertyFilter || undefined,
          searchQuery || undefined
        )
        if (res.status === 'success') {
          setAvailableTasks(res.data)
          // Build overrides for new tasks (preserve existing ones)
          const anyTaxEnabled = taxHstEnabled || taxGstEnabled || taxQstEnabled
          setTaskOverrides((prev) => {
            const next = new Map<string, TaskOverride>()
            res.data.forEach((task) => {
              if (prev.has(task.id)) {
                next.set(task.id, prev.get(task.id)!)
              } else {
                next.set(task.id, {
                  amount: task.agreedAmount ?? 0,
                  amountManuallySet: false,
                  isTaxable: anyTaxEnabled,
                })
              }
            })
            return next
          })
        }
      } catch (err) {
        console.error('Error fetching tasks:', err)
      } finally {
        setLoadingTasks(false)
      }
    }
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractor.id, periodStart, periodEnd, propertyFilter, searchQuery])

  // ─── Detect out-of-range selections when dates narrow ─────────────────────
  // Instead of silently deselecting, surface a conflict modal so the user can
  // choose to expand the period or drop the items.

  useEffect(() => {
    if (!isOpen) return

    const oorTasks: AvailableTask[] = []
    selectedTaskIds.forEach((id) => {
      const task = availableTasks.find((tk) => tk.id === id)
      if (task && task.scheduledDate && !isDateInRange(task.scheduledDate, periodStart, periodEnd)) {
        oorTasks.push(task)
      }
    })

    const oorExtraItems = extraItems.filter(
      (item) => item.taskDate && !isDateInRange(item.taskDate, periodStart, periodEnd)
    )

    if (oorTasks.length + oorExtraItems.length > 0) {
      setPeriodConflict({ tasks: oorTasks, extraItems: oorExtraItems })
    } else {
      setPeriodConflict(null)
    }
    // Depends on period dates plus extraItems: the task list is server-filtered
    // to the period so only a period change can push selections out of range,
    // but extra charges accept any typed date and must be re-checked when added.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd, extraItems])

  const handleExpandPeriod = () => {
    if (!periodConflict) return
    const dates: string[] = []
    periodConflict.tasks.forEach((task) => {
      if (task.scheduledDate) dates.push(task.scheduledDate.split('T')[0])
    })
    periodConflict.extraItems.forEach((item) => {
      if (item.taskDate) dates.push(item.taskDate)
    })
    if (dates.length === 0) {
      setPeriodConflict(null)
      return
    }
    const minDate = dates.reduce((m, d) => (d < m ? d : m), dates[0])
    const maxDate = dates.reduce((m, d) => (d > m ? d : m), dates[0])
    if (periodStart && minDate < periodStart) setPeriodStart(minDate)
    if (periodEnd && maxDate > periodEnd) setPeriodEnd(maxDate)
    setPeriodConflict(null)
  }

  const handleDropOutOfRange = () => {
    if (!periodConflict) return
    const droppedCount = periodConflict.tasks.length + periodConflict.extraItems.length

    if (periodConflict.tasks.length > 0) {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev)
        periodConflict.tasks.forEach((task) => next.delete(task.id))
        return next
      })
    }
    if (periodConflict.extraItems.length > 0) {
      const droppedIds = new Set(periodConflict.extraItems.map((item) => item._id))
      setExtraItems((prev) => prev.filter((item) => !droppedIds.has(item._id)))
    }
    if (droppedCount > 0) {
      showNotification(t('itemsDeselectedWarning', { count: droppedCount }), 'info')
    }
    setPeriodConflict(null)
  }

  // ─── Subtotal calculations ────────────────────────────────────────────────

  const taskSubtotal = useMemo(() => {
    let total = 0
    selectedTaskIds.forEach((id) => {
      const ov = taskOverrides.get(id)
      if (ov) total += ov.amount
    })
    return total
  }, [selectedTaskIds, taskOverrides])

  const extraSubtotal = useMemo(() => {
    return extraItems.reduce((s, item) => s + item.amount, 0)
  }, [extraItems])

  const selectedSubtotal = taskSubtotal + extraSubtotal

  // Taxable subtotal — only taxable task items + taxable extra items
  const taxableSubtotal = useMemo(() => {
    let total = 0
    selectedTaskIds.forEach((id) => {
      const ov = taskOverrides.get(id)
      if (ov && ov.isTaxable) total += ov.amount
    })
    extraItems.forEach((item) => {
      if (item.isTaxable) total += item.amount
    })
    return total
  }, [selectedTaskIds, taskOverrides, extraItems])

  const hasTax = taxHstEnabled || taxGstEnabled || taxQstEnabled
  const taxPreview = useMemo(() => {
    const hst = taxHstEnabled ? calcTax(taxableSubtotal, 'hst') : 0
    const gst = taxGstEnabled ? calcTax(taxableSubtotal, 'gst') : 0
    const qst = taxQstEnabled ? calcTax(taxableSubtotal, 'qst') : 0
    return { hst, gst, qst, total: hst + gst + qst }
  }, [taxableSubtotal, taxHstEnabled, taxGstEnabled, taxQstEnabled])

  const selectedTotal = selectedSubtotal + taxPreview.total

  // ─── Task handlers ────────────────────────────────────────────────────────

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAmountChange = (taskId: string, value: string) => {
    setTaskOverrides((prev) => {
      const next = new Map(prev)
      const current = next.get(taskId)
      if (current) {
        const numVal = value.trim() ? parseFloat(value) : 0
        next.set(taskId, { ...current, amount: numVal, amountManuallySet: true })
      }
      return next
    })
  }

  // ─── Extra charge handlers ────────────────────────────────────────────────

  const handleAddExtraItem = () => {
    if (!extraDesc.trim()) {
      showNotification(t('descriptionRequired'), 'error')
      return
    }
    if (!extraAmount || parseFloat(extraAmount) <= 0) {
      showNotification(t('amountRequired'), 'error')
      return
    }
    if (!extraDate) {
      showNotification(t('chargeDateRequired'), 'error')
      return
    }

    const newItem: LocalExtraItem = {
      _id: crypto.randomUUID(),
      description: extraDesc.trim(),
      amount: parseFloat(extraAmount),
      ...(extraPropertyId ? { propertyId: extraPropertyId } : {}),
      taskDate: extraDate,
      isTaxable: extraTaxable,
    }

    setExtraItems((prev) => [...prev, newItem])
    setExtraDesc('')
    setExtraAmount('')
    setExtraDate(formatLocalDate(new Date()))
    setExtraPropertyId('')
    setExtraTaxable(false)
    showNotification(t('extraItemAdded'), 'success')
  }

  const removeExtraItem = (id: string) => {
    setExtraItems((prev) => prev.filter((item) => item._id !== id))
  }

  // ─── Generate invoice ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (totalItemCount === 0) return
    setIsSubmitting(true)

    try {
      // Build task overrides
      const itemOverrides: Record<string, { amount?: number; isTaxable?: boolean }> = {}
      selectedTaskIds.forEach((id) => {
        const task = availableTasks.find((tk) => tk.id === id)
        const override = taskOverrides.get(id)
        if (!task || !override) return
        const hasChanges = override.amountManuallySet || override.isTaxable
        if (hasChanges) {
          const entry: { amount?: number; isTaxable?: boolean } = {}
          if (override.amountManuallySet) entry.amount = override.amount
          if (override.isTaxable) entry.isTaxable = true
          itemOverrides[id] = entry
        }
      })

      const res = await createInvoice({
        contractorId: contractor.id,
        ...(periodStart && { periodStart }),
        ...(periodEnd && { periodEnd }),
        taskIds: Array.from(selectedTaskIds),
        ...(extraItems.length > 0 ? {
          extraItems: extraItems.map(({ _id: _unused, ...rest }) => rest),
        } : {}),
        ...(Object.keys(itemOverrides).length > 0 ? { itemOverrides } : {}),
        taxHstEnabled,
        taxGstEnabled,
        taxQstEnabled,
      })

      if (res.status === 'success') {
        showNotification(
          t('invoiceGeneratedWithItems', { number: res.data.invoiceNumber, count: res.data.items?.length || totalItemCount }),
          'success'
        )
        onCreated(res.data)
      } else {
        showNotification(res.message || t('failedToGenerateInvoice'), 'error')
      }
    } catch (err) {
      console.error('Error creating invoice:', err)
      showNotification(err instanceof Error ? err.message : t('errorGeneratingInvoice'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderConflictItemRow = (label: string, dateStr: string | null | undefined) => (
    <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded text-xs">
      <span className="text-gray-700 truncate">{label}</span>
      <span className="text-gray-400 tabular-nums flex-shrink-0">
        {dateStr ? formatTaskDate(dateStr) : '—'}
      </span>
    </div>
  )

  const renderConflictGroup = (
    title: string,
    conflictItems: Array<{ key: string; label: string; date: string | null | undefined }>
  ) => {
    if (conflictItems.length === 0) return null
    const visible = conflictItems.slice(0, 5)
    const overflow = conflictItems.length - visible.length
    return (
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {title} ({conflictItems.length})
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-100 divide-y divide-gray-100">
          {visible.map((it) => (
            <div key={it.key}>{renderConflictItemRow(it.label, it.date)}</div>
          ))}
          {overflow > 0 && (
            <div className="text-[11px] text-gray-400 px-2 py-1.5">+{overflow} more</div>
          )}
        </div>
      </div>
    )
  }

  // Compact summary shown in the collapsed mobile filter bar
  const filterPropertyLabel = propertyFilter
    ? (properties.find((p) => p.id === propertyFilter)?.address ?? t('allProperties'))
    : t('allProperties')
  const activeFilterCount = (propertyFilter ? 1 : 0) + (searchQuery.trim() ? 1 : 0)
  const filterRangeLabel =
    periodStart && periodEnd ? `${formatTaskDate(periodStart)} – ${formatTaskDate(periodEnd)}` : ''

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-5xl w-[95%] sm:w-11/12 max-h-[92vh] flex flex-col">
      {/* ═══ Header ═══ */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('generateInvoiceTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1">Select completed tasks and add any extra charges.</p>
      </div>

      {/* ═══ Global Filters ═══ */}
      {/* Mobile: collapsed summary bar — frees vertical space for line items */}
      <button
        type="button"
        onClick={() => setFiltersExpanded((v) => !v)}
        aria-expanded={filtersExpanded}
        className="sm:hidden w-full flex items-center justify-between gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-700 flex-shrink-0">{t('filters')}</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex-shrink-0">
              {activeFilterCount}
            </span>
          )}
          {!filtersExpanded && (
            <span className="text-xs text-gray-400 truncate">
              {filterRangeLabel && `· ${filterRangeLabel} `}· {filterPropertyLabel}
            </span>
          )}
        </div>
        {filtersExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Panel: hidden on mobile until expanded; always visible on desktop */}
      <div className={`${filtersExpanded ? 'block' : 'hidden'} sm:block px-5 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50`}>
        {/* Date presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: t('currentMonth'), getRange: () => {
              const now = new Date()
              return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
            }},
            { label: t('lastMonth'), getRange: () => {
              const now = new Date()
              return {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0),
              }
            }},
            { label: t('pastTwoWeeks'), getRange: () => {
              const now = new Date()
              const twoWeeksAgo = new Date(now)
              twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
              return { start: twoWeeksAgo, end: now }
            }},
          ].map((preset) => {
            const { start, end } = preset.getRange()
            const isActive = periodStart === formatDateInput(start) && periodEnd === formatDateInput(end)
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPeriodStart(formatDateInput(start))
                  setPeriodEnd(formatDateInput(end))
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Date inputs + property filter + search */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="relative">
            <CalendarDaysIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              placeholder={t('periodStart')}
              className="w-full pl-8 pr-2 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            />
          </div>
          <div className="relative">
            <CalendarDaysIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              placeholder={t('periodEnd')}
              className="w-full pl-8 pr-2 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            />
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="w-full px-3 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          >
            <option value="">{t('allProperties')}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchItemsPlaceholder')}
              className="w-full pl-8 pr-3 py-2 min-h-[40px] border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>

      {/* ═══ Content (scrollable) ═══ */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-6">

        {/* ─── Tasks Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <WrenchScrewdriverIcon className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Tasks</h3>
            {taskCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{taskCount}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
            <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            Completed tasks for this contractor that are not yet on any invoice.
          </p>
          <div>
            {loadingTasks ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Searching completed tasks...</span>
                </div>
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <ExclamationTriangleIcon className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No tasks found</h3>
                <p className="text-xs text-gray-500 max-w-xs">No completed, uninvoiced tasks in this date range. Try widening the period or clearing filters.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {availableTasks.length} completed {availableTasks.length === 1 ? 'task' : 'tasks'}
                </p>
                {/* Column Headers (desktop) */}
                <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto] gap-2 px-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="w-5" />
                  <div>Task</div>
                  <div className="text-center w-24">Agreed</div>
                  <div className="text-right w-32">Amount</div>
                </div>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                  {availableTasks.map((task) => {
                    const isSelected = selectedTaskIds.has(task.id)
                    const override = taskOverrides.get(task.id)
                    const agreedLabel = task.agreedAmount != null ? `$${task.agreedAmount.toFixed(2)}` : '—'
                    const propertyLabel = task.propertyName || task.propertyAddress || t('unknownProperty')

                    return (
                      <div key={task.id} className={`transition-colors ${isSelected ? 'bg-amber-50/50' : 'bg-white'}`}>
                        {/* Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto] gap-2 items-center p-3 sm:p-4">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                              isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-300 hover:border-amber-400'
                            }`}
                          >
                            {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <WrenchScrewdriverIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-5">
                              <BuildingOfficeIcon className="h-3 w-3 text-gray-300 flex-shrink-0" />
                              <p className="text-xs text-gray-400 truncate">{propertyLabel}</p>
                              {task.scheduledDate && (
                                <>
                                  <span className="text-xs text-gray-300">&middot;</span>
                                  <p className="text-xs text-gray-400 flex-shrink-0">{formatTaskDate(task.scheduledDate)}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="w-24 text-center">
                            <span className="text-xs text-gray-500 tabular-nums">{agreedLabel}</span>
                          </div>
                          <div className="w-32">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTaskOverrides((prev) => {
                                    const next = new Map(prev)
                                    const cur = next.get(task.id)
                                    if (cur) next.set(task.id, { ...cur, isTaxable: !cur.isTaxable })
                                    return next
                                  })
                                }}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                  override?.isTaxable
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200'
                                }`}
                                title={override?.isTaxable ? t('taxableClickRemove') : t('notTaxableClickAdd')}
                              >
                                {t('taxShort')}
                              </button>
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={override?.amount != null ? (override.amount === 0 && !override.amountManuallySet ? '' : override.amount) : ''}
                                onChange={(e) => handleAmountChange(task.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="0.00"
                                className={`w-20 px-2 py-1 text-xs text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white ${
                                  override?.amountManuallySet ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden p-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer ${
                                isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-300 hover:border-amber-400'
                              }`}
                            >
                              {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <WrenchScrewdriverIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-5 mb-2">
                                <span className="text-xs text-gray-400 truncate">{propertyLabel}</span>
                                {task.scheduledDate && (
                                  <span className="text-xs text-gray-400">{formatTaskDate(task.scheduledDate)}</span>
                                )}
                                <span className="text-xs text-gray-500 tabular-nums">{agreedLabel}</span>
                              </div>
                              <div className="flex items-center gap-3 ml-5 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <CurrencyDollarIcon className="h-3 w-3 text-gray-400" />
                                  <input
                                    type="number" step="0.01" min="0"
                                    value={override?.amount != null ? (override.amount === 0 && !override.amountManuallySet ? '' : override.amount) : ''}
                                    onChange={(e) => handleAmountChange(task.id, e.target.value)}
                                    placeholder="0.00"
                                    className={`w-20 px-1.5 py-1 text-xs text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                      override?.amountManuallySet ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Amounts are prefilled from the agreed price — edit any row before generating.</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Extra Charges Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollarIcon className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Extra Charges</h3>
            {extraCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{extraCount}</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
            <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
            Add manual line items like materials, mileage, or other charges.
          </p>
          <div className="space-y-4">
            {/* Add form */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('addExtraChargeTitle')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('extraItemDescription')} *</label>
                  <input
                    type="text"
                    value={extraDesc}
                    onChange={(e) => setExtraDesc(e.target.value)}
                    placeholder={t('extraItemDescriptionPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('extraItemAmount')} *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={extraAmount}
                        onChange={(e) => setExtraAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('chargeDate')} *</label>
                    <input
                      type="date"
                      value={extraDate}
                      onChange={(e) => setExtraDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('extraItemProperty')}</label>
                  <select
                    value={extraPropertyId}
                    onChange={(e) => setExtraPropertyId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  >
                    <option value="">{t('selectProperty')}</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.address}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExtraTaxable(!extraTaxable)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                      extraTaxable
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                      extraTaxable ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {extraTaxable && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                    </div>
                    {t('taxable')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddExtraItem}
                    disabled={!extraDesc.trim() || !extraAmount || !extraDate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    {t('addExtraItem')}
                  </button>
                </div>
              </div>
            </div>

            {/* Added extra items list */}
            {extraItems.length > 0 && (
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                {extraItems.map((item) => {
                  const prop = properties.find((p) => p.id === item.propertyId)
                  return (
                    <div key={item._id} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <PlusIcon className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                        <div className="flex items-center gap-1.5">
                          {prop && <span className="text-[10px] text-gray-400 truncate">{prop.address}</span>}
                          {item.taskDate && (
                            <>
                              {prop && <span className="text-[10px] text-gray-300">&middot;</span>}
                              <span className="text-[10px] text-gray-400">{formatTaskDate(item.taskDate)}</span>
                            </>
                          )}
                          {item.isTaxable && (
                            <>
                              <span className="text-[10px] text-gray-300">&middot;</span>
                              <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">{t('taxShort')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                        ${item.amount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExtraItem(item._id)}
                        className="p-1 text-gray-400 hover:text-red-500 cursor-pointer rounded hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Selected Items Cart (collapsible) ═══ */}
      {totalItemCount > 0 && (
        <div className="border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCartExpanded(!cartExpanded)}
            className="w-full flex items-center justify-between px-5 sm:px-6 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-700">{t('selectedItemsCart')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {totalItemCount}
              </span>
            </div>
            {cartExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
          </button>

          {cartExpanded && (
            <div className="px-5 sm:px-6 py-3 bg-gray-50/50 max-h-[200px] overflow-y-auto space-y-2">
              {/* Tasks */}
              {taskCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Tasks ({taskCount})</p>
                  {Array.from(selectedTaskIds).map((id) => {
                    const task = availableTasks.find((tk) => tk.id === id)
                    const ov = taskOverrides.get(id)
                    if (!task) return null
                    return (
                      <div key={id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600 truncate mr-2">
                          {task.title}{task.scheduledDate ? ` — ${formatTaskDate(task.scheduledDate)}` : ''}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-gray-900 tabular-nums">${ov?.amount.toFixed(2) || '0.00'}</span>
                          <button type="button" onClick={() => toggleTask(id)} className="text-gray-400 hover:text-red-500 cursor-pointer"><XMarkIcon className="h-3 w-3" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Extra charges */}
              {extraCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('cartExtraCharges')} ({extraCount})</p>
                  {extraItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between py-1">
                      <span className="text-xs text-gray-600 truncate mr-2">{item.description}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-900 tabular-nums">${item.amount.toFixed(2)}</span>
                        <button type="button" onClick={() => removeExtraItem(item._id)} className="text-gray-400 hover:text-red-500 cursor-pointer"><XMarkIcon className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Footer ═══ */}
      <div className="border-t border-gray-200 px-5 sm:px-6 py-4">
        {/* Tax Toggles */}
        {totalItemCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('taxLabel')}:</span>
            {([
              { key: 'hst' as const, enabled: taxHstEnabled, setter: setTaxHstEnabled },
              { key: 'gst' as const, enabled: taxGstEnabled, setter: setTaxGstEnabled },
              { key: 'qst' as const, enabled: taxQstEnabled, setter: setTaxQstEnabled },
            ]).map(({ key, enabled, setter }) => (
              <button
                key={key}
                type="button"
                onClick={() => setter(!enabled)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                  enabled
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                  enabled ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                }`}>
                  {enabled && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                </div>
                {TAX_RATES[key].label} ({TAX_RATES[key].pct})
              </button>
            ))}
          </div>
        )}

        {/* Summary + Generate */}
        {totalItemCount > 0 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {t('canContinueEditingAfter')}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              {hasTax ? (
                <>
                  <p className="text-xs text-amber-600">{t('subtotal')}: ${selectedSubtotal.toFixed(2)}</p>
                  {taxHstEnabled && <p className="text-[10px] text-amber-500">{TAX_RATES.hst.label}: ${taxPreview.hst.toFixed(2)}</p>}
                  {taxGstEnabled && <p className="text-[10px] text-amber-500">{TAX_RATES.gst.label}: ${taxPreview.gst.toFixed(2)}</p>}
                  {taxQstEnabled && <p className="text-[10px] text-amber-500">{TAX_RATES.qst.label}: ${taxPreview.qst.toFixed(2)}</p>}
                  <p className="text-lg font-bold text-amber-800 mt-0.5">${selectedTotal.toFixed(2)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-amber-600">{t('total')}</p>
                  <p className="text-xl font-bold text-amber-800">${selectedTotal.toFixed(2)}</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[44px] text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm font-medium cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmation(true)}
            disabled={isSubmitting || totalItemCount === 0}
            className="px-6 py-2.5 min-h-[44px] text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 font-semibold text-sm shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            {`${t('generateInvoice')} — $${selectedTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </Modal>

    {/* ─── Period conflict confirmation overlay ─── */}
    {periodConflict && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="period-conflict-title"
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              <h3 id="period-conflict-title" className="text-base font-semibold text-gray-900">
                Items outside this period
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {(() => {
                const total = periodConflict.tasks.length + periodConflict.extraItems.length
                return `${total} selected ${total === 1 ? 'item is' : 'items are'} outside the chosen date range. Expand the period to keep them, or drop them from the invoice.`
              })()}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {renderConflictGroup(
              'Tasks',
              periodConflict.tasks.map((task) => ({
                key: task.id,
                label: task.title || task.propertyName || 'Task',
                date: task.scheduledDate,
              }))
            )}
            {renderConflictGroup(
              'Extra Charges',
              periodConflict.extraItems.map((item) => ({
                key: item._id,
                label: item.description,
                date: item.taskDate,
              }))
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={handleDropOutOfRange}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Drop items
            </button>
            <button
              type="button"
              onClick={handleExpandPeriod}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Expand period
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ─── Invoice confirmation overlay ─── */}
    {showConfirmation && createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-invoice-title"
          className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <ShoppingCartIcon className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 id="confirm-invoice-title" className="text-base font-semibold text-gray-900">
                  {t('reviewYourInvoice')}
                </h3>
                <p className="text-xs text-gray-500">{t('reviewInvoiceHint')}</p>
              </div>
            </div>
          </div>

          {/* Scrollable item list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Tasks */}
            {taskCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <WrenchScrewdriverIcon className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{taskCount}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 tabular-nums">${taskSubtotal.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {Array.from(selectedTaskIds).map((id) => {
                    const task = availableTasks.find((tk) => tk.id === id)
                    const ov = taskOverrides.get(id)
                    if (!task) return null
                    return (
                      <div key={id} className="flex items-center gap-2 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{task.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {task.propertyName || task.propertyAddress || ''}{task.scheduledDate ? ` · ${formatTaskDate(task.scheduledDate)}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">${ov?.amount.toFixed(2) || '0.00'}</span>
                        <button
                          type="button"
                          onClick={() => toggleTask(id)}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Extra Charges */}
            {extraCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CurrencyDollarIcon className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('cartExtraCharges')}</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{extraCount}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 tabular-nums">${extraSubtotal.toFixed(2)}</span>
                </div>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {extraItems.map((item) => {
                    const prop = properties.find((p) => p.id === item.propertyId)
                    return (
                      <div key={item._id} className="flex items-center gap-2 px-3 py-2 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{item.description}</p>
                          <p className="text-[10px] text-gray-400">{prop?.address || ''}{item.isTaxable ? ` · ${t('taxable')}` : ''}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 tabular-nums flex-shrink-0">${item.amount.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeExtraItem(item._id)}
                          className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary + Footer */}
          <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/80">
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('subtotal')}</span>
                <span className="font-medium text-gray-900 tabular-nums">${selectedSubtotal.toFixed(2)}</span>
              </div>
              {taxHstEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{TAX_RATES.hst.label} ({TAX_RATES.hst.pct})</span>
                  <span className="text-gray-600 tabular-nums">${taxPreview.hst.toFixed(2)}</span>
                </div>
              )}
              {taxGstEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{TAX_RATES.gst.label} ({TAX_RATES.gst.pct})</span>
                  <span className="text-gray-600 tabular-nums">${taxPreview.gst.toFixed(2)}</span>
                </div>
              )}
              {taxQstEnabled && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{TAX_RATES.qst.label} ({TAX_RATES.qst.pct})</span>
                  <span className="text-gray-600 tabular-nums">${taxPreview.qst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-1 border-t border-gray-200">
                <span className="font-semibold text-gray-900">{t('total')}</span>
                <span className="font-bold text-amber-700 tabular-nums">${selectedTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t('goBack')}
              </button>
              <button
                type="button"
                onClick={() => { handleGenerate() }}
                disabled={isSubmitting || totalItemCount === 0}
                className="px-6 py-2.5 text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 font-semibold text-sm shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                {isSubmitting ? t('generatingInvoice') : t('confirmAndGenerate')}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}

export default CreateContractorInvoiceModal
