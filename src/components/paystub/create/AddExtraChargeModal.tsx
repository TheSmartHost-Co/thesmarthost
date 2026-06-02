'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { addPaystubItem } from '@/services/paystubService'
import type { PaystubItem } from '@/services/types/paystub'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { PlusIcon } from '@heroicons/react/24/outline'

interface AddExtraChargeModalProps {
  isOpen: boolean
  onClose: () => void
  paystubId: string
  userId: string
  onAdded: (item: PaystubItem) => void
}

const AddExtraChargeModal: React.FC<AddExtraChargeModalProps> = ({
  isOpen, onClose, paystubId, userId, onAdded,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    if (!isOpen) {
      setDescription('')
      setAmount('')
      setPropertyId('')
      setExpenseDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setSubmitting(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await getProperties(userId)
        if (!cancelled && res.status === 'success') setProperties(res.data)
      } catch { /* dropdown stays empty */ }
    })()
    return () => { cancelled = true }
  }, [isOpen, userId])

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !propertyId) return
    setSubmitting(true)
    try {
      const res = await addPaystubItem(paystubId, {
        description: description.trim(),
        amount: parseFloat(amount),
        propertyId,
        expenseDate: expenseDate || undefined,
        notes: notes.trim() || undefined,
      })
      if (res.status === 'success') {
        showNotification('Extra charge added.', 'success')
        onAdded(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to add extra charge.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error adding extra charge.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-5 max-w-lg !w-11/12" zIndex={80}>
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <PlusIcon className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Add extra charge</h2>
          <p className="text-[11px] text-gray-500">Bonus, mileage, or other adjustment.</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Mileage to Beach House"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-3">
          <div className="w-1/3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Property *</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select a property…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.listingName || p.address}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          disabled={submitting || !description.trim() || !amount || !propertyId}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding…
            </>
          ) : (
            <>
              <PlusIcon className="h-3.5 w-3.5" />
              Add charge
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}

export default AddExtraChargeModal
