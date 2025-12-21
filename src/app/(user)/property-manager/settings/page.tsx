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
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { updateUserProfile } from '@/services/profileService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getConnectionByUserId, disconnectHostaway } from '@/services/hostawayConnectionService'
import { getConnectionByUserId as getGuestyConnection, disconnectGuesty } from '@/services/guestyConnectionService'
import HostawayConnectionModal from '@/components/connection/hostaway/HostawayConnectionModal'
import GuestyConnectionModal from '@/components/connection/guesty/GuestyConnectionModal'
import type { HostawayConnection } from '@/services/types/hostawayConnection'
import type { GuestyConnection } from '@/services/types/guestyConnection'

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
    role: 'PROPERTY-MANAGER' as 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT'
  })

  // Hostaway modal state
  const [showHostawayModal, setShowHostawayModal] = useState(false)
  const [hostawayConnection, setHostawayConnection] = useState<HostawayConnection | null>(null)
  const [loadingHostawayConnection, setLoadingHostawayConnection] = useState(false)

  // Guesty modal state
  const [showGuestyModal, setShowGuestyModal] = useState(false)
  const [guestyConnection, setGuestyConnection] = useState<GuestyConnection | null>(null)
  const [loadingGuestyConnection, setLoadingGuestyConnection] = useState(false)

  const { profile, setProfile } = useUserStore()
  const { showNotification } = useNotificationStore()

  useEffect(() => {
    if (profile) {
      setProfileData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phoneNumber || '',
        company: profile.companyName || '',
        role: profile.role!
      })
    }
  }, [profile])

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
        companyName: profileData.company || null
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
    if (!profile?.id) return

    setLoadingHostawayConnection(true)
    try {
      const response = await getConnectionByUserId(profile.id)
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
    if (!profile?.id) return

    setLoadingGuestyConnection(true)
    try {
      const response = await getGuestyConnection(profile.id)
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

  useEffect(() => {
    fetchHostawayConnection()
    fetchGuestyConnection()
  }, [profile?.id])

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your account and integrations</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading settings...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your account and integrations</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading settings</h3>
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

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
                  <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
              </div>
              <motion.button
                onClick={() => setShowProfileEdit(!showProfileEdit)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {showProfileEdit ? 'Cancel' : 'Edit'}
              </motion.button>
            </div>
          </div>

          <div className="p-6">
            {!showProfileEdit ? (
              // View Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{profile?.fullName || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</label>
                  <p className="text-gray-900 font-medium">{profileData.email || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                  <p className="text-gray-900 font-medium">{profile?.phoneNumber || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Company</label>
                  <p className="text-gray-900 font-medium">{profile?.companyName || 'Not set'}</p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                      placeholder="Enter email address"
                      disabled
                      title="Email cannot be changed"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={profileData.company}
                      onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Enter company name"
                    />
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
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleProfileSave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-white bg-blue-600 rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Save Changes
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* PMS Connections Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                <LinkIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">PMS Connections</h3>
                <p className="text-sm text-gray-500">Connect your property management systems</p>
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
                      Sync bookings and reservations automatically
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
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          <XCircleIcon className="w-3.5 h-3.5" />
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hostawayConnection ? (
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
                      Sync bookings and reservations automatically
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
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          <XCircleIcon className="w-3.5 h-3.5" />
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {guestyConnection ? (
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

            {/* Future PMS integrations placeholder */}
            <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Cog6ToothIcon className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">More Integrations Coming Soon</h4>
                <p className="mt-1 text-sm text-gray-500">
                  We&apos;re working on integrations with Airbnb, Booking.com, and other major platforms
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Cog6ToothIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                <p className="text-sm text-gray-500">Manage your account preferences</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {/* Notification preferences */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BellIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive emails about new bookings and updates</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 after:shadow-sm"></div>
                </label>
              </div>

              {/* Auto-sync preferences */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <ArrowPathIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Auto-Sync Bookings</h4>
                    <p className="text-sm text-gray-500">Automatically import new bookings without approval</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 after:shadow-sm"></div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hostaway Connection Modal */}
      <HostawayConnectionModal
        isOpen={showHostawayModal}
        onClose={() => setShowHostawayModal(false)}
        onConnect={handleHostawayConnect}
        userId={profile?.id!}
      />

      {/* Guesty Connection Modal */}
      <GuestyConnectionModal
        isOpen={showGuestyModal}
        onClose={() => setShowGuestyModal(false)}
        onConnect={handleGuestyConnect}
        userId={profile?.id!}
      />
    </div>
  )
}
