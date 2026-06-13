"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UserIcon,
  Cog6ToothIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { updateUserProfile } from '@/services/profileService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getConnectionByUserId, disconnectHostaway } from '@/services/hostawayConnectionService'
import { getConnectionByUserId as getGuestyConnection, disconnectGuesty } from '@/services/guestyConnectionService'
import { getConnectionByUserId as getHospitableConnection, disconnectHospitable } from '@/services/hospitableConnectionService'
import HostawayConnectionModal from '@/components/connection/hostaway/HostawayConnectionModal'
import GuestyConnectionModal from '@/components/connection/guesty/GuestyConnectionModal'
import HospitableConnectionModal from '@/components/connection/hospitable/HospitableConnectionModal'
import QuickBooksSection from '@/components/quickbooks/QuickBooksSection'
import ICalSubscriptionsSection from '@/components/ical-subscription/ICalSubscriptionsSection'
import ListingMappingsSection from '@/components/listing-mapping/ListingMappingsSection'
import SettingsSectionNav, { SettingsNavSection } from '@/components/settings/SettingsSectionNav'
import BrandingLogoManager from '@/components/settings/BrandingLogoManager'
import LanguageSelector from '@/components/shared/LanguageSelector'
import LanguagePromptBanner from '@/components/shared/LanguagePromptBanner'
import { getProperties } from '@/services/propertyService'
import type { HostawayConnection } from '@/services/types/hostawayConnection'
import type { GuestyConnection } from '@/services/types/guestyConnection'
import type { HospitableConnection } from '@/services/types/hospitableConnection'
import type { Property } from '@/services/types/property'

