'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { uploadReceipt } from '@/services/receiptService'
import type { UploadReceiptResponse } from '@/services/types/receipt'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface UploadReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onUploaded: (response: UploadReceiptResponse['data']) => void
  propertyId?: string
  supplyListId?: string
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
}) => {
  const [step, setStep] = useState<Step>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showNotification = useNotificationStore((s) => s.showNotification)

  useEffect(() => {
    if (!isOpen) {
      setStep('select')
      setSelectedFile(null)
      setIsDragOver(false)
      setError(null)
    }
  }, [isOpen])

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showNotification('Invalid file type. Upload an image or PDF.', 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      showNotification('File too large. Maximum 10MB.', 'error')
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

    setStep('uploading')
    setError(null)

    try {
      const res = await uploadReceipt(selectedFile, propertyId, supplyListId)
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
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Scan Receipt</h3>
        <p className="text-sm text-gray-500 mb-5">Upload a receipt image to extract data with OCR</p>

        {step === 'select' && (
          <>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('receipt-file-input')?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : selectedFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
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

              {selectedFile ? (
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
              ) : (
                <>
                  <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Drag & drop or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, or PDF up to 10MB</p>
                </>
              )}
            </div>

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
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload & Process
              </button>
            </div>
          </>
        )}

        {step === 'uploading' && (
          <div className="py-12 text-center">
            <ArrowPathIcon className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-base font-medium text-gray-900 mb-1">Processing receipt...</p>
            <p className="text-sm text-gray-500">Extracting data with OCR. This may take a few seconds.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default UploadReceiptModal
