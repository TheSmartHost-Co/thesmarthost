'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Modal from '../../shared/modal'
import { createInvoice, getAvailableProjects } from '@/services/cleanerInvoiceService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { Cleaner } from '@/services/types/cleaner'
import type { CleanerInvoice, AvailableProject } from '@/services/types/cleanerInvoice'
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onCreated: (invoice: CleanerInvoice) => void
}

// Per-project overrides the cleaner can edit before generating
interface ProjectOverride {
  durationMinutes: number
  amount: number
  amountManuallySet: boolean // true if cleaner typed a custom amount directly
}

/** Get duration in minutes from a project (priority: cleaner override > property default > actual times > estimate) */
function getDurationMinutes(project: AvailableProject): number {
  if (project.cleanerPropertyDurationMinutes) {
    return project.cleanerPropertyDurationMinutes
  }
  if (project.propertyDefaultDurationMinutes) {
    return project.propertyDefaultDurationMinutes
  }
  if (project.actualStart && project.actualEnd) {
    return Math.round(
      (new Date(project.actualEnd).getTime() - new Date(project.actualStart).getTime()) / 1000 / 60
    )
  }
  return project.estimatedDurationMinutes || 0
}

/** Calculate amount from rate + duration */
function calcAmount(
  rateType: string | null | undefined,
  rateAmount: number | null | undefined,
  durationMinutes: number,
  cleanerHourlyRate?: number
): number {
  if (rateType === 'flat' && rateAmount) return rateAmount
  if (rateType === 'hourly' && rateAmount) {
    return Math.round(rateAmount * (durationMinutes / 60) * 100) / 100
  }
  if (cleanerHourlyRate) {
    return Math.round(cleanerHourlyRate * (durationMinutes / 60) * 100) / 100
  }
  return 0
}

/** Get rate label for display */
function getRateLabel(project: AvailableProject, cleanerHourlyRate?: number): string {
  if (project.propertyRateType === 'flat' && project.propertyRateAmount) {
    return `$${project.propertyRateAmount.toFixed(2)} flat`
  }
  if (project.propertyRateType === 'hourly' && project.propertyRateAmount) {
    return `$${project.propertyRateAmount.toFixed(2)}/hr`
  }
  if (cleanerHourlyRate) {
    return `$${cleanerHourlyRate.toFixed(2)}/hr (default)`
  }
  return 'No rate set'
}

function isHourlyRate(project: AvailableProject, cleanerHourlyRate?: number): boolean {
  if (project.propertyRateType === 'flat') return false
  if (project.propertyRateType === 'hourly') return true
  return !!cleanerHourlyRate // global rate is always hourly
}

