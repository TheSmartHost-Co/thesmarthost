'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  CameraIcon,
  HomeIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  createChecklist,
  addChecklistItem,
  COMMON_ROOM_NAMES,
} from '@/services/checklistService'
import SearchableSelect from '@/components/shared/SearchableSelect'
import type { Checklist, ChecklistItemPayload } from '@/services/types/checklist'
import type { Property } from '@/services/types/property'

interface CreateChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (checklist: Checklist) => void
  properties: Property[]
  initialPropertyId?: string
}

// Local item state before saving
interface LocalItem {
  id: string // temporary local ID
  roomName: string
  taskDescription: string
  requiresPhoto: boolean
  sortOrder: number
}

export default function CreateChecklistModal({
  isOpen,
  onClose,
  onAdd,
  properties,
  initialPropertyId,
}: CreateChecklistModalProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Form state
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [items, setItems] = useState<LocalItem[]>([])

  // New item form state
  const [newRoom, setNewRoom] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newRequiresPhoto, setNewRequiresPhoto] = useState(false)
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'details' | 'items'>('details')

  // Convert properties to SearchableSelect options
  const propertyOptions = useMemo(
    () =>
      properties.map((prop) => ({
        value: prop.id,
        label: prop.listingName || prop.internalName || prop.address,
        secondaryLabel: prop.address,
      })),
    [properties]
  )

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPropertyId(initialPropertyId || null)
      setName('')
      setIsDefault(false)
      setItems([])
      setNewRoom('')
      setNewTask('')
      setNewRequiresPhoto(false)
      setStep('details')
    }
  }, [isOpen, initialPropertyId])

  // Generate temporary ID for local items
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add a new item
  const handleAddItem = () => {
    if (!newTask.trim()) {
      showNotification('Please enter a task description', 'error')
      return
    }

    const newItem: LocalItem = {
      id: generateTempId(),
      roomName: newRoom.trim() || '',
      taskDescription: newTask.trim(),
      requiresPhoto: newRequiresPhoto,
      sortOrder: items.length,
    }

    setItems([...items, newItem])
    setNewTask('')
    setNewRequiresPhoto(false)
    // Keep the room for quick consecutive additions
  }

  // Remove an item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  // Toggle photo requirement for an item
  const togglePhotoRequirement = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, requiresPhoto: !item.requiresPhoto } : item
      )
    )
  }

  // Handle reorder
  const handleReorder = (newOrder: LocalItem[]) => {
    setItems(newOrder.map((item, index) => ({ ...item, sortOrder: index })))
  }

  // Filter room suggestions
  const filteredRoomSuggestions = COMMON_ROOM_NAMES.filter((room) =>
    room.toLowerCase().includes(newRoom.toLowerCase())
  )

  // Get unique rooms from current items
  const usedRooms = [...new Set(items.map((item) => item.roomName).filter(Boolean))]

  // Group items by room for display
  const groupedItems = items.reduce(
    (acc, item) => {
      const room = item.roomName || 'General'
      if (!acc[room]) acc[room] = []
      acc[room].push(item)
      return acc
    },
    {} as Record<string, LocalItem[]>
  )

  const handleSubmit = async () => {
    if (!profile?.id) {
      showNotification('Please log in', 'error')
      return
    }

    if (!propertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    if (!name.trim()) {
      showNotification('Please enter a checklist name', 'error')
      return
    }

    setLoading(true)

    try {
      // 1. Create the checklist
      const checklistRes = await createChecklist({
        propertyId,
        name: name.trim(),
        isDefault,
      })

      if (checklistRes.status !== 'success') {
        throw new Error(checklistRes.message || 'Failed to create checklist')
      }

      const checklistId = checklistRes.data.id

      // 2. Add all items
      if (items.length > 0) {
        const itemPromises = items.map((item, index) => {
          const payload: ChecklistItemPayload = {
            taskDescription: item.taskDescription,
            roomName: item.roomName || null,
            requiresPhoto: item.requiresPhoto,
            sortOrder: index,
          }
          return addChecklistItem(checklistId, payload)
        })

        await Promise.all(itemPromises)
      }

      // 3. Fetch the complete checklist with items
      const finalChecklist: Checklist = {
        ...checklistRes.data,
        itemCount: items.length,
      }

      showNotification(
        `Checklist "${name}" created with ${items.length} items`,
        'success'
      )
      onAdd(finalChecklist)
      onClose()
    } catch (err) {
      console.error('Error creating checklist:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to create checklist',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Create Checklist Template</h2>
                <p className="text-sm text-gray-500">
                  {step === 'details' ? 'Step 1: Basic details' : 'Step 2: Add tasks'}
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
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 'details' ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 space-y-6"
                >
                  {/* Property Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <HomeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      Property <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={propertyOptions}
                      value={propertyId}
                      onChange={setPropertyId}
                      placeholder="Search properties..."
                      emptyText="No properties found"
                      clearable={false}
                    />
                  </div>

                  {/* Checklist Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      Checklist Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Standard Turnover, Deep Clean, Quick Refresh"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                      required
                    />
                  </div>

                  {/* Default Toggle */}
                  <label className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-emerald-800">
                        Set as default checklist
                      </span>
                      <p className="text-xs text-emerald-600">
                        This checklist will be auto-selected for new projects at this property
                      </p>
                    </div>
                  </label>
                </motion.div>
              ) : (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  {/* Add Item Form */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <PlusIcon className="w-4 h-4 text-emerald-500" />
                      Add Task
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Room Input with Autocomplete */}
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
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
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
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700"
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
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700"
                                  >
                                    {room}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Task Input */}
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
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
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
                          className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No tasks added yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Add tasks above to build your checklist
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {items.length} task{items.length !== 1 && 's'}
                        </span>
                        <span className="text-gray-500 text-xs">Drag to reorder</span>
                      </div>

                      <Reorder.Group
                        axis="y"
                        values={items}
                        onReorder={handleReorder}
                        className="space-y-2"
                      >
                        {items.map((item) => (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                          >
                            <Bars3Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {item.taskDescription}
                              </div>
                              {item.roomName && (
                                <div className="text-xs text-gray-500">{item.roomName}</div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => togglePhotoRequirement(item.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.requiresPhoto
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'text-gray-300 hover:text-gray-500'
                              }`}
                              title={item.requiresPhoto ? 'Photo required' : 'No photo required'}
                            >
                              <CameraIcon className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div>
              {step === 'items' && (
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              {step === 'details' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!propertyId) {
                      showNotification('Please select a property', 'error')
                      return
                    }
                    if (!name.trim()) {
                      showNotification('Please enter a checklist name', 'error')
                      return
                    }
                    setStep('items')
                  }}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  Next: Add Tasks
                  <ChevronDownIcon className="w-4 h-4 rotate-[-90deg]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || items.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Create Checklist ({items.length} tasks)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
