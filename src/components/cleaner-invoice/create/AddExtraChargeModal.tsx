'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Modal from '@/components/shared/modal'
import { addInvoiceItem } from '@/services/cleanerInvoiceService'
import { uploadReceipt, searchReceipts } from '@/services/receiptService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { UploadedReceipt } from '@/services/types/receipt'
import {
  PlusIcon,
  PhotoIcon,
  DocumentTextIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

interface AddExtraChargeModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  onAdded: () => void
  defaultTaxable?: boolean
}

type ReceiptTab = 'upload' | 'select'

const AddExtraChargeModal: React.FC<AddExtraChargeModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onAdded,
  defaultTaxable = false,
}) => {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Charge form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isTaxable, setIsTaxable] = useState(false)

  // Receipt state
  const [receiptTab, setReceiptTab] = useState<ReceiptTab>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Select existing receipt state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UploadedReceipt[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<UploadedReceipt | null>(null)

  // Submission state
  const [submitting, setSubmitting] = useState(false)

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setDescription('')
      setAmount('')
      setNotes('')
      setIsTaxable(defaultTaxable)
      setFile(null)
      if (filePreview) URL.revokeObjectURL(filePreview)
      setFilePreview(null)
      setIsDragOver(false)
      setReceiptTab('upload')
      setSearchQuery('')
      setSearchResults([])
      setSelectedReceipt(null)
      setSubmitting(false)
    }
  }, [isOpen])

  // Load existing receipts when switching to select tab
  useEffect(() => {
    if (!isOpen || receiptTab !== 'select') return
    loadReceipts()
  }, [isOpen, receiptTab])

  // Debounced search
  useEffect(() => {
    if (receiptTab !== 'select') return
    const timer = setTimeout(() => {
      loadReceipts(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, receiptTab])

  const loadReceipts = async (search?: string) => {
    setSearchLoading(true)
    try {
      const res = await searchReceipts({ search: search || undefined, limit: 20 })
      if (res.status === 'success') {
        setSearchResults(res.data)
      }
    } catch (err) {
      console.error('Error loading receipts:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleFileSelect = useCallback((f: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(f.type)) {
      showNotification(t('invalidFileType'), 'error')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      showNotification(t('fileTooLarge'), 'error')
      return
    }
    setFile(f)
    setSelectedReceipt(null) // Clear any selected existing receipt
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f))
    } else {
      setFilePreview(null)
    }
  }, [showNotification])

  const removeFile = () => {
    setFile(null)
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
      setFilePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileSelect(files[0])
  }, [handleFileSelect])

  const selectExistingReceipt = (receipt: UploadedReceipt) => {
    if (selectedReceipt?.id === receipt.id) {
      setSelectedReceipt(null) // Deselect
    } else {
      setSelectedReceipt(receipt)
      setFile(null) // Clear any uploaded file
      if (filePreview) {
        URL.revokeObjectURL(filePreview)
        setFilePreview(null)
      }
    }
  }

  const handleSubmit = async () => {
    if (!description.trim() || !amount) return
    setSubmitting(true)

    try {
      let receiptId: string | null = null

      // If uploading a new file, upload first
      if (file) {
        const uploadRes = await uploadReceipt(file)
        if (uploadRes.status === 'success') {
          receiptId = uploadRes.data.receipt.id
        } else {
          showNotification(uploadRes.message || t('failedToUploadReceipt'), 'error')
          setSubmitting(false)
          return
        }
      } else if (selectedReceipt) {
        receiptId = selectedReceipt.id
      }

      // Add the invoice item
      const res = await addInvoiceItem(invoiceId, {
        description: description.trim(),
        amount: parseFloat(amount),
        notes: notes.trim() || undefined,
        receiptId,
        isTaxable,
      })

      if (res.status === 'success') {
        showNotification(t('extraChargeAdded'), 'success')
        onAdded()
        onClose()
      } else {
        showNotification(res.message || t('failedToAddExtraCharge'), 'error')
      }
    } catch (err) {
      console.error('Error adding extra charge:', err)
      showNotification(err instanceof Error ? err.message : t('errorAddingExtraCharge'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const hasReceipt = !!file || !!selectedReceipt

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-5 max-w-lg !w-11/12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <PlusIcon className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('addExtraChargeTitle')}</h2>
          <p className="text-[11px] text-gray-500">{t('addExtraChargeDescription')}</p>
        </div>
      </div>

      {/* Charge Details */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('chargeDescription')} *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('chargeDescriptionPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3">
          <div className="w-1/3">
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('chargeAmount')} *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('notes')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesOptionalPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Taxable Toggle */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setIsTaxable(!isTaxable)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            isTaxable
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
            isTaxable ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}>
            {isTaxable && <CheckIcon className="h-2.5 w-2.5 text-white" />}
          </div>
          {t('taxable')}
        </button>
      </div>

      {/* Receipt Section */}
      <div className="border-t border-gray-100 pt-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <PaperClipIcon className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attachReceipt')}</span>
          </div>
          {hasReceipt && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {t('attached')}
            </span>
          )}
        </div>

        {/* Receipt Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
          <button
            type="button"
            onClick={() => setReceiptTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              receiptTab === 'upload'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            {t('uploadNew')}
          </button>
          <button
            type="button"
            onClick={() => setReceiptTab('select')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l border-gray-200 cursor-pointer ${
              receiptTab === 'select'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
            {t('selectExisting')}
          </button>
        </div>

        {/* Upload Tab */}
        {receiptTab === 'upload' && (
          <div>
            {file ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Receipt preview"
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-emerald-200"
                  />
                ) : (
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
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
                className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
              >
                <PhotoIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  {t('dropReceiptHere')}{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    {t('browse')}
                  </button>
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{t('fileTypesDescription')}</p>
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
        )}

        {/* Select Existing Tab */}
        {receiptTab === 'select' && (
          <div>
            {/* Search */}
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchReceiptsPlaceholder')}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Results */}
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-100 p-1">
              {searchLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  {searchQuery ? t('noReceiptsFound') : t('noReceiptsUploadedYet')}
                </p>
              ) : (
                searchResults.map((receipt) => {
                  const isSelected = selectedReceipt?.id === receipt.id
                  return (
                    <button
                      key={receipt.id}
                      type="button"
                      onClick={() => selectExistingReceipt(receipt)}
                      className={`w-full text-left flex items-center gap-2.5 p-2 rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-300 ring-1 ring-emerald-300'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      {receipt.signedUrl && receipt.mimeType.startsWith('image/') ? (
                        <img
                          src={receipt.signedUrl}
                          alt=""
                          className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          <DocumentTextIcon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                          {receipt.originalName}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400">{formatDate(receipt.createdAt)}</span>
                          {receipt.propertyName && (
                            <>
                              <span className="text-[10px] text-gray-300">·</span>
                              <span className="text-[10px] text-gray-400 truncate">{receipt.propertyName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !description.trim() || !amount}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('addingCharge')}
            </>
          ) : (
            <>
              <PlusIcon className="h-3.5 w-3.5" />
              {t('addCharge')}
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}

export default AddExtraChargeModal
