'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  PencilSquareIcon,
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateMaintenanceTask } from '@/services/maintenanceTaskService'
import TimeSelect, { roundToNearest15 } from '@/components/shared/TimeSelect'
import DurationSelect, { roundDurationToNearest15 } from '@/components/shared/DurationSelect'
import ReservationAwareness from './ReservationAwareness'
import type { MaintenanceTask, UpdateMaintenanceTaskPayload } from '@/services/types/maintenanceTask'

export interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: MaintenanceTask
  onUpdated: (task: MaintenanceTask) => void
}

export default function EditTaskModal({ isOpen, onClose, task, onUpdated }: EditTaskModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [scheduledEndTime, setScheduledEndTime] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [pmNotes, setPmNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)

  // Pre-populate form when modal opens
  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setScheduledDate(task.scheduledDate ? task.scheduledDate.split('T')[0] : '')
      setScheduledStartTime(task.scheduledStartTime ? roundToNearest15(task.scheduledStartTime.substring(0, 5)) : '')
      setScheduledEndTime(task.scheduledEndTime ? roundToNearest15(task.scheduledEndTime.substring(0, 5)) : '')
      setEstimatedDuration(task.estimatedDurationMinutes ? roundDurationToNearest15(task.estimatedDurationMinutes) : '')
      setPmNotes(task.pmNotes || '')
    }
  }, [isOpen, task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showNotification(t('pleaseEnterTaskTitle'), 'error')
      return
    }

    setLoading(true)

    try {
      const payload: UpdateMaintenanceTaskPayload = {
        title: title.trim(),
      }

      // Optional fields — only attach truthy values
      if (description.trim()) payload.description = description.trim()
      if (scheduledDate) payload.scheduledDate = scheduledDate
      if (scheduledStartTime) payload.scheduledStartTime = scheduledStartTime
      if (scheduledEndTime) payload.scheduledEndTime = scheduledEndTime
      if (estimatedDuration) payload.estimatedDurationMinutes = parseInt(estimatedDuration, 10)
      if (pmNotes.trim()) payload.pmNotes = pmNotes.trim()

      const res = await updateMaintenanceTask(task.id, payload)

      if (res.status === 'success') {
        showNotification(t('taskUpdated'), 'success')
        onUpdated({ ...task, ...res.data })
        onClose()
      } else {
        showNotification(res.message || t('failedToUpdateTask'), 'error')
      }
    } catch (err) {
      console.error('Error updating task:', err)
      showNotification(err instanceof Error ? err.message : t('failedToUpdateTask'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <PencilSquareIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('editTaskTitle')}</h2>
                <p className="text-sm text-gray-500">{t('editTaskSubtitle')}</p>
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
                  value={task.propertyName || t('notSet')}
                  disabled
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                />
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
                    propertyId={task.propertyId}
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
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    {t('saveChanges')}
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
