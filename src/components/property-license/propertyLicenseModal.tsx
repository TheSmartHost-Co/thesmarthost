'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import {
  getLicensesByPropertyId,
  createLicense,
  updateLicense,
  deleteLicense,
  downloadLicense,
  getLicensePreviewUrl
} from '@/services/propertyLicenseService'
import type { PropertyLicense, CreatePropertyLicensePayload, UpdatePropertyLicensePayload } from '@/services/types/propertyLicense'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  EyeIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline'

interface PropertyLicenseModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  propertyName: string
  initialLicenses?: PropertyLicense[]
  onRefreshProperties?: () => Promise<void>
}

type ModalMode = 'list' | 'upload' | 'edit' | 'preview'

const PropertyLicenseModal: React.FC<PropertyLicenseModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  initialLicenses,
  onRefreshProperties,
}) => {
  const [licenses, setLicenses] = useState<PropertyLicense[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('list')
  const [selectedLicense, setSelectedLicense] = useState<PropertyLicense | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [licenseTitle, setLicenseTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Initialize with stored data when modal opens
  useEffect(() => {
    if (isOpen) {
      setLicenses(initialLicenses || [])
      setMode('list')
    }
  }, [isOpen, initialLicenses])

  // Fetch fresh licenses after mutations (create/update/delete)
  const refreshLicenses = async () => {
    if (!propertyId) return

    setLoading(true)
    try {
      const response = await getLicensesByPropertyId(propertyId)
      if (response.status === 'success') {
        setLicenses(response.data)
      } else {
        showNotification('Failed to refresh licenses', 'error')
      }
    } catch (error) {
      console.error('Error refreshing licenses:', error)
      showNotification('Error refreshing licenses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetUploadForm = () => {
    setSelectedFile(null)
    setLicenseTitle('')
    setNotes('')
    setSelectedLicense(null)
    setPreviewUrl(null)
  }

  const handleModeSwitch = (newMode: ModalMode) => {
    if (newMode === 'upload') {
      resetUploadForm()
    }
    setMode(newMode)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!licenseTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setLicenseTitle(nameWithoutExt)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !licenseTitle.trim() || !profile?.id) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      const createData: CreatePropertyLicensePayload = {
        propertyId,
        licenseTitle: licenseTitle.trim(),
        notes: notes.trim() || undefined,
        uploadedBy: profile.id,
        file: selectedFile
      }

      const response = await createLicense(createData)
      if (response.status === 'success') {
        showNotification('License uploaded successfully', 'success')
        // Refresh licenses from server
        await refreshLicenses()
        // Refresh all properties in parent
        await onRefreshProperties?.()
        resetUploadForm()
        setMode('list')
      } else {
        showNotification(response.message || 'Failed to upload license', 'error')
      }
    } catch (error) {
      console.error('Error uploading license:', error)
      showNotification('Error uploading license', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (license: PropertyLicense) => {
    setSelectedLicense(license)
    setLicenseTitle(license.licenseTitle)
    setNotes(license.notes || '')
    setMode('edit')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLicense || !licenseTitle.trim()) {
      showNotification('License title is required', 'error')
      return
    }

    setLoading(true)
    try {
      const updateData: UpdatePropertyLicensePayload = {
        licenseTitle: licenseTitle.trim(),
        notes: notes.trim() || undefined
      }

      const response = await updateLicense(selectedLicense.id, updateData)
      if (response.status === 'success') {
        showNotification('License updated successfully', 'success')
        // Refresh licenses from server
        await refreshLicenses()
        // Refresh all properties in parent
        await onRefreshProperties?.()
        resetUploadForm()
        setMode('list')
      } else {
        showNotification(response.message || 'Failed to update license', 'error')
      }
    } catch (error) {
      console.error('Error updating license:', error)
      showNotification('Error updating license', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (licenseId: string) => {
    if (!confirm('Are you sure you want to delete this license? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await deleteLicense(licenseId)
      if (response.status === 'success') {
        showNotification('License deleted successfully', 'success')
        // Refresh licenses from server
        await refreshLicenses()
        // Refresh all properties in parent
        await onRefreshProperties?.()
      } else {
        showNotification(response.message || 'Failed to delete license', 'error')
      }
    } catch (error) {
      console.error('Error deleting license:', error)
      showNotification('Error deleting license', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (license: PropertyLicense) => {
    try {
      await downloadLicense(license.id)
      showNotification('Download started', 'success')
    } catch (error) {
      console.error('Error downloading license:', error)
      showNotification('Error downloading license', 'error')
    }
  }

  const handlePreview = async (license: PropertyLicense) => {
    try {
      setLoading(true)
      const url = await getLicensePreviewUrl(license.id)
      setPreviewUrl(url)
      setSelectedLicense(license)
      setMode('preview')
    } catch (error) {
      console.error('Error loading preview:', error)
      showNotification('Error loading document preview', 'error')
    } finally {
      setLoading(false)
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

  const renderModeContent = () => {
    switch (mode) {
      case 'list':
        return (
          <div className="space-y-4">
            {/* List Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Property Licenses</h3>
              <button
                onClick={() => handleModeSwitch('upload')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                Upload License
              </button>
            </div>

            {/* Licenses Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-y-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">License</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {licenses.map((license) => (
                      <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <DocumentCheckIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{license.licenseTitle}</div>
                              <div className="text-xs text-gray-500">by {license.uploadedByName || 'Unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 line-clamp-2">{license.notes || '—'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(license.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handlePreview(license)}
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="Preview"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(license)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(license)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(license.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {licenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <DocumentCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No licenses found</p>
                          <p className="text-gray-400 text-sm">Upload your first license to get started.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'upload':
        return (
          <div className="space-y-4">
            {/* Upload Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Upload New License</h3>
              <button
                onClick={() => handleModeSwitch('list')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License File *</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragOver
                      ? 'border-blue-400 bg-blue-50'
                      : selectedFile
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <DocumentTextIcon className="mx-auto h-10 w-10 text-green-600" />
                      <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Drag and drop your license file here, or{' '}
                        <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                          click to browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Title *</label>
                <input
                  required
                  value={licenseTitle}
                  onChange={(e) => setLicenseTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g. STR License 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="e.g. Expires December 2025"
                  rows={3}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('list')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || !licenseTitle.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Upload License
                </button>
              </div>
            </form>
          </div>
        )

      case 'edit':
        return (
          <div className="space-y-4">
            {/* Edit Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Edit License</h3>
              <button
                onClick={() => handleModeSwitch('list')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Title *</label>
                <input
                  required
                  value={licenseTitle}
                  onChange={(e) => setLicenseTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('list')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Update License
                </button>
              </div>
            </form>
          </div>
        )

      case 'preview':
        return (
          <div className="space-y-4">
            {/* Preview Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedLicense?.licenseTitle}</h3>
                <p className="text-sm text-gray-500">
                  Uploaded by {selectedLicense?.uploadedByName || 'Unknown'} on{' '}
                  {selectedLicense && formatDate(selectedLicense.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedLicense && handleDownload(selectedLicense)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => handleModeSwitch('list')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[500px]"
                  title={`Preview of ${selectedLicense?.licenseTitle}`}
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="flex items-center justify-center h-[500px]">
                  <div className="text-center">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Document preview is loading...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Actions */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => handleModeSwitch('list')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Back to List
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => selectedLicense && handleEdit(selectedLicense)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit License
                </button>
                <button
                  onClick={() => selectedLicense && handleDownload(selectedLicense)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{propertyName}</h2>
        <p className="text-sm text-gray-500">Manage rental licenses for this property</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => handleModeSwitch('list')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'list' || mode === 'preview'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Licenses ({licenses.length})
        </button>
        <button
          onClick={() => handleModeSwitch('upload')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'upload'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Upload New
        </button>
        {selectedLicense && mode === 'edit' && (
          <button className="px-4 py-2 text-sm font-medium rounded-t-lg bg-blue-50 text-blue-600 border-b-2 border-blue-600">
            Edit License
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading licenses...</p>
          </div>
        </div>
      ) : (
        renderModeContent()
      )}

      {/* Modal Footer */}
      <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default PropertyLicenseModal