function formatDurationDisplay(minutes: number): string {
  if (!minutes) return '0h 0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

function formatProjectDate(dateStr: string): string {
  const date = new Date(dateStr.split('T')[0] + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onCreated,
}) => {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [periodStart, setPeriodStart] = useState(formatDateInput(firstOfMonth))
  const [periodEnd, setPeriodEnd] = useState(formatDateInput(today))
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Map<string, ProjectOverride>>(new Map())
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Fetch projects when modal opens or dates change
  useEffect(() => {
    if (!isOpen) return

    const fetchProjects = async () => {
      if (!periodStart || !periodEnd) {
        setAvailableProjects([])
        setSelectedIds(new Set())
        setOverrides(new Map())
        return
      }

      setLoadingProjects(true)
      try {
        const res = await getAvailableProjects(cleaner.id, periodStart, periodEnd)
        if (res.status === 'success') {
          setAvailableProjects(res.data)
          setSelectedIds(new Set(res.data.map((p) => p.id)))
          // Initialize overrides with calculated defaults
          const newOverrides = new Map<string, ProjectOverride>()
          res.data.forEach((p) => {
            const dur = getDurationMinutes(p)
            newOverrides.set(p.id, {
              durationMinutes: dur,
              amount: calcAmount(p.propertyRateType, p.propertyRateAmount, dur, cleaner.hourlyRate),
              amountManuallySet: false,
            })
          })
          setOverrides(newOverrides)
        }
      } catch (err) {
        console.error('Error fetching available projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [isOpen, cleaner.id, periodStart, periodEnd])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setPeriodStart(formatDateInput(first))
      setPeriodEnd(formatDateInput(now))
      setSelectedIds(new Set())
      setOverrides(new Map())
    }
  }, [isOpen])

  // Selected totals
  const selectedTotal = useMemo(() => {
    let total = 0
    selectedIds.forEach((id) => {
      const ov = overrides.get(id)
      if (ov) total += ov.amount
    })
    return total
  }, [selectedIds, overrides])

  const selectedCount = selectedIds.size

  const toggleProject = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === availableProjects.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableProjects.map((p) => p.id)))
    }
  }

  /** Update duration for a project — accepts total minutes, auto-recalculates amount unless manually overridden */
  const handleDurationChange = (projectId: string, totalMinutes: number) => {
    const project = availableProjects.find((p) => p.id === projectId)
    if (!project) return

    setOverrides((prev) => {
      const next = new Map(prev)
      const current = next.get(projectId)
      if (current) {
        const newAmount = current.amountManuallySet
          ? current.amount
          : calcAmount(project.propertyRateType, project.propertyRateAmount, totalMinutes, cleaner.hourlyRate)
        next.set(projectId, { ...current, durationMinutes: totalMinutes, amount: newAmount })
      }
      return next
    })
  }

  /** Handle hours input change — combines with existing minutes remainder */
  const handleHoursChange = (projectId: string, value: string) => {
    const current = overrides.get(projectId)
    const currentTotal = current?.durationMinutes ?? 0
    const currentMins = currentTotal % 60
    const newHours = value.trim() ? parseInt(value) : 0
    handleDurationChange(projectId, newHours * 60 + currentMins)
  }

  /** Handle minutes input change — combines with existing hours */
  const handleMinsChange = (projectId: string, value: string) => {
    const current = overrides.get(projectId)
    const currentTotal = current?.durationMinutes ?? 0
    const currentHours = Math.floor(currentTotal / 60)
    const newMins = value.trim() ? parseInt(value) : 0
    handleDurationChange(projectId, currentHours * 60 + Math.min(newMins, 59))
  }

  /** Update amount directly — marks as manually set */
  const handleAmountChange = (projectId: string, value: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      const current = next.get(projectId)
      if (current) {
        const numVal = value.trim() ? parseFloat(value) : 0
        next.set(projectId, { ...current, amount: numVal, amountManuallySet: true })
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (selectedCount === 0) return

    setIsSubmitting(true)
    try {
      // Build overrides for projects where the cleaner edited duration or amount
      const itemOverrides: Record<string, { durationMinutes?: number; amount?: number }> = {}
      selectedIds.forEach((id) => {
        const project = availableProjects.find((p) => p.id === id)
        const override = overrides.get(id)
        if (!project || !override) return

        const defaultDuration = getDurationMinutes(project)
        const defaultAmount = calcAmount(project.propertyRateType, project.propertyRateAmount, defaultDuration, cleaner.hourlyRate)

        const hasChanges = override.durationMinutes !== defaultDuration || override.amountManuallySet
        if (hasChanges) {
          const entry: { durationMinutes?: number; amount?: number } = {}
          if (override.durationMinutes !== defaultDuration) entry.durationMinutes = override.durationMinutes
          if (override.amountManuallySet) entry.amount = override.amount
          itemOverrides[id] = entry
        }
      })

      const res = await createInvoice({
        cleanerId: cleaner.id,
        periodStart,
        periodEnd,
        projectIds: Array.from(selectedIds),
        ...(Object.keys(itemOverrides).length > 0 ? { itemOverrides } : {}),
      })

      if (res.status === 'success') {
        showNotification(
          `Invoice ${res.data.invoiceNumber} generated with ${res.data.items?.length || selectedCount} items`,
          'success'
        )
        onCreated(res.data)
      } else {
        showNotification(res.message || 'Failed to generate invoice', 'error')
      }
    } catch (err) {
      console.error('Error creating invoice:', err)
      showNotification(err instanceof Error ? err.message : 'Error generating invoice', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allSelected = availableProjects.length > 0 && selectedIds.size === availableProjects.length

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-3xl w-[95%] sm:w-11/12 max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Generate Invoice</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select a date range, review your projects, and adjust hours or amounts before generating
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'Current Month', getRange: () => {
              const now = new Date()
              return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
            }},
            { label: 'Last Month', getRange: () => {
              const now = new Date()
              return {
                start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end: new Date(now.getFullYear(), now.getMonth(), 0), // last day of previous month
              }
            }},
            { label: 'Past 2 Weeks', getRange: () => {
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
                onClick={() => {
                  setPeriodStart(formatDateInput(start))
                  setPeriodEnd(formatDateInput(end))
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Period Start</label>
            <div className="relative">
              <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Period End</label>
            <div className="relative">
              <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Projects Section */}
        {loadingProjects ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Searching for completed projects...</span>
            </div>
          </div>
        ) : availableProjects.length > 0 ? (
          <div>
            {/* Select All Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    allSelected
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  {allSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  {availableProjects.length} completed project{availableProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {selectedCount} selected
              </span>
            </div>

            {/* Column Headers (desktop) */}
            <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div className="w-5" />
              <div>Project</div>
              <div className="text-center w-20">Rate</div>
              <div className="text-center w-32">Duration</div>
              <div className="text-right w-28">Amount</div>
            </div>

            {/* Project List */}
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[320px] sm:max-h-[380px] overflow-y-auto">
              {availableProjects.map((project) => {
                const isSelected = selectedIds.has(project.id)
                const override = overrides.get(project.id)
                const hourly = isHourlyRate(project, cleaner.hourlyRate)
                const rateLabel = getRateLabel(project, cleaner.hourlyRate)

                return (
                  <div
                    key={project.id}
                    className={`transition-colors ${isSelected ? 'bg-emerald-50/50' : 'bg-white'}`}
                  >
                    {/* Desktop Layout */}
                    <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center p-3 sm:p-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleProject(project.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-gray-300 hover:border-emerald-400'
                        }`}
                      >
                        {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                      </button>

                      {/* Property + Date */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <BuildingOfficeIcon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.propertyName || project.propertyAddress || 'Unknown Property'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 ml-5">{formatProjectDate(project.projectDate)}</p>
                      </div>

                      {/* Rate (read-only) */}
                      <div className="w-20 text-center">
                        <span className="text-xs text-gray-500">{rateLabel}</span>
                      </div>

                      {/* Hours (editable for hourly — split into hrs + min) */}
                      <div className="w-32">
                        {hourly ? (
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              min="0"
                              value={override ? Math.floor(override.durationMinutes / 60) : ''}
                              onChange={(e) => handleHoursChange(project.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                            <span className="text-[10px] text-gray-400">hr</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={override ? override.durationMinutes % 60 : ''}
                              onChange={(e) => handleMinsChange(project.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                            <span className="text-[10px] text-gray-400">min</span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 text-center">—</p>
                        )}
                      </div>

                      {/* Amount (always editable) */}
                      <div className="w-28">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={override?.amount != null ? (override.amount === 0 && !override.amountManuallySet ? '' : override.amount) : ''}
                            onChange={(e) => handleAmountChange(project.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0.00"
                            className={`w-20 px-2 py-1 text-xs text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white ${
                              override?.amountManuallySet
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-gray-200'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="sm:hidden p-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleProject(project.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600'
                              : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <BuildingOfficeIcon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {project.propertyName || project.propertyAddress || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-5 mb-2">
                            <span className="text-xs text-gray-400">{formatProjectDate(project.projectDate)}</span>
                            <span className="text-xs text-gray-500">{rateLabel}</span>
                          </div>
                          {/* Editable fields row */}
                          <div className="flex items-center gap-3 ml-5 flex-wrap">
                            {hourly && (
                              <div className="flex items-center gap-1">
                                <ClockIcon className="h-3 w-3 text-gray-400" />
                                <input
                                  type="number"
                                  min="0"
                                  value={override ? Math.floor(override.durationMinutes / 60) : ''}
                                  onChange={(e) => handleHoursChange(project.id, e.target.value)}
                                  className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] text-gray-400">hr</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={override ? override.durationMinutes % 60 : ''}
                                  onChange={(e) => handleMinsChange(project.id, e.target.value)}
                                  className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] text-gray-400">min</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <CurrencyDollarIcon className="h-3 w-3 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={override?.amount != null ? (override.amount === 0 && !override.amountManuallySet ? '' : override.amount) : ''}
                                onChange={(e) => handleAmountChange(project.id, e.target.value)}
                                placeholder="0.00"
                                className={`w-20 px-1.5 py-1 text-xs text-right border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  override?.amountManuallySet
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-gray-200'
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

            <p className="text-[11px] text-gray-400 mt-2">
              Hours and amounts are pre-filled from your rates. Edit them if needed — you can also adjust everything after the invoice is generated.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <ExclamationTriangleIcon className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-xs text-gray-500 max-w-xs">
              No uninvoiced completed cleaning projects found for this date range. Try adjusting the dates.
            </p>
          </div>
        )}
      </div>

      {/* Footer with Summary */}
      <div className="border-t border-gray-200 px-5 sm:px-6 py-4">
        {selectedCount > 0 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {selectedCount} project{selectedCount !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                You can continue editing after generating
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-xs text-emerald-600">Total</p>
              <p className="text-xl font-bold text-emerald-800">${selectedTotal.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[44px] text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isSubmitting || selectedCount === 0 || loadingProjects}
            className="px-6 py-2.5 min-h-[44px] text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-semibold text-sm shadow-lg shadow-emerald-500/25"
          >
            {isSubmitting
              ? 'Generating...'
              : `Generate Invoice — $${selectedTotal.toFixed(2)}`
            }
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateInvoiceModal
