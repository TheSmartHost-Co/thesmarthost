'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CloudArrowUpIcon, DocumentIcon, CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { getProperties } from '@/services/propertyService'
import { Property } from '@/services/types/property'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'

interface UploadStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  onFileUploaded?: (file: any) => void
  uploadedFile?: any
  selectedProperty?: Property | null
  onPropertySelected?: (property: Property) => void
}

const UploadStep: React.FC<UploadStepProps> = ({
  onNext,
  onBack,
  onCancel,
  canGoNext,
  canGoBack,
  config,
  onFileUploaded,
  uploadedFile,
  selectedProperty,
  onPropertySelected
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Load properties on component mount
  useEffect(() => {
    const loadProperties = async () => {
      if (!profile?.id) return

      try {
        setLoadingProperties(true)
        const response = await getProperties(profile.id)
        if (response.status === 'success') {
          setProperties(response.data)
        } else {
          showNotification(response.message || 'Failed to load properties', 'error')
        }
      } catch (error) {
        console.error('Error loading properties:', error)
        showNotification('Error loading properties', 'error')
      } finally {
        setLoadingProperties(false)
      }
    }

    loadProperties()
  }, [profile?.id, showNotification])

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (property && onPropertySelected) {
      onPropertySelected(property)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file type - CSV only for reliability
    const allowedTypes = ['.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      alert('Please upload a CSV file. If you have an Excel file, please save it as CSV first.')
      return
    }

    // Validate file size (10MB limit)
    const maxSize = config?.maxFileSize || 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size too large. Please upload a file smaller than 10MB.')
      return
    }

    setIsUploading(true)

    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false)
      if (onFileUploaded) {
        onFileUploaded(file)
      }
    }, 1500)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Booking Data</h2>
        <p className="text-gray-600">
          Upload a CSV or Excel file containing your booking data from your property management system.
        </p>
      </div>

      {/* Property Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Select Property
        </label>
        {loadingProperties ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
            <div className="animate-pulse flex space-x-2 items-center">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-4 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedProperty?.id || ''}
              onChange={(e) => handlePropertySelect(e.target.value)}
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              required
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.listingName} ({property.address})
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        )}
        {properties.length === 0 && !loadingProperties && (
          <p className="text-sm text-gray-500">
            No properties found. Please add a property first.
          </p>
        )}
      </div>

      {!uploadedFile ? (
        <>
          {/* File Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileSelect}
            />

            {isUploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Uploading...</h3>
                  <p className="text-gray-500">Please wait while we process your file</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {isDragging ? 'Drop your file here' : 'Upload your booking file'}
                  </h3>
                  <p className="text-gray-500">
                    Drag and drop your file here, or click to browse
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  Supports CSV files up to 10MB
                </div>
              </div>
            )}
          </div>

          {/* File Format Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-3">Have an Excel file?</h4>
            <p className="text-sm text-blue-700 mb-3">
              For best results, convert your Excel file to CSV format:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 pl-4">
              <li>1. Open your Excel file</li>
              <li>2. Go to File → Save As</li>
              <li>3. Choose "CSV (Comma delimited)" format</li>
              <li>4. Click Save</li>
            </ol>
          </div>

          {/* Supported Platforms */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Supported Platforms</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Hostaway', 'Airbnb', 'VRBO', 'Booking.com'].map(platform => (
                <div key={platform} className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                  <div className="text-sm font-medium text-gray-900">{platform}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* File Uploaded Successfully */
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mr-4" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-green-900">File Uploaded Successfully</h3>
              <div className="mt-2 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="h-4 w-4" />
                  <span>{uploadedFile.name}</span>
                  <span className="text-green-600">({formatFileSize(uploadedFile.size)})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={onNext}
          disabled={!canGoNext || !uploadedFile || !selectedProperty}
          className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Field Mapping
        </button>
      </div>
    </div>
  )
}

export default UploadStep