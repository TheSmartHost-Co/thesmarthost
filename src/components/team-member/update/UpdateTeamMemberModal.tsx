'use client'

import { notifyError } from '@/utils/notify'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('settings')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [permissions, setPermissions] = useState<Permissions>({ ...DEFAULT_PERMISSIONS })
  const [hourlyRate, setHourlyRate] = useState('')
  const [weeklyMaxHours, setWeeklyMaxHours] = useState('')
  const [currency, setCurrency] = useState('CAD')
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [loading, setLoading] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Populate form fields when modal opens or member changes
  useEffect(() => {
    if (isOpen && member) {
      setName(member.name || '')
      setPhone(member.phone || '')
      setStatus(member.status === 'inactive' ? 'inactive' : 'active')
      setPermissions(member.permissions ? { ...member.permissions } : { ...DEFAULT_PERMISSIONS })
      setHourlyRate(member.hourlyRate != null ? String(member.hourlyRate) : '')
      setWeeklyMaxHours(member.weeklyMaxHours != null ? String(member.weeklyMaxHours) : '')
      setCurrency(member.currency || 'CAD')
      setInvoicePrefix(member.invoicePrefix ?? '')
      setLoading(false)
    }
  }, [isOpen, member])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!member) return

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification(t('teamMemberNameRequired'), 'error')
      return
    }

    setLoading(true)

    try {
      // Wage fields use COALESCE on the backend, so omitting (undefined) leaves
      // them unchanged. We always send them so the PM's edits stick.
      const parseNum = (v: string): number | null => {
        const t = v.trim()
        if (!t) return null
        const n = Number(t)
        return Number.isFinite(n) && n >= 0 ? n : null
      }

      const trimmedPrefix = invoicePrefix.trim()
      const payload: UpdateTeamMemberPayload = {
        name: trimmedName,
        phone: trimmedPhone || null,
        status,
        permissions,
        hourlyRate: parseNum(hourlyRate),
        weeklyMaxHours: parseNum(weeklyMaxHours),
        currency: currency.trim() || 'CAD',
        invoicePrefix: trimmedPrefix ? trimmedPrefix.toUpperCase() : null,
      }

      const res = await updateTeamMember(member.id, payload)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification(t('teamMemberUpdated'), 'success')
        onClose()
      } else {
        showNotification(res.message || t('failedToUpdateTeamMember'), 'error')
      }
    } catch (err) {
      console.error('Error updating team member:', err)
      notifyError(err, t('errorUpdatingTeamMember'))
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-2xl max-h-[85vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">{t('editTeamMember')}</h2>

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

        {/* Email field (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('email')}
          </label>
          <input
            type="email"
            value={member.email}
            disabled
            className="w-full text-gray-500 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('emailCannotBeChangedAfterInvite')}
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

        {/* Status field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('statusLabel')}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          >
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
          {member.status === 'invited' && (
            <p className="text-xs text-amber-600 mt-1">
              {t('pendingInvitationWarning')}
            </p>
          )}
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

        {/* Paystub prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paystub number prefix
          </label>
          <input
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)}
            maxLength={8}
            className="w-full text-gray-900 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all uppercase"
            placeholder="e.g. JS"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used as the prefix in this team member&rsquo;s paystub numbers (e.g. &ldquo;JS-2026-0001&rdquo;). Leave blank to use name initials.
          </p>
        </div>

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
            {loading ? t('savingChanges') : t('saveChanges')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdateTeamMemberModal
