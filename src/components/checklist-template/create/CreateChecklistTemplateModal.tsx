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
  ChevronDownIcon,
  CheckIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { createChecklistTemplate } from '@/services/checklistTemplateService'
import { COMMON_ROOM_NAMES } from '@/services/checklistService'
import type { ChecklistTemplate } from '@/services/types/checklistTemplate'

interface CreateChecklistTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (template: ChecklistTemplate) => void
}

// Local item state before saving
interface LocalItem {
  id: string
  roomName: string
  taskDescription: string
  requiresPhoto: boolean
  sortOrder: number
}

export default function CreateChecklistTemplateModal({
  isOpen,
  onClose,
  onAdd,
}: CreateChecklistTemplateModalProps) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [requiresWalkthrough, setRequiresWalkthrough] = useState(false)
  const [items, setItems] = useState<LocalItem[]>([])

  // New item form state
  const [newRoom, setNewRoom] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newRequiresPhoto, setNewRequiresPhoto] = useState(false)
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'details' | 'items'>('details')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setTags([])
      setTagInput('')
      setRequiresWalkthrough(false)
      setItems([])
      setNewRoom('')
      setNewTask('')
      setNewRequiresPhoto(false)
      setStep('details')
    }
  }, [isOpen])

  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Tag management
  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // Item management
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
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const togglePhotoRequirement = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, requiresPhoto: !item.requiresPhoto } : item
      )
    )
  }

  const handleReorder = (newOrder: LocalItem[]) => {
    setItems(newOrder.map((item, index) => ({ ...item, sortOrder: index })))
  }

  // Room suggestions
  const filteredRoomSuggestions = COMMON_ROOM_NAMES.filter((room) =>
    room.toLowerCase().includes(newRoom.toLowerCase())
  )

  const usedRooms = [...new Set(items.map((item) => item.roomName).filter(Boolean))]

  // Group items by room for display
  const groupedItems = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const room = item.roomName || 'General'
        if (!acc[room]) acc[room] = []
        acc[room].push(item)
        return acc
      },
      {} as Record<string, LocalItem[]>
    )
  }, [items])

  const handleSubmit = async () => {
    if (!profile?.id) {
      showNotification('Please log in', 'error')
      return
    }

    if (!name.trim()) {
      showNotification('Please enter a template name', 'error')
      return
    }

    setLoading(true)

    try {
      const res = await createChecklistTemplate({
        userId: profile.id,
        name: name.trim(),
        description: description.trim() || null,
        tags,
        requiresWalkthrough,
        items: items.map((item, index) => ({
          roomName: item.roomName || null,
          taskDescription: item.taskDescription,
          requiresPhoto: item.requiresPhoto,
          sortOrder: index,
        })),
      })

      if (res.status !== 'success') {
        throw new Error(res.message || 'Failed to create template')
      }

      showNotification(
        `Template "${name}" created with ${items.length} tasks`,
        'success'
      )
      onAdd(res.data)
      onClose()
    } catch (err) {
      console.error('Error creating template:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to create template',
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
                  {step === 'details' ? 'Step 1: Template details' : 'Step 2: Add tasks'}
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
                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., 3 Bedroom Apartment, Studio Quick Turn, Deep Clean"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe when to use this template..."
                      rows={3}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <TagIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      Tags
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                        placeholder="Add tag and press Enter..."
                        className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                        className="px-3 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-lg"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Walkthrough Toggle */}
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Require Final Walkthrough</p>
                      <p className="text-xs text-gray-500 mt-0.5">Cleaners must upload room photos before completing</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequiresWalkthrough(!requiresWalkthrough)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        requiresWalkthrough ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          requiresWalkthrough ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
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
                        Add tasks above to build your template
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
                    if (!name.trim()) {
                      showNotification('Please enter a template name', 'error')
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
                      Create Template ({items.length} tasks)
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
