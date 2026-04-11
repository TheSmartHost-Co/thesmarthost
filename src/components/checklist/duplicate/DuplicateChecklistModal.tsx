'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getChecklists,
  getChecklistById,
  duplicateChecklist,
} from '@/services/checklistService'
import SearchableSelect from '@/components/shared/SearchableSelect'
import type { Checklist, ChecklistItem } from '@/services/types/checklist'
import type { Property } from '@/services/types/property'

interface DuplicateChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  onDuplicate: (newChecklist: Checklist) => void
  properties: Property[]
}

export default function DuplicateChecklistModal({
  isOpen,
  onClose,
  onDuplicate,
  properties,
}: DuplicateChecklistModalProps) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Checklist list state
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loadingChecklists, setLoadingChecklists] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Selection state
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null)
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Duplicate config state
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)

  // Fetch all checklists when modal opens
  useEffect(() => {
    if (isOpen && profile?.id) {
      setLoadingChecklists(true)
      getChecklists({ userId: profile.id })
        .then((res) => {
          if (res.status === 'success') {
            setChecklists(res.data)
          }
        })
        .catch((err) => {
          console.error('Error fetching checklists:', err)
        })
        .finally(() => setLoadingChecklists(false))
    }
  }, [isOpen, profile?.id])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedChecklistId(null)
      setSelectedChecklist(null)
      setTargetPropertyId(null)
      setNewName('')
      setSearchQuery('')
    }
  }, [isOpen])

  // Fetch full checklist details when selection changes
  useEffect(() => {
    if (!selectedChecklistId) {
      setSelectedChecklist(null)
      return
    }

    setLoadingDetails(true)
    getChecklistById(selectedChecklistId)
      .then((res) => {
        if (res.status === 'success') {
          setSelectedChecklist(res.data)
          setNewName(`${res.data.name} (Copy)`)
          setTargetPropertyId(res.data.propertyId)
        }
      })
      .catch((err) => {
        console.error('Error fetching checklist details:', err)
        showNotification('Failed to load checklist details', 'error')
      })
      .finally(() => setLoadingDetails(false))
  }, [selectedChecklistId, showNotification])

  // Filter checklists by search
  const filteredChecklists = useMemo(() => {
    if (!searchQuery.trim()) return checklists
    const q = searchQuery.toLowerCase()
    return checklists.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.propertyName?.toLowerCase().includes(q)
    )
  }, [checklists, searchQuery])

  // Group items by room for preview
  const groupedItems = useMemo(() => {
    if (!selectedChecklist?.items) return {}
    return selectedChecklist.items.reduce(
      (acc, item) => {
        const room = item.roomName || 'General'
        if (!acc[room]) acc[room] = []
        acc[room].push(item)
        return acc
      },
      {} as Record<string, ChecklistItem[]>
    )
  }, [selectedChecklist?.items])

  // Property options for SearchableSelect
  const propertyOptions = useMemo(
    () =>
      properties.map((prop) => ({
        value: prop.id,
        label: prop.listingName || prop.internalName || prop.address,
        secondaryLabel: prop.address,
      })),
    [properties]
  )

  const handleSubmit = async () => {
    if (!selectedChecklistId) {
      showNotification('Please select a checklist to duplicate', 'error')
      return
    }
    if (!newName.trim()) {
      showNotification('Please enter a name for the new checklist', 'error')
      return
    }
    if (!targetPropertyId) {
      showNotification('Please select a target property', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await duplicateChecklist(selectedChecklistId, {
        name: newName.trim(),
        targetPropertyId,
      })

      if (res.status === 'success') {
        onDuplicate(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to duplicate checklist', 'error')
      }
    } catch (err) {
      console.error('Error duplicating checklist:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to duplicate checklist',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DocumentDuplicateIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Duplicate Checklist
                </h2>
                <p className="text-sm text-gray-500">
                  Copy an existing checklist to a property
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Checklist Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                Select Checklist to Copy
              </label>

              {loadingChecklists ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-gray-500">Loading checklists...</span>
                </div>
              ) : checklists.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                  <ExclamationCircleIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No checklists found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Create a checklist first, then come back to duplicate it
                  </p>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search checklists..."
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                    />
                  </div>

                  {/* Checklist List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {filteredChecklists.map((checklist) => (
                      <button
                        key={checklist.id}
                        type="button"
                        onClick={() => setSelectedChecklistId(checklist.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                          selectedChecklistId === checklist.id
                            ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500/20'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {checklist.name}
                              </span>
                              {checklist.isDefault && (
                                <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500 truncate">
                                {checklist.propertyName || 'Unknown property'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {checklist.itemCount || 0} tasks
                              </span>
                            </div>
                          </div>
                          {selectedChecklistId === checklist.id && (
                            <CheckIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredChecklists.length === 0 && (
                      <p className="text-center py-4 text-sm text-gray-400">
                        No checklists match your search
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Task Preview */}
            <AnimatePresence mode="wait">
              {selectedChecklistId && (
                <motion.div
                  key={selectedChecklistId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-gray-500">Loading tasks...</span>
                    </div>
                  ) : selectedChecklist?.items && selectedChecklist.items.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Tasks to Copy
                        </label>
                        <span className="text-xs text-gray-400">
                          {selectedChecklist.items.length} task{selectedChecklist.items.length !== 1 && 's'}
                        </span>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-xl max-h-56 overflow-y-auto">
                        {Object.entries(groupedItems).map(([room, items]) => (
                          <div key={room}>
                            <div className="px-4 py-2 bg-gray-100/80 border-b border-gray-100 sticky top-0">
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                {room}
                              </span>
                            </div>
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="px-4 py-2.5 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                              >
                                <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                                <span className="text-sm text-gray-700 flex-1">
                                  {item.taskDescription}
                                </span>
                                {item.requiresPhoto && (
                                  <CameraIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedChecklist?.items?.length === 0 ? (
                    <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm text-yellow-700">This checklist has no tasks</p>
                      <p className="text-xs text-yellow-500 mt-0.5">It will be duplicated as an empty checklist</p>
                    </div>
                  ) : null}

                  {/* Duplicate Configuration */}
                  {selectedChecklist && (
                    <div className="mt-6 space-y-4">
                      {/* Target Property */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <HomeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                          Copy to Property <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={propertyOptions}
                          value={targetPropertyId}
                          onChange={setTargetPropertyId}
                          placeholder="Select target property..."
                          emptyText="No properties found"
                          clearable={false}
                        />
                      </div>

                      {/* New Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                          Checklist Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Enter a name for the duplicate"
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedChecklistId || !newName.trim() || !targetPropertyId}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  Duplicate Checklist
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
