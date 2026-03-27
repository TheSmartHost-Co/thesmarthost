'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '@/components/shared/modal'
import CleanerCreateSupplyListModal from './CleanerCreateSupplyListModal'
import CleanerScanReceiptModal from './CleanerScanReceiptModal'
import type { SupplyList, SupplyListItem, Receipt } from '@/services/types/supplyList'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
import {
  getSupplyListsByProject,
  getSupplyListById,
  updateSupplyList,
  deleteSupplyList,
  fulfillSupplyList,
  toggleSupplyListItem,
  formatSupplyListAge,
  getSupplyListReceipts,
  deleteSupplyListReceipt,
} from '@/services/supplyListService'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  TrashIcon,
  ChevronLeftIcon,
  PlusIcon,
  CheckIcon,
  UserCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CameraIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { parseLocalDate } from '@/utils/dateUtils'

interface CleanerSupplyListModalProps {
  isOpen: boolean
  onClose: () => void
  supplyList?: SupplyList | null
  projectId?: string
  projectName?: string
  cleanerId: string
  pmUserId?: string
  propertyId?: string
  onChanged?: () => void
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-teal-500 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

const statusBadgeColors: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
}

const statusIconColors: Record<string, string> = {
  pending: 'bg-teal-100 text-teal-600',
  in_progress: 'bg-blue-100 text-blue-600',
  fulfilled: 'bg-green-100 text-green-600',
}

const receiptStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  matched: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
}

