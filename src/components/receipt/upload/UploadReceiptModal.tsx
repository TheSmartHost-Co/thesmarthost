'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { uploadReceipt } from '@/services/receiptService'
import { getProperties } from '@/services/propertyService'
import type { UploadReceiptResponse } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  XMarkIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'

interface UploadReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onUploaded: (response: UploadReceiptResponse['data']) => void
  propertyId?: string
  supplyListId?: string
  /** Show a required property selector; upload is blocked until one is chosen.
      The propertyId prop seeds the selection when provided. */
  requireProperty?: boolean
}

type Step = 'select' | 'uploading'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const UploadReceiptModal: React.FC<UploadReceiptModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  propertyId,
  supplyListId,
  requireProperty,
}) => {
  const { t } = useTranslation(['expenses', 'common'])
  const [step, setStep] = useState<Step>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [loadedProperties, setLoadedProperties] = useState(false)
  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((s) => s.showNotification)

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

  useEffect(() => {
    if (isOpen && requireProperty) setSelectedPropertyId(propertyId || '')
  }, [isOpen, requireProperty, propertyId])

  useEffect(() => {
    if (isOpen && requireProperty) loadProperties()
  }, [isOpen, requireProperty, loadProperties])

  useEffect(() => {
    if (!isOpen) {
      setStep('select')
      setSelectedFile(null)
      setIsDragOver(false)
      setError(null)
      setSelectedPropertyId('')
    }
  }, [isOpen])

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showNotification(t('invalidFileType'), 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      showNotification(t('fileTooLarge'), 'error')
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
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return
    if (requireProperty && !selectedPropertyId) return

    setStep('uploading')
    setError(null)

    try {
      const res = await uploadReceipt(
        selectedFile,
        requireProperty ? selectedPropertyId : propertyId,
        supplyListId
      )
      if (res.status === 'success') {
        onUploaded(res.data)
        onClose()
      } else {
        setError(res.message || 'Failed to process receipt')
        setStep('select')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Network error during upload')
      setStep('select')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-lg w-full mx-4" closable={step !== 'uploading'}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('scanReceipt')}</h3>
        <p className="text-sm text-gray-500 mb-5">{t('uploadReceiptDescription')}</p>

        {step === 'select' && (
          <>
            {selectedFile ? (
              /* Selected file preview */
              <div
                onClick={() => document.getElementById('receipt-file-input')?.click()}
                className="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors border-green-300 bg-green-50"
              >
                <input
                  id="receipt-file-input"
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                    }}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Take Photo button */}
                <button
                  type="button"
                  onClick={() => document.getElementById('receipt-camera-input')?.click()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                >
                  <CameraIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{t('takePhoto')}</span>
                </button>
                <input
                  id="receipt-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                    e.target.value = ''
                  }}
                  className="hidden"
                />

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">{t('orUploadAFile')}</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('receipt-file-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    id="receipt-file-input"
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">{t('dragDropOrBrowse')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('allowedFileTypes')}</p>
                </div>
              </div>
            )}

            {requireProperty && (
              <div className="mt-4">
                <label htmlFor="receipt-property-select" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common:property')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="receipt-property-select"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('common:selectAProperty')}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || (requireProperty && !selectedPropertyId)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('uploadAndProcess')}
              </button>
            </div>
          </>
        )}

        {step === 'uploading' && (
          <div className="py-12 text-center">
            <ArrowPathIcon className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-base font-medium text-gray-900 mb-1">{t('processingReceipt')}</p>
            <p className="text-sm text-gray-500">{t('extractingDataWithOcr')}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default UploadReceiptModal
