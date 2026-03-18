'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createTeamMember } from '@/services/teamMemberService'
import type { TeamMember, CreateTeamMemberPayload } from '@/services/types/teamMember'
import { DEFAULT_PERMISSIONS, type Permissions } from '@/constants/permissionTemplates'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import PermissionEditor from '@/components/team-member/permissions/PermissionEditor'

interface CreateTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newMember: TeamMember) => void
}

const CreateTeamMemberModal: React.FC<CreateTeamMemberModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [permissions, setPermissions] = useState<Permissions>({ ...DEFAULT_PERMISSIONS })
  const [loading, setLoading] = useState(false)

  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setEmail('')
      setPhone('')
      setPermissions({ ...DEFAULT_PERMISSIONS })
      setLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification('Team member name is required', 'error')
      return
    }

    if (!trimmedEmail) {
      showNotification('Email is required', 'error')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      showNotification('Please enter a valid email address', 'error')
      return
    }

    if (!effectiveUserId) {
      showNotification('User profile not found', 'error')
      return
    }

    setLoading(true)

    try {
      const payload: CreateTeamMemberPayload = {
        userId: effectiveUserId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        permissions,
      }

      const res = await createTeamMember(payload)

      if (res.status === 'success') {
        onAdd(res.data)
        showNotification('Team member invited successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to create team member', 'error')
      }
    } catch (err) {
      console.error('Error creating team member:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error creating team member',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-2xl max-h-[85vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Invite Team Member</h2>

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

        {/* Email field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder="e.g. jane@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            An invitation email will be sent to this address
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
            {loading ? 'Sending Invite...' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateTeamMemberModal
