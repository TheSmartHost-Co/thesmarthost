'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '@/components/shared/modal'
import {
  getSupplyListsByProject,
  updateSupplyList,
  deleteSupplyList,
  fulfillSupplyList,
  toggleSupplyListItem,
  formatSupplyListAge,
} from '@/services/supplyListService'
import type { SupplyList, SupplyListItem } from '@/services/types/supplyList'
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
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface ViewSupplyListsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName?: string
  onSupplyListsChanged?: () => void
  fulfilledBy?: string
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
}) => {
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<SupplyList | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemFilter, setItemFilter] = useState<'all' | 'remaining' | 'purchased'>('all')

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
        showNotification(res.message || 'Failed to load supply lists', 'error')
      }
    } catch (err) {
      console.error('Error fetching supply lists:', err)
      showNotification('Failed to load supply lists', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showNotification])

  useEffect(() => {
    if (isOpen && projectId) {
      fetchSupplyLists()
    }
  }, [isOpen, projectId, fetchSupplyLists])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedList(null)
      setNewItemName('')
      setNewItemQuantity('1')
      setShowDeleteConfirm(false)
      setItemFilter('all')
      itemOrderRef.current = []
    }
  }, [isOpen])

  // Capture item order when a list is first selected
  const selectList = (list: SupplyList) => {
    itemOrderRef.current = list.items.map(i => i.id)
    setItemFilter('all')
    setSelectedList(list)
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
        fulfilledBy: fulfilledBy,
      })
      if (res.status === 'success') {
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || 'Failed to update item', 'error')
      }
    } catch (err) {
      showNotification('Failed to update item', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Update PM notes for an item
  const handleUpdatePmNotes = async (item: SupplyListItem, pmNotes: string) => {
    if (!selectedList) return
    try {
      const res = await updateSupplyList(selectedList.id, {
        items: [{ id: item.id, pmNotes }],
      })
      if (res.status === 'success') {
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
      }
    } catch (err) {
      console.error('Error updating PM notes:', err)
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
        showNotification('Item added', 'success')
      } else {
        showNotification(res.message || 'Failed to add item', 'error')
      }
    } catch (err) {
      showNotification('Failed to add item', 'error')
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
        showNotification('Item removed', 'success')
      } else {
        showNotification(res.message || 'Failed to remove item', 'error')
      }
    } catch (err) {
      showNotification('Failed to remove item', 'error')
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
        showNotification('Supply list marked as fulfilled', 'success')
        setSelectedList(res.data)
        setSupplyLists(prev => prev.map(sl => sl.id === res.data.id ? res.data : sl))
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || 'Failed to fulfill supply list', 'error')
      }
    } catch (err) {
      showNotification('Failed to fulfill supply list', 'error')
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
        showNotification('Supply list deleted', 'success')
        setSupplyLists(prev => prev.filter(sl => sl.id !== selectedList.id))
        setSelectedList(null)
        setShowDeleteConfirm(false)
        onSupplyListsChanged?.()
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch (err) {
      showNotification('Failed to delete supply list', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getProgress = (list: SupplyList) => {
    if (list.progress) return list.progress
    const totalItems = list.items.length
    const purchasedItems = list.items.filter(i => i.isPurchased).length
    return { totalItems, purchasedItems, percentage: totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0 }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {selectedList ? (
              <button
                onClick={() => { setSelectedList(null); setShowDeleteConfirm(false) }}
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

              {/* Progress Bar (detail view) */}
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
              <div className="bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto">
                <div className="space-y-2">
                  {getStableItems(selectedList)
                    .filter(item => {
                      if (itemFilter === 'remaining') return !item.isPurchased
                      if (itemFilter === 'purchased') return item.isPurchased
                      return true
                    })
                    .map(item => {
                    const isEditable = selectedList.status !== 'fulfilled'
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
                            <p className={`text-sm font-medium ${item.isPurchased ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {item.name}
                            </p>
                            {item.quantity > 1 && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                          {/* PM Notes inline edit */}
                          {isEditable && (
                            <input
                              type="text"
                              value={item.pmNotes || ''}
                              onChange={(e) => {
                                // Optimistic update
                                setSelectedList(prev => prev ? {
                                  ...prev,
                                  items: prev.items.map(i => i.id === item.id ? { ...i, pmNotes: e.target.value } : i),
                                } : null)
                              }}
                              onBlur={(e) => handleUpdatePmNotes(item, e.target.value)}
                              placeholder="Add a note..."
                              className="mt-1 w-full text-xs px-2 py-1 border border-transparent hover:border-gray-200 focus:border-teal-300 rounded focus:ring-1 focus:ring-teal-300 bg-transparent focus:bg-white"
                            />
                          )}
                          {!isEditable && item.pmNotes && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.pmNotes}</p>
                          )}
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

              {/* Add new item (editable lists) */}
              {selectedList.status !== 'fulfilled' && (
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
                    className="flex-shrink-0 px-3 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Actions (editable lists) */}
              {selectedList.status !== 'fulfilled' && (
                <div className="border-t pt-4 flex gap-3">
                  <button
                    onClick={handleFulfill}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 px-4 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Mark as Fulfilled
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={actionLoading}
                    className="py-2.5 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Fulfilled info */}
              {selectedList.status === 'fulfilled' && selectedList.fulfilledAt && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700">Fulfilled</p>
                    <p className="text-sm text-green-600">
                      {new Date(selectedList.fulfilledAt).toLocaleString()}
                    </p>
                  </div>
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
                      className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="flex-1 py-2 px-3 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
    </Modal>
  )
}

export default ViewSupplyListsModal
