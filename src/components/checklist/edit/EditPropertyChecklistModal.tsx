'use client'

import { notifyError } from '@/utils/notify'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  CameraIcon,
  CheckIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import GroupedItemsEditor from '@/components/shared/GroupedItemsEditor'
import type { EditableItem } from '@/components/shared/GroupedItemsEditor'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getChecklistById,
  updateChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
  COMMON_ROOM_NAMES,
} from '@/services/checklistService'
import type { Checklist, ChecklistItem } from '@/services/types/checklist'

interface EditPropertyChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  checklistId: string | null
}

export default function EditPropertyChecklistModal({
  isOpen,
  onClose,
  onUpdated,
  checklistId,
}: EditPropertyChecklistModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Data state
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)

  // Metadata state
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  // Items state
  const [items, setItems] = useState<EditableItem[]>([])
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])

  // New item form
  const [newRoom, setNewRoom] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newRequiresPhoto, setNewRequiresPhoto] = useState(false)
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(false)

  // UI state
  const [saving, setSaving] = useState(false)

  // Fetch checklist data
  useEffect(() => {
    if (isOpen && checklistId) {
      setLoadingData(true)
      setIsEditing(false)
      getChecklistById(checklistId)
        .then((res) => {
          if (res.status === 'success') {
            setChecklist(res.data)
            populateForm(res.data)
          } else {
            showNotification('Failed to load checklist', 'error')
          }
        })
        .catch((err) => {
          console.error('Error loading checklist:', err)
          showNotification('Failed to load checklist', 'error')
        })
        .finally(() => setLoadingData(false))
    }
  }, [isOpen, checklistId])

  const populateForm = (data: Checklist) => {
    setName(data.name)
    setIsDefault(data.isDefault)
    setDeletedItemIds([])
    setNewRoom('')
    setNewTask('')
    setNewRequiresPhoto(false)

    if (data.items) {
      setItems(
        data.items.map((item) => ({
          id: item.id,
          roomName: item.roomName || '',
          taskDescription: item.taskDescription,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
          isNew: false,
          isDirty: false,
        }))
      )
    } else {
      setItems([])
    }
  }

  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Item management
  const handleAddItem = () => {
    if (!newTask.trim()) {
      showNotification('Please enter a task description', 'error')
      return
    }

    setItems([
      ...items,
      {
        id: generateTempId(),
        roomName: newRoom.trim() || '',
        taskDescription: newTask.trim(),
        requiresPhoto: newRequiresPhoto,
        sortOrder: items.length,
        isNew: true,
        isDirty: false,
      },
    ])
    setNewTask('')
    setNewRequiresPhoto(false)
  }

  const handleRemoveItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item && !item.isNew) {
      setDeletedItemIds([...deletedItemIds, id])
    }
    setItems(items.filter((i) => i.id !== id))
  }

  // Room suggestions
  const filteredRoomSuggestions = COMMON_ROOM_NAMES.filter((room) =>
    room.toLowerCase().includes(newRoom.toLowerCase())
  )
  const usedRooms = [...new Set(items.map((item) => item.roomName).filter(Boolean))]

  // Group items by room for view mode
  const groupedItems = items.reduce(
    (acc, item) => {
      const room = item.roomName || 'General'
      if (!acc[room]) acc[room] = []
      acc[room].push(item)
      return acc
    },
    {} as Record<string, EditableItem[]>
  )

  const handleSave = async () => {
    if (!checklist) return
    if (!name.trim()) {
      showNotification('Please enter a checklist name', 'error')
      return
    }

    setSaving(true)

    try {
      // 1. Update metadata
      const metaRes = await updateChecklist(checklist.id, {
        name: name.trim(),
        isDefault,
      })

      if (metaRes.status !== 'success') {
        throw new Error(metaRes.message || 'Failed to update checklist')
      }

      // 2. Delete removed items
      for (const itemId of deletedItemIds) {
        await deleteChecklistItem(checklist.id, itemId)
      }

      // 3. Add new items
      for (const item of items.filter((i) => i.isNew)) {
        await addChecklistItem(checklist.id, {
          roomName: item.roomName || null,
          taskDescription: item.taskDescription,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
        })
      }

      // 4. Update modified existing items
      for (const item of items.filter((i) => i.isDirty && !i.isNew)) {
        await updateChecklistItem(checklist.id, item.id, {
          roomName: item.roomName || null,
          taskDescription: item.taskDescription,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
        })
      }

      // 5. Reorder existing items
      const existingItems = items.filter((i) => !i.isNew)
      if (existingItems.length > 0) {
        await reorderChecklistItems(checklist.id, {
          items: existingItems.map((item, index) => ({
            id: item.id,
            sortOrder: index,
          })),
        })
      }

      showNotification('Checklist updated successfully', 'success')
      setIsEditing(false)
      onUpdated()
      onClose()
    } catch (err) {
      console.error('Error updating checklist:', err)
      notifyError(err, 'Failed to update checklist')
    } finally {
      setSaving(false)
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {loadingData ? 'Loading...' : checklist?.name || 'Checklist'}
                </h2>
                <p className="text-sm text-gray-500">
                  {checklist?.propertyName || ''}
                  {checklist?.templateName && (
                    <span className="ml-2 text-emerald-600">
                      &middot; Based on: {checklist.templateName}
                    </span>
                  )}
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
            {loadingData ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">Loading checklist...</span>
              </div>
            ) : isEditing ? (
              /* ─── Edit Mode ─── */
              <>
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Checklist Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>

                {/* Default Toggle */}
                <label className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-blue-800">
                      Set as default checklist
                    </span>
                    <p className="text-xs text-blue-600">
                      Auto-selected for new cleaning projects at this property
                    </p>
                  </div>
                </label>

                <div className="border-t border-gray-200" />

                {/* Add Item Form */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <PlusIcon className="w-4 h-4 text-blue-500" />
                    Add Task
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={newRoom}
                        onChange={(e) => {
                          setNewRoom(e.target.value)
                          setShowRoomSuggestions(true)
                        }}
                        onFocus={() => setShowRoomSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowRoomSuggestions(false), 200)}
                        placeholder="Room (optional)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                      />
                      {showRoomSuggestions && (newRoom || usedRooms.length > 0) && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {usedRooms.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                Recently Used
                              </div>
                              {usedRooms.map((room) => (
                                <button
                                  key={room}
                                  type="button"
                                  onClick={() => {
                                    setNewRoom(room)
                                    setShowRoomSuggestions(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700"
                                >
                                  {room}
                                </button>
                              ))}
                            </>
                          )}
                          {filteredRoomSuggestions.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                Suggestions
                              </div>
                              {filteredRoomSuggestions.slice(0, 5).map((room) => (
                                <button
                                  key={room}
                                  type="button"
                                  onClick={() => {
                                    setNewRoom(room)
                                    setShowRoomSuggestions(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700"
                                >
                                  {room}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <input
                        type="text"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddItem()
                          }
                        }}
                        placeholder="Task description"
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setNewRequiresPhoto(!newRequiresPhoto)}
                        className={`px-2.5 py-2 rounded-lg border transition-colors ${
                          newRequiresPhoto
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                        }`}
                        title="Requires photo"
                      >
                        <CameraIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editable Items List — Grouped by Room */}
                {items.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No tasks</p>
                  </div>
                ) : (
                  <GroupedItemsEditor
                    items={items}
                    onItemsChange={setItems}
                    onDeleteItem={handleRemoveItem}
                    accentColor="blue"
                  />
                )}
              </>
            ) : (
              /* ─── View Mode ─── */
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{items.length}</p>
                    <p className="text-xs text-gray-500">Tasks</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {Object.keys(groupedItems).length}
                    </p>
                    <p className="text-xs text-gray-500">Rooms</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {items.filter((i) => i.requiresPhoto).length}
                    </p>
                    <p className="text-xs text-gray-500">Photos Required</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {checklist?.isDefault && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      Default
                    </span>
                  )}
                  {checklist?.templateName && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Based on: {checklist.templateName}
                    </span>
                  )}
                  {checklist?.templateId && !checklist?.templateName && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Template removed
                    </span>
                  )}
                </div>

                {/* Items by Room */}
                {items.length > 0 ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {Object.entries(groupedItems).map(([room, roomItems]) => (
                      <div key={room}>
                        <div className="px-4 py-2.5 bg-gray-100/80 border-b border-gray-100 sticky top-0">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {room}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {roomItems.length} task{roomItems.length !== 1 && 's'}
                          </span>
                        </div>
                        {roomItems.map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                          >
                            <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                            <span className="text-sm text-gray-700 flex-1">
                              {item.taskDescription}
                            </span>
                            {item.requiresPhoto && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <CameraIcon className="w-3.5 h-3.5" />
                                Photo
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">This checklist has no tasks</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    if (checklist) populateForm(checklist)
                    setIsEditing(false)
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Close
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit Checklist
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
