'use client'

import React from 'react'
import Modal from '../../shared/modal'
import type { TeamMember } from '@/services/types/teamMember'
import PermissionEditor from '@/components/team-member/permissions/PermissionEditor'
import { DEFAULT_PERMISSIONS } from '@/constants/permissionTemplates'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

interface PreviewTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember | null
}

const PreviewTeamMemberModal: React.FC<PreviewTeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  if (!member) return null

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusBadge = () => {
    switch (member.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Active
          </span>
        )
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            Invited
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Inactive
          </span>
        )
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-2xl max-h-[85vh]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">
              {member.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge()}
              <span className="text-sm text-gray-500">
                Added {formatDate(member.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Contact Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">
                {member.phone || <span className="text-gray-400">Not provided</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Information */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Activity
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Joined</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(member.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Active</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateTime(member.lastActiveAt) || (
                  <span className="text-gray-400">Never</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Permissions
        </h3>
        <PermissionEditor
          permissions={member.permissions || DEFAULT_PERMISSIONS}
          onChange={() => {}}
          readOnly={true}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default PreviewTeamMemberModal
