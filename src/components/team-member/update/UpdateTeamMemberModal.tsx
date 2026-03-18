'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { updateTeamMember } from '@/services/teamMemberService'
import type { TeamMember, UpdateTeamMemberPayload } from '@/services/types/teamMember'
import type { Permissions } from '@/constants/permissionTemplates'
import { DEFAULT_PERMISSIONS } from '@/constants/permissionTemplates'
import { useNotificationStore } from '@/store/useNotificationStore'
import PermissionEditor from '@/components/team-member/permissions/PermissionEditor'

interface UpdateTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember | null
  onUpdate: (updatedMember: TeamMember) => void
}

const UpdateTeamMemberModal: React.FC<UpdateTeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onUpdate,
}) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [permissions, setPermissions] = useState<Permissions>({ ...DEFAULT_PERMISSIONS })
  const [loading, setLoading] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Populate form fields when modal opens or member changes
  useEffect(() => {
    if (isOpen && member) {
      setName(member.name || '')
      setPhone(member.phone || '')
      setStatus(member.status === 'inactive' ? 'inactive' : 'active')
      setPermissions(member.permissions ? { ...member.permissions } : { ...DEFAULT_PERMISSIONS })
      setLoading(false)
    }
  }, [isOpen, member])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!member) return

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification('Team member name is required', 'error')
      return
    }

    setLoading(true)

    try {
      const payload: UpdateTeamMemberPayload = {
        name: trimmedName,
        phone: trimmedPhone || null,
        status,
        permissions,
      }

      const res = await updateTeamMember(member.id, payload)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('Team member updated successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to update team member', 'error')
      }
    } catch (err) {
      console.error('Error updating team member:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error updating team member',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-2xl max-h-[85vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Edit Team Member</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder="e.g. Jane Smith"
          />
        </div>

        {/* Email field (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={member.email}
            disabled
            className="w-full text-gray-500 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email cannot be changed after invitation
          </p>
        </div>

        {/* Phone field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder="e.g. (555) 123-4567"
          />
        </div>

        {/* Status field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {member.status === 'invited' && (
            <p className="text-xs text-amber-600 mt-1">
              This member has a pending invitation. Changing status will override the invite status.
            </p>
          )}
        </div>

        {/* Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Permissions
          </label>
          <PermissionEditor
            permissions={permissions}
            onChange={setPermissions}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 cursor-pointer bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdateTeamMemberModal
