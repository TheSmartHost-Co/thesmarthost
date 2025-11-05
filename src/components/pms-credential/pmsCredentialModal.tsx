'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { getCredentialsByClientId, createCredential, updateCredential, deleteCredential } from '@/services/pmsCredentialService'
import { PMSCredential, CreatePMSCredentialPayload, UpdatePMSCredentialPayload } from '@/services/types/pmsCredential'
import { useNotificationStore } from '@/store/useNotificationStore'
import { PencilIcon, TrashIcon, PlusIcon, EyeIcon, EyeSlashIcon, ClipboardIcon } from '@heroicons/react/24/outline'

interface PMSCredentialModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onCredentialUpdate?: () => void
}

const PMSCredentialModal: React.FC<PMSCredentialModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onCredentialUpdate,
}) => {
  const [credentials, setCredentials] = useState<PMSCredential[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCredential, setEditingCredential] = useState<PMSCredential | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  
  // Form state
  const [pms, setPms] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && clientId) {
      fetchCredentials()
    }
  }, [isOpen, clientId])

  const fetchCredentials = async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const response = await getCredentialsByClientId(clientId)
      console.log(response);
      if (response.status === 'success') {
        setCredentials(response.data)
      } else {
        showNotification('Failed to fetch PMS credentials', 'error')
      }
    } catch (error) {
      console.error('Error fetching PMS credentials:', error)
      showNotification('Error fetching PMS credentials', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setPms('')
    setUsername('')
    setPassword('')
    setEditingCredential(null)
    setShowCreateForm(false)
  }

  const handleCreateNew = () => {
    resetForm()
    setShowCreateForm(true)
  }

  const handleEdit = (credential: PMSCredential) => {
    setPms(credential.pms)
    setUsername(credential.username)
    setPassword(credential.password)
    setEditingCredential(credential)
    setShowCreateForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedPms = pms.trim()
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedPms || !trimmedUsername) {
      showNotification('PMS and username are required', 'error')
      return
    }

    try {
      if (editingCredential) {
        // Update existing credential
        const updateData: UpdatePMSCredentialPayload = {
          pms: trimmedPms,
          username: trimmedUsername,
          password: trimmedPassword || undefined,
        }

        const response = await updateCredential(editingCredential.id, updateData)
        if (response.status === 'success') {
          showNotification('PMS credential updated successfully', 'success')
          fetchCredentials()
          resetForm()
          onCredentialUpdate?.()
        } else {
          showNotification(response.message || 'Failed to update PMS credential', 'error')
        }
      } else {
        // Create new credential
        const createData: CreatePMSCredentialPayload = {
          clientId,
          pms: trimmedPms,
          username: trimmedUsername,
          password: trimmedPassword || undefined,
        }

        const response = await createCredential(createData)
        if (response.status === 'success') {
          showNotification('PMS credential created successfully', 'success')
          fetchCredentials()
          resetForm()
          onCredentialUpdate?.()
        } else {
          showNotification(response.message || 'Failed to create PMS credential', 'error')
        }
      }
    } catch (error) {
      console.error('Error saving PMS credential:', error)
      showNotification('Error saving PMS credential', 'error')
    }
  }

  const handleDelete = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete this PMS credential? This action cannot be undone.')) {
      return
    }

    try {
      const response = await deleteCredential(credentialId)
      if (response.status === 'success') {
        showNotification('PMS credential deleted successfully', 'success')
        fetchCredentials()
        onCredentialUpdate?.()
      } else {
        showNotification(response.message || 'Failed to delete PMS credential', 'error')
      }
    } catch (error) {
      console.error('Error deleting PMS credential:', error)
      showNotification('Error deleting PMS credential', 'error')
    }
  }

  const togglePasswordVisibility = (credentialId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }))
  }

  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text)
      showNotification(`${type === 'username' ? 'Username' : 'Password'} copied to clipboard`, 'success')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showNotification('Failed to copy to clipboard', 'error')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12">
      <h2 className="text-xl mb-4 text-black">PMS Credentials - {clientName}</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading PMS credentials...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Credentials list */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-black">Current PMS Credentials</h3>
              <button
                onClick={handleCreateNew}
                className="cursor-pointer flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Credential</span>
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-y-auto max-h-64">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PMS</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {credentials.map((credential) => (
                      <tr key={credential.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{credential.pms}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900">{credential.username}</span>
                            <button
                              onClick={() => copyToClipboard(credential.username, 'username')}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy username"
                            >
                              <ClipboardIcon className="cursor-pointer w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900">
                              {showPasswords[credential.id] ? credential.password : '*********'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(credential.id)}
                              className="text-gray-400 hover:text-gray-600"
                              title={showPasswords[credential.id] ? 'Hide password' : 'Show password'}
                            >
                              {showPasswords[credential.id] ? (
                                <EyeSlashIcon className="text-green-700 cursor-pointer w-4 h-4" />
                              ) : (
                                <EyeIcon className="text-green-500 cursor-pointer w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(credential.password, 'password')}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy password"
                            >
                              <ClipboardIcon className="cursor-pointer w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(credential.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(credential)}
                              className="cursor-pointer text-blue-600 hover:text-blue-800 pr-5"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(credential.id)}
                              className="cursor-pointer text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {credentials.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No PMS credentials found. Add your first credential to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Create/Edit form */}
          {showCreateForm && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-black mb-4">
                {editingCredential ? 'Edit PMS Credential' : 'Create New PMS Credential'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4 text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PMS field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">PMS Platform *</label>
                    <input
                      required
                      value={pms}
                      onChange={(e) => setPms(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Hostaway, Airbnb, Booking.com"
                    />
                  </div>

                  {/* Username field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. john_abc_properties"
                    />
                  </div>

                  {/* Password field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password"
                    />
                    <p className="text-xs text-gray-500 mt-1">Password is encrypted and stored securely</p>
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end space-x-4 pt-4 pb-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingCredential ? 'Update Credential' : 'Create Credential'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Modal buttons */}
      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default PMSCredentialModal