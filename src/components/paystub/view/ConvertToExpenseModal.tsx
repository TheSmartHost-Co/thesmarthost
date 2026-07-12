'use client'

import { notifyError } from '@/utils/notify'
import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { convertPaystubItemToExpense } from '@/services/paystubService'
import type { PaystubItem } from '@/services/types/paystub'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { BanknotesIcon } from '@heroicons/react/24/outline'

interface ConvertToExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  paystubId: string
  item: PaystubItem | null
  userId: string
  onConverted: (item: PaystubItem) => void
}

const ConvertToExpenseModal: React.FC<ConvertToExpenseModalProps> = ({
  isOpen, onClose, paystubId, item, userId, onConverted,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [propertyId, setPropertyId] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !item) return
    setPropertyId(item.propertyId ?? '')
    setVendorName('')
    setCategory('')
    setExpenseDate(item.projectDate ?? new Date().toISOString().slice(0, 10))
    ;(async () => {
      try {
        const res = await getProperties(userId)
        if (res.status === 'success') setProperties(res.data)
      } catch { /* dropdown stays empty */ }
    })()
  }, [isOpen, item, userId])

  if (!item) return null

  const handleSubmit = async () => {
    if (!propertyId) {
      showNotification('Property is required.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await convertPaystubItemToExpense(paystubId, item.id, {
        propertyId,
        vendorName: vendorName.trim() || undefined,
        category: category.trim() || undefined,
        expenseDate: expenseDate || undefined,
        amount: item.amount,
        description: item.description,
      })
      if (res.status === 'success') {
        showNotification('Item converted to tracked expense.', 'success')
        onConverted(res.data.paystubItem)
        onClose()
      } else {
        showNotification(res.message || 'Failed to convert.', 'error')
      }
    } catch (err) {
      notifyError(err, 'Error converting.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12" zIndex={80}>
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <BanknotesIcon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Convert to expense</h2>
          <p className="text-[11px] text-gray-500">Track this line item as an expense in your books.</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="text-sm font-semibold text-gray-900">{item.description}</div>
        <div className="text-xs text-gray-500">Amount: ${item.amount.toFixed(2)}</div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Property *</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Shell"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. vehicle"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !propertyId}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Converting…' : 'Convert'}
        </button>
      </div>
    </Modal>
  )
}

export default ConvertToExpenseModal
