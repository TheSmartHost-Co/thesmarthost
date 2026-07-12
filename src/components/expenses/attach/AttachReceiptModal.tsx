'use client'

import { notifyError } from '@/utils/notify'
import React, { useState, useEffect, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import TabBar from '@/components/shared/TabBar'
import ReceiptThumbnail from '@/components/shared/ReceiptThumbnail'
import { searchReceipts } from '@/services/receiptService'
import { attachReceipt } from '@/services/expenseService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { UploadedReceipt } from '@/services/types/receipt'
import type { AttachReceiptResponse } from '@/services/types/expense'
import { parseLocalDate } from '@/utils/dateUtils'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  CameraIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface AttachReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  onAttached: (data: AttachReceiptResponse['data']) => void
}

type Tab = 'existing' | 'upload'

const AttachReceiptModal: React.FC<AttachReceiptModalProps> = ({
  isOpen,
  onClose,
  expenseId,
  onAttached,
}) => {
  const { t } = useTranslation('expenses')
  const showNotification = useNotificationStore((s) => s.showNotification)

  const instanceId = useId()
  const fileInputId = `attach-file-${instanceId}`
  const cameraInputId = `attach-camera-${instanceId}`
  const [activeTab, setActiveTab] = useState<Tab>('existing')
  const [attaching, setAttaching] = useState(false)

  // ── Choose Existing tab state ──
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)

  // ── Upload New tab state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const loadReceipts = useCallback(async () => {
    setLoadingReceipts(true)
    try {
      const res = await searchReceipts({ status: 'matched', limit: 50 })
      if (res.status === 'success') {
        setReceipts(res.data || [])
      }
    } catch {
      // silent — empty list is fine
    } finally {
      setLoadingReceipts(false)
    }
  }, [])

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setActiveTab('existing')
      setAttaching(false)
      setSelectedReceiptId(null)
      setSelectedFile(null)
      setFileError(null)
      setSearch('')
      loadReceipts()
    }
  }, [isOpen, loadReceipts])

  // ── Attach existing receipt ──
  const handleAttachExisting = async () => {
    if (!selectedReceiptId) return
    setAttaching(true)
    try {
      const res = await attachReceipt(expenseId, { receiptId: selectedReceiptId })
      if (res.status === 'success') {
        showNotification(t('receiptAttached'), 'success')
        onAttached(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to attach receipt', 'error')
      }
    } catch (err) {
      console.error('Attach error:', err)
      notifyError(err, 'Error attaching receipt')
    } finally {
      setAttaching(false)
    }
  }

  // ── Upload and attach new receipt ──
  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError(t('invalidFileType'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('fileTooLarge'))
      return
    }
    setSelectedFile(file)
    setFileError(null)
  }

  const handleUploadAndAttach = async () => {
    if (!selectedFile) return
    setAttaching(true)
    setFileError(null)
    try {
      const res = await attachReceipt(expenseId, selectedFile)
      if (res.status === 'success') {
        showNotification(t('receiptAttached'), 'success')
        onAttached(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to attach receipt', 'error')
        setAttaching(false)
      }
    } catch (err) {
      console.error('Upload+attach error:', err)
      setFileError(err instanceof Error ? err.message : 'Error uploading receipt')
      setAttaching(false)
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    // expenseDate is a date-only "YYYY-MM-DD" (parse LOCAL to avoid the UTC-midnight
    // day-shift); createdAt is an ISO instant and formats normally (PAYSTUB-007).
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? parseLocalDate(dateStr) : new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const formatCurrency = (amount: number | string | null) => {
    if (amount == null) return '—'
    return `$${parseFloat(String(amount)).toFixed(2)}`
  }

  // Filter receipts by search
  const filteredReceipts = search.trim()
    ? receipts.filter((r) =>
        (r.vendorName || r.originalName || '').toLowerCase().includes(search.toLowerCase())
      )
    : receipts

  // ── Processing overlay (shown during upload+OCR) ──
  if (attaching && activeTab === 'upload') {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} style="max-w-lg w-full mx-4" closable={false}>
        <div className="p-6">
          <div className="py-12 text-center">
            <ArrowPathIcon className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-base font-medium text-gray-900 mb-1">{t('attaching')}</p>
            <p className="text-sm text-gray-500">{t('extractingDataWithOcr')}</p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-xl w-full mx-4 p-0 !overflow-y-hidden flex flex-col" closable={!attaching}>
      <div className="px-6 pt-6 pb-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('attachReceipt')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('attachReceiptDescription')}</p>
        <TabBar
          tabs={[
            { key: 'existing', label: t('chooseExisting') },
            { key: 'upload', label: t('uploadNew') },
          ]}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as Tab)}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-6">
        {/* ── Choose Existing Tab ── */}
        {activeTab === 'existing' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchReceiptsByVendor')}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Receipt list */}
            {loadingReceipts ? (
              <div className="py-8 text-center">
                <ArrowPathIcon className="w-6 h-6 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-500">Loading receipts...</p>
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="py-8 text-center">
                <DocumentTextIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">{t('noMatchedReceipts')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('noMatchedReceiptsHint')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto">
                {filteredReceipts.map((receipt) => {
                  const isSelected = selectedReceiptId === receipt.id
                  return (
                    <button
                      key={receipt.id}
                      type="button"
                      onClick={() => setSelectedReceiptId(isSelected ? null : receipt.id)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <ReceiptThumbnail
                          signedUrl={receipt.signedUrl}
                          mimeType={receipt.mimeType}
                          originalName={receipt.originalName}
                          imgClassName="w-full h-full object-cover"
                          pdfRenderWidth={80}
                          fallback={
                            <div className="w-full h-full flex items-center justify-center">
                              <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          }
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {receipt.vendorName || receipt.originalName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{formatDate(receipt.expenseDate || receipt.createdAt)}</span>
                          {receipt.total != null && (
                            <span className="text-xs font-semibold text-gray-700">{formatCurrency(receipt.total)}</span>
                          )}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Confirm button */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAttachExisting}
                disabled={!selectedReceiptId || attaching}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {attaching ? t('attaching') : t('selectReceipt')}
              </button>
            </div>
          </div>
        )}

        {/* ── Upload New Tab ── */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {selectedFile ? (
              <div
                onClick={() => document.getElementById(fileInputId)?.click()}
                className="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors border-green-300 bg-green-50"
              >
                <input
                  id={fileInputId}
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
                  onClick={() => document.getElementById(cameraInputId)?.click()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                >
                  <CameraIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{t('takePhoto')}</span>
                </button>
                <input
                  id={cameraInputId}
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
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    id={fileInputId}
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

            {fileError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {fileError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUploadAndAttach}
                disabled={!selectedFile || attaching}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('uploadAndProcess')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AttachReceiptModal
