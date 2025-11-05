'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { getStatusCodesByUserId, createStatusCode, updateStatusCode, deleteStatusCode } from '@/services/clientCodeService'
import { ClientStatusCode, CreateStatusCodePayload, UpdateStatusCodePayload } from '@/services/types/clientCode'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

interface StatusCodeManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: () => void
}

const StatusCodeManagementModal: React.FC<StatusCodeManagementModalProps> = ({
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const [statusCodes, setStatusCodes] = useState<ClientStatusCode[]>([])
  const [loading, setLoading] = useState(false)
  const [editingStatus, setEditingStatus] = useState<ClientStatusCode | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // Form state
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [colorHex, setColorHex] = useState('#6B7280')
  const [isDefault, setIsDefault] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && profile?.id) {
      fetchStatusCodes()
    }
  }, [isOpen, profile?.id])

  const fetchStatusCodes = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      const response = await getStatusCodesByUserId(profile.id)
      if (response.status === 'success') {
        setStatusCodes(response.data)
      } else {
        showNotification('Failed to fetch status codes', 'error')
      }
    } catch (error) {
      console.error('Error fetching status codes:', error)
      showNotification('Error fetching status codes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCode('')
    setLabel('')
    setColorHex('#6B7280')
    setIsDefault(false)
    setEditingStatus(null)
    setShowCreateForm(false)
  }

  const handleCreateNew = () => {
    resetForm()
    setShowCreateForm(true)
  }

  const handleEdit = (status: ClientStatusCode) => {
    setCode(status.code)
    setLabel(status.label)
    setColorHex(status.colorHex)
    setIsDefault(status.isDefault)
    setEditingStatus(status)
    setShowCreateForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedCode = code.trim()
    const trimmedLabel = label.trim()

    if (!trimmedCode || !trimmedLabel) {
      showNotification('Code and label are required', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    try {
      if (editingStatus) {
        // Update existing status
        const updateData: UpdateStatusCodePayload = {
          code: trimmedCode,
          label: trimmedLabel,
          colorHex,
          isDefault,
        }

        const response = await updateStatusCode(editingStatus.id, updateData)
        if (response.status === 'success') {
          showNotification('Status code updated successfully', 'success')
          fetchStatusCodes()
          resetForm()
          onStatusUpdate?.()
        } else {
          showNotification(response.message || 'Failed to update status code', 'error')
        }
      } else {
        // Create new status
        const createData: CreateStatusCodePayload = {
          userId: profile.id,
          code: trimmedCode,
          label: trimmedLabel,
          colorHex,
          isDefault,
        }

        const response = await createStatusCode(createData)
        if (response.status === 'success') {
          showNotification('Status code created successfully', 'success')
          fetchStatusCodes()
          resetForm()
          onStatusUpdate?.()
        } else {
          showNotification(response.message || 'Failed to create status code', 'error')
        }
      }
    } catch (error) {
      console.error('Error saving status code:', error)
      showNotification('Error saving status code', 'error')
    }
  }

  const handleDelete = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status code? This action cannot be undone.')) {
      return
    }

    try {
      const response = await deleteStatusCode(statusId)
      if (response.status === 'success') {
        showNotification('Status code deleted successfully', 'success')
        fetchStatusCodes()
        onStatusUpdate?.()
      } else {
        showNotification(response.message || 'Failed to delete status code', 'error')
      }
    } catch (error) {
      console.error('Error deleting status code:', error)
      showNotification('Error deleting status code', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Manage Status Codes</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading status codes...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status codes list */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-black">Current Status Codes</h3>
              <button
                onClick={handleCreateNew}
                className="cursor-pointer flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-y-auto max-h-64">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statusCodes.map((status) => (
                      <tr key={status.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{status.code}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{status.label}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: status.colorHex }}
                            ></div>
                            <span className="text-gray-600">{status.colorHex}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {status.isDefault && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(status)}
                              className="cursor-pointer text-blue-600 hover:text-blue-800 pr-5"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(status.id)}
                              className="cursor-pointer text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {statusCodes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No status codes found. Create your first status code to get started.
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
                {editingStatus ? 'Edit Status Code' : 'Create New Status Code'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4 text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Code field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Code *</label>
                    <input
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. ACTIVE"
                    />
                  </div>

                  {/* Label field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Label *</label>
                    <input
                      required
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Active Client"
                    />
                  </div>

                  {/* Color field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#6B7280"
                      />
                    </div>
                  </div>

                  {/* Default checkbox */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Status</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Set as default status for new clients</span>
                    </div>
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end space-x-4 pt-4 pb-2">
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
                    {editingStatus ? 'Update Status' : 'Create Status'}
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

export default StatusCodeManagementModal