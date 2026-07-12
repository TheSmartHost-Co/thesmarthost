'use client'

import { notifyError } from '@/utils/notify'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('settings')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [permissions, setPermissions] = useState<Permissions>({ ...DEFAULT_PERMISSIONS })
  const [hourlyRate, setHourlyRate] = useState('')
  const [weeklyMaxHours, setWeeklyMaxHours] = useState('')
  const [currency, setCurrency] = useState('CAD')
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
      setHourlyRate('')
      setWeeklyMaxHours('')
      setCurrency('CAD')
      setLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification(t('teamMemberNameRequired'), 'error')
      return
    }

    if (!trimmedEmail) {
      showNotification(t('emailRequired'), 'error')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      showNotification(t('enterValidEmail'), 'error')
      return
    }

    if (!effectiveUserId) {
      showNotification(t('userProfileNotFound'), 'error')
      return
    }

    setLoading(true)

    try {
      const parseNum = (v: string): number | null => {
        const t = v.trim()
        if (!t) return null
        const n = Number(t)
        return Number.isFinite(n) && n >= 0 ? n : null
      }

      const payload: CreateTeamMemberPayload = {
        userId: effectiveUserId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        permissions,
        hourlyRate: parseNum(hourlyRate),
        weeklyMaxHours: parseNum(weeklyMaxHours),
        currency: currency.trim() || 'CAD',
      }

      const res = await createTeamMember(payload)

      if (res.status === 'success') {
        onAdd(res.data)
        showNotification(t('teamMemberInvited'), 'success')
        onClose()
      } else {
        showNotification(res.message || t('failedToCreateTeamMember'), 'error')
      }
    } catch (err) {
      console.error('Error creating team member:', err)
      notifyError(err, t('errorCreatingTeamMember'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-2xl max-h-[85vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">{t('inviteTeamMember')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('fullName')} <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder={t('fullNamePlaceholder')}
          />
        </div>

        {/* Email field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('email')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder={t('emailPlaceholder')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('invitationEmailWillBeSent')}
          </p>
        </div>

        {/* Phone field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('phoneNumber')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder={t('phonePlaceholder')}
          />
        </div>

        {/* Wage settings (Time Sheet) */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hourly rate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              placeholder="25.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weekly max hrs</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={weeklyMaxHours}
              onChange={(e) => setWeeklyMaxHours(e.target.value)}
              className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              placeholder="20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="PHP">PHP</option>
              <option value="AUD">AUD</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">All optional — set later if you don&rsquo;t know yet.</p>

        {/* Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('permissions')}
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
            {t('cancel')}
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
            {loading ? t('sendingInvite') : t('sendInvite')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateTeamMemberModal
