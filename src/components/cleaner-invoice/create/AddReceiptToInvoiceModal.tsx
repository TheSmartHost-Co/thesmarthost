'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '@/components/shared/modal'
import { addInvoiceItem } from '@/services/cleanerInvoiceService'
import { uploadReceipt, searchReceipts, applyReceipt } from '@/services/receiptService'
import { getProperties } from '@/services/propertyService'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import type { UploadedReceipt, ReceiptDetail, AutoApplyReceiptResponse, ApplyReceiptPayload } from '@/services/types/receipt'
import type { CleanerInvoiceItem } from '@/services/types/cleanerInvoice'
import type { Property } from '@/services/types/property'
import ReceiptThumbnail from '@/components/shared/ReceiptThumbnail'
import {
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  CameraIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface AddReceiptToInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  cleanerId: string
  onAdded: (item: CleanerInvoiceItem) => void
}

type Tab = 'upload' | 'unapplied'

type UploadStep = 'select' | 'uploading' | 'preview'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024

const AddReceiptToInvoiceModal: React.FC<AddReceiptToInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  cleanerId,
  onAdded,
}) => {
  const { t } = useTranslation('turnover')
  const { t: tExpenses } = useTranslation('expenses')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const profile = useUserStore((s) => s.profile)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Shared state
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [submitting, setSubmitting] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])

  // Tab 1: Upload state
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStep, setUploadStep] = useState<UploadStep>('select')
  const [uploadPropertyId, setUploadPropertyId] = useState('')
  const [ocrResult, setOcrResult] = useState<{ receipt: ReceiptDetail; expenseId: string } | null>(null)

  // Tab 2: Unapplied receipts state
  const [unappliedReceipts, setUnappliedReceipts] = useState<UploadedReceipt[]>([])
  const [unappliedLoading, setUnappliedLoading] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<UploadedReceipt | null>(null)
  const [applyPropertyId, setApplyPropertyId] = useState('')

  // Load properties on open
  useEffect(() => {
    if (!isOpen || !profile?.id) return
    const parentId = profile.pmUserId || profile.id
    getProperties(parentId).then((res) => {
      if (res.status === 'success') setProperties(res.data)
    }).catch(console.error)
  }, [isOpen, profile?.id])

  // Load data when switching tabs
  useEffect(() => {
    if (!isOpen) return
    if (activeTab === 'unapplied') loadUnappliedReceipts()
  }, [isOpen, activeTab])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('upload')
      setSubmitting(false)
      setFile(null)
      if (filePreview) URL.revokeObjectURL(filePreview)
      setFilePreview(null)
      setIsDragOver(false)
      setUploadStep('select')
      setUploadPropertyId('')
      setOcrResult(null)
      setUnappliedReceipts([])
      setSelectedReceipt(null)
      setApplyPropertyId('')
    }
  }, [isOpen])

  const loadUnappliedReceipts = async () => {
    setUnappliedLoading(true)
    try {
      const [pendingRes, matchedRes] = await Promise.all([
        searchReceipts({ status: 'pending', limit: 50 }),
        searchReceipts({ status: 'matched', limit: 50 }),
      ])
      const combined: UploadedReceipt[] = []
      if (pendingRes.status === 'success') combined.push(...pendingRes.data)
      if (matchedRes.status === 'success') combined.push(...matchedRes.data)
      setUnappliedReceipts(combined)
    } catch (err) {
      console.error('Error loading unapplied receipts:', err)
    } finally {
      setUnappliedLoading(false)
    }
  }

  // --- Tab 1: Upload handlers ---

  const handleFileSelect = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      showNotification(t('invalidFileType'), 'error')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      showNotification(t('fileTooLarge'), 'error')
      return
    }
    setFile(f)
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f))
    } else {
      setFilePreview(null)
    }
  }, [showNotification, t])

  const removeFile = () => {
    setFile(null)
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
      setFilePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) handleFileSelect(files[0])
  }, [handleFileSelect])

  const handleUploadAndApply = async () => {
    if (!file || !uploadPropertyId) return
    setUploadStep('uploading')

    try {
      const res = await uploadReceipt(file, uploadPropertyId, undefined, {
        autoApply: true,
        category: 'SUPPLIES',
        paidByType: 'CLEANER',
        paidById: cleanerId,
        supplyList: { mode: 'none' },
      }) as AutoApplyReceiptResponse

      if (res.status === 'success') {
        const expenseId = (res.data.expense as { id: string }).id
        setOcrResult({ receipt: res.data.receipt, expenseId })
        setUploadStep('preview')
      } else {
        showNotification(res.message || t('failedToUploadAndApply'), 'error')
        setUploadStep('select')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showNotification(err instanceof Error ? err.message : t('failedToUploadAndApply'), 'error')
      setUploadStep('select')
    }
  }

  const handleConfirmUpload = async () => {
    if (!ocrResult) return
    setSubmitting(true)

    try {
      const res = await addInvoiceItem(invoiceId, {
        expenseId: ocrResult.expenseId,
        receiptId: ocrResult.receipt.id,
      })
      if (res.status === 'success') {
        showNotification(t('receiptAddedToInvoice'), 'success')
        onAdded(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToAddReceiptExpense'), 'error')
      }
    } catch (err) {
      console.error('Error adding expense to invoice:', err)
      showNotification(err instanceof Error ? err.message : t('failedToAddReceiptExpense'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Tab 2: Unapplied receipt handlers ---

  const handleApplyAndAdd = async () => {
    if (!selectedReceipt || !applyPropertyId) return
    setSubmitting(true)

    try {
      const payload: ApplyReceiptPayload = {
        propertyId: applyPropertyId,
        expenseDate: selectedReceipt.expenseDate || new Date().toISOString().split('T')[0],
        vendorName: selectedReceipt.vendorName || 'Unknown',
        category: 'SUPPLIES',
        paymentMethod: selectedReceipt.total ? 'credit_card' : 'OTHER',
        paidByType: 'CLEANER',
        paidById: cleanerId,
        subtotal: selectedReceipt.subtotal ? parseFloat(String(selectedReceipt.subtotal)) : 0,
        taxGst: null,
        taxPst: null,
        taxHst: null,
        taxQst: null,
        taxTotal: selectedReceipt.taxTotal ? parseFloat(String(selectedReceipt.taxTotal)) : 0,
        supplyList: { mode: 'none' },
      }

      const applyRes = await applyReceipt(selectedReceipt.id, payload)
      if (applyRes.status !== 'success') {
        showNotification(applyRes.message || t('failedToApplyReceipt'), 'error')
        setSubmitting(false)
        return
      }

      const expenseId = (applyRes.data.expense as { id: string }).id
      const addRes = await addInvoiceItem(invoiceId, {
        expenseId,
        receiptId: selectedReceipt.id,
      })
      if (addRes.status === 'success') {
        showNotification(t('receiptAddedToInvoice'), 'success')
        onAdded(addRes.data)
        onClose()
      } else {
        showNotification(addRes.message || t('failedToAddReceiptExpense'), 'error')
      }
    } catch (err) {
      console.error('Error applying receipt:', err)
      showNotification(err instanceof Error ? err.message : t('failedToApplyReceipt'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatAmount = (amount: number | null | undefined) => {
    if (amount == null) return '$0.00'
    return `$${Number(amount).toFixed(2)}`
  }

  // --- Property picker component ---

  const PropertyPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{t('selectProperty')} *</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
      >
        <option value="">{t('selectProperty')}</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.address}
          </option>
        ))}
      </select>
    </div>
  )

  // --- Footer button config ---

  const getFooterAction = () => {
    if (activeTab === 'upload') {
      if (uploadStep === 'preview') {
        return { label: t('addToInvoice'), onClick: handleConfirmUpload, disabled: submitting }
      }
      return { label: t('uploadAndAdd'), onClick: handleUploadAndApply, disabled: !file || !uploadPropertyId || uploadStep === 'uploading' }
    }
    return { label: t('applyAndAdd'), onClick: handleApplyAndAdd, disabled: !selectedReceipt || !applyPropertyId || submitting }
  }

  const footer = getFooterAction()

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-5 max-w-lg !w-11/12" closable={uploadStep !== 'uploading'}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <DocumentTextIcon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('addReceiptToInvoiceTitle')}</h2>
          <p className="text-[11px] text-gray-500">{t('addReceiptToInvoiceDescription')}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
        {([
          { key: 'upload' as Tab, icon: ArrowUpTrayIcon, label: t('uploadNewTab') },
          { key: 'unapplied' as Tab, icon: ClipboardDocumentListIcon, label: t('unappliedReceiptsTab') },
        ]).map(({ key, icon: Icon, label }, i) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
              i > 0 ? 'border-l border-gray-200' : ''
            } ${
              activeTab === key
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mb-4">
        {/* === Tab 1: Upload New === */}
        {activeTab === 'upload' && (
          <div>
            {uploadStep === 'select' && (
              <div className="space-y-3">
                <PropertyPicker value={uploadPropertyId} onChange={setUploadPropertyId} />

                {file ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Receipt preview"
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-green-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DocumentTextIcon className="w-5 h-5 text-green-600" />
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
                  <div className="space-y-3">
                    {/* Camera button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium"
                    >
                      <CameraIcon className="w-4 h-4" />
                      {t('takePhoto')}
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileSelect(f)
                        e.target.value = ''
                      }}
                      className="hidden"
                    />

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-[10px] text-gray-400 font-medium uppercase">{tExpenses('orUploadAFile')}</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Drop zone */}
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                        isDragOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PhotoIcon className="mx-auto h-7 w-7 text-gray-300 mb-1.5" />
                      <p className="text-sm text-gray-500">{tExpenses('dragDropOrBrowse')}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{tExpenses('allowedFileTypes')}</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_TYPES.join(',')}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileSelect(f)
                        e.target.value = ''
                      }}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            )}

            {uploadStep === 'uploading' && (
              <div className="py-10 text-center">
                <ArrowPathIcon className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium text-gray-900 mb-0.5">{tExpenses('processingReceipt')}</p>
                <p className="text-xs text-gray-500">{tExpenses('extractingDataWithOcr')}</p>
              </div>
            )}

            {uploadStep === 'preview' && ocrResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t('ocrPreviewTitle')}</p>
                    <p className="text-[11px] text-gray-500">{t('ocrPreviewSubtitle')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{t('vendor')}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {ocrResult.receipt.vendorName || t('unknownVendor')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{t('total')}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatAmount(ocrResult.receipt.total || ocrResult.receipt.subtotal)}
                    </span>
                  </div>
                  {ocrResult.receipt.expenseDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{t('date')}</span>
                      <span className="text-sm text-gray-700">{formatDate(ocrResult.receipt.expenseDate)}</span>
                    </div>
                  )}
                </div>

                {ocrResult.receipt.lineItems && ocrResult.receipt.lineItems.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">{t('items')}</p>
                    <div className="space-y-1.5">
                      {ocrResult.receipt.lineItems.slice(0, 8).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-600 truncate mr-2">{item.name}</span>
                          <span className="text-gray-900 font-medium tabular-nums flex-shrink-0">
                            {formatAmount(item.totalPrice)}
                          </span>
                        </div>
                      ))}
                      {ocrResult.receipt.lineItems.length > 8 && (
                        <p className="text-[10px] text-gray-400">
                          +{ocrResult.receipt.lineItems.length - 8} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === Tab 2: Unapplied Receipts === */}
        {activeTab === 'unapplied' && (
          <div className="space-y-3">
            {unappliedLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : unappliedReceipts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-0.5">{t('noUnappliedReceipts')}</p>
                <p className="text-xs text-gray-500 max-w-xs">{t('noUnappliedReceiptsDescription')}</p>
              </div>
            ) : (
              <>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-100 p-1">
                  {unappliedReceipts.map((receipt) => {
                    const isSelected = selectedReceipt?.id === receipt.id
                    return (
                      <button
                        key={receipt.id}
                        type="button"
                        onClick={() => {
                          setSelectedReceipt(isSelected ? null : receipt)
                          if (!isSelected && receipt.propertyId) setApplyPropertyId(receipt.propertyId)
                        }}
                        className={`w-full text-left flex items-center gap-2.5 p-2 rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-300 ring-1 ring-emerald-300'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200 ${
                          isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          <ReceiptThumbnail
                            signedUrl={receipt.signedUrl}
                            mimeType={receipt.mimeType}
                            originalName={receipt.originalName}
                            imgClassName="w-full h-full object-cover"
                            pdfRenderWidth={120}
                            fallback={
                              <DocumentTextIcon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                            {receipt.vendorName || receipt.originalName}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">{formatDate(receipt.createdAt)}</span>
                            {receipt.propertyId && (
                              <>
                                <span className="text-[10px] text-gray-300">&middot;</span>
                                <span className="text-[10px] text-gray-400 truncate">{properties.find((p) => p.id === receipt.propertyId)?.address || receipt.propertyName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-900 tabular-nums flex-shrink-0">
                          {formatAmount(receipt.total || receipt.subtotal)}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {selectedReceipt && (
                  <PropertyPicker value={applyPropertyId} onChange={setApplyPropertyId} />
                )}
              </>
            )}
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
          onClick={footer.onClick}
          disabled={footer.disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting || uploadStep === 'uploading' ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {uploadStep === 'uploading' ? t('uploadingReceipt') : t('addingToInvoice')}
            </>
          ) : (
            footer.label
          )}
        </button>
      </div>
    </Modal>
  )
}

export default AddReceiptToInvoiceModal
