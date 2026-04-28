'use client'

import React, { useState, useCallback } from 'react'
import Modal from '@/components/shared/modal'
import { uploadReceipt } from '@/services/receiptService'
import { getProperties } from '@/services/propertyService'
import type { AutoApplyOptions, AutoApplyReceiptResponse } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CameraIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

interface ScanReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onExpenseCreated: (expenseId: string) => void
}

type ModalStep = 'upload' | 'processing'

const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated,
}) => {
  const [step, setStep] = useState<ModalStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propertyId, setPropertyId] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [loadedProperties, setLoadedProperties] = useState(false)

  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load properties on open
  const loadProperties = useCallback(async () => {
    if (!effectiveUserId || loadedProperties) return
    try {
      const res = await getProperties(effectiveUserId)
      if (res.status === 'success') setProperties(res.data || [])
      setLoadedProperties(true)
    } catch (err) {
      console.error('Error loading properties:', err)
    }
  }, [effectiveUserId, loadedProperties])

  React.useEffect(() => {
    if (isOpen) loadProperties()
  }, [isOpen, loadProperties])

  // Reset on close
  React.useEffect(() => {
    if (!isOpen) {
      setStep('upload')
      setSelectedFile(null)
      setIsDragOver(false)
      setError(null)
      setPropertyId('')
    }
  }, [isOpen])

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
    ]
    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Please upload an image or PDF.', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification('File too large. Maximum size is 10MB.', 'error')
      return
    }
    setSelectedFile(file)
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileSelect(files[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleScanAndApply = async () => {
    if (!selectedFile) return

    setStep('processing')
    setError(null)

    try {
      const autoApplyOptions: AutoApplyOptions = { autoApply: true }
      const response = await uploadReceipt(
        selectedFile,
        propertyId || undefined,
        undefined,
        autoApplyOptions,
      )

      if (response.status === 'success') {
        const autoApplyRes = response as AutoApplyReceiptResponse
        const expenseId = (autoApplyRes.data.expense as { id: string }).id
        showNotification('Receipt scanned and expense created!', 'success')
        onExpenseCreated(expenseId)
        onClose()
      } else {
        setError(response.message || 'Failed to scan receipt')
        setStep('upload')
      }
    } catch (err) {
      console.error('Scan & apply error:', err)
      setError('Error processing receipt. Please try again.')
      setStep('upload')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-xl w-11/12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CameraIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scan Receipt</h2>
          <p className="text-sm text-gray-500">
            Upload a receipt and we&apos;ll create an expense automatically
          </p>
        </div>
      </div>

      {step === 'processing' ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="mt-4 text-lg font-medium text-gray-900">Scanning receipt...</p>
          <p className="text-sm text-gray-500">Extracting details and creating expense</p>
        </div>
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                {selectedFile.type.startsWith('image/') ? (
                  <PhotoIcon className="w-10 h-10 text-green-600" />
                ) : (
                  <DocumentTextIcon className="w-10 h-10 text-green-600" />
                )}
                <div className="text-left">
                  <p className="font-medium text-green-700">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="cursor-pointer ml-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-600">
                  Drag and drop your receipt here, or{' '}
                  <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG, GIF, WEBP, PDF (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Property Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property (optional)
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.listingName}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScanAndApply}
              disabled={!selectedFile}
              className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CameraIcon className="w-5 h-5" />
              Scan & Create Expense
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default ScanReceiptModal
