'use client'

import { notifyError } from '@/utils/notify'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateUserProfile } from '@/services/profileService'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '@/components/shared/LanguageSelector'
import LanguagePromptBanner from '@/components/shared/LanguagePromptBanner'

export default function ClientSettingsPage() {
  const { t } = useTranslation('settings')
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '')
      setPhone(profile.phoneNumber || '')
      setSmsEnabled(profile.smsNotificationsEnabled ?? false)
      setEmailEnabled(profile.emailNotificationsEnabled ?? false)
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const res = await updateUserProfile(profile.id, {
        fullName,
        role: profile.role,
        phoneNumber: phone || null,
        smsNotificationsEnabled: smsEnabled,
        emailNotificationsEnabled: emailEnabled,
      })
      if (res.status === 'success' && res.data) {
        setProfile({
          ...profile,
          fullName: res.data.fullName,
          phoneNumber: res.data.phoneNumber,
          smsNotificationsEnabled: res.data.smsNotificationsEnabled,
          emailNotificationsEnabled: res.data.emailNotificationsEnabled,
        })
        showNotification(t('settingsUpdated'), 'success')
      } else {
        showNotification(res.message || t('failedToUpdate'), 'error')
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      notifyError(err, 'Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('manageProfileAndNotifications')}</p>
      </div>

      {/* Language Prompt Banner */}
      <LanguagePromptBanner />

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserCircleIcon className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">{t('profile')}</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              value={profile.email || ''}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Language Preference */}
      <LanguageSelector delay={0.05} />

      {/* Notification Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">{t('notifications')}</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* SMS Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('smsNotifications')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('smsDescriptionClient')}</p>
            </div>
            <button
              type="button"
              onClick={() => setSmsEnabled(!smsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${smsEnabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${smsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Email Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('emailNotifications')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('emailDescriptionClient')}</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emailEnabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {saving && (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {t('saveChanges')}
        </button>
      </motion.div>
    </div>
  )
}
