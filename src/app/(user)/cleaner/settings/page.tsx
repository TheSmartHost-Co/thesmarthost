'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UserIcon,
  Cog6ToothIcon,
  PencilIcon,
  XMarkIcon,
  BellIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateUserProfile } from '@/services/profileService'
import { getCleanerByAuthUserId, updateCleaner } from '@/services/cleanerService'
import type { Cleaner } from '@/services/types/cleaner'
import { useTranslation } from 'react-i18next'
import { TAX_RATES } from '@/constants/taxRates'
import LanguageSelector from '@/components/shared/LanguageSelector'
import LanguagePromptBanner from '@/components/shared/LanguagePromptBanner'
import NotificationPreferencesMatrix from '@/components/settings/NotificationPreferencesMatrix'

export default function CleanerSettingsPage() {
  const { t } = useTranslation('settings')
  // A PM viewing as this user must not be able to edit their settings —
  // the app never swaps identity, so writes would target the PM's own row.
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleaner data
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)

  // Profile editing state
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
  })

  // Invoice settings state
  const [showInvoiceEdit, setShowInvoiceEdit] = useState(false)
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [taxHstEnabled, setTaxHstEnabled] = useState(false)
  const [taxGstEnabled, setTaxGstEnabled] = useState(false)
  const [taxQstEnabled, setTaxQstEnabled] = useState(false)
  const [savingInvoice, setSavingInvoice] = useState(false)

  // Notification preferences state

  const { profile, setProfile } = useUserStore()
  const { showNotification } = useNotificationStore()

  
  // Fetch cleaner data on mount
  useEffect(() => {
    const fetchCleanerData = async () => {
      if (!profile?.id) return

      setLoading(true)
      setError(null)

      try {
        const cleanerRes = await getCleanerByAuthUserId(profile.id)
        if (cleanerRes.status === 'success' && cleanerRes.data) {
          setCleaner(cleanerRes.data)
          // Initialize form with cleaner data
          setProfileData({
            fullName: cleanerRes.data.name || profile.fullName || '',
            email: cleanerRes.data.email || profile.email || '',
            phone: cleanerRes.data.phone || '',
          })
          // Initialize invoice settings
          setInvoicePrefix(cleanerRes.data.invoicePrefix || '')
          setBusinessName(profile.companyName || '')
          setTaxHstEnabled(cleanerRes.data.taxHstEnabled || false)
          setTaxGstEnabled(cleanerRes.data.taxGstEnabled || false)
          setTaxQstEnabled(cleanerRes.data.taxQstEnabled || false)
        } else {
          // Fallback to profile data if no cleaner record
          setProfileData({
            fullName: profile.fullName || '',
            email: profile.email || '',
            phone: profile.phoneNumber || '',
          })
        }
      } catch (err) {
        console.error('Error fetching cleaner data:', err)
        setError(t('failedToUpdate'))
      } finally {
        setLoading(false)
      }
    }

    fetchCleanerData()
  }, [profile?.id, profile?.fullName, profile?.email, profile?.phoneNumber])

  const handleProfileSave = async () => {
    if (!profile?.id) return

    // Validate required fields
    if (!profileData.fullName.trim()) {
      showNotification(t('fullNameRequired'), 'error')
      return
    }

    try {
      setSaving(true)

      // Update profile in profiles table
      const profileResponse = await updateUserProfile(profile.id, {
        fullName: profileData.fullName,
        phoneNumber: profileData.phone || null,
        smsNotificationsEnabled: profile.smsNotificationsEnabled ?? true,
        emailNotificationsEnabled: profile.emailNotificationsEnabled ?? true,
      })

      if (profileResponse.status !== 'success') {
        showNotification(profileResponse.message || t('failedToUpdate'), 'error')
        return
      }

      // Also update cleaner record if it exists
      if (cleaner?.id) {
        const cleanerResponse = await updateCleaner(cleaner.id, {
          name: profileData.fullName,
          phone: profileData.phone || null,
        })

        if (cleanerResponse.status === 'success' && cleanerResponse.data) {
          setCleaner(cleanerResponse.data)
        }
      }

      // Update the store with new profile data
      setProfile({
        ...profile,
        fullName: profileData.fullName,
        phoneNumber: profileData.phone || null,
      })

      showNotification(t('profileUpdated'), 'success')
      setShowProfileEdit(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      showNotification(t('failedToUpdate'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInvoiceSettingsSave = async () => {
    if (!profile?.id || !cleaner?.id) return

    try {
      setSavingInvoice(true)

      // Update business name on profile (company_name)
      const profileResponse = await updateUserProfile(profile.id, {
        fullName: profile.fullName,
        companyName: businessName.trim() || null,
        smsNotificationsEnabled: profile.smsNotificationsEnabled ?? true,
        emailNotificationsEnabled: profile.emailNotificationsEnabled ?? true,
      })

      if (profileResponse.status !== 'success') {
        showNotification(profileResponse.message || t('failedToUpdate'), 'error')
        return
      }

      // Update invoice prefix and tax defaults on cleaner record
      const cleanerResponse = await updateCleaner(cleaner.id, {
        name: cleaner.name,
        invoicePrefix: invoicePrefix.trim() || null,
        taxHstEnabled,
        taxGstEnabled,
        taxQstEnabled,
      })

      if (cleanerResponse.status === 'success' && cleanerResponse.data) {
        setCleaner(cleanerResponse.data)
      }

      // Update profile store
      setProfile({
        ...profile,
        companyName: businessName.trim() || null,
      })

      showNotification(t('invoiceSettingsSaved'), 'success')
      setShowInvoiceEdit(false)
    } catch (err) {
      console.error('Error saving invoice settings:', err)
      showNotification(t('failedToSaveInvoiceSettings'), 'error')
    } finally {
      setSavingInvoice(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 animate-pulse" />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-48 animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('manageAccountPreferences')}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingSettings')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">{t('manageAccountPreferences')}</p>
      </div>

      {/* Language Prompt Banner */}
      <LanguagePromptBanner />

      {isImpersonating && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {t('settingsReadOnlyImpersonating')}
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Notification Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('notifications')}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{t('notificationsDescCleaner')}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              

              

            </div>
          </div>

          {/* Per-event x per-channel matrix. The master switches above still win. */}
          <div className="border-t border-gray-100">
            <NotificationPreferencesMatrix simple />
          </div>
        </motion.div>

        {/* Profile Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
                  <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('profileSettings')}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{t('updatePersonalInfo')}</p>
                </div>
              </div>
              <motion.button
                onClick={() => setShowProfileEdit(!showProfileEdit)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center min-h-[44px] px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer flex-shrink-0"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {showProfileEdit ? t('cancel') : t('edit')}
              </motion.button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {!showProfileEdit ? (
              // View Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('nameLabel')}
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner?.name || profile?.fullName || t('notSet')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('email')}
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner?.email || profile?.email || t('notSet')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('phone')}
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner?.phone || profile?.phoneNumber || t('notSet')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('roleLabel')}
                  </label>
                  <p className="text-gray-900 font-medium">{t('roleCleaner')}</p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('fullName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder={t('enterFullName')}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                      placeholder={t('enterEmail')}
                      disabled
                      title={t('emailCannotBeChanged')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('phone')}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder={t('enterPhone')}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <motion.button
                    onClick={() => setShowProfileEdit(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                    disabled={saving || isImpersonating}
                  >
                    {t('cancel')}
                  </motion.button>
                  <motion.button
                    onClick={handleProfileSave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-white bg-purple-600 rounded-xl font-medium hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={saving || isImpersonating}
                  >
                    {saving ? t('savingChanges') : t('saveChanges')}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Language Preference */}
        <LanguageSelector delay={0.15} />


        {/* Invoice Settings Section */}
        {cleaner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
                    <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('invoiceSettings')}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{t('invoiceSettingsDesc')}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => {
                    if (showInvoiceEdit) {
                      // Reset to saved values
                      setInvoicePrefix(cleaner.invoicePrefix || '')
                      setBusinessName(profile?.companyName || '')
                      setTaxHstEnabled(cleaner.taxHstEnabled || false)
                      setTaxGstEnabled(cleaner.taxGstEnabled || false)
                      setTaxQstEnabled(cleaner.taxQstEnabled || false)
                    }
                    setShowInvoiceEdit(!showInvoiceEdit)
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center min-h-[44px] px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer flex-shrink-0"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {showInvoiceEdit ? t('cancel') : t('edit')}
                </motion.button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {!showInvoiceEdit ? (
                // View Mode
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      {t('businessNameLabel')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {profile?.companyName || t('notSet')}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      {t('invoicePrefixLabel')}
                    </label>
                    <p className="text-gray-900 font-medium">
                      {cleaner.invoicePrefix || t('autoFromInitials')}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      {t('defaultTaxes')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { key: 'hst' as const, enabled: cleaner.taxHstEnabled },
                        { key: 'gst' as const, enabled: cleaner.taxGstEnabled },
                        { key: 'qst' as const, enabled: cleaner.taxQstEnabled },
                      ]).map(({ key, enabled }) => (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            enabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {enabled && <CheckIcon className="h-3 w-3" />}
                          {TAX_RATES[key].label} ({TAX_RATES[key].pct})
                          {!enabled && ` — ${t('off')}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('businessNameLabel')}
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder={t('businessNamePlaceholder')}
                      />
                      <p className="text-xs text-gray-400 mt-1">{t('businessNameHint')}</p>
                    </div>
                    <div>
                      <label htmlFor="invoicePrefix" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('invoicePrefixLabel')}
                      </label>
                      <input
                        type="text"
                        id="invoicePrefix"
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder={t('invoicePrefixPlaceholder')}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {t('invoiceNumberPreview', { prefix: invoicePrefix || `(${t('initials')})`, year: new Date().getFullYear() })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('defaultTaxes')}
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                      {t('defaultTaxesHint')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {([
                        { key: 'hst' as const, enabled: taxHstEnabled, setter: setTaxHstEnabled },
                        { key: 'gst' as const, enabled: taxGstEnabled, setter: setTaxGstEnabled },
                        { key: 'qst' as const, enabled: taxQstEnabled, setter: setTaxQstEnabled },
                      ]).map(({ key, enabled, setter }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setter(!enabled)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border cursor-pointer ${
                            enabled
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            enabled ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                          }`}>
                            {enabled && <CheckIcon className="h-3 w-3 text-white" />}
                          </div>
                          {TAX_RATES[key].label} ({TAX_RATES[key].pct})
                          <span className="text-xs text-gray-400">{TAX_RATES[key].description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <motion.button
                      onClick={() => setShowInvoiceEdit(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                      disabled={savingInvoice || isImpersonating}
                    >
                      {t('cancel')}
                    </motion.button>
                    <motion.button
                      onClick={handleInvoiceSettingsSave}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 text-white bg-emerald-600 rounded-xl font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={savingInvoice || isImpersonating}
                    >
                      {savingInvoice ? t('savingChanges') : t('saveInvoiceSettings')}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Work Info Section (read-only) */}
        {cleaner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25 flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('workInformation')}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{t('managedByPM')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('hourlyRateLabel')}
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner.hourlyRate ? `$${cleaner.hourlyRate.toFixed(2)}/hr` : t('notSet')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('defaultTurnaroundLabel')}
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner.defaultTurnaroundMinutes
                      ? `${Math.floor(cleaner.defaultTurnaroundMinutes / 60)}h ${cleaner.defaultTurnaroundMinutes % 60}m`
                      : t('notSet')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('statusLabel')}
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    cleaner.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : cleaner.status === 'invited'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cleaner.status === 'active' ? t('active') : cleaner.status === 'invited' ? t('invited') : t('inactive')}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('assignedPropertiesLabel')}
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner.assignedProperties?.length || 0} {t('propertiesUnit')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                {t('contactPMToUpdate')}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