export default function CleanerSupplyListModal({
  isOpen,
  onClose,
  supplyList: initialSupplyList,
  projectId,
  projectName,
  cleanerId,
  pmUserId,
  propertyId,
  onChanged,
}: CleanerSupplyListModalProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const itemOrderRef = useRef<string[]>([])

  // View state
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<SupplyList | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemFilter, setItemFilter] = useState<'all' | 'remaining' | 'purchased'>('all')
  const [detailTab, setDetailTab] = useState<'items' | 'notes' | 'receipts'>('items')

  // Inline item editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQuantity, setEditQuantity] = useState('1')

  // Inline item notes state (optimistic)
  const [localItemNotes, setLocalItemNotes] = useState<Record<string, string>>({})

  // Supply list-level notes
  const [listNotes, setListNotes] = useState('')

  // List-view delete confirmation
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const [deletingListFromView, setDeletingListFromView] = useState(false)

  // Receipt state
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null)
  const [confirmDeleteReceiptId, setConfirmDeleteReceiptId] = useState<string | null>(null)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Scan receipt modal
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false)

  // Fetch supply lists for project
  const fetchSupplyLists = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getSupplyListsByProject(projectId)
      if (res.status === 'success') {
        setSupplyLists(res.data)
      } else {
        showNotification(res.message || 'Failed to load supply lists', 'error')
      }
    } catch {
      showNotification('Failed to load supply lists', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showNotification])

  // Initialize on open
  useEffect(() => {
    if (!isOpen) {
      setSelectedList(null)
      setNewItemName('')
      setNewItemQuantity('1')
      setShowDeleteConfirm(false)
      setItemFilter('all')
      setReceipts([])
      setReceiptsLoading(false)
      setDeletingReceiptId(null)
      setConfirmDeleteReceiptId(null)
      setEditingItemId(null)
      setLocalItemNotes({})
      setListNotes('')
      setDeleteListId(null)
      setDeletingListFromView(false)
      setShowScanReceiptModal(false)
      itemOrderRef.current = []
      return
    }

    if (initialSupplyList) {
      // Direct open to detail
      itemOrderRef.current = initialSupplyList.items.map(i => i.id)
      setSelectedList(initialSupplyList)
      setListNotes(initialSupplyList.notes || '')
      // Initialize local item notes
      const notes: Record<string, string> = {}
      initialSupplyList.items.forEach(i => { notes[i.id] = i.pmNotes || '' })
      setLocalItemNotes(notes)
      // Refresh from server
      getSupplyListById(initialSupplyList.id).then(res => {
        if (res.status === 'success') {
          setSelectedList(res.data)
          setListNotes(res.data.notes || '')
          const freshNotes: Record<string, string> = {}
          res.data.items.forEach(i => { freshNotes[i.id] = i.pmNotes || '' })
          setLocalItemNotes(freshNotes)
        }
      }).catch(() => {})
    } else if (projectId) {
      setSelectedList(null)
      fetchSupplyLists()
    }
  }, [isOpen, initialSupplyList, projectId, fetchSupplyLists])

  // Fetch receipts when a list is selected
  const fetchReceipts = useCallback(async (listId: string) => {
    setReceiptsLoading(true)
    try {
      const res = await getSupplyListReceipts(listId)
      if (res.status === 'success') setReceipts(res.data || [])
    } catch {
      // Non-critical
    } finally {
      setReceiptsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && selectedList) {
      fetchReceipts(selectedList.id)
    }
  }, [isOpen, selectedList?.id, fetchReceipts])

  // Sync local item notes when selectedList changes
  useEffect(() => {
    if (selectedList) {
      const notes: Record<string, string> = {}
      selectedList.items.forEach(i => { notes[i.id] = i.pmNotes || '' })
      setLocalItemNotes(prev => {
        // Only update if keys changed (avoid overwriting in-flight edits)
        const prevKeys = Object.keys(prev).sort().join(',')
        const newKeys = Object.keys(notes).sort().join(',')
        if (prevKeys !== newKeys) return notes
        return prev
      })
    }
  }, [selectedList?.items.length])

  // Select a list from list view
  const selectList = (list: SupplyList) => {
    itemOrderRef.current = list.items.map(i => i.id)
    setItemFilter('all')
    setEditingItemId(null)
    setListNotes(list.notes || '')
    const notes: Record<string, string> = {}
    list.items.forEach(i => { notes[i.id] = i.pmNotes || '' })
    setLocalItemNotes(notes)
    setDetailTab('items')
    setSelectedList(list)
  }

  // Sort items by original order, new items at end
  const getStableItems = (list: SupplyList): SupplyListItem[] => {
    const order = itemOrderRef.current
    if (order.length === 0) return list.items
    return [...list.items].sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      const aIdx = ai === -1 ? order.length : ai
      const bIdx = bi === -1 ? order.length : bi
      return aIdx - bIdx
    })
  }

  const getProgress = (list: SupplyList) => {
    if (list.progress) return list.progress
    const totalItems = list.items.length
    const purchasedItems = list.items.filter(i => i.isPurchased).length
    return { totalItems, purchasedItems, percentage: totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0 }
  }

  // Toggle item purchased
  const handleTogglePurchased = async (item: SupplyListItem) => {
    if (!selectedList) return
    setActionLoading(true)
    try {
      const res = await toggleSupplyListItem(selectedList.id, item.id, {
        isPurchased: !item.isPurchased,
      })
      if (res.status === 'success') {
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch {
      showNotification('Failed to update item', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Add new item inline
  const handleAddItem = async () => {
    if (!selectedList || !newItemName.trim()) return
    setActionLoading(true)
    try {
      const res = await updateSupplyList(selectedList.id, {
        newItems: [{ name: newItemName.trim(), quantity: parseInt(newItemQuantity, 10) || 1 }],
      })
      if (res.status === 'success') {
        const existingIds = new Set(itemOrderRef.current)
        res.data.items.forEach(i => {
          if (!existingIds.has(i.id)) itemOrderRef.current.push(i.id)
        })
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        setNewItemName('')
        setNewItemQuantity('1')
        // Update local notes for new items
        const notes = { ...localItemNotes }
        res.data.items.forEach(i => { if (!(i.id in notes)) notes[i.id] = i.pmNotes || '' })
        setLocalItemNotes(notes)
        showNotification('Item added', 'success')
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to add item', 'error')
      }
    } catch {
      showNotification('Failed to add item', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Remove item
  const handleRemoveItem = async (itemId: string) => {
    if (!selectedList) return
    setActionLoading(true)
    try {
      const res = await updateSupplyList(selectedList.id, {
        removeItemIds: [itemId],
      })
      if (res.status === 'success') {
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        if (editingItemId === itemId) setEditingItemId(null)
        showNotification('Item removed', 'success')
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to remove item', 'error')
      }
    } catch {
      showNotification('Failed to remove item', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Start inline editing an item
  const startEditItem = (item: SupplyListItem) => {
    setEditingItemId(item.id)
    setEditName(item.name)
    setEditQuantity(String(item.quantity))
  }

  // Save inline item edit
  const handleSaveItemEdit = async () => {
    if (!selectedList || !editingItemId || !editName.trim()) return
    setActionLoading(true)
    try {
      const res = await updateSupplyList(selectedList.id, {
        items: [{ id: editingItemId, name: editName.trim(), quantity: parseInt(editQuantity, 10) || 1 }],
      })
      if (res.status === 'success') {
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        setEditingItemId(null)
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch {
      showNotification('Failed to update item', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Save per-item note on blur
  const handleUpdateItemNotes = async (item: SupplyListItem, value: string) => {
    if (!selectedList) return
    const trimmed = value.trim()
    if (trimmed === (item.pmNotes || '')) return
    // Optimistic: update local state only, save silently in background
    setSelectedList(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === item.id ? { ...i, pmNotes: trimmed } : i),
    } : null)
    try {
      await updateSupplyList(selectedList.id, {
        items: [{ id: item.id, pmNotes: trimmed }],
      })
    } catch {
      // Revert on failure
      setLocalItemNotes(prev => ({ ...prev, [item.id]: item.pmNotes || '' }))
      setSelectedList(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, pmNotes: item.pmNotes } : i),
      } : null)
    }
  }

  // Save supply list-level notes on blur (silent background save)
  const handleUpdateListNotes = async () => {
    if (!selectedList) return
    const trimmed = listNotes.trim()
    if (trimmed === (selectedList.notes || '')) return
    // Optimistic: update local state only
    setSelectedList(prev => prev ? { ...prev, notes: trimmed } : null)
    setSupplyLists(prev => prev.map(sl => sl.id === selectedList.id ? { ...sl, notes: trimmed } : sl))
    try {
      await updateSupplyList(selectedList.id, { notes: trimmed })
    } catch {
      // Revert on failure
      setListNotes(selectedList.notes || '')
      setSelectedList(prev => prev ? { ...prev, notes: selectedList.notes } : null)
      setSupplyLists(prev => prev.map(sl => sl.id === selectedList.id ? { ...sl, notes: selectedList.notes } : sl))
    }
  }

  // Mark as fulfilled
  const handleFulfill = async () => {
    if (!selectedList || selectedList.status === 'fulfilled') return
    setActionLoading(true)
    try {
      const res = await fulfillSupplyList(selectedList.id, cleanerId)
      if (res.status === 'success') {
        showNotification('Supply list marked as fulfilled', 'success')
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to fulfill supply list', 'error')
      }
    } catch {
      showNotification('Failed to fulfill supply list', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete supply list (from detail view)
  const handleDelete = async () => {
    if (!selectedList) return
    setActionLoading(true)
    try {
      const res = await deleteSupplyList(selectedList.id)
      if (res.status === 'success') {
        showNotification('Supply list deleted', 'success')
        setSupplyLists(prev => prev.filter(sl => sl.id !== selectedList.id))
        setSelectedList(null)
        setShowDeleteConfirm(false)
        onChanged?.()
        if (!projectId) onClose()
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch {
      showNotification('Failed to delete supply list', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete supply list from list view
  const handleDeleteFromListView = async (listId: string) => {
    setDeletingListFromView(true)
    try {
      const res = await deleteSupplyList(listId)
      if (res.status === 'success') {
        showNotification('Supply list deleted', 'success')
        setSupplyLists(prev => prev.filter(sl => sl.id !== listId))
        setDeleteListId(null)
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch {
      showNotification('Failed to delete supply list', 'error')
    } finally {
      setDeletingListFromView(false)
    }
  }

  // Receipt upload

  // Delete receipt
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!selectedList) return
    setDeletingReceiptId(receiptId)
    try {
      const res = await deleteSupplyListReceipt(selectedList.id, receiptId)
      if (res.status === 'success') {
        showNotification('Receipt deleted', 'success')
        setReceipts(prev => prev.filter(r => r.id !== receiptId))
        setConfirmDeleteReceiptId(null)
        // Refetch supply list to get updated item statuses
        const slRes = await getSupplyListById(selectedList.id)
        if (slRes.status === 'success') {
          setSelectedList(slRes.data)
          setSupplyLists(prev => prev.map(sl => sl.id === slRes.data.id ? slRes.data : sl))
        }
        onChanged?.()
      } else {
        showNotification(res.message || 'Failed to delete receipt', 'error')
      }
    } catch {
      showNotification('Error deleting receipt', 'error')
    } finally {
      setDeletingReceiptId(null)
    }
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} closable style="!overflow-y-hidden flex flex-col max-w-2xl w-[calc(100%-1rem)]">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {selectedList ? (
                <button
                  onClick={() => { setSelectedList(null); setShowDeleteConfirm(false); setEditingItemId(null) }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600">
                  <ClipboardDocumentListIcon className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedList ? 'Supply List Details' : 'Supply Lists'}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedList
                    ? `Submitted ${formatSupplyListAge(selectedList.createdAt)}`
                    : projectName || `${supplyLists.length} list${supplyLists.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
            {!selectedList && pmUserId && projectId && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                New Request
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {selectedList ? (
              // Detail View
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Status & Submitter Info */}
                <div className="flex items-center gap-3">
                  <span className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium
                    ${statusBadgeColors[SUPPLY_LIST_STATUS_INFO[selectedList.status].color] || 'bg-gray-100 text-gray-700'}
                  `}>
                    {SUPPLY_LIST_STATUS_INFO[selectedList.status].label}
                  </span>
                  {selectedList.submitterName && (
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <UserCircleIcon className="w-4 h-4" />
                      {selectedList.submitterName}
                    </span>
                  )}
                </div>

                {/* Project date */}
                {selectedList.projectDate && (
                  <p className="text-xs text-gray-500">
                    {parseLocalDate(selectedList.projectDate).toLocaleDateString()}
                  </p>
                )}

                {/* Fulfilled info */}
                {selectedList.status === 'fulfilled' && selectedList.fulfilledAt && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Fulfilled</p>
                      <p className="text-xs text-green-600">
                        {new Date(selectedList.fulfilledAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab Navigation */}
                {(() => {
                  const purchased = selectedList.items.filter(i => i.isPurchased).length
                  const tabs: { key: 'items' | 'notes' | 'receipts'; label: string; badge?: string; dot?: boolean }[] = [
                    { key: 'items', label: 'Items', badge: `${purchased}/${selectedList.items.length}` },
                    { key: 'notes', label: 'Notes', dot: !!listNotes },
                    { key: 'receipts', label: 'Receipts', badge: receipts.length > 0 ? String(receipts.length) : undefined },
                  ]
                  return (
                    <div className="flex items-center border-b border-gray-200">
                      {tabs.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setDetailTab(tab.key)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                            detailTab === tab.key
                              ? 'border-teal-500 text-teal-700'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {tab.label}
                          {tab.badge && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              detailTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {tab.badge}
                            </span>
                          )}
                          {tab.dot && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* Tab Content */}
                {detailTab === 'items' && (
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    {selectedList.items.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{getProgress(selectedList).purchasedItems}/{getProgress(selectedList).totalItems} purchased</span>
                          <span>{getProgress(selectedList).percentage}%</span>
                        </div>
                        <ProgressBar percentage={getProgress(selectedList).percentage} />
                      </div>
                    )}

                    {/* Item Filter Pills */}
                    {selectedList.items.length > 0 && (() => {
                      const purchased = selectedList.items.filter(i => i.isPurchased).length
                      const remaining = selectedList.items.length - purchased
                      return (
                        <div className="flex items-center gap-1.5">
                          {([
                            { key: 'all' as const, label: 'All', count: selectedList.items.length },
                            { key: 'remaining' as const, label: 'Remaining', count: remaining },
                            { key: 'purchased' as const, label: 'Purchased', count: purchased },
                          ]).map(({ key, label, count }) => (
                            <button
                              key={key}
                              onClick={() => setItemFilter(key)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                itemFilter === key
                                  ? 'bg-teal-500 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {label} ({count})
                            </button>
                          ))}
                        </div>
                      )
                    })()}

                    {/* Items Checklist */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="space-y-2">
                        {getStableItems(selectedList)
                          .filter(item => {
                            if (itemFilter === 'remaining') return !item.isPurchased
                            if (itemFilter === 'purchased') return item.isPurchased
                            return true
                          })
                          .map(item => {
                          const isEditable = selectedList.status !== 'fulfilled'
                          const isEditing = editingItemId === item.id
                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-lg transition-colors ${
                                item.isPurchased ? 'bg-green-50' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => isEditable && !isEditing && handleTogglePurchased(item)}
                                  disabled={actionLoading || !isEditable || isEditing}
                                  className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                                    item.isPurchased
                                      ? 'bg-teal-500 border-teal-500 text-white'
                                      : 'border-gray-300 hover:border-teal-500'
                                  } ${actionLoading || isEditing ? 'opacity-50' : ''}`}
                                >
                                  {item.isPurchased && <CheckIcon className="w-3 h-3" />}
                                </button>

                                {isEditing ? (
                                  // Inline edit mode
                                  <div className="flex-1 space-y-1.5">
                                    <input
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && editName.trim()) handleSaveItemEdit()
                                        if (e.key === 'Escape') setEditingItemId(null)
                                      }}
                                      className="w-full text-sm px-2 py-1 border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-400">Qty:</span>
                                        <input
                                          type="number"
                                          value={editQuantity}
                                          onChange={(e) => setEditQuantity(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && editName.trim()) handleSaveItemEdit()
                                            if (e.key === 'Escape') setEditingItemId(null)
                                          }}
                                          min="1"
                                          className="w-14 text-sm px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                                        />
                                      </div>
                                      <button
                                        onClick={handleSaveItemEdit}
                                        disabled={actionLoading || !editName.trim()}
                                        className="px-2.5 py-1 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingItemId(null)}
                                        className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Display mode
                                  <>
                                    <div
                                      className={`flex-1 min-w-0 ${isEditable ? 'cursor-pointer' : ''}`}
                                      onClick={() => isEditable && startEditItem(item)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <p className={`text-sm font-medium ${item.isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                          {item.name}
                                        </p>
                                        {item.quantity > 1 && (
                                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                            x{item.quantity}
                                          </span>
                                        )}
                                        {item.isPurchased && item.totalCost != null && item.totalCost > 0 && (
                                          <span className="text-teal-600 text-[10px] font-medium">
                                            ${item.totalCost.toFixed(2)}
                                          </span>
                                        )}
                                        {isEditable && (
                                          <PencilIcon className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                        )}
                                      </div>
                                    </div>
                                    {isEditable && (
                                      <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        disabled={actionLoading}
                                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Inline per-item notes */}
                              {!isEditing && (
                                <div className="ml-8 mt-1">
                                  <input
                                    type="text"
                                    value={localItemNotes[item.id] ?? (item.pmNotes || '')}
                                    onChange={(e) => setLocalItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    onBlur={(e) => handleUpdateItemNotes(item, e.target.value)}
                                    placeholder="Add a note..."
                                    className="w-full text-xs px-2 py-1 border border-transparent hover:border-gray-200 focus:border-teal-300 focus:ring-1 focus:ring-teal-300 rounded bg-transparent transition-colors"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'notes' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-500">List Notes</label>
                    <textarea
                      value={listNotes}
                      onChange={(e) => setListNotes(e.target.value)}
                      onBlur={handleUpdateListNotes}
                      placeholder="Add notes for this supply list..."
                      rows={5}
                      className="w-full text-sm px-3 py-2 border border-gray-200 hover:border-gray-300 focus:border-teal-300 focus:ring-1 focus:ring-teal-300 rounded-lg bg-gray-50 focus:bg-white resize-none transition-colors"
                    />
                    <p className="text-[10px] text-gray-400">Notes are saved automatically when you click away.</p>
                  </div>
                )}

                {detailTab === 'receipts' && (
                  <div className="space-y-3">
                    {/* Scan Receipt button */}
                    {selectedList.status !== 'fulfilled' && propertyId && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowScanReceiptModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <CameraIcon className="w-3.5 h-3.5" /> Scan Receipt
                        </button>
                      </div>
                    )}

                    {/* Receipt list */}
                    {receiptsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                      </div>
                    ) : receipts.length === 0 ? (
                      <div className="text-center py-8">
                        <DocumentTextIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No receipts uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {receipts.map(receipt => {
                          const isOwn = receipt.uploadedBy === profile?.id
                          const isConfirmingDelete = confirmDeleteReceiptId === receipt.id
                          return (
                            <div key={receipt.id}>
                              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CameraIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">{receipt.originalName}</p>
                                    <p className="text-[10px] text-gray-400">
                                      {new Date(receipt.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${receiptStatusColors[receipt.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {receipt.status}
                                  </span>
                                  {isOwn && (
                                    <button
                                      onClick={() => setConfirmDeleteReceiptId(isConfirmingDelete ? null : receipt.id)}
                                      disabled={deletingReceiptId === receipt.id}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Delete receipt"
                                    >
                                      <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {isConfirmingDelete && (
                                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-[10px] text-red-700 mb-1.5">
                                    {receipt.status === 'applied'
                                      ? 'This will delete the linked expense and revert matched items.'
                                      : 'Delete this receipt?'}
                                  </p>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => setConfirmDeleteReceiptId(null)}
                                      className="flex-1 py-1 text-[10px] font-medium border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReceipt(receipt.id)}
                                      disabled={!!deletingReceiptId}
                                      className="flex-1 py-1 text-[10px] font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                                    >
                                      {deletingReceiptId === receipt.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700 font-medium mb-3">
                      Are you sure you want to delete this supply list?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={actionLoading}
                        className="flex-1 py-2 px-3 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              // List View
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                  </div>
                ) : supplyLists.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardDocumentListIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No supply requests</p>
                    {pmUserId && projectId && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Request Supplies
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {supplyLists.map((list) => {
                      const statusInfo = SUPPLY_LIST_STATUS_INFO[list.status]
                      const progress = getProgress(list)
                      const isConfirmingDelete = deleteListId === list.id

                      return (
                        <div key={list.id}>
                          <div
                            className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => selectList(list)}
                                className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <div className={`p-2 rounded-lg flex-shrink-0 ${statusIconColors[list.status] || 'bg-teal-100 text-teal-600'}`}>
                                  <ClipboardDocumentListIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900">
                                      {list.items.length} item{list.items.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className={`
                                      px-2 py-0.5 rounded text-xs font-medium
                                      ${statusBadgeColors[statusInfo.color] || 'bg-gray-100 text-gray-700'}
                                    `}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 line-clamp-1">
                                    {list.items.map(i => i.name).join(', ')}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <ClockIcon className="w-3.5 h-3.5" />
                                      {formatSupplyListAge(list.createdAt)}
                                    </span>
                                    {list.submitterName && (
                                      <span className="flex items-center gap-1">
                                        <UserCircleIcon className="w-3.5 h-3.5" />
                                        {list.submitterName}
                                      </span>
                                    )}
                                    {list.status !== 'fulfilled' && progress.purchasedItems > 0 && (
                                      <span className="text-teal-600">
                                        {progress.purchasedItems}/{progress.totalItems} purchased
                                      </span>
                                    )}
                                  </div>
                                  {list.status !== 'fulfilled' && list.items.length > 0 && progress.purchasedItems > 0 && (
                                    <div className="mt-2">
                                      <ProgressBar percentage={progress.percentage} />
                                    </div>
                                  )}
                                </div>
                              </button>
                              {/* Delete button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteListId(isConfirmingDelete ? null : list.id) }}
                                className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete supply list"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {/* Inline delete confirmation */}
                          {isConfirmingDelete && (
                            <div className="mt-1.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                              <p className="text-xs text-red-700 font-medium mb-2">
                                Delete this supply list and all its items?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setDeleteListId(null)}
                                  className="flex-1 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteFromListView(list.id)}
                                  disabled={deletingListFromView}
                                  className="flex-1 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                                >
                                  {deletingListFromView ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky bottom actions — outside scroll area */}
      {selectedList && selectedList.status !== 'fulfilled' && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 sm:px-6 space-y-3">
          {/* Add new item */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newItemName.trim() && handleAddItem()}
              placeholder="Add new item..."
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <input
              type="number"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              min="1"
              className="w-14 sm:w-16 flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-xl text-sm text-center focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              onClick={handleAddItem}
              disabled={actionLoading || !newItemName.trim()}
              className="flex-shrink-0 px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Fulfill / Delete actions */}
          <div className="flex gap-3">
            <button
              onClick={handleFulfill}
              disabled={actionLoading}
              className="flex-1 py-2.5 px-4 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Mark as Fulfilled
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={actionLoading}
              className="py-2.5 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Modal>

    {pmUserId && projectId && (
      <CleanerCreateSupplyListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        cleanerId={cleanerId}
        pmUserId={pmUserId}
        projectId={projectId}
        onCreated={() => {
          setShowCreateModal(false)
          fetchSupplyLists()
          onChanged?.()
        }}
      />
    )}

    {propertyId && (
      <CleanerScanReceiptModal
        isOpen={showScanReceiptModal}
        onClose={() => setShowScanReceiptModal(false)}
        supplyLists={selectedList ? [selectedList] : supplyLists}
        properties={[{ id: propertyId, listingName: selectedList?.propertyName || projectName || '' }]}
        pmUserId={pmUserId}
        onReceiptApplied={() => {
          setShowScanReceiptModal(false)
          if (selectedList) fetchReceipts(selectedList.id)
          fetchSupplyLists()
          onChanged?.()
        }}
      />
    )}
    </>
  )
}
