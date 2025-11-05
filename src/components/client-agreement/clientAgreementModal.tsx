'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { 
  getAgreementsByClientId, 
  createAgreement, 
  updateAgreement, 
  deleteAgreement, 
  setDefaultAgreement,
  downloadAgreement,
  getDocumentPreviewUrl
} from '@/services/clientAgreementService'
import { ClientAgreement, CreateClientAgreementPayload, UpdateClientAgreementPayload } from '@/services/types/clientAgreement'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  DocumentTextIcon,
  StarIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface ClientAgreementModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onAgreementUpdate?: () => void
}

type ModalMode = 'list' | 'upload' | 'edit' | 'preview'

const ClientAgreementModal: React.FC<ClientAgreementModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onAgreementUpdate,
}) => {
  const [agreements, setAgreements] = useState<ClientAgreement[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('list')
  const [selectedAgreement, setSelectedAgreement] = useState<ClientAgreement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [agreementTitle, setAgreementTitle] = useState('')
  const [version, setVersion] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && clientId) {
      fetchAgreements()
      setMode('list') // Always start in list mode
    }
  }, [isOpen, clientId])

  const fetchAgreements = async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const response = await getAgreementsByClientId(clientId)
      if (response.status === 'success') {
        setAgreements(response.data)
      } else {
        showNotification('Failed to fetch agreements', 'error')
      }
    } catch (error) {
      console.error('Error fetching agreements:', error)
      showNotification('Error fetching agreements', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetUploadForm = () => {
    setSelectedFile(null)
    setAgreementTitle('')
    setVersion('')
    setIsDefault(false)
    setSelectedAgreement(null)
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
    if (!agreementTitle) {
      // Auto-populate title from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setAgreementTitle(nameWithoutExt)
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

    if (!selectedFile || !agreementTitle.trim() || !profile?.id) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    try {
      const createData: CreateClientAgreementPayload = {
        clientId,
        agreementTitle: agreementTitle.trim(),
        version: version.trim() || '1.0',
        uploadedBy: profile.id,
        isDefault,
        file: selectedFile
      }

      const response = await createAgreement(createData)
      if (response.status === 'success') {
        showNotification('Agreement uploaded successfully', 'success')
        fetchAgreements()
        resetUploadForm()
        setMode('list')
        onAgreementUpdate?.()
      } else {
        showNotification(response.message || 'Failed to upload agreement', 'error')
      }
    } catch (error) {
      console.error('Error uploading agreement:', error)
      showNotification('Error uploading agreement', 'error')
    }
  }

  const handleEdit = (agreement: ClientAgreement) => {
    setSelectedAgreement(agreement)
    setAgreementTitle(agreement.agreementTitle)
    setVersion(agreement.version)
    setIsDefault(agreement.isDefault)
    setMode('edit')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAgreement || !agreementTitle.trim()) {
      showNotification('Agreement title is required', 'error')
      return
    }

    try {
      const updateData: UpdateClientAgreementPayload = {
        agreementTitle: agreementTitle.trim(),
        version: version.trim(),
        isDefault
      }

      const response = await updateAgreement(selectedAgreement.id, updateData)
      if (response.status === 'success') {
        showNotification('Agreement updated successfully', 'success')
        fetchAgreements()
        resetUploadForm()
        setMode('list')
        onAgreementUpdate?.()
      } else {
        showNotification(response.message || 'Failed to update agreement', 'error')
      }
    } catch (error) {
      console.error('Error updating agreement:', error)
      showNotification('Error updating agreement', 'error')
    }
  }

  const handleDelete = async (agreementId: string) => {
    if (!confirm('Are you sure you want to delete this agreement? This action cannot be undone.')) {
      return
    }

    try {
      const response = await deleteAgreement(agreementId)
      if (response.status === 'success') {
        showNotification('Agreement deleted successfully', 'success')
        fetchAgreements()
        onAgreementUpdate?.()
      } else {
        showNotification(response.message || 'Failed to delete agreement', 'error')
      }
    } catch (error) {
      console.error('Error deleting agreement:', error)
      showNotification('Error deleting agreement', 'error')
    }
  }

  const handleSetDefault = async (agreementId: string) => {
    try {
      const response = await setDefaultAgreement(agreementId)
      if (response.status === 'success') {
        showNotification('Default agreement updated successfully', 'success')
        fetchAgreements()
        onAgreementUpdate?.()
      } else {
        showNotification(response.message || 'Failed to set default agreement', 'error')
      }
    } catch (error) {
      console.error('Error setting default agreement:', error)
      showNotification('Error setting default agreement', 'error')
    }
  }

  const handleDownload = async (agreement: ClientAgreement) => {
    try {
      await downloadAgreement(agreement.id)
      showNotification('Download started', 'success')
    } catch (error) {
      console.error('Error downloading agreement:', error)
      showNotification('Error downloading agreement', 'error')
    }
  }

  const handlePreview = async (agreement: ClientAgreement) => {
    try {
      setLoading(true)
      const url = await getDocumentPreviewUrl(agreement.id)
      setPreviewUrl(url)
      setSelectedAgreement(agreement)
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
              <h3 className="text-lg font-medium text-black">Client Agreements</h3>
              <button
                onClick={() => handleModeSwitch('upload')}
                className="cursor-pointer flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>Upload Agreement</span>
              </button>
            </div>
            
            {/* Agreements Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-y-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agreements.map((agreement) => (
                      <tr key={agreement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{agreement.agreementTitle}</div>
                            <div className="text-sm text-gray-500">by {agreement.uploadedByName || 'Unknown'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {agreement.version}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleSetDefault(agreement.id)}
                            className="cursor-pointer text-gray-400 hover:text-yellow-500 transition-colors"
                            title={agreement.isDefault ? 'Remove as default' : 'Set as default'}
                          >
                            {agreement.isDefault ? (
                              <StarIconSolid className="w-5 h-5 text-yellow-500" />
                            ) : (
                              <StarIcon className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(agreement.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex space-x-4">
                            <button
                              onClick={() => handlePreview(agreement)}
                              className="cursor-pointer text-purple-600 hover:text-purple-800"
                              title="Preview"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(agreement)}
                              className="cursor-pointer text-green-600 hover:text-green-800"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(agreement)}
                              className="cursor-pointer text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(agreement.id)}
                              className="cursor-pointer text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {agreements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No agreements found. Upload your first agreement to get started.
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
              <h3 className="text-lg font-medium text-black">Upload New Agreement</h3>
              <button
                onClick={() => handleModeSwitch('list')}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-black">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium mb-2">Agreement File *</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : selectedFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <DocumentTextIcon className="mx-auto h-8 w-8 text-green-600" />
                      <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="cursor-pointer text-xs text-red-600 hover:text-red-800"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Drag and drop your agreement file here, or{' '}
                        <label className="text-blue-600 hover:text-blue-800 cursor-pointer">
                          click to browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Agreement Title *</label>
                  <input
                    required
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Property Management Agreement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Version</label>
                  <input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 1.0"
                  />
                </div>
              </div>

              {/* Default Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Set as default agreement for this client</span>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('list')}
                  className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || !agreementTitle.trim()}
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Upload Agreement
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
              <h3 className="text-lg font-medium text-black">Edit Agreement</h3>
              <button
                onClick={() => handleModeSwitch('list')}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-black">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Agreement Title *</label>
                  <input
                    required
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Version</label>
                  <input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Default Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Set as default agreement for this client</span>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('list')}
                  className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Agreement
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
                <h3 className="text-lg font-medium text-black">
                  {selectedAgreement?.agreementTitle} v{selectedAgreement?.version}
                </h3>
                <p className="text-sm text-gray-500">
                  Uploaded by {selectedAgreement?.uploadedByName || 'Unknown'} on{' '}
                  {selectedAgreement && formatDate(selectedAgreement.createdAt)}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => selectedAgreement && handleDownload(selectedAgreement)}
                  className="cursor-pointer flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleModeSwitch('list')}
                  className="cursor-pointer text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px]"
                  title={`Preview of ${selectedAgreement?.agreementTitle}`}
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="flex items-center justify-center h-[600px] bg-gray-50">
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
                className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to List
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => selectedAgreement && handleEdit(selectedAgreement)}
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Agreement
                </button>
                <button
                  onClick={() => selectedAgreement && handleDownload(selectedAgreement)}
                  className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-6xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Client - {clientName}</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading agreements...</div>
        </div>
      ) : (
        renderModeContent()
      )}

      {/* Modal Footer */}
      <div className="flex justify-end pt-6 border-t mt-6">
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

export default ClientAgreementModal