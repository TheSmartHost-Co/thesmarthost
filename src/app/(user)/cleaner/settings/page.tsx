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
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateUserProfile } from '@/services/profileService'
import { getCleanerByAuthUserId, updateCleaner } from '@/services/cleanerService'
import type { Cleaner } from '@/services/types/cleaner'

export default function CleanerSettingsPage() {
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
        setError('Failed to load settings')
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
      showNotification('Full name is required', 'error')
      return
    }

    try {
      setSaving(true)

      // Update profile in profiles table
      const profileResponse = await updateUserProfile(profile.id, {
        fullName: profileData.fullName,
        role: 'CLEANER',
        phoneNumber: profileData.phone || null,
      })

      if (profileResponse.status !== 'success') {
        showNotification(profileResponse.message || 'Failed to update profile', 'error')
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

      showNotification('Profile updated successfully', 'success')
      setShowProfileEdit(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      showNotification('Failed to update profile', 'error')
    } finally {
      setSaving(false)
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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account preferences</p>
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
              <h3 className="font-semibold text-red-800">Error loading settings</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
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
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
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
                className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
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
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Name
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner?.name || profile?.fullName || 'Not set'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner?.email || profile?.email || 'Not set'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner?.phone || profile?.phoneNumber || 'Not set'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <p className="text-gray-900 font-medium">Cleaner</p>
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
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
                  <div className="md:col-span-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <motion.button
                    onClick={() => setShowProfileEdit(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                    disabled={saving}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleProfileSave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 text-white bg-purple-600 rounded-xl font-medium hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Cog6ToothIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
                <p className="text-sm text-gray-500">Manage your notification and work preferences</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Email notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BellIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive emails about new task assignments</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 after:shadow-sm"></div>
                </label>
              </div>

              {/* SMS notifications placeholder */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl opacity-60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">SMS Notifications</h4>
                    <p className="text-sm text-gray-500">Coming soon - Get text alerts for urgent tasks</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:shadow-sm cursor-not-allowed"></div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Work Info Section (read-only) */}
        {cleaner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Work Information</h3>
                  <p className="text-sm text-gray-500">Your work details (managed by your property manager)</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Hourly Rate
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner.hourlyRate ? `$${cleaner.hourlyRate.toFixed(2)}/hr` : 'Not set'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Default Turnaround Time
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner.defaultTurnaroundMinutes
                      ? `${Math.floor(cleaner.defaultTurnaroundMinutes / 60)}h ${cleaner.defaultTurnaroundMinutes % 60}m`
                      : 'Not set'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    cleaner.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cleaner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Assigned Properties
                  </label>
                  <p className="text-gray-900 font-medium">
                    {cleaner.assignedProperties?.length || 0} properties
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Contact your property manager to update these settings
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
