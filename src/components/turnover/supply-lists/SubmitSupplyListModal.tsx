'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { createSupplyList } from '@/services/supplyListService'
import type { SupplyList } from '@/services/types/supplyList'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface SubmitSupplyListModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  cleanerId?: string | null
  onSubmitted: (supplyList: SupplyList) => void
}

interface ItemRow {
  name: string
  quantity: string
}

const SubmitSupplyListModal: React.FC<SubmitSupplyListModalProps> = ({
  isOpen,
  onClose,
  projectId,
  cleanerId,
  onSubmitted,
}) => {
  const [items, setItems] = useState<ItemRow[]>([{ name: '', quantity: '1' }])
  const [loading, setLoading] = useState(false)

  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setItems([{ name: '', quantity: '1' }])
      setLoading(false)
    }
  }, [isOpen])

  const addItem = () => {
    setItems(prev => [...prev, { name: '', quantity: '1' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async () => {
    const validItems = items.filter(item => item.name.trim())
    if (validItems.length === 0) {
      showNotification(t('pleaseAddAtLeastOneItem'), 'error')
      return
    }

    setLoading(true)
    try {
      const res = await createSupplyList(projectId, {
        submittedBy: cleanerId || undefined,
        items: validItems.map(item => ({
          name: item.name.trim(),
          quantity: parseInt(item.quantity, 10) || 1,
        })),
      })

      if (res.status === 'success') {
        showNotification(t('supplyListSubmitted'), 'success')
        onSubmitted(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToSubmitList'), 'error')
      }
    } catch (err) {
      console.error('Error submitting supply list:', err)
      showNotification(
        err instanceof Error ? err.message : t('failedToSubmitList'),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={!loading}>
      <div className="p-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600">
            <ClipboardDocumentListIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('submitSupplyListTitle')}</h2>
            <p className="text-sm text-gray-500">{t('supplyListsSubtitle')}</p>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3 mb-6">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder={t('itemName')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                min="1"
                className="w-20 px-3 py-2 border border-gray-300 rounded-xl text-sm text-center focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
                className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Item Button */}
        <button
          type="button"
          onClick={addItem}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center gap-1.5 mb-6"
        >
          <PlusIcon className="w-4 h-4" />
          {t('addItem')}
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || items.every(i => !i.name.trim())}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2
              ${loading || items.every(i => !i.name.trim())
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-teal-500 text-white hover:bg-teal-600'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('submittingList')}
              </>
            ) : (
              <>
                <ClipboardDocumentListIcon className="w-5 h-5" />
                {t('submitList')}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SubmitSupplyListModal
