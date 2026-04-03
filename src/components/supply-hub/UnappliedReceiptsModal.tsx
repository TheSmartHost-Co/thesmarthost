'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'
import { searchReceipts } from '@/services/receiptService'
import type { UploadedReceipt } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import {
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

interface UnappliedReceiptsModalProps {
  isOpen: boolean
  onClose: () => void
  onReceiptApplied: () => void
  properties: Property[]
}

export default function UnappliedReceiptsModal({
  isOpen,
  onClose,
  onReceiptApplied,
  properties,
}: UnappliedReceiptsModalProps) {
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])
  const [reviewingReceiptId, setReviewingReceiptId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadUnappliedReceipts()
    } else {
      setReceipts([])
      setLoading(true)
      setReviewingReceiptId(null)
    }
  }, [isOpen])

  const loadUnappliedReceipts = async () => {
    setLoading(true)
    try {
      const res = await searchReceipts({ status: 'matched' })
      if (res.status === 'success') {
        const sorted = [...res.data].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setReceipts(sorted)
      } else {
        setReceipts([])
      }
    } catch (err) {
      console.error('Error loading unapplied receipts:', err)
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }

  const handleReceiptUpdated = () => {
    setReviewingReceiptId(null)
    loadUnappliedReceipts()
    onReceiptApplied()
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-2xl w-[calc(100%-1rem)] sm:w-11/12 !overflow-y-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unapplied Receipts</h2>
                <p className="text-xs text-gray-500">
                  {loading ? 'Loading...' : `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''} pending review`}
                </p>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600" />
                <p className="mt-3 text-sm text-gray-500">Loading receipts...</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && receipts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <DocumentTextIcon className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">All receipts have been reviewed</p>
                <p className="text-xs text-gray-500 mt-1">No unapplied receipts at this time</p>
              </div>
            )}

            {/* Receipt list */}
            {!loading && receipts.length > 0 && (
              <div className="space-y-2">
                {receipts.map(receipt => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DocumentTextIcon className="w-4.5 h-4.5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {receipt.propertyName || 'Unknown Property'}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="truncate">{receipt.originalName}</span>
                          <span className="flex-shrink-0">·</span>
                          <span className="flex-shrink-0 flex items-center gap-0.5">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(receipt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                        Pending Review
                      </span>
                      <button
                        onClick={() => setReviewingReceiptId(receipt.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Child modal: Review Receipt */}
      {reviewingReceiptId && (
        <ReceiptDetailModal
          isOpen={true}
          onClose={() => setReviewingReceiptId(null)}
          receiptId={reviewingReceiptId}
          properties={properties}
          onUpdated={handleReceiptUpdated}
          onDeleted={handleReceiptUpdated}
        />
      )}
    </>
  )
}
