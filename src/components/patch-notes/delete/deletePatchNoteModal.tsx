'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { deletePatchNote } from '@/services/patchNoteService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { PatchNote } from '@/services/types/patchNote'

interface DeletePatchNoteModalProps {
  isOpen: boolean
  note: PatchNote
  onClose: () => void
  onDeleted: () => void
}

const DeletePatchNoteModal: React.FC<DeletePatchNoteModalProps> = ({
  isOpen,
  note,
  onClose,
  onDeleted,
}) => {
  const { t } = useTranslation('common')
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const res = await deletePatchNote(note.id)

      if (res.status === 'success') {
        showNotification('Patch note deleted successfully', 'success')
        onDeleted()
      } else {
        showNotification(res.message || 'Failed to delete patch note', 'error')
      }
    } catch (err) {
      console.error('Error deleting patch note:', err)
      const message =
        err instanceof Error ? err.message : 'Error deleting patch note'
      showNotification(message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {t('deletePatchNote')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('confirmDeletePatchNote', { title: note.title })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="cursor-pointer px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDeleting ? t('deleting') : t('delete')}
        </button>
      </div>
    </Modal>
  )
}

export default DeletePatchNoteModal
