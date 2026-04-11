'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import TimeSelect, { roundToNearest15 } from '@/components/shared/TimeSelect'
import { submitTimeChangeRequest } from '@/services/timeChangeRequestService'
import { formatTime } from '@/services/cleaningProjectService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ClockIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { CleaningProject } from '@/services/types/cleaningProject'

interface RequestTimeChangeModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  cleanerId: string
  onSubmitted: () => void
}

export default function RequestTimeChangeModal({
  isOpen,
  onClose,
  project,
  cleanerId,
  onSubmitted,
}: RequestTimeChangeModalProps) {
  const { t } = useTranslation('cleanerPortal')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [projectDate, setProjectDate] = useState('')
  const [projectStartTime, setProjectStartTime] = useState('')
  const [projectEndTime, setProjectEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const dateStr = project.projectDate.split('T')[0]
      setProjectDate(dateStr)
      setProjectStartTime(project.projectStartTime ? roundToNearest15(project.projectStartTime) : '')
      setProjectEndTime(project.projectEndTime ? roundToNearest15(project.projectEndTime) : '')
      setReason('')
      setLoading(false)
      setValidationErrors([])
    }
  }, [isOpen, project])

  const handleSubmit = async () => {
    if (!projectDate) {
      showNotification(t('pleaseSelectDate'), 'error')
      return
    }

    // Validate against booking boundaries
    const errors: string[] = []

    if (projectStartTime && projectEndTime && projectStartTime >= projectEndTime) {
      errors.push(t('startBeforeEnd'))
    }

    const prevCheckOut = project.previousBookingCheckOut?.split('T')[0]
    const nextCheckIn = project.nextBookingCheckIn?.split('T')[0]

    if (prevCheckOut && projectDate < prevCheckOut) {
      errors.push(t('dateBeforeCheckout', { date: prevCheckOut }))
    }

    if (nextCheckIn && projectDate > nextCheckIn) {
      errors.push(t('dateAfterCheckin', { date: nextCheckIn }))
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setLoading(true)
    try {
      const res = await submitTimeChangeRequest(project.id, {
        cleanerId,
        requestedProjectDate: projectDate,
        requestedProjectStartTime: projectStartTime || null,
        requestedProjectEndTime: projectEndTime || null,
        reason: reason.trim() || undefined,
      })

      if (res.status === 'success') {
        showNotification(t('requestSubmitted'), 'success')
        onSubmitted()
        onClose()
      } else {
        showNotification(res.message || t('failedToSubmit'), 'error')
      }
    } catch (err) {
      console.error('Error submitting time change request:', err)
      showNotification(
        err instanceof Error ? err.message : t('failedToSubmit'),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={!loading}>
      <div className="p-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('requestTimeChangeTitle')}</h2>
            <p className="text-sm text-gray-500">{project.propertyName}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('date')}
            </label>
            <input
              type="date"
              value={projectDate}
              onChange={(e) => setProjectDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('current')}: {project.projectDate.split('T')[0]}
            </p>
          </div>

          {/* Checkout Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('startTime')}
            </label>
            <TimeSelect
              value={projectStartTime}
              onChange={setProjectStartTime}
              placeholder="Select checkout time"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('current')}: {formatTime(project.projectStartTime) || t('notSet')}
            </p>
          </div>

          {/* Checkin Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('endTime')}
            </label>
            <TimeSelect
              value={projectEndTime}
              onChange={setProjectEndTime}
              placeholder="Select check-in time"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('current')}: {formatTime(project.projectEndTime) || t('notSet')}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('reason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('whyNeedChange')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            />
          </div>

          {/* Booking constraints info */}
          {(project.previousBookingCheckOut || project.nextBookingCheckIn) && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">{t('bookingWindow')}</p>
                {project.previousBookingCheckOut && (
                  <p>{t('departingGuestCheckout', { date: project.previousBookingCheckOut.split('T')[0] })}</p>
                )}
                {project.nextBookingCheckIn && (
                  <p>{t('arrivingGuestCheckin', { date: project.nextBookingCheckIn.split('T')[0] })}</p>
                )}
              </div>
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !projectDate}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer
              ${loading || !projectDate
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-amber-500 text-white hover:bg-amber-600'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('submittingRequest')}
              </>
            ) : (
              t('submitRequest')
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
