'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Modal from '@/components/shared/modal'
import { scanSupplyListReceipt } from '@/services/supplyListService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { SupplyList } from '@/services/types/supplyList'
import {
  CameraIcon,
  PhotoIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

interface CleanerUploadReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  supplyLists: SupplyList[]
  onUploaded: () => void
}

export default function CleanerUploadReceiptModal({
  isOpen,
  onClose,
  supplyLists,
  onUploaded,
}: CleanerUploadReceiptModalProps) {
  const showNotification = useNotificationStore((s) => s.showNotification)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedListId, setSelectedListId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Only show non-fulfilled lists as options
  const eligibleLists = supplyLists.filter(sl => sl.status !== 'fulfilled')

  useEffect(() => {
    if (!isOpen) {
      setSelectedListId('')
      setFile(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
      setUploading(false)
      setIsDragOver(false)
    } else if (eligibleLists.length === 1) {
      setSelectedListId(eligibleLists[0].id)
    }
  }, [isOpen])

  const handleFileSelect = useCallback((f: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(f.type)) {
      showNotification('Invalid file type. Upload an image or PDF.', 'error')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      showNotification('File too large. Maximum 10MB.', 'error')
      return
    }
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }, [showNotification])

  const removeFile = () => {
    setFile(null)
    if (preview) {
      URL.revokeObjectURL(preview)
      setPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileSelect(files[0])
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!selectedListId || !file) return

    setUploading(true)
    try {
      const res = await scanSupplyListReceipt(selectedListId, file)
      if (res.status === 'success') {
        showNotification('Receipt uploaded! Your PM will review it.', 'success')
        onUploaded()
        onClose()
      } else {
        showNotification(res.message || 'Failed to upload receipt', 'error')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to upload receipt',
        'error'
      )
    } finally {
      setUploading(false)
    }
  }

  const selectedList = supplyLists.find(sl => sl.id === selectedListId)

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="sm:max-w-lg">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <CameraIcon className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Upload Receipt
          </h2>
        </div>
        <p className="text-xs text-gray-500 -mt-2 mb-4">
          Upload a receipt photo for your PM to review and create an expense
        </p>

        {/* Supply List Selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Supply List
          </label>
          {eligibleLists.length === 0 ? (
            <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded-lg">
              No active supply lists to attach a receipt to
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {eligibleLists.map(sl => {
                const isSelected = selectedListId === sl.id
                const itemPreview = sl.items.slice(0, 2).map(i => i.name).join(', ')
                const remaining = sl.items.length - 2
                return (
                  <button
                    key={sl.id}
                    type="button"
                    onClick={() => setSelectedListId(sl.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-400'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-teal-100' : 'bg-gray-100'
                      }`}>
                        {isSelected ? (
                          <CheckCircleIcon className="w-4 h-4 text-teal-600" />
                        ) : (
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                          {sl.propertyName || 'Unknown Property'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {sl.items.length} item{sl.items.length !== 1 ? 's' : ''}
                          {itemPreview ? ` — ${itemPreview}` : ''}
                          {remaining > 0 ? `, +${remaining}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* File Upload Area */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Receipt Photo
          </label>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
              {preview ? (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-teal-200"
                />
              ) : (
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-5 h-5 text-teal-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-[11px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer flex-shrink-0 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                isDragOver
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
            >
              <PhotoIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                Drop receipt here or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer"
                >
                  browse
                </button>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, GIF, WebP, PDF — max 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>

        {/* Selected list summary */}
        {selectedList && file && (
          <div className="mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-[11px] text-gray-500">
              Receipt will be uploaded to <span className="font-medium text-gray-700">{selectedList.propertyName}</span> supply list.
              Your PM will review the scanned items and create an expense.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedListId || !file}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                Upload Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
