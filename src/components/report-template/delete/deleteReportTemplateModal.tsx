'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteReportTemplate } from '@/services/reportTemplateService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import type { ReportTemplate } from '@/services/types/reportTemplate'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteReportTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  template: ReportTemplate | null
  onDeleted: () => void
}

const DeleteReportTemplateModal: React.FC<DeleteReportTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    if (!template || !profile?.id) return

    setIsDeleting(true)

    try {
      const res = await deleteReportTemplate(template.id, profile.id)
      if (res.status === 'success') {
        showNotification('Template deleted successfully', 'success')
        onDeleted()
      } else {
        showNotification(res.message || 'Failed to delete template', 'error')
      }
    } catch (err) {
      console.error('Error deleting template:', err)
      showNotification('Error deleting template', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!template) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Delete Template</h2>
          <p className="text-gray-600 mt-2">
            Are you sure you want to delete <strong className="text-gray-900">{template.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone. All sections and fields within this template will be
            permanently removed. Properties assigned to this template will no longer have it available.
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isDeleting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          Delete Template
        </button>
      </div>
    </Modal>
  )
}

export default DeleteReportTemplateModal
