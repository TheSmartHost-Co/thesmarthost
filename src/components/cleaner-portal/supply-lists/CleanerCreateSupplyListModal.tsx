'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { createSupplyList } from '@/services/supplyListService'
import { getCleaningProjects } from '@/services/cleaningProjectService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { SupplyList } from '@/services/types/supplyList'
import type { CleaningProject } from '@/services/types/cleaningProject'
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { parseLocalDate } from '@/utils/dateUtils'

interface CleanerCreateSupplyListModalProps {
  isOpen: boolean
  onClose: () => void
  cleanerId: string
  pmUserId: string
  projectId?: string
  onCreated: (sl: SupplyList) => void
}

interface ItemRow {
  name: string
  quantity: string
}

const ACTIVE_STATUSES = ['pending', 'assigned', 'confirmed', 'in_progress']

export default function CleanerCreateSupplyListModal({
  isOpen,
  onClose,
  cleanerId,
  pmUserId,
  projectId: preSelectedProjectId,
  onCreated,
}: CleanerCreateSupplyListModalProps) {
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ name: '', quantity: '1' }])
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Fetch active projects on open
  useEffect(() => {
    if (!isOpen) {
      setItems([{ name: '', quantity: '1' }])
      setSelectedProjectId('')
      setLoading(false)
      return
    }

    // If a project is pre-selected, use it directly
    if (preSelectedProjectId) {
      setSelectedProjectId(preSelectedProjectId)
      setLoadingProjects(false)
      return
    }

    const fetchProjects = async () => {
      setLoadingProjects(true)
      try {
        const res = await getCleaningProjects({ userId: pmUserId })
        if (res.status === 'success') {
          const active = res.data.filter((p) =>
            ACTIVE_STATUSES.includes(p.status)
          )
          setProjects(active)
          if (active.length === 1) setSelectedProjectId(active[0].id)
        }
      } catch {
        console.error('Failed to fetch projects')
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [isOpen, pmUserId, preSelectedProjectId])

  const addItem = () => {
    setItems((prev) => [...prev, { name: '', quantity: '1' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      showNotification('Please select a project', 'error')
      return
    }

    const validItems = items.filter((item) => item.name.trim())
    if (validItems.length === 0) {
      showNotification('Please add at least one item', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await createSupplyList(selectedProjectId, {
        submittedBy: cleanerId,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: parseInt(item.quantity, 10) || 1,
        })),
      })

      if (res.status === 'success') {
        showNotification('Supply list submitted', 'success')
        onCreated(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to create supply list', 'error')
      }
    } catch (err) {
      console.error('Error creating supply list:', err)
      showNotification(
        err instanceof Error ? err.message : 'Network error',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="sm:max-w-lg">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <ClipboardDocumentListIcon className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Request Supplies
          </h2>
        </div>

        {/* Project Selector (hidden when pre-selected) */}
        {!preSelectedProjectId && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cleaning Project
            </label>
            {loadingProjects ? (
              <div className="text-xs text-gray-500 py-2">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">
                No active projects available
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.propertyName || 'Unknown Property'} &mdash;{' '}
                    {parseLocalDate(p.projectDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Items */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Items Needed
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="w-16 text-sm text-center border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

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
            onClick={handleSubmit}
            disabled={loading || !selectedProjectId}
            className="px-4 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