export default function PropertyManagerSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile editing state
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    role: 'PROPERTY-MANAGER' as 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT' | 'CLEANER' | 'TEAM_MEMBER'
  })

  // Hostaway modal state
  const [showHostawayModal, setShowHostawayModal] = useState(false)
  const [hostawayConnection, setHostawayConnection] = useState<HostawayConnection | null>(null)
  const [loadingHostawayConnection, setLoadingHostawayConnection] = useState(false)

  // Guesty modal state
  const [showGuestyModal, setShowGuestyModal] = useState(false)
  const [guestyConnection, setGuestyConnection] = useState<GuestyConnection | null>(null)
  const [loadingGuestyConnection, setLoadingGuestyConnection] = useState(false)

  // Hospitable modal state
  const [showHospitableModal, setShowHospitableModal] = useState(false)
  const [hospitableConnection, setHospitableConnection] = useState<HospitableConnection | null>(null)
  const [loadingHospitableConnection, setLoadingHospitableConnection] = useState(false)

  // Properties state (for iCal section)
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)

  // Notification preferences state
  const [savingField, setSavingField] = useState<string | null>(null)

  const { profile, setProfile } = useUserStore()
  const { showNotification } = useNotificationStore()
  const { t } = useTranslation('settings')
  usePermissionGuard('settings')
  const { effectiveUserId, canWrite } = usePermissions()

  useEffect(() => {
    if (profile) {
      setProfileData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phoneNumber || '',
        company: profile.companyName || '',
        companyAddress: profile.companyAddress || '',
        companyPhone: profile.companyPhone || '',
        companyEmail: profile.companyEmail || '',
        role: profile.role!
      })
    }
  }, [profile])

  const handleNotificationToggle = async (field: 'smsNotificationsEnabled' | 'emailNotificationsEnabled', enabled: boolean) => {
    if (!profile?.id) return

    // Validate phone number for SMS
    if (field === 'smsNotificationsEnabled' && enabled && !profile.phoneNumber) {
      showNotification('Please add a phone number in your profile before enabling SMS notifications', 'error')
      return
    }

    try {
      setSavingField(field)
      const response = await updateUserProfile(profile.id, {
        fullName: profile.fullName,
        role: profile.role!,
        [field]: enabled,
      })

      if (response.status === 'success' && response.data) {
        setProfile({
          ...profile,
          ...response.data,
          email: profile.email,
        })
        const label = field === 'smsNotificationsEnabled' ? 'SMS' : 'Email'
        showNotification(`${label} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success')
      } else {
        showNotification(response.message || 'Failed to update notification preferences', 'error')
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err)
      showNotification('Failed to update notification preferences', 'error')
    } finally {
      setSavingField(null)
    }
  }

  const handleAutoImportToggle = async (enabled: boolean) => {
    if (!profile?.id) return

    try {
      setSavingField('autoImport')
      const response = await updateUserProfile(profile.id, {
        fullName: profile.fullName,
        role: profile.role!,
        autoImport: enabled,
      })

      if (response.status === 'success' && response.data) {
        setProfile({
          ...profile,
          ...response.data,
          email: profile.email,
        })
        showNotification(
          enabled
            ? 'Auto-import enabled — new bookings with matched properties will be imported automatically'
            : 'Auto-import disabled — all new bookings will require manual review',
          'success'
        )
      } else {
        showNotification(response.message || 'Failed to update auto-import setting', 'error')
      }
    } catch (err) {
      console.error('Error updating auto-import setting:', err)
      showNotification('Failed to update auto-import setting', 'error')
    } finally {
      setSavingField(null)
    }
  }

  const handleProfileSave = async () => {
    if (!profile?.id) return

    // Validate required fields
    if (!profileData.fullName.trim()) {
      showNotification('Full name is required', 'error')
      return
    }

    try {
      setLoading(true)
      const response = await updateUserProfile(profile.id, {
        fullName: profileData.fullName,
        role: profileData.role,
        phoneNumber: profileData.phone || null,
        companyName: profileData.company || null,
        companyAddress: profileData.companyAddress || null,
        companyPhone: profileData.companyPhone || null,
        companyEmail: profileData.companyEmail || null,
      })

      if (response.status === 'success' && response.data) {
        // Update the store with new profile data
        setProfile({
          ...profile,
          ...response.data,
          email: profile.email // Keep email from existing profile
        })
        showNotification('Profile updated successfully', 'success')
        setShowProfileEdit(false)
      } else {
        showNotification(response.message || 'Failed to update profile', 'error')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      showNotification('Failed to update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectHostaway = () => {
    setShowHostawayModal(true)
  }

  const fetchHostawayConnection = async () => {
    if (!effectiveUserId) return

    setLoadingHostawayConnection(true)
    try {
      const response = await getConnectionByUserId(effectiveUserId)
      if (response.status === 'success' && response.data) {
        setHostawayConnection(response.data)
      } else {
        setHostawayConnection(null)
      }
    } catch (error) {
      console.error('Error fetching Hostaway connection:', error)
      setHostawayConnection(null)
    } finally {
      setLoadingHostawayConnection(false)
    }
  }

  const fetchGuestyConnection = async () => {
    if (!effectiveUserId) return

    setLoadingGuestyConnection(true)
    try {
      const response = await getGuestyConnection(effectiveUserId)
      if (response.status === 'success' && response.data) {
        setGuestyConnection(response.data)
      } else {
        setGuestyConnection(null)
      }
    } catch (error) {
      console.error('Error fetching Guesty connection:', error)
      setGuestyConnection(null)
    } finally {
      setLoadingGuestyConnection(false)
    }
  }

  const fetchHospitableConnection = async () => {
    if (!effectiveUserId) return

    setLoadingHospitableConnection(true)
    try {
      const response = await getHospitableConnection(effectiveUserId)
      if (response.status === 'success' && response.data) {
        setHospitableConnection(response.data)
      } else {
        setHospitableConnection(null)
      }
    } catch (error) {
      console.error('Error fetching Hospitable connection:', error)
      setHospitableConnection(null)
    } finally {
      setLoadingHospitableConnection(false)
    }
  }

  const fetchProperties = async () => {
    if (!effectiveUserId) return

    setLoadingProperties(true)
    try {
      const response = await getProperties(effectiveUserId)
      if (response.status === 'success' && response.data) {
        setProperties(response.data)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoadingProperties(false)
    }
  }

  useEffect(() => {
    fetchHostawayConnection()
    fetchGuestyConnection()
    fetchHospitableConnection()
    fetchProperties()
  }, [effectiveUserId])

  const handleHostawayConnect = async (accountId: string, apiKey: string) => {
    setShowHostawayModal(false)
    showNotification('Hostaway connection successful!', 'success')
    // Refresh connection data
    fetchHostawayConnection()
  }

  const handleHostawayDisconnect = async () => {
    if (!hostawayConnection?.id) return

    try {
      setLoadingHostawayConnection(true)
      const response = await disconnectHostaway(hostawayConnection.id)

      if (response.status === 'success') {
        setHostawayConnection(null)
        if (response.warnings && response.warnings.length > 0) {
          showNotification(`Disconnected with warnings: ${response.warnings.join(', ')}`, 'error')
        } else {
          showNotification('Hostaway connection disconnected successfully', 'success')
        }
      } else {
        showNotification(response.message || 'Failed to disconnect', 'error')
      }
    } catch (error) {
      console.error('Error disconnecting Hostaway:', error)
      showNotification('Failed to disconnect from Hostaway', 'error')
    } finally {
      setLoadingHostawayConnection(false)
    }
  }

  const handleConnectGuesty = () => {
    setShowGuestyModal(true)
  }

  const handleGuestyConnect = async (clientId: string, clientSecret: string) => {
    setShowGuestyModal(false)
    showNotification('Guesty connection successful!', 'success')
    // Refresh connection data
    fetchGuestyConnection()
  }

  const handleGuestyDisconnect = async () => {
    if (!guestyConnection?.id) return

    try {
      setLoadingGuestyConnection(true)
      const response = await disconnectGuesty(guestyConnection.id)

      if (response.status === 'success') {
        setGuestyConnection(null)
        if (response.warnings && response.warnings.length > 0) {
          showNotification(`Disconnected with warnings: ${response.warnings.join(', ')}`, 'error')
        } else {
          showNotification('Guesty connection disconnected successfully', 'success')
        }
      } else {
        showNotification(response.message || 'Failed to disconnect', 'error')
      }
    } catch (error) {
      console.error('Error disconnecting Guesty:', error)
      showNotification('Failed to disconnect from Guesty', 'error')
    } finally {
      setLoadingGuestyConnection(false)
    }
  }

  const handleConnectHospitable = () => {
    setShowHospitableModal(true)
  }

  const handleHospitableConnect = async (personalAccessToken: string) => {
    setShowHospitableModal(false)
    showNotification('Hospitable connection successful!', 'success')
    // Refresh connection data
    fetchHospitableConnection()
  }

  const handleHospitableDisconnect = async () => {
    if (!hospitableConnection?.id) return

    try {
      setLoadingHospitableConnection(true)
      const response = await disconnectHospitable(hospitableConnection.id)

      if (response.status === 'success') {
        setHospitableConnection(null)
        if (response.warnings && response.warnings.length > 0) {
          showNotification(`Disconnected with warnings: ${response.warnings.join(', ')}`, 'error')
        } else {
          showNotification('Hospitable connection disconnected successfully', 'success')
        }
      } else {
        showNotification(response.message || 'Failed to disconnect', 'error')
      }
    } catch (error) {
      console.error('Error disconnecting Hospitable:', error)
      showNotification('Failed to disconnect from Hospitable', 'error')
    } finally {
      setLoadingHospitableConnection(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('manageAccountAndIntegrations')}</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">{t('loadingSettings')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('manageAccountAndIntegrations')}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingSettings')}</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and integrations</p>
        </div>
      </div>

      {/* Language Prompt Banner */}
      <LanguagePromptBanner />

      {/* Section quick-nav (sticky tabs that jump to each section) */}
      <SettingsSectionNav
        sections={[
          { id: 'settings-profile', label: 'Profile', icon: <UserIcon className="h-4 w-4" /> },
          { id: 'settings-notifications', label: 'Notifications', icon: <BellIcon className="h-4 w-4" /> },
          { id: 'settings-connections', label: 'Connections', icon: <LinkIcon className="h-4 w-4" /> },
          { id: 'settings-quickbooks', label: 'QuickBooks', icon: <CreditCardIcon className="h-4 w-4" /> },
          { id: 'settings-mappings', label: 'Property mappings', icon: <ArrowsRightLeftIcon className="h-4 w-4" /> },
          { id: 'settings-calendar', label: 'Calendar', icon: <CalendarDaysIcon className="h-4 w-4" /> },
        ] satisfies SettingsNavSection[]}
      />

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          id="settings-profile"
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-36"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('profileSettings')}</h3>
                  <p className="text-sm text-gray-500">{t('updatePersonalInfo')}</p>
                </div>
              </div>
              {canWrite('settings') && (
                <motion.button
                  onClick={() => setShowProfileEdit(!showProfileEdit)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {showProfileEdit ? 'Cancel' : 'Edit'}
                </motion.button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Company logo — one per user, managed instantly via its own endpoints */}
            <div className="pb-6 mb-6 border-b border-gray-100">
              <BrandingLogoManager canWrite={canWrite('settings')} />
            </div>

            {!showProfileEdit ? (
              // View Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('nameLabel')}</label>
                  <p className="text-gray-900 font-medium">{profile?.fullName || t('notSet')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('email')}</label>
                  <p className="text-gray-900 font-medium">{profileData.email || t('notSet')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('phone')}</label>
                  <p className="text-gray-900 font-medium">{profile?.phoneNumber || t('notSet')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('company')}</label>
                  <p className="text-gray-900 font-medium">{profile?.companyName || t('notSet')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('companyAddress')}</label>
                  <p className="text-gray-900 font-medium whitespace-pre-line">{profile?.companyAddress || t('notSet')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('companyPhone')}</label>
                  <p className="text-gray-900 font-medium">{profile?.companyPhone || t('notSet')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('companyEmail')}</label>
                  <p className="text-gray-900 font-medium">{profile?.companyEmail || t('notSet')}</p>
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
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
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('phone')}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder={t('enterPhone')}
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('company')}
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={profileData.company}
                      onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder={t('enterCompany')}
                    />
                  </div>
                </div>

                {/* Branding — shown on paystub & report PDFs */}
                <div className="pt-4 border-t border-gray-100 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('branding')}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{t('brandingHint')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('companyAddress')}
                      </label>
                      <textarea
                        id="companyAddress"
                        rows={3}
                        value={profileData.companyAddress}
                        onChange={(e) => setProfileData(prev => ({ ...prev, companyAddress: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder={t('enterCompanyAddress')}
                      />
                    </div>
                    <div>
                      <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('companyPhone')}
                      </label>
                      <input
                        type="tel"
                        id="companyPhone"
                        value={profileData.companyPhone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, companyPhone: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder={t('enterCompanyPhone')}
                      />
                    </div>
                    <div>
                      <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('companyEmail')}
                      </label>
                      <input
                        type="email"
                        id="companyEmail"
                        value={profileData.companyEmail}
                        onChange={(e) => setProfileData(prev => ({ ...prev, companyEmail: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        placeholder={t('enterCompanyEmail')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <motion.button
                    onClick={() => setShowProfileEdit(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    disabled={loading}
                  >
                    {t('cancel')}
                  </motion.button>
                  <motion.button
                    onClick={handleProfileSave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-white bg-blue-600 rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {t('saveChanges')}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Language Preference */}
        <LanguageSelector delay={0.15} />

        {/* Notification Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          id="settings-notifications"
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-36"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <BellIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('notificationPreferences')}</h3>
                <p className="text-sm text-gray-500">{t('notificationPreferencesDesc')}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('emailNotifications')}</h4>
                    <p className="text-sm text-gray-500">{t('emailNotificationsDescPM')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile?.emailNotificationsEnabled ?? true}
                  disabled={savingField === 'emailNotificationsEnabled'}
                  onClick={() => handleNotificationToggle('emailNotificationsEnabled', !(profile?.emailNotificationsEnabled ?? true))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    (profile?.emailNotificationsEnabled ?? true) ? 'bg-blue-600' : 'bg-gray-200'
                  } ${savingField === 'emailNotificationsEnabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      (profile?.emailNotificationsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* SMS Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('smsNotifications')}</h4>
                    <p className="text-sm text-gray-500">
                      Receive text message alerts for turnover projects, cleaner assignments, and updates
                      {!profile?.phoneNumber && (
                        <span className="block text-amber-600 text-xs mt-1">
                          Add a phone number in your profile to enable SMS notifications
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile?.smsNotificationsEnabled ?? true}
                  disabled={savingField === 'smsNotificationsEnabled'}
                  onClick={() => handleNotificationToggle('smsNotificationsEnabled', !(profile?.smsNotificationsEnabled ?? true))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    (profile?.smsNotificationsEnabled ?? true) ? 'bg-amber-500' : 'bg-gray-200'
                  } ${savingField === 'smsNotificationsEnabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      (profile?.smsNotificationsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto-Import Bookings Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <ArrowPathIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('autoImportBookings')}</h4>
                    <p className="text-sm text-gray-500">
                      Automatically import new bookings when properties are matched (exact or fuzzy)
                    </p>
                    {(profile?.autoImport) && (
                      <span className="text-xs text-green-600 mt-1 block">
                        Bookings with matched properties will be imported automatically
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile?.autoImport ?? false}
                  disabled={savingField === 'autoImport' || !canWrite('settings')}
                  onClick={() => handleAutoImportToggle(!(profile?.autoImport ?? false))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    (profile?.autoImport ?? false) ? 'bg-green-600' : 'bg-gray-200'
                  } ${savingField === 'autoImport' || !canWrite('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      (profile?.autoImport ?? false) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Info note */}
              <div className="mt-2 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-700">
                  These settings control notifications for turnover projects, cleaner assignments, issue reports, and other operational updates.
                  Auto-import will automatically create bookings and cleaning projects when new webhook bookings match your properties.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

        {/* PMS Connections Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          id="settings-connections"
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-36"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                <LinkIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('pmsConnections')}</h3>
                <p className="text-sm text-gray-500">{t('pmsConnectionsDesc')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Hostaway Connection */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                      <path d="M2 17L12 22L22 17" />
                      <path d="M2 12L12 17L22 12" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Hostaway</h4>
                    <p className="text-sm text-gray-500">
                      {t('syncBookingsDesc')}
                    </p>
                    <div className="mt-2">
                      {loadingHostawayConnection ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </span>
                      ) : hostawayConnection ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          {t('connected')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          <XCircleIcon className="w-3.5 h-3.5" />
                          {t('notConnected')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canWrite('settings') && (
                  hostawayConnection ? (
                    <motion.button
                      onClick={handleHostawayDisconnect}
                      disabled={loadingHostawayConnection}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingHostawayConnection ? 'Disconnecting...' : 'Disconnect'}
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleConnectHostaway}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Connect
                    </motion.button>
                  )
                )}
              </div>

              {/* Connection details (show when connected) */}
              {hostawayConnection && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1">Account ID</span>
                      <span className="font-mono text-gray-900">{hostawayConnection.hostawayAccountId}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Status</span>
                      <span className={`font-semibold ${hostawayConnection.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {hostawayConnection.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Webhook</span>
                      <span className={`text-xs ${hostawayConnection.webhookId ? 'text-green-600' : 'text-yellow-600'}`}>
                        {hostawayConnection.webhookId ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Auto Import</span>
                      <span className={`text-xs ${hostawayConnection.autoImport ? 'text-green-600' : 'text-gray-600'}`}>
                        {hostawayConnection.autoImport ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {hostawayConnection.lastSyncAt && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Last synced: {new Date(hostawayConnection.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Guesty Connection */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Guesty</h4>
                    <p className="text-sm text-gray-500">
                      {t('syncBookingsDesc')}
                    </p>
                    <div className="mt-2">
                      {loadingGuestyConnection ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </span>
                      ) : guestyConnection ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          {t('connected')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          <XCircleIcon className="w-3.5 h-3.5" />
                          {t('notConnected')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canWrite('settings') && (
                  guestyConnection ? (
                    <motion.button
                      onClick={handleGuestyDisconnect}
                      disabled={loadingGuestyConnection}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingGuestyConnection ? 'Disconnecting...' : 'Disconnect'}
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleConnectGuesty}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Connect
                    </motion.button>
                  )
                )}
              </div>

              {/* Connection details (show when connected) */}
              {guestyConnection && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1">Client ID</span>
                      <span className="font-mono text-gray-900">{guestyConnection.guestyClientId}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Status</span>
                      <span className={`font-semibold ${guestyConnection.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {guestyConnection.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Webhook</span>
                      <span className={`text-xs ${guestyConnection.webhookId ? 'text-green-600' : 'text-yellow-600'}`}>
                        {guestyConnection.webhookId ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Auto Import</span>
                      <span className={`text-xs ${guestyConnection.autoImport ? 'text-green-600' : 'text-gray-600'}`}>
                        {guestyConnection.autoImport ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {guestyConnection.lastSyncAt && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Last synced: {new Date(guestyConnection.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hospitable Connection */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Hospitable</h4>
                    <p className="text-sm text-gray-500">
                      {t('syncBookingsDesc')}
                    </p>
                    <div className="mt-2">
                      {loadingHospitableConnection ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </span>
                      ) : hospitableConnection ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          {t('connected')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          <XCircleIcon className="w-3.5 h-3.5" />
                          {t('notConnected')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canWrite('settings') && (
                  hospitableConnection ? (
                    <motion.button
                      onClick={handleHospitableDisconnect}
                      disabled={loadingHospitableConnection}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingHospitableConnection ? 'Disconnecting...' : 'Disconnect'}
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleConnectHospitable}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/25 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Connect
                    </motion.button>
                  )
                )}
              </div>

              {/* Connection details (show when connected) */}
              {hospitableConnection && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1">Account ID</span>
                      <span className="font-mono text-gray-900">{hospitableConnection.hospitableAccountId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Status</span>
                      <span className={`font-semibold ${hospitableConnection.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {hospitableConnection.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Token Expires</span>
                      <span className={`text-xs ${hospitableConnection.tokenExpiresAt && new Date(hospitableConnection.tokenExpiresAt) > new Date() ? 'text-green-600' : 'text-yellow-600'}`}>
                        {hospitableConnection.tokenExpiresAt
                          ? new Date(hospitableConnection.tokenExpiresAt).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Auto Import</span>
                      <span className={`text-xs ${hospitableConnection.autoImport ? 'text-green-600' : 'text-gray-600'}`}>
                        {hospitableConnection.autoImport ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {hospitableConnection.lastSyncAt && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Last synced: {new Date(hospitableConnection.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* QuickBooks Online */}
            <div id="settings-quickbooks" className="scroll-mt-36">
              <QuickBooksSection canWrite={canWrite('settings')} />
            </div>

            {/* Future PMS integrations placeholder */}
            <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Cog6ToothIcon className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{t('moreIntegrations')}</h4>
                <p className="mt-1 text-sm text-gray-500">
                  {t('moreIntegrationsDesc')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      {/* Listing Mappings Section (Hostaway listing → property) */}
      <div id="settings-mappings" className="scroll-mt-36">
        <ListingMappingsSection
          userId={effectiveUserId!}
          properties={properties}
          loadingProperties={loadingProperties}
          canWrite={canWrite('settings')}
        />
      </div>

      {/* iCal Calendar Feeds Section */}
      <div id="settings-calendar" className="scroll-mt-36">
        <ICalSubscriptionsSection
          userId={effectiveUserId!}
          properties={properties}
          loadingProperties={loadingProperties}
        />
      </div>

      {/* Hostaway Connection Modal */}
      <HostawayConnectionModal
        isOpen={showHostawayModal}
        onClose={() => setShowHostawayModal(false)}
        onConnect={handleHostawayConnect}
        userId={effectiveUserId!}
      />

      {/* Guesty Connection Modal */}
      <GuestyConnectionModal
        isOpen={showGuestyModal}
        onClose={() => setShowGuestyModal(false)}
        onConnect={handleGuestyConnect}
        userId={effectiveUserId!}
      />

      {/* Hospitable Connection Modal */}
      <HospitableConnectionModal
        isOpen={showHospitableModal}
        onClose={() => setShowHospitableModal(false)}
        onConnect={handleHospitableConnect}
        userId={effectiveUserId!}
      />
    </div>
  )
}
