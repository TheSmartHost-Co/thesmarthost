'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../../shared/modal'
import { deleteCleaningProject } from '@/services/cleaningProjectService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { CleaningProject } from '@/services/types/cleaningProject'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: CleaningProject
  onDeleted: (id: string) => void
}

const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onDeleted,
}) => {
  const { t } = useTranslation('turnover')
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const projectLabel = `${project.propertyName} on ${project.projectDate}`

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteCleaningProject(project.id)
      if (res.status === 'success') {
        showNotification(t('projectDeleted'), 'success')
        onDeleted(project.id)
        onClose()
      } else {
        showNotification(res.message || t('errorLoadingData'), 'error')
      }
    } catch (err) {
      showNotification(t('errorLoadingData'), 'error')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('deleteCleaningProject')}</h2>
          <p className="text-gray-600 mt-2">
            {t('confirmDeleteProject')} <strong>{projectLabel}</strong>?
          </p>
          {project.cleanerName && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>{t('warning')}:</strong> {t('warningCleanerAssigned', { name: project.cleanerName })}
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-3">
            {t('actionCannotBeUndone')}
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors disabled:opacity-50"
        >
          {isDeleting ? t('deleting') : t('deleteProject')}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteProjectModal
