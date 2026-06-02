'use client'

import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { searchReceipts, uploadReceipt } from '@/services/receiptService'
import type { UploadedReceipt } from '@/services/types/receipt'
import { addPaystubItem } from '@/services/paystubService'
import type { PaystubItem } from '@/services/types/paystub'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ReceiptPercentIcon, MagnifyingGlassIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { formatMoney } from '@/lib/format'

interface AddReceiptToPaystubModalProps {
  isOpen: boolean
  onClose: () => void
  paystubId: string
  userId: string
  onAdded: (item: PaystubItem) => void
}

const AddReceiptToPaystubModal: React.FC<AddReceiptToPaystubModalProps> = ({
  isOpen, onClose, paystubId, userId, onAdded,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [attaching, setAttaching] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  // Used when receipt has no property_id — user must pick one before applying
  const [propertyOverrides, setPropertyOverrides] = useState<Record<string, string>>({})

  const loadReceipts = async () => {
    setLoading(true)
    try {
      const res = await searchReceipts({ status: 'matched', linked: 'unlinked' })
      if (res.status === 'success') setReceipts(res.data)
      else showNotification(res.message || 'Failed to load receipts.', 'error')
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setPropertyOverrides({})
      return
    }
    loadReceipts()
    ;(async () => {
      try {
        const res = await getProperties(userId)
        if (res.status === 'success') setProperties(res.data)
      } catch { /* dropdown stays empty */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  const handleAttach = async (receipt: UploadedReceipt) => {
    const overridePropertyId = propertyOverrides[receipt.id]
    if (!receipt.propertyId && !overridePropertyId) {
      showNotification('Pick a property for this receipt first.', 'error')
      return
    }
    setAttaching(receipt.id)
    try {
      const res = await addPaystubItem(paystubId, {
        receiptId: receipt.id,
        propertyId: overridePropertyId || undefined,
      })
      if (res.status === 'success') {
        showNotification('Receipt added to paystub.', 'success')
        onAdded(res.data)
        setReceipts(list => list.filter(r => r.id !== receipt.id))
      } else {
        showNotification(res.message || 'Failed to attach receipt.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error attaching receipt.', 'error')
    } finally {
      setAttaching(null)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await uploadReceipt(file)
      }
      showNotification('Receipt uploaded — processing.', 'success')
      // Re-fetch in a moment so newly-matched receipts surface
      setTimeout(loadReceipts, 1500)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const filtered = receipts.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (r.vendorName?.toLowerCase().includes(q) ?? false) ||
      (r.description?.toLowerCase().includes(q) ?? false) ||
      (r.propertyName?.toLowerCase().includes(q) ?? false) ||
      r.originalName.toLowerCase().includes(q)
    )
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-xl w-11/12" zIndex={80}>
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <ReceiptPercentIcon className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Add receipt</h2>
          <p className="text-[11px] text-gray-500">Pick a matched receipt or upload a new one.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 border border-purple-200">
          <ArrowUpTrayIcon className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      <div className="max-h-96 overflow-y-auto -mx-2">
        {loading ? (
          <div className="px-2 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-gray-500">
            {search.trim() ? 'No matches.' : 'No matched receipts available. Upload one above.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(r => (
              <li key={r.id} className="px-2 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {r.vendorName || r.originalName}
                    </div>
                    {r.description && (
                      <div className="text-xs text-gray-600 truncate">{r.description}</div>
                    )}
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {r.expenseDate || '—'}
                      {r.propertyName && <> · {r.propertyName}</>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.total != null && (
                      <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(r.total, 'CAD')}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAttach(r)}
                      disabled={attaching === r.id || (!r.propertyId && !propertyOverrides[r.id])}
                      className="mt-1 text-xs font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
                    >
                      {attaching === r.id ? 'Adding…' : 'Add to paystub'}
                    </button>
                  </div>
                </div>
                {!r.propertyId && (
                  <select
                    value={propertyOverrides[r.id] ?? ''}
                    onChange={(e) => setPropertyOverrides(o => ({ ...o, [r.id]: e.target.value }))}
                    className="mt-2 w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded text-amber-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Pick a property for this receipt…</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}

export default AddReceiptToPaystubModal
