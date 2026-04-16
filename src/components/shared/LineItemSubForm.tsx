'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrashIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import type { ExpenseLineItem, CreateExpenseLineItemPayload, UpdateExpenseLineItemPayload } from '@/services/types/expense'

interface LineItemSubFormProps {
  lineItem?: ExpenseLineItem | null
  onSave: (data: CreateExpenseLineItemPayload | UpdateExpenseLineItemPayload) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  saving: boolean
  userId: string
  hasSupplyLink?: boolean
}

export default function LineItemSubForm({
  lineItem,
  onSave,
  onCancel,
  onDelete,
  saving,
  userId,
  hasSupplyLink = false,
}: LineItemSubFormProps) {
  const isEditing = !!lineItem

  const [description, setDescription] = useState(lineItem?.description || '')
  const [quantity, setQuantity] = useState(lineItem?.quantity?.toString() || '1')
  const [unitCost, setUnitCost] = useState(lineItem?.unitCost?.toString() || '')
  const [totalCost, setTotalCost] = useState(lineItem?.totalCost?.toString() || '')
  const [manualTotal, setManualTotal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Auto-calculate totalCost when quantity or unitCost changes (if not manually set)
  useEffect(() => {
    if (!manualTotal) {
      const qty = parseFloat(quantity) || 0
      const unit = parseFloat(unitCost) || 0
      if (qty > 0 && unit > 0) {
        setTotalCost((qty * unit).toFixed(2))
      }
    }
  }, [quantity, unitCost, manualTotal])

  const handleTotalChange = (val: string) => {
    setManualTotal(true)
    setTotalCost(val)
  }

  const handleSubmit = async () => {
    if (!description.trim()) return

    const data: CreateExpenseLineItemPayload | UpdateExpenseLineItemPayload = {
      userId,
      description: description.trim(),
      quantity: parseFloat(quantity) || 1,
      unitCost: parseFloat(unitCost) || undefined,
      totalCost: parseFloat(totalCost) || undefined,
    }

    await onSave(data)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="overflow-hidden"
      >
        <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-3 mt-1 mb-2">
          {hasSupplyLink && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-purple-600">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Linked to supply list item — edits cascade</span>
            </div>
          )}

          {/* Description */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Qty / Unit Cost / Total Cost row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Qty</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Unit Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => { setManualTotal(false); setUnitCost(e.target.value) }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Total</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalCost}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 tabular-nums"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !description.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>

            {isEditing && onDelete && (
              <div className="ml-auto">
                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-600">Delete?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                    >
                      {deleting ? '...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete line item"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
