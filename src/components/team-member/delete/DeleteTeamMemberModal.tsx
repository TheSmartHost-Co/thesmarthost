'use client'

import { notifyError } from '@/utils/notify'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../../shared/modal'
import { deleteTeamMember } from '@/services/teamMemberService'
import type { TeamMember } from '@/services/types/teamMember'
import { useNotificationStore } from '@/store/useNotificationStore'

interface DeleteTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember | null
  onDelete: (deletedId: string) => void
}

const DeleteTeamMemberModal: React.FC<DeleteTeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onDelete,
}) => {
  const { t } = useTranslation('settings')
  const [loading, setLoading] = useState(false)
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    if (!member) return

    setLoading(true)

    try {
      const res = await deleteTeamMember(member.id)

      if (res.status === 'success') {
        showNotification(t('teamMemberRemoved'), 'success')
        onDelete(member.id)
        onClose()
      } else {
        showNotification(res.message || t('failedToDeleteTeamMember'), 'error')
      }
    } catch (err) {
      console.error('Error deleting team member:', err)
      notifyError(err, t('errorDeletingTeamMember'))
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-sm w-11/12">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">{t('removeTeamMember')}</h2>
      <p className="text-gray-900 mb-2">
        {t('confirmRemoveMember', { name: member.name })}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        {member.email}
      </p>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
        <p className="text-sm text-red-700">
          {t('removeTeamMemberWarning')}
        </p>
      </div>
      <div className="flex justify-end space-x-4">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400 cursor-pointer transition-colors disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {loading ? t('removing') : t('removeMember')}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteTeamMemberModal
