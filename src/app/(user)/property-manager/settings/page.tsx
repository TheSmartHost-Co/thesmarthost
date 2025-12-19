"use client"

import { useState, useEffect } from 'react'
import { UserIcon, CogIcon, LinkIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { updateUserProfile } from '@/services/profileService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getConnectionByUserId, disconnectHostaway } from '@/services/hostawayConnectionService'
import HostawayConnectionModal from '@/components/connection/hostaway/HostawayConnectionModal'
import type { HostawayConnection } from '@/services/types/hostawayConnection'

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
  const [loadingConnection, setLoadingConnection] = useState(false)
  
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
    
    setLoadingConnection(true)
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
      setLoadingConnection(false)
    }
  }
  
  useEffect(() => {
    fetchHostawayConnection()
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
      setLoadingConnection(true)
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
      setLoadingConnection(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and integrations</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <p className="text-gray-600">Manage your account and integrations</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading settings: {error}</p>
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
          <p className="text-gray-600">Manage your account and integrations</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
                  <p className="text-sm text-gray-600">Update your personal information</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileEdit(!showProfileEdit)}
                className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {showProfileEdit ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {!showProfileEdit ? (
              // View Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{`${profile?.fullName}` || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{profileData.email || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{profile?.phoneNumber || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <p className="text-gray-900">{profile?.companyName || 'Not set'}</p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                      placeholder="Enter email address"
                      disabled
                      title="Email cannot be changed"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={profileData.company}
                      onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                      className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowProfileEdit(false)}
                    className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSave}
                    className="cursor-pointer px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PMS Connections Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">PMS Connections</h3>
                <p className="text-sm text-gray-600">Connect your property management systems</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Hostaway Connection */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                      <path d="M2 17L12 22L22 17" />
                      <path d="M2 12L12 17L22 12" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Hostaway</h4>
                    <p className="text-sm text-gray-600">
                      Connect your Hostaway account to automatically sync bookings and reservations
                    </p>
                    <div className="mt-2">
                      {loadingConnection ? (
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                          Loading...
                        </div>
                      ) : hostawayConnection ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hostawayConnection ? (
                  <button
                    onClick={handleHostawayDisconnect}
                    disabled={loadingConnection}
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-red-300 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingConnection ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectHostaway}
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Connect
                  </button>
                )}
              </div>
              
              {/* Connection details (show when connected) */}
              {hostawayConnection && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span><strong>Account ID:</strong></span>
                      <span className="font-mono">{hostawayConnection.hostawayAccountId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong>Status:</strong></span>
                      <span className={`font-medium ${
                        hostawayConnection.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {hostawayConnection.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong>Webhook:</strong></span>
                      <span className={`text-xs ${
                        hostawayConnection.webhookId ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {hostawayConnection.webhookId ? `ID: ${hostawayConnection.webhookId}` : 'Not configured'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong>Last Sync:</strong></span>
                      <span className="text-xs">
                        {hostawayConnection.lastSyncAt 
                          ? new Date(hostawayConnection.lastSyncAt).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong>Auto Import:</strong></span>
                      <span className={`text-xs ${
                        hostawayConnection.autoImport ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {hostawayConnection.autoImport ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Future PMS integrations placeholder */}
            <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <CogIcon className="mx-auto h-8 w-8 text-gray-400" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">More Integrations Coming Soon</h4>
                <p className="mt-1 text-sm text-gray-600">
                  We're working on integrations with Airbnb, Booking.com, and other major platforms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <CogIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                <p className="text-sm text-gray-600">Manage your account preferences</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {/* Notification preferences */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive emails about new bookings and updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {/* Auto-sync preferences */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Auto-Sync Bookings</h4>
                  <p className="text-sm text-gray-600">Automatically import new bookings without approval</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hostaway Connection Modal */}
      <HostawayConnectionModal
        isOpen={showHostawayModal}
        onClose={() => setShowHostawayModal(false)}
        onConnect={handleHostawayConnect}
        userId={profile?.id!}
      />
    </div>
  )
}