'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  WrenchScrewdriverIcon,
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { createMaintenanceTask } from '@/services/maintenanceTaskService'
import { getContractors } from '@/services/contractorService'
import SearchableSelect from '@/components/shared/SearchableSelect'
import TimeSelect from '@/components/shared/TimeSelect'
import DurationSelect from '@/components/shared/DurationSelect'
import ReservationAwareness from './ReservationAwareness'
import TaskChecklistBuilder from './TaskChecklistBuilder'
import { ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS } from '@/components/turnover/issues/issueTypeUi'
import type {
  MaintenanceTask,
  CreateMaintenanceTaskPayload,
  CreateTaskChecklistItemPayload,
  PricingType,
} from '@/services/types/maintenanceTask'
import type { ProjectIssue } from '@/services/types/projectIssue'
import type { Contractor } from '@/services/types/contractor'

export interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  issue: ProjectIssue
  onCreated: (task: MaintenanceTask) => void
}

export default function CreateTaskModal({ isOpen, onClose, issue, onCreated }: CreateTaskModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId } = usePermissions()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [scheduledEndTime, setScheduledEndTime] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [contractorId, setContractorId] = useState<string | null>(null)
  const [pricingType, setPricingType] = useState<PricingType>('flat')
  const [offeredAmount, setOfferedAmount] = useState('')
  const [pmNotes, setPmNotes] = useState('')
  const [checklistItems, setChecklistItems] = useState<CreateTaskChecklistItemPayload[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loadingContractors, setLoadingContractors] = useState(false)

  const contractorOptions = useMemo(
    () =>
      contractors.map((contractor) => ({
        value: contractor.id,
        label: contractor.name,
        secondaryLabel: contractor.trade || contractor.email || contractor.phone || undefined,
      })),
    [contractors]
  )

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setScheduledDate('')
      setScheduledStartTime('')
      setScheduledEndTime('')
      setEstimatedDuration('')
      setContractorId(null)
      setPricingType('flat')
      setOfferedAmount('')
      setPmNotes('')
      setChecklistItems([])
    }
  }, [isOpen])

  // Fetch contractors when modal opens
  useEffect(() => {
    const fetchContractors = async () => {
      if (!isOpen || !effectiveUserId) return
      setLoadingContractors(true)
      try {
        const res = await getContractors(effectiveUserId)
        if (res.status === 'success') {
          setContractors(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch contractors:', err)
      } finally {
        setLoadingContractors(false)
      }
    }

    fetchContractors()
  }, [isOpen, effectiveUserId])

  const IssueIcon = ISSUE_TYPE_ICONS[issue.issueType]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showNotification(t('pleaseEnterTaskTitle'), 'error')
      return
    }

    setLoading(true)

    try {
      const payload: CreateMaintenanceTaskPayload = {
        issueId: issue.id,
        title: title.trim(),
      }

      // Optional fields — only attach truthy values
      if (description.trim()) payload.description = description.trim()
      if (scheduledDate) payload.scheduledDate = scheduledDate
      if (scheduledStartTime) payload.scheduledStartTime = scheduledStartTime
      if (scheduledEndTime) payload.scheduledEndTime = scheduledEndTime
      if (estimatedDuration) payload.estimatedDurationMinutes = parseInt(estimatedDuration, 10)
      if (contractorId) payload.contractorId = contractorId
      if (contractorId && offeredAmount && parseFloat(offeredAmount) > 0) {
        payload.pricingType = pricingType
        payload.offeredAmount = parseFloat(offeredAmount)
      }
      if (pmNotes.trim()) payload.pmNotes = pmNotes.trim()
      const nonEmptyChecklistItems = checklistItems
        .map((item) => ({ ...item, description: item.description.trim() }))
        .filter((item) => item.description)
      if (nonEmptyChecklistItems.length > 0) payload.checklistItems = nonEmptyChecklistItems

      const res = await createMaintenanceTask(payload)

      if (res.status === 'success') {
        showNotification(t('taskCreated'), 'success')
        onCreated(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToCreateTask'), 'error')
      }
    } catch (err) {
      console.error('Error creating task:', err)
      showNotification(err instanceof Error ? err.message : t('failedToCreateTask'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('createTaskTitle')}</h2>
                <p className="text-sm text-gray-500">{t('createTaskSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Locked Property */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <HomeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('property')}
                </label>
                <input
                  type="text"
                  value={issue.propertyName || t('notSet')}
                  disabled
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Linked Issue Summary */}
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${ISSUE_TYPE_COLORS[issue.issueType]}`}>
                <IssueIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    {t('linkedIssue')}
                  </p>
                  <p className="text-sm mt-0.5 line-clamp-2 break-words">{issue.description}</p>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <WrenchScrewdriverIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('taskTitleLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('taskTitlePlaceholder')}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <DocumentTextIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('description')} <span className="text-gray-400">({t('optional')})</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('taskDescriptionPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <CalendarDaysIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('taskDateLabel')} <span className="text-gray-400">({t('optional')})</span>
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {/* Reservation awareness */}
                <div className="mt-3">
                  <ReservationAwareness
                    propertyId={issue.propertyId}
                    date={scheduledDate}
                    onSelectDate={setScheduledDate}
                  />
                </div>
              </div>

              {/* Time Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <ClockIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('startTime')}
                  </label>
                  <TimeSelect
                    value={scheduledStartTime}
                    onChange={setScheduledStartTime}
                    placeholder="Start time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <ClockIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('endTime')}
                  </label>
                  <TimeSelect
                    value={scheduledEndTime}
                    onChange={setScheduledEndTime}
                    placeholder="End time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <ClockIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('estimatedDurationLabel')}
                  </label>
                  <DurationSelect
                    value={estimatedDuration}
                    onChange={setEstimatedDuration}
                    placeholder="Duration"
                  />
                </div>
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <UserIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('assignContractor')} <span className="text-gray-400">({t('optional')})</span>
                </label>
                <SearchableSelect
                  options={contractorOptions}
                  value={contractorId}
                  onChange={setContractorId}
                  placeholder={t('unassigned')}
                  loading={loadingContractors}
                  emptyText={t('noContractorsFound')}
                  clearable
                />
              </div>

              {/* Pricing — only when a contractor is selected */}
              {contractorId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 border border-gray-100 rounded-xl p-4"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CurrencyDollarIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('openingOfferLabel')} <span className="text-gray-400">({t('optional')})</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPricingType('flat')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                          pricingType === 'flat'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t('pricingFlat')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPricingType('hourly')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                          pricingType === 'hourly'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t('pricingHourly')}
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={offeredAmount}
                        onChange={(e) => setOfferedAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Checklist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('checklistLabel')} <span className="text-gray-400">({t('optional')})</span>
                </label>
                <TaskChecklistBuilder items={checklistItems} onChange={setChecklistItems} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <DocumentTextIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {t('pmNotesLabel')}
                </label>
                <textarea
                  value={pmNotes}
                  onChange={(e) => setPmNotes(e.target.value)}
                  placeholder={t('taskPmNotesPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <WrenchScrewdriverIcon className="w-4 h-4" />
                    {t('createTaskButton')}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
