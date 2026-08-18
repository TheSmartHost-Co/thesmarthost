'use client'

import React, { useState } from 'react'
import Modal from '../../shared/modal'
import { deleteContractor } from '@/services/contractorService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Contractor } from '@/services/types/contractor'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteContractorModalProps {
  isOpen: boolean
  onClose: () => void
  contractor: Contractor
  onDeleted: (id: string) => void
}

const DeleteContractorModal: React.FC<DeleteContractorModalProps> = ({
  isOpen,
  onClose,
  contractor,
  onDeleted,
}) => {
  const { t } = useTranslation('turnover')
  const [isDeleting, setIsDeleting] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteContractor(contractor.id)
      if (res.status === 'success') {
        showNotification(t('contractorDeleted'), 'success')
        onDeleted(contractor.id)
        onClose()
      } else {
        // Backend returns a specific message (e.g. contractor has submitted invoices)
        showNotification(res.message || t('failedToDeleteContractor'), 'error')
      }
    } catch (err) {
      showNotification(t('errorDeletingContractor'), 'error')
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
          <h2 className="text-lg font-semibold text-gray-900">{t('deleteContractorTitle')}</h2>
          <p className="text-gray-600 mt-2">
            {t('confirmDeleteContractorNamed', { name: contractor.name })}
          </p>
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
          {isDeleting ? t('deletingContractor') : t('deleteContractorButton')}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteContractorModal
