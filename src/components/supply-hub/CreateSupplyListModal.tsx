'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { getCleaningProjects } from '@/services/cleaningProjectService'
import { createSupplyList, createStandaloneSupplyList } from '@/services/supplyListService'
import type { Property } from '@/services/types/property'
import type { CleaningProject } from '@/services/types/cleaningProject'
import {
  PlusIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

interface CreateSupplyListModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  properties: Property[]
  onScanReceipt?: () => void
  defaultPropertyId?: string
}

interface ItemRow {
  name: string
  quantity: number
}

const ACTIVE_STATUSES = ['pending', 'assigned', 'confirmed', 'in_progress']

export default function CreateSupplyListModal({
  isOpen,
  onClose,
  onCreated,
  properties,
  onScanReceipt,
  defaultPropertyId,
}: CreateSupplyListModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore(s => s.showNotification)
  const { profile } = useUserStore()

  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [items, setItems] = useState<ItemRow[]>([{ name: '', quantity: 1 }])
  const [submitting, setSubmitting] = useState(false)

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPropertyId('')
      setSelectedProjectId('')
      setProjects([])
      setItems([{ name: '', quantity: 1 }])
      setSubmitting(false)
    }
  }, [isOpen])

  // Pre-select property when opened with a default (from ProjectDetailModal)
  useEffect(() => {
    if (isOpen && defaultPropertyId) {
      setSelectedPropertyId(defaultPropertyId)
    }
  }, [isOpen, defaultPropertyId])

  // Load projects when property changes
  useEffect(() => {
    if (!selectedPropertyId || !profile?.id) {
      setProjects([])
      setSelectedProjectId('')
      return
    }

    const loadProjects = async () => {
      setLoadingProjects(true)
      try {
        const res = await getCleaningProjects({ userId: profile.id })
        if (res.status === 'success') {
          // Filter to active projects for this property
          const filtered = (res.data || []).filter(
            p => p.propertyId === selectedPropertyId && ACTIVE_STATUSES.includes(p.status)
          )
          setProjects(filtered)
          // Auto-select if only one project
          if (filtered.length === 1) setSelectedProjectId(filtered[0].id)
          else setSelectedProjectId('')
        }
      } catch (err) {
        console.error('Error loading projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [selectedPropertyId, profile?.id])

  const addItem = () => {
    setItems(prev => [...prev, { name: '', quantity: 1 }])
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: 'name' | 'quantity', value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async () => {
    if (!selectedPropertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    const validItems = items.filter(i => i.name.trim())
    if (validItems.length === 0) {
      showNotification('Add at least one item', 'error')
      return
    }

    setSubmitting(true)
    try {
      const itemsPayload = validItems.map(i => ({ name: i.name.trim(), quantity: i.quantity }))
      const res = selectedProjectId
        ? await createSupplyList(selectedProjectId, {
            items: itemsPayload,
          })
        : await createStandaloneSupplyList({
            propertyId: selectedPropertyId,
            items: itemsPayload,
          })
      if (res.status === 'success') {
        showNotification('Supply list created', 'success')
        onCreated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to create supply list', 'error')
      }
    } catch (err) {
      console.error('Error creating supply list:', err)
      showNotification('Error creating supply list', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const validItemCount = items.filter(i => i.name.trim()).length
  const canSubmit = selectedPropertyId && validItemCount > 0 && !submitting

  const formatProjectDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-lg w-[calc(100%-1rem)] sm:w-11/12 !overflow-y-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600">
              <ClipboardDocumentListIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('createSupplyListTitle')}</h2>
              <p className="text-xs text-gray-500">
                Create a supply request{onScanReceipt && (
                  <> or <button type="button" onClick={onScanReceipt} className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">scan a receipt</button> to quick-create</>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Property selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('property')}</label>
              <div className="relative">
                <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.listingName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project selector */}
            {selectedPropertyId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">Loading projects...</span>
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No active projects for this property</p>
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                    <option value="">No project (standalone)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {formatProjectDate(p.projectDate)} — {p.status}
                        {p.cleanerName ? ` (${p.cleanerName})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Items section */}
            {selectedPropertyId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Items</label>
                  <span className="text-[10px] text-gray-400">{validItemCount} item{validItemCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Add item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {submitting ? t('creatingList') : t('createListButton')}
        </button>
      </div>
    </Modal>
  )
}
