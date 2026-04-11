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
  CheckIcon,
  TagIcon,
  PencilSquareIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  LinkSlashIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  updateChecklistTemplate,
  addChecklistTemplateItem,
  updateChecklistTemplateItem,
  deleteChecklistTemplateItem,
  reorderChecklistTemplateItems,
  getLinkedProperties,
  unlinkPropertyFromTemplate,
  propagateTemplateToChecklists,
} from '@/services/checklistTemplateService'
import { COMMON_ROOM_NAMES } from '@/services/checklistService'
import type { ChecklistTemplate, ChecklistTemplateItem, LinkedProperty } from '@/services/types/checklistTemplate'
import PropagateTemplateModal from './PropagateTemplateModal'
import UnlinkPropertyConfirmModal from '../unlink/UnlinkPropertyConfirmModal'

interface UpdateChecklistTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: (template: ChecklistTemplate) => void
  template: ChecklistTemplate | null
}

interface EditableItem {
  id: string
  roomName: string
  taskDescription: string
  requiresPhoto: boolean
  sortOrder: number
  isNew: boolean // true if created locally, not yet saved
  isDirty: boolean // true if modified since last save
}

export default function UpdateChecklistTemplateModal({
  isOpen,
  onClose,
  onUpdated,
  template,
}: UpdateChecklistTemplateModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Metadata state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

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

  // Linked properties state
  const [linkedProperties, setLinkedProperties] = useState<LinkedProperty[]>([])
  const [loadingLinked, setLoadingLinked] = useState(false)
  const [showLinkedSection, setShowLinkedSection] = useState(false)

  // Propagation state
  const [showPropagateModal, setShowPropagateModal] = useState(false)

  // Unlink state
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedProperty | null>(null)
  const [showUnlinkModal, setShowUnlinkModal] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  // Populate form when template changes
  useEffect(() => {
    if (isOpen && template) {
      setName(template.name)
      setDescription(template.description || '')
      setTags(template.tags || [])
      setTagInput('')
      setDeletedItemIds([])
      setNewRoom('')
      setNewTask('')
      setNewRequiresPhoto(false)

      if (template.items) {
        setItems(
          template.items.map((item) => ({
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
  }, [isOpen, template])

  // Fetch linked properties when modal opens
  useEffect(() => {
    if (isOpen && template) {
      setLoadingLinked(true)
      getLinkedProperties(template.id)
        .then((res) => {
          if (res.status === 'success') {
            setLinkedProperties(res.data || [])
          }
        })
        .catch(console.error)
        .finally(() => setLoadingLinked(false))
    } else {
      setLinkedProperties([])
      setShowLinkedSection(false)
    }
  }, [isOpen, template])

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
      showNotification(t('pleaseEnterTaskDescription'), 'error')
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

  const togglePhotoRequirement = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, requiresPhoto: !item.requiresPhoto, isDirty: !item.isNew }
          : item
      )
    )
  }

  const handleReorder = (newOrder: EditableItem[]) => {
    setItems(newOrder.map((item, index) => ({ ...item, sortOrder: index })))
  }

  // Room suggestions
  const filteredRoomSuggestions = COMMON_ROOM_NAMES.filter((room) =>
    room.toLowerCase().includes(newRoom.toLowerCase())
  )
  const usedRooms = [...new Set(items.map((item) => item.roomName).filter(Boolean))]

  const handleSave = async () => {
    if (!template) return
    if (!name.trim()) {
      showNotification(t('pleaseEnterTemplateName'), 'error')
      return
    }

    setSaving(true)

    try {
      // 1. Update metadata
      const metaRes = await updateChecklistTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        tags,
      })

      if (metaRes.status !== 'success') {
        throw new Error(metaRes.message || t('failedToUpdateTemplate'))
      }

      // 2. Delete removed items
      for (const itemId of deletedItemIds) {
        await deleteChecklistTemplateItem(template.id, itemId)
      }

      // 3. Add new items
      for (const item of items.filter((i) => i.isNew)) {
        await addChecklistTemplateItem(template.id, {
          roomName: item.roomName || null,
          taskDescription: item.taskDescription,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
        })
      }

      // 4. Update modified existing items
      for (const item of items.filter((i) => i.isDirty && !i.isNew)) {
        await updateChecklistTemplateItem(template.id, item.id, {
          roomName: item.roomName || null,
          taskDescription: item.taskDescription,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
        })
      }

      // 5. Reorder all items (handles reorder for both new and existing)
      const allCurrentItems = items.filter((i) => !i.isNew)
      if (allCurrentItems.length > 0) {
        await reorderChecklistTemplateItems(template.id, {
          items: allCurrentItems.map((item, index) => ({
            id: item.id,
            sortOrder: index,
          })),
        })
      }

      return metaRes.data
    } catch (err) {
      console.error('Error updating template:', err)
      showNotification(
        err instanceof Error ? err.message : t('failedToUpdateTemplate'),
        'error'
      )
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSaveClick = () => {
    if (!name.trim()) {
      showNotification(t('pleaseEnterTemplateName'), 'error')
      return
    }
    if (linkedProperties.length > 0) {
      setShowPropagateModal(true)
    } else {
      handleSaveAndClose()
    }
  }

  // Save template only, then close and reload
  const handleSaveAndClose = async () => {
    const result = await handleSave()
    if (result) {
      showNotification(t('templateUpdatedSuccess'), 'success')
      onUpdated(result)
      onClose()
    }
  }

  const handleSaveAndPropagate = async (checklistIds: string[]) => {
    // Keep the propagate modal open with its spinner — don't close it yet
    const result = await handleSave()
    if (!result) {
      setShowPropagateModal(false)
      return
    }

    // Propagate BEFORE calling onUpdated so the page reloads AFTER propagation
    if (checklistIds.length > 0 && template) {
      try {
        await propagateTemplateToChecklists(template.id, { checklistIds })
        showNotification(
          t('templateSavedAndUpdated', { count: checklistIds.length }),
          'success'
        )
      } catch (err) {
        console.error('Error propagating:', err)
        showNotification(t('templateSavedButFailed'), 'error')
      }
    } else {
      showNotification('Template updated successfully', 'success')
    }

    // Close everything at once — no flash of the edit modal
    setShowPropagateModal(false)
    onUpdated(result)
    onClose()
  }

  const handleSaveTemplateOnly = async () => {
    // Keep propagate modal open during save, then close everything at once
    const result = await handleSave()
    setShowPropagateModal(false)
    if (result) {
      showNotification(t('templateUpdatedSuccess'), 'success')
      onUpdated(result)
      onClose()
    }
  }

  const handleUnlink = async (action: 'unlink' | 'delete') => {
    if (!unlinkTarget || !template) return
    setUnlinking(true)
    try {
      const res = await unlinkPropertyFromTemplate(template.id, {
        checklistId: unlinkTarget.checklistId,
        action,
      })
      if (res.status === 'success') {
        showNotification(
          action === 'delete' ? t('checklistDeletedNotification') : t('propertyUnlinkedNotification'),
          'success'
        )
        setLinkedProperties((prev) =>
          prev.filter((lp) => lp.checklistId !== unlinkTarget.checklistId)
        )
      } else {
        showNotification(res.message || t('failedToUnlink'), 'error')
      }
    } catch (err) {
      console.error('Error unlinking:', err)
      showNotification(t('failedToUnlinkProperty'), 'error')
    } finally {
      setUnlinking(false)
      setShowUnlinkModal(false)
      setUnlinkTarget(null)
    }
  }

  if (!isOpen || !template) return null

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
                <PencilSquareIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('editTemplateTitle')}</h2>
                <p className="text-sm text-gray-500">
                  Update &ldquo;{template.name}&rdquo;
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
            {/* Linked Properties */}
            {linkedProperties.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLinkedSection(!showLinkedSection)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Linked to {linkedProperties.length} {linkedProperties.length === 1 ? 'property' : 'properties'}
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-blue-400 transition-transform ${
                      showLinkedSection ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {showLinkedSection && (
                  <div className="border-t border-blue-200 divide-y divide-blue-100">
                    {linkedProperties.map((lp) => (
                      <div
                        key={lp.checklistId}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {lp.propertyName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {lp.checklistName}
                            {lp.isDefault && (
                              <span className="ml-1.5 text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0 rounded-full">
                                DEFAULT
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUnlinkTarget(lp)
                            setShowUnlinkModal(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                          title="Unlink property"
                        >
                          <LinkSlashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('templateName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
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
                  rows={2}
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
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Items Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">{t('tasks')}</h3>

              {/* Add Item Form */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <PlusIcon className="w-4 h-4 text-emerald-500" />
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
                <div className="text-center py-6 text-gray-500">
                  <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No tasks</p>
                </div>
              ) : (
                <>
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
                        className={`bg-white border rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
                          item.isNew ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
                        }`}
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
                        {item.isNew && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                            NEW
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePhotoRequirement(item.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.requiresPhoto
                              ? 'bg-amber-100 text-amber-700'
                              : 'text-gray-300 hover:text-gray-500'
                          }`}
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
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saving || !name.trim()}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  {t('saveChanges')}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      {/* Propagate Template Modal */}
      <PropagateTemplateModal
        isOpen={showPropagateModal}
        onClose={() => setShowPropagateModal(false)}
        onConfirm={handleSaveAndPropagate}
        onSkip={handleSaveTemplateOnly}
        linkedProperties={linkedProperties}
        templateName={name || template?.name || ''}
        saving={saving}
      />

      {/* Unlink Property Confirm Modal */}
      <UnlinkPropertyConfirmModal
        isOpen={showUnlinkModal}
        onClose={() => {
          setShowUnlinkModal(false)
          setUnlinkTarget(null)
        }}
        onConfirm={handleUnlink}
        propertyName={unlinkTarget?.propertyName || ''}
        checklistName={unlinkTarget?.checklistName || ''}
        submitting={unlinking}
      />
    </AnimatePresence>
  )
}
