'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import NoteInput from '@/components/shared/NoteInput'
import {
  getSupplyListsByProject,
  getSupplyListById,
  updateSupplyList,
  deleteSupplyList,
  fulfillSupplyList,
  toggleSupplyListItem,
  formatSupplyListAge,
} from '@/services/supplyListService'
import { searchReceipts, deleteReceipt } from '@/services/receiptService'
import type { SupplyList, SupplyListItem } from '@/services/types/supplyList'
import type { UploadedReceipt } from '@/services/types/receipt'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
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
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'
import ScanSupplyReceiptModal from '@/components/supply-hub/ScanSupplyReceiptModal'
import ReceiptDetailModal from '@/components/receipt/detail/ReceiptDetailModal'
import TabBar from '@/components/shared/TabBar'
import RelatedEntityCard from '@/components/shared/RelatedEntityCard'
import NeedsReceiptBadge from '@/components/shared/NeedsReceiptBadge'

interface ViewSupplyListsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  projectName?: string
  onSupplyListsChanged?: () => void
  fulfilledBy?: string
  initialSupplyList?: SupplyList | null
  onScanReceipt?: (supplyList: SupplyList) => void
  zIndex?: number
}

// Inline progress bar component
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

const ViewSupplyListsModal: React.FC<ViewSupplyListsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  onSupplyListsChanged,
  fulfilledBy,
  initialSupplyList,
  onScanReceipt,
  zIndex,
}) => {
  const { t } = useTranslation('turnover')
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<SupplyList | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemFilter, setItemFilter] = useState<'all' | 'remaining' | 'purchased'>('all')
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null)
  const [confirmDeleteReceiptId, setConfirmDeleteReceiptId] = useState<string | null>(null)

  // Inline item editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQuantity, setEditQuantity] = useState('1')

  // List-level notes state
  const [listNotes, setListNotes] = useState('')

  // Whether we opened directly to a specific supply list (skip list view)
  const isDirectDetail = !!initialSupplyList

  const [reviewReceiptId, setReviewReceiptId] = useState<string | null>(null)
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null)
  const [stackedReceiptId, setStackedReceiptId] = useState<string | null>(null)

  // Tab state for detail view
  type DetailTab = 'items' | 'receipts' | 'details'
  const [detailTab, setDetailTab] = useState<DetailTab>('items')

  // Preserve item order: capture the order when a list is first selected
  const itemOrderRef = useRef<string[]>([])

  const showNotification = useNotificationStore((state) => state.showNotification)

  const fetchSupplyLists = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getSupplyListsByProject(projectId)
      if (res.status === 'success') {
        setSupplyLists(res.data)
      } else {
        showNotification(res.message || t('failedToLoadSupplyLists'), 'error')
      }
    } catch (err) {
      console.error('Error fetching supply lists:', err)
      showNotification(t('failedToLoadSupplyLists'), 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showNotification])

  // When opened with initialSupplyList, go straight to detail view
  const fetchInitialSupplyList = useCallback(async () => {
    if (!initialSupplyList) return
    setLoading(true)
    try {
      const res = await getSupplyListById(initialSupplyList.id)
      if (res.status === 'success') {
        selectList(res.data)
      } else {
        // Fall back to the passed-in data
        selectList(initialSupplyList)
      }
    } catch {
      selectList(initialSupplyList)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSupplyList])

  useEffect(() => {
    if (isOpen) {
      if (initialSupplyList) {
        fetchInitialSupplyList()
      } else if (projectId) {
        fetchSupplyLists()
      }
    }
  }, [isOpen, projectId, initialSupplyList, fetchSupplyLists, fetchInitialSupplyList])

  // Reset state when modal closes
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
      setEditName('')
      setEditQuantity('1')
      setListNotes('')
      setDetailTab('items')
      setStackedReceiptId(null)
      itemOrderRef.current = []
    }
  }, [isOpen])

  // Capture item order when a list is first selected
  const selectList = async (list: SupplyList) => {
    itemOrderRef.current = list.items.map(i => i.id)
    setItemFilter('all')
    setDetailTab('items')
    setSelectedList(list)
    setListNotes(list.notes || '')
    setEditingItemId(null)

    // Use receipts from API response if available, otherwise fetch
    if (list.receipts) {
      // Map SupplyListReceipt[] to UploadedReceipt[] shape for backwards compat
      setReceipts(list.receipts.map(r => ({
        id: r.id,
        supplyListId: list.id,
        uploadedBy: null,
        storagePath: '',
        originalName: r.originalName,
        mimeType: '',
        status: r.status as UploadedReceipt['status'],
        appliedAt: r.appliedAt,
        errorMessage: null,
        createdAt: r.createdAt,
        userId: null,
        propertyId: null,
        propertyName: null,
        vendorName: r.vendorName,
        expenseDate: r.expenseDate,
        subtotal: null,
        taxTotal: null,
        total: r.total,
        description: null,
        uploaderName: null,
      })))
      setReceiptsLoading(false)
    } else {
      setReceiptsLoading(true)
      try {
        const res = await searchReceipts({ supplyListId: list.id })
        if (res.status === 'success') setReceipts(res.data || [])
      } catch {
        // Non-critical, silently fail
      } finally {
        setReceiptsLoading(false)
      }
    }
  }

  // Sort items by their original order, putting new items at the end
  const getStableItems = (list: SupplyList): SupplyListItem[] => {
    const order = itemOrderRef.current
    if (order.length === 0) return list.items
    return [...list.items].sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      // Items not in original order go to end
      const aIdx = ai === -1 ? order.length : ai
      const bIdx = bi === -1 ? order.length : bi
      return aIdx - bIdx
    })
  }

  // Toggle item purchased status via PATCH
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
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || t('failedToUpdateItem'), 'error')
      }
    } catch (err) {
      showNotification(t('failedToUpdateItem'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Save PM notes for an item via send button
  const handleUpdatePmNotes = async (item: SupplyListItem, note: string) => {
    if (!selectedList) return
    const trimmed = note.trim()
    if (trimmed === (item.pmNotes || '')) return
    // Optimistic update
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
      setSelectedList(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, pmNotes: item.pmNotes } : i),
      } : null)
    }
  }

  // Start inline editing of an item's name/quantity
  const startEditItem = (item: SupplyListItem) => {
    setEditingItemId(item.id)
    setEditName(item.name)
    setEditQuantity(item.quantity.toString())
  }

  // Save inline edit of item name/quantity
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
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || t('failedToUpdateItem'), 'error')
      }
    } catch {
      showNotification(t('failedToUpdateItem'), 'error')
    } finally {
      setActionLoading(false)
      setEditingItemId(null)
    }
  }

  // Save list-level notes via send button
  const handleSendListNote = async (note: string) => {
    if (!selectedList) return
    const trimmed = note.trim()
    if (trimmed === (selectedList.notes || '')) return
    // Optimistic update
    setListNotes(trimmed)
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

  // Add a new item to the selected supply list
  const handleAddItem = async () => {
    if (!selectedList || !newItemName.trim()) return
    setActionLoading(true)
    try {
      const res = await updateSupplyList(selectedList.id, {
        newItems: [{ name: newItemName.trim(), quantity: parseInt(newItemQuantity, 10) || 1 }],
      })
      if (res.status === 'success') {
        // Add new item IDs to the stable order ref
        const existingIds = new Set(itemOrderRef.current)
        res.data.items.forEach(i => {
          if (!existingIds.has(i.id)) itemOrderRef.current.push(i.id)
        })
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        setNewItemName('')
        setNewItemQuantity('1')
        showNotification(t('itemAdded'), 'success')
      } else {
        showNotification(res.message || t('failedToAddItem'), 'error')
      }
    } catch (err) {
      showNotification(t('failedToAddItem'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Remove an item from the selected supply list
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
        showNotification(t('itemRemoved'), 'success')
      } else {
        showNotification(res.message || t('failedToRemoveItem'), 'error')
      }
    } catch (err) {
      showNotification(t('failedToRemoveItem'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Mark as fulfilled
  const handleFulfill = async () => {
    if (!selectedList || selectedList.status === 'fulfilled') return
    setActionLoading(true)
    try {
      const res = await fulfillSupplyList(selectedList.id, fulfilledBy)
      if (res.status === 'success') {
        showNotification(t('supplyListFulfilled'), 'success')
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || t('failedToFulfillSupplyList'), 'error')
      }
    } catch (err) {
      showNotification(t('failedToFulfillSupplyList'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete supply list
  const handleDelete = async () => {
    if (!selectedList) return
    setActionLoading(true)
    try {
      const res = await deleteSupplyList(selectedList.id)
      if (res.status === 'success') {
        showNotification(t('supplyListDeleted'), 'success')
        setSupplyLists(prev => prev.filter(sl => sl.id !== selectedList.id))
        setShowDeleteConfirm(false)
        onSupplyListsChanged?.()
        if (isDirectDetail) {
          onClose()
        } else {
          setSelectedList(null)
        }
      } else {
        showNotification(res.message || t('failedToDelete'), 'error')
      }
    } catch (err) {
      showNotification(t('failedToDeleteSupplyList'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete receipt
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!selectedList) return
    setDeletingReceiptId(receiptId)
    try {
      const res = await deleteReceipt(receiptId)
      if (res.status === 'success') {
        showNotification(t('receiptDeleted'), 'success')
        setReceipts(prev => prev.filter(r => r.id !== receiptId))
        setConfirmDeleteReceiptId(null)
        // Refetch supply list to get updated item statuses
        if (isDirectDetail) {
          const slRes = await getSupplyListById(selectedList.id)
          if (slRes.status === 'success') {
            setSelectedList(slRes.data)
          }
        } else {
          const slRes = await getSupplyListsByProject(projectId!)
          if (slRes.status === 'success') {
            setSupplyLists(slRes.data)
            const updated = slRes.data.find(sl => sl.id === selectedList.id)
            if (updated) setSelectedList(updated)
          }
        }
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || t('failedToDeleteReceipt'), 'error')
      }
    } catch {
      showNotification(t('errorDeletingReceipt'), 'error')
    } finally {
      setDeletingReceiptId(null)
    }
  }

  // Refresh the selected supply list after line item mutations (backend cascades cost changes to items)
  const refreshSelectedList = async () => {
    if (!selectedList) return
    try {
      const res = await getSupplyListById(selectedList.id)
      if (res.status === 'success') {
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
      }
    } catch {
      // Non-critical — items will refresh on next navigation
    }
  }


  const getProgress = (list: SupplyList) => {
    if (list.progress) return list.progress
    const totalItems = list.items.length
    const purchasedItems = list.items.filter(i => i.isPurchased).length
    const totalCost = list.items.reduce((sum, i) => sum + (i.totalCost || 0), 0)
    return { totalItems, purchasedItems, percentage: totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0, totalCost }
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} closable style="!overflow-y-hidden flex flex-col max-w-2xl w-[calc(100%-1rem)]" zIndex={zIndex}>
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {selectedList ? (
              <button
                onClick={() => {
                  if (isDirectDetail) {
                    onClose()
                  } else {
                    setSelectedList(null)
                    setShowDeleteConfirm(false)
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                {selectedList ? t('supplyListDetails') : t('supplyListsTitle')}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedList
                  ? t('submittedAgo', { time: formatSupplyListAge(selectedList.createdAt) })
                  : projectName || `${supplyLists.length} list${supplyLists.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>
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
              {/* Tab Bar */}
              <TabBar
                tabs={[
                  { key: 'items', label: t('items') || 'Items', badge: selectedList.items.length, badgeColor: 'bg-teal-500' },
                  { key: 'receipts', label: t('receipts') || 'Receipts', badge: receipts.length || undefined, badgeColor: 'bg-blue-500' },
                  { key: 'details', label: t('details') || 'Details' },
                ]}
                activeTab={detailTab}
                onTabChange={(key) => setDetailTab(key as DetailTab)}
              />

              {/* === ITEMS TAB === */}
              {detailTab === 'items' && (
                <>
                  {/* Progress Bar */}
                  {selectedList.items.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{getProgress(selectedList).purchasedItems}/{getProgress(selectedList).totalItems} {t('purchasedLabel').toLowerCase()}</span>
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
                          { key: 'all' as const, label: t('all'), count: selectedList.items.length },
                          { key: 'remaining' as const, label: t('remaining'), count: remaining },
                          { key: 'purchased' as const, label: t('purchasedLabel'), count: purchased },
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
                    const isEditingThis = editingItemId === item.id

                    if (isEditingThis && isEditable) {
                      return (
                        <div key={item.id} className="p-2.5 bg-teal-50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveItemEdit()
                                if (e.key === 'Escape') setEditingItemId(null)
                              }}
                            />
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              min="1"
                              className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveItemEdit()
                                if (e.key === 'Escape') setEditingItemId(null)
                              }}
                            />
                          </div>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                            <button
                              onClick={handleSaveItemEdit}
                              disabled={actionLoading || !editName.trim()}
                              className="px-2.5 py-1 text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 cursor-pointer"
                            >
                              {actionLoading ? t('saving') : t('saveChanges')}
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                          item.isPurchased ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        <button
                          onClick={() => handleTogglePurchased(item)}
                          disabled={actionLoading}
                          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                            item.isPurchased
                              ? 'bg-teal-500 border-teal-500 text-white'
                              : 'border-gray-300 hover:border-teal-500'
                          } ${actionLoading ? 'opacity-50' : ''}`}
                        >
                          {item.isPurchased && <CheckIcon className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isEditable ? (
                              <button
                                onClick={() => startEditItem(item)}
                                className="text-sm font-medium text-left hover:text-teal-700 transition-colors cursor-pointer"
                              >
                                <span className={item.isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'}>
                                  {item.name}
                                </span>
                              </button>
                            ) : (
                              <p className={`text-sm font-medium ${item.isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {item.name}
                              </p>
                            )}
                            {item.quantity > 1 && (
                              isEditable ? (
                                <button
                                  onClick={() => startEditItem(item)}
                                  className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                  x{item.quantity}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  x{item.quantity}
                                </span>
                              )
                            )}
                            {item.isPurchased && item.totalCost != null && item.totalCost > 0 && (
                              <span className="text-teal-600 text-[10px] font-medium">
                                ${item.totalCost.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {/* PM Notes */}
                          <div className="mt-1">
                            <NoteInput
                              value={item.pmNotes || ''}
                              onSend={(note) => handleUpdatePmNotes(item, note)}
                              placeholder={t('addANote')}
                              compact
                            />
                          </div>
                        </div>
                        {isEditable && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={actionLoading}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

                  {/* Delete Confirmation (in items tab) */}
                  {showDeleteConfirm && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-700 font-medium mb-3">
                        {t('confirmDeleteSupplyList')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={actionLoading}
                          className="flex-1 py-2 px-3 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading ? t('deleting') : t('deleteList')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* === RECEIPTS TAB === */}
              {detailTab === 'receipts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                      {t('receipts')} ({receipts.length})
                    </h4>
                    {onScanReceipt && selectedList && (
                      <button
                        onClick={() => onScanReceipt(selectedList)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <CameraIcon className="w-3.5 h-3.5" /> {t('scanReceipt')}
                      </button>
                    )}
                  </div>
                  {receiptsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                    </div>
                  ) : receipts.length === 0 ? (
                    <div className="text-center py-8">
                      <DocumentTextIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">{t('noReceiptsScannedYet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {receipts.map(receipt => (
                        <div key={receipt.id}>
                          <RelatedEntityCard
                            entityType="receipt"
                            title={receipt.vendorName || receipt.originalName}
                            subtitle={receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : undefined}
                            amount={receipt.total}
                            status={receipt.status}
                            onClick={() => setStackedReceiptId(receipt.id)}
                          />
                          {/* Quick actions below card */}
                          <div className="flex items-center gap-1.5 mt-1 ml-8">
                            {receipt.status === 'matched' && (
                              <button
                                onClick={() => setReviewReceiptId(receipt.id)}
                                className="px-2 py-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                              >
                                {t('review')}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteReceiptId(confirmDeleteReceiptId === receipt.id ? null : receipt.id)}
                              disabled={deletingReceiptId === receipt.id}
                              className="px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {t('deleteReceipt')}
                            </button>
                          </div>
                          {confirmDeleteReceiptId === receipt.id && (
                            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg ml-8">
                              <p className="text-[10px] text-red-700 mb-1.5">
                                {receipt.status === 'applied'
                                  ? t('deleteReceiptLinkedWarning')
                                  : t('deleteThisReceipt')}
                              </p>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setConfirmDeleteReceiptId(null)}
                                  className="flex-1 py-1 text-[10px] font-medium border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                                >
                                  {t('cancel')}
                                </button>
                                <button
                                  onClick={() => handleDeleteReceipt(receipt.id)}
                                  disabled={!!deletingReceiptId}
                                  className="flex-1 py-1 text-[10px] font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                                >
                                  {deletingReceiptId === receipt.id ? t('deleting') : t('deleteList')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === DETAILS TAB === */}
              {detailTab === 'details' && (
                <div className="space-y-4">
                  {/* Status & Submitter Info */}
                  <div className="flex items-center gap-3 flex-wrap">
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

                  {/* Property & Date */}
                  {(selectedList.propertyName || selectedList.projectDate) && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {selectedList.propertyName && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 font-medium">Property:</span>
                          <span className="text-gray-900">{selectedList.propertyName}</span>
                        </div>
                      )}
                      {selectedList.projectDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {new Date(selectedList.projectDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress Summary */}
                  {selectedList.items.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{getProgress(selectedList).purchasedItems}/{getProgress(selectedList).totalItems} {t('purchasedLabel').toLowerCase()}</span>
                        <span>{getProgress(selectedList).percentage}%</span>
                      </div>
                      <ProgressBar percentage={getProgress(selectedList).percentage} />
                      {getProgress(selectedList).totalCost > 0 && (
                        <p className="text-xs text-teal-600 font-medium mt-1">
                          Total cost: ${getProgress(selectedList).totalCost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* List-level Notes */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                    <NoteInput
                      value={listNotes}
                      onSend={handleSendListNote}
                      placeholder={t('addNotesForSupplyList')}
                      multiline
                    />
                  </div>

                  {/* Fulfilled info */}
                  {selectedList.status === 'fulfilled' && selectedList.fulfilledAt && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">{t('fulfilled')}</p>
                        <p className="text-sm text-green-600">
                          {new Date(selectedList.fulfilledAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
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
                  <p className="text-gray-500">{t('noSupplyLists')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplyLists.map((list) => {
                    const statusInfo = SUPPLY_LIST_STATUS_INFO[list.status]
                    const progress = getProgress(list)

                    return (
                      <button
                        key={list.id}
                        onClick={() => selectList(list)}
                        className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${statusIconColors[list.status] || 'bg-teal-100 text-teal-600'}`}>
                            <ClipboardDocumentListIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-gray-900">
                                {list.items.length} item{list.items.length !== 1 ? 's' : ''}
                              </span>
                              <span className={`
                                px-2 py-0.5 rounded text-xs font-medium
                                ${statusBadgeColors[statusInfo.color] || 'bg-gray-100 text-gray-700'}
                              `}>
                                {statusInfo.label}
                              </span>
                              <NeedsReceiptBadge supplyList={list} />
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
                                  {progress.purchasedItems}/{progress.totalItems} {t('purchasedLabel').toLowerCase()}
                                </span>
                              )}
                            </div>
                            {/* Progress bar on list card */}
                            {list.status !== 'fulfilled' && list.items.length > 0 && progress.purchasedItems > 0 && (
                              <div className="mt-2">
                                <ProgressBar percentage={progress.percentage} />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
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
              placeholder={t('addNewItemPlaceholder')}
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
              className="flex-shrink-0 px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Fulfill / Delete actions */}
          <div className="flex gap-3">
            <button
              onClick={handleFulfill}
              disabled={actionLoading}
              className="flex-1 py-2.5 px-4 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              {t('markAsFulfilled')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={actionLoading}
              className="py-2.5 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Modal>

    {stackedReceiptId && (
      <ReceiptDetailModal
        isOpen={!!stackedReceiptId}
        onClose={() => setStackedReceiptId(null)}
        receiptId={stackedReceiptId}
        properties={[]}
        onUpdated={() => {
          // Refresh the selected supply list to pick up any receipt changes
          if (selectedList) refreshSelectedList()
        }}
        onDeleted={() => {
          setStackedReceiptId(null)
          if (selectedList) refreshSelectedList()
        }}
        defaultSupplyListId={selectedList?.id}
        zIndex={(zIndex ?? 60) + 10}
      />
    )}
    {viewingExpenseId && (
      <ExpenseViewerModal
        isOpen={!!viewingExpenseId}
        onClose={() => setViewingExpenseId(null)}
        expenseId={viewingExpenseId}
        hideSupplyListLink={true}
        zIndex={(zIndex ?? 60) + 10}
      />
    )}
    {reviewReceiptId && selectedList && (
      <ScanSupplyReceiptModal
        isOpen={true}
        onClose={() => setReviewReceiptId(null)}
        receiptId={reviewReceiptId}
        supplyListId={selectedList.id}
        supplyList={selectedList}
        onReceiptApplied={() => {
          setReviewReceiptId(null)
          searchReceipts({ supplyListId: selectedList.id }).then(res => {
            if (res.status === 'success') setReceipts(res.data || [])
          })
          onSupplyListsChanged?.()
        }}
      />
    )}
    </>
  )
}

export default ViewSupplyListsModal
