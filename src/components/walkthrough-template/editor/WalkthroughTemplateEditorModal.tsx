'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { upsertWalkthroughTemplate } from '@/services/walkthroughTemplateService'
import type {
  WalkthroughTemplate,
  UpsertWalkthroughTemplatePayload,
} from '@/services/types/walkthroughTemplate'
import PropertyAssignmentSelector from '@/components/report-template/shared/PropertyAssignmentSelector'

interface WalkthroughTemplateEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (template: WalkthroughTemplate) => void
  template: WalkthroughTemplate | null
}

// Local editor state. `localKey` is a stable identifier for Framer Motion
// Reorder that works for both existing rows (where `id` is set) and new rows
// (where `id` is undefined until the first successful save).
interface LocalItem {
  localKey: string
  id?: string
  name: string
  sortOrder: number
}

interface LocalGroup {
  localKey: string
  id?: string
  name: string
  sortOrder: number
  items: LocalItem[]
  isExpanded: boolean
}

function tempKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function WalkthroughTemplateEditorModal({
  isOpen,
  onClose,
  onSaved,
  template,
}: WalkthroughTemplateEditorModalProps) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(state => state.showNotification)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requiresCompletion, setRequiresCompletion] = useState(false)
  const [groups, setGroups] = useState<LocalGroup[]>([])
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!template
  const isDefault = template?.isDefault ?? false

  // Hydrate on open
  useEffect(() => {
    if (!isOpen) return
    if (template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setRequiresCompletion(template.requiresCompletion)
      setGroups(
        [...template.groups]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(g => ({
            localKey: g.id,
            id: g.id,
            name: g.name,
            sortOrder: g.sortOrder,
            isExpanded: true,
            items: [...g.items]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(it => ({
                localKey: it.id,
                id: it.id,
                name: it.name,
                sortOrder: it.sortOrder,
              })),
          }))
      )
      setAssignedPropertyIds(template.assignedProperties.map(p => p.propertyId))
    } else {
      setName('')
      setDescription('')
      setRequiresCompletion(false)
      setGroups([])
      setAssignedPropertyIds([])
    }
    setNewGroupName('')
    setSaving(false)
  }, [isOpen, template])

  const handleAddGroup = () => {
    const trimmed = newGroupName.trim()
    if (!trimmed) return
    if (groups.some(g => g.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showNotification(t('groupNameAlreadyExists'), 'error')
      return
    }
    setGroups(prev => [
      ...prev,
      {
        localKey: tempKey('group'),
        name: trimmed,
        sortOrder: prev.length,
        items: [],
        isExpanded: true,
      },
    ])
    setNewGroupName('')
  }

  const handleRemoveGroup = (localKey: string) => {
    setGroups(prev => prev.filter(g => g.localKey !== localKey))
  }

  const handleToggleGroup = (localKey: string) => {
    setGroups(prev =>
      prev.map(g => (g.localKey === localKey ? { ...g, isExpanded: !g.isExpanded } : g))
    )
  }

  const handleRenameGroup = (localKey: string, name: string) => {
    setGroups(prev => prev.map(g => (g.localKey === localKey ? { ...g, name } : g)))
  }

  const handleReorderGroups = (next: LocalGroup[]) => {
    setGroups(next)
  }

  const handleAddItem = (groupLocalKey: string, itemName: string) => {
    const trimmed = itemName.trim()
    if (!trimmed) return
    setGroups(prev =>
      prev.map(g => {
        if (g.localKey !== groupLocalKey) return g
        if (g.items.some(it => it.name.trim().toLowerCase() === trimmed.toLowerCase())) {
          showNotification(t('itemAlreadyInGroup', { item: trimmed, group: g.name }), 'error')
          return g
        }
        return {
          ...g,
          items: [
            ...g.items,
            {
              localKey: tempKey('item'),
              name: trimmed,
              sortOrder: g.items.length,
            },
          ],
        }
      })
    )
  }

  const handleRemoveItem = (groupLocalKey: string, itemLocalKey: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.localKey === groupLocalKey
          ? { ...g, items: g.items.filter(it => it.localKey !== itemLocalKey) }
          : g
      )
    )
  }

  const handleRenameItem = (groupLocalKey: string, itemLocalKey: string, name: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.localKey === groupLocalKey
          ? {
              ...g,
              items: g.items.map(it => (it.localKey === itemLocalKey ? { ...it, name } : it)),
            }
          : g
      )
    )
  }

  const handleReorderItems = (groupLocalKey: string, next: LocalItem[]) => {
    setGroups(prev => prev.map(g => (g.localKey === groupLocalKey ? { ...g, items: next } : g)))
  }

  const handleSave = async () => {
    if (!profile?.id) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      showNotification(t('templateNameIsRequired'), 'error')
      return
    }
    // Validate group/item names are non-empty
    for (const g of groups) {
      if (!g.name.trim()) {
        showNotification(t('allGroupsNeedName'), 'error')
        return
      }
      for (const it of g.items) {
        if (!it.name.trim()) {
          showNotification(t('itemNeedsName', { group: g.name }), 'error')
          return
        }
      }
    }

    setSaving(true)
    try {
      const payload: UpsertWalkthroughTemplatePayload = {
        userId: profile.id,
        id: template?.id,
        name: trimmedName,
        description: description.trim() || null,
        requiresCompletion,
        groups: groups.map((g, gi) => ({
          id: g.id,
          name: g.name.trim(),
          sortOrder: gi,
          items: g.items.map((it, ii) => ({
            id: it.id,
            name: it.name.trim(),
            sortOrder: ii,
          })),
        })),
        propertyIds: assignedPropertyIds,
      }
      const res = await upsertWalkthroughTemplate(payload)
      if (res.status === 'success') {
        showNotification(
          isEdit ? t('templateUpdated2') : t('templateCreated2'),
          'success'
        )
        onSaved(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToSaveTemplate'), 'error')
      }
    } catch (err) {
      console.error('Error saving walkthrough template:', err)
      showNotification(
        err instanceof Error ? err.message : t('errorSavingTemplate'),
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const assignedPropertyDetails =
    template?.assignedProperties.map(p => ({
      propertyId: p.propertyId,
      listingName: p.listingName ?? p.internalName ?? p.externalName ?? 'Unnamed property',
    })) ?? []

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-[95vw] max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <CameraIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {isEdit ? t('editWalkthroughTemplateTitle') : t('createWalkthroughTemplateTitle')}
                </h2>
                {isEdit && isDefault && (
                  <p className="text-[11px] text-gray-500">
                    {t('defaultTemplateNote')}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Metadata */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('templateNameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={saving}
                placeholder={t('templateNameEditorPlaceholder')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('descriptionOptional')} <span className="text-gray-400 font-normal">({t('optional')})</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder={t('descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 resize-none"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('requireCompletion')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('requireCompletionDescription')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequiresCompletion(!requiresCompletion)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  requiresCompletion ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    requiresCompletion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{t('groupsAndItems')}</h3>
              <span className="text-xs text-gray-500">{t('dragToReorder')}</span>
            </div>

            {groups.length > 0 ? (
              <Reorder.Group
                axis="y"
                values={groups}
                onReorder={handleReorderGroups}
                className="space-y-2"
              >
                {groups.map(group => (
                  <Reorder.Item
                    key={group.localKey}
                    value={group}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <GroupEditor
                      group={group}
                      disabled={saving}
                      onToggle={() => handleToggleGroup(group.localKey)}
                      onRename={(n) => handleRenameGroup(group.localKey, n)}
                      onRemove={() => handleRemoveGroup(group.localKey)}
                      onAddItem={(n) => handleAddItem(group.localKey, n)}
                      onRemoveItem={(itemLocalKey) => handleRemoveItem(group.localKey, itemLocalKey)}
                      onRenameItem={(itemLocalKey, n) => handleRenameItem(group.localKey, itemLocalKey, n)}
                      onReorderItems={(next) => handleReorderItems(group.localKey, next)}
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div className="text-center py-6 text-gray-500 border border-dashed border-gray-200 rounded-xl">
                <CameraIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t('noGroupsYet')}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('addGroupBelow')}
                </p>
              </div>
            )}

            {/* Add group */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddGroup()
                  }
                }}
                disabled={saving}
                placeholder={t('addGroupPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
              />
              <button
                type="button"
                onClick={handleAddGroup}
                disabled={saving || !newGroupName.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                {t('addLabel')}
              </button>
            </div>
          </div>

          {/* Property assignment */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{t('applyToPropertiesTitle')}</h3>
            <p className="text-xs text-gray-500">
              {t('applyToPropertiesDescription')}
            </p>
            <PropertyAssignmentSelector
              assignedPropertyIds={assignedPropertyIds}
              assignedPropertyDetails={assignedPropertyDetails}
              onAssign={(propertyId) =>
                setAssignedPropertyIds(prev =>
                  prev.includes(propertyId) ? prev : [...prev, propertyId]
                )
              }
              onUnassign={(propertyId) =>
                setAssignedPropertyIds(prev => prev.filter(id => id !== propertyId))
              }
              disabled={saving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {isEdit ? t('saveChanges') : t('createTemplate')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

// -----------------------------------------------------------------------------
// Group sub-editor
// -----------------------------------------------------------------------------

interface GroupEditorProps {
  group: LocalGroup
  disabled: boolean
  onToggle: () => void
  onRename: (name: string) => void
  onRemove: () => void
  onAddItem: (name: string) => void
  onRemoveItem: (itemLocalKey: string) => void
  onRenameItem: (itemLocalKey: string, name: string) => void
  onReorderItems: (next: LocalItem[]) => void
}

function GroupEditor({
  group,
  disabled,
  onToggle,
  onRename,
  onRemove,
  onAddItem,
  onRemoveItem,
  onRenameItem,
  onReorderItems,
}: GroupEditorProps) {
  const { t } = useTranslation('turnover')
  const [newItemName, setNewItemName] = useState('')

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <Bars3Icon className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
        <button
          type="button"
          onClick={onToggle}
          className="p-0.5 cursor-pointer"
          title={group.isExpanded ? 'Collapse' : 'Expand'}
        >
          {group.isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
          )}
        </button>
        <input
          type="text"
          value={group.name}
          onChange={e => onRename(e.target.value)}
          disabled={disabled}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent px-2 py-1 text-sm font-medium text-gray-900 border border-transparent hover:border-gray-200 focus:border-purple-300 rounded-md focus:outline-none"
        />
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {group.items.length} {group.items.length !== 1 ? t('itemsLabel') : t('itemLabel')}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
          title="Remove group"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <AnimatePresence initial={false}>
        {group.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {group.items.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={group.items}
                  onReorder={onReorderItems}
                  className="space-y-1.5"
                >
                  {group.items.map(item => (
                    <Reorder.Item
                      key={item.localKey}
                      value={item}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg"
                    >
                      <Bars3Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => onRenameItem(item.localKey, e.target.value)}
                        disabled={disabled}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent px-1.5 py-0.5 text-xs text-gray-800 border border-transparent hover:border-gray-200 focus:border-purple-300 rounded focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.localKey)}
                        disabled={disabled}
                        className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}

              {/* Add item */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newItemName.trim()) {
                        onAddItem(newItemName)
                        setNewItemName('')
                      }
                    }
                  }}
                  disabled={disabled}
                  placeholder={t('addAnItem')}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newItemName.trim()) {
                      onAddItem(newItemName)
                      setNewItemName('')
                    }
                  }}
                  disabled={disabled || !newItemName.trim()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:text-gray-400 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
