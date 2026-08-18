'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { cancelTask } from '@/services/maintenanceTaskService'
import type { MaintenanceTask } from '@/services/types/maintenanceTask'

export interface CancelTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: MaintenanceTask
  onCancelled: (task: MaintenanceTask) => void
}

export default function CancelTaskModal({ isOpen, onClose, task, onCancelled }: CancelTaskModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setLoading(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await cancelTask(task.id, reason.trim() || undefined)
      if (res.status === 'success') {
        showNotification(t('taskCancelled'), 'success')
        onCancelled({ ...task, ...res.data })
        onClose()
      } else {
        showNotification(res.message || t('failedToCancelTask'), 'error')
      }
    } catch (err) {
      console.error('Error cancelling task:', err)
      showNotification(err instanceof Error ? err.message : t('failedToCancelTask'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={!loading} zIndex={70} style="p-6 max-w-md w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
          <XCircleIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('cancelTaskTitle')}</h2>
          <p className="text-sm text-gray-500">{task.title}</p>
        </div>
      </div>

      {/* Warning: the linked issue reopens */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{t('cancelTaskWarning')}</p>
      </div>

      {/* Optional reason */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('cancelTaskReasonLabel')} <span className="text-gray-400">({t('optional')})</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('cancelTaskReasonPlaceholder')}
          rows={3}
          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
        >
          {t('keepTask')}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('cancellingTask')}
            </>
          ) : (
            <>
              <XCircleIcon className="w-4 h-4" />
              {t('confirmCancelTask')}
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}
