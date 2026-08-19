'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getTaskChecklist,
  addTaskChecklistItem,
  updateTaskChecklistItem,
  deleteTaskChecklistItem,
} from '@/services/maintenanceTaskService'
import type {
  MaintenanceTask,
  TaskChecklistItem,
  TaskChecklistProgress,
  UpdateTaskChecklistItemPayload,
} from '@/services/types/maintenanceTask'

export interface TaskChecklistSectionProps {
  task: MaintenanceTask
}

function computeProgress(items: TaskChecklistItem[]): TaskChecklistProgress {
  return {
    totalItems: items.length,
    completedItems: items.filter((i) => i.isCompleted).length,
    requiredItems: items.filter((i) => i.isRequired).length,
    requiredCompleted: items.filter((i) => i.isRequired && i.isCompleted).length,
    photosRequired: items.filter((i) => i.photoRequired).length,
    photosUploaded: items.filter((i) => i.photoRequired && i.photoUrl).length,
  }
}

/**
 * PM-side checklist panel inside TaskDetailModal: progress line, item rows
 * (with the contractor's completion + photo state) and authoring controls
 * (add / inline edit / delete) while the task is not terminal.
 */
export default function TaskChecklistSection({ task }: TaskChecklistSectionProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [items, setItems] = useState<TaskChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  // Add row
  const [newDescription, setNewDescription] = useState('')
  const [newIsRequired, setNewIsRequired] = useState(true)
  const [newPhotoRequired, setNewPhotoRequired] = useState(false)
  const [adding, setAdding] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editIsRequired, setEditIsRequired] = useState(true)
  const [editPhotoRequired, setEditPhotoRequired] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete confirm + per-item busy flags
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)

  const isTerminal = task.status === 'completed' || task.status === 'cancelled'
  const canToggleCompletion = task.status === 'in_progress'
  const progress = useMemo(() => computeProgress(items), [items])
  const photosMissing = progress.photosRequired - progress.photosUploaded

  useEffect(() => {
    let cancelled = false
    const fetchChecklist = async () => {
      setLoading(true)
      setEditingId(null)
      setConfirmDeleteId(null)
      try {
        const res = await getTaskChecklist(task.id)
        if (cancelled) return
        if (res.status === 'success') {
          setItems(res.data.items)
        } else {
          showNotification(res.message || t('errorLoadingChecklist'), 'error')
        }
      } catch (err) {
        console.error('Error loading checklist:', err)
        if (!cancelled) showNotification(t('errorLoadingChecklist'), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchChecklist()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  const handleAdd = async () => {
    const description = newDescription.trim()
    if (!description || adding) return
    setAdding(true)
    try {
      const res = await addTaskChecklistItem(task.id, {
        description,
        isRequired: newIsRequired,
        photoRequired: newPhotoRequired,
      })
      if (res.status === 'success') {
        setItems((prev) => [...prev, res.data])
        setNewDescription('')
        setNewIsRequired(true)
        setNewPhotoRequired(false)
      } else {
        showNotification(res.message || t('failedToAddChecklistItem'), 'error')
      }
    } catch (err) {
      console.error('Error adding checklist item:', err)
      showNotification(err instanceof Error ? err.message : t('failedToAddChecklistItem'), 'error')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (item: TaskChecklistItem) => {
    setEditingId(item.id)
    setEditDescription(item.description)
    setEditIsRequired(item.isRequired)
    setEditPhotoRequired(item.photoRequired)
    setConfirmDeleteId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || savingEdit) return
    const description = editDescription.trim()
    if (!description) return
    setSavingEdit(true)
    try {
      const payload: UpdateTaskChecklistItemPayload = {
        description,
        isRequired: editIsRequired,
        photoRequired: editPhotoRequired,
      }
      const res = await updateTaskChecklistItem(task.id, editingId, payload)
      if (res.status === 'success') {
        setItems((prev) => prev.map((i) => (i.id === res.data.id ? { ...i, ...res.data } : i)))
        setEditingId(null)
      } else {
        showNotification(res.message || t('failedToUpdateChecklistItem'), 'error')
      }
    } catch (err) {
      console.error('Error updating checklist item:', err)
      showNotification(err instanceof Error ? err.message : t('failedToUpdateChecklistItem'), 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleToggleCompleted = async (item: TaskChecklistItem) => {
    if (!canToggleCompletion || busyItemId) return
    setBusyItemId(item.id)
    try {
      const res = await updateTaskChecklistItem(task.id, item.id, { isCompleted: !item.isCompleted })
      if (res.status === 'success') {
        setItems((prev) => prev.map((i) => (i.id === res.data.id ? { ...i, ...res.data } : i)))
      } else {
        showNotification(res.message || t('failedToUpdateChecklistItem'), 'error')
      }
    } catch (err) {
      console.error('Error toggling checklist item:', err)
      showNotification(err instanceof Error ? err.message : t('failedToUpdateChecklistItem'), 'error')
    } finally {
      setBusyItemId(null)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (busyItemId) return
    setBusyItemId(itemId)
    try {
      const res = await deleteTaskChecklistItem(task.id, itemId)
      if (res.status === 'success') {
        setItems((prev) => prev.filter((i) => i.id !== itemId))
        setConfirmDeleteId(null)
      } else {
        showNotification(res.message || t('failedToDeleteChecklistItem'), 'error')
      }
    } catch (err) {
      console.error('Error deleting checklist item:', err)
      showNotification(err instanceof Error ? err.message : t('failedToDeleteChecklistItem'), 'error')
    } finally {
      setBusyItemId(null)
    }
  }

  const flagToggleClass = (active: boolean, activeClasses: string) =>
    `flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
      active ? activeClasses : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
    }`

  return (
    <div>
      {/* Section header + progress */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">{t('checklistLabel')}</h4>
        </div>
        {items.length > 0 && (
          <p className="text-xs text-gray-500">
            {t('checklistProgressDone', { completed: progress.completedItems, total: progress.totalItems })}
            {photosMissing > 0 && (
              <span className="text-amber-600"> · {t('checklistPhotosMissing', { count: photosMissing })}</span>
            )}
          </p>
        )}
      </div>

      {/* Thin progress bar */}
      {items.length > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progress.totalItems > 0 ? (progress.completedItems / progress.totalItems) * 100 : 0}%` }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-400">{t('noChecklistItems')}</p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5"
            >
              {editingId === item.id ? (
                /* Inline edit row */
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveEdit()
                      }
                    }}
                    placeholder={t('checklistItemPlaceholder')}
                    autoFocus
                    className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setEditIsRequired((v) => !v)}
                    title={t('checklistRequiredTooltip')}
                    aria-pressed={editIsRequired}
                    className={flagToggleClass(editIsRequired, 'bg-red-50 border-red-200 text-red-600')}
                  >
                    <ExclamationCircleIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('checklistRequiredBadge')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPhotoRequired((v) => !v)}
                    title={t('checklistPhotoTooltip')}
                    aria-pressed={editPhotoRequired}
                    className={flagToggleClass(editPhotoRequired, 'bg-blue-50 border-blue-200 text-blue-600')}
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('photo')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editDescription.trim()}
                    title={t('checklistSaveItem')}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {savingEdit ? (
                      <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    ) : (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    disabled={savingEdit}
                    title={t('cancel')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => handleToggleCompleted(item)}
                    disabled={!canToggleCompletion || busyItemId === item.id}
                    className={`mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0 ${
                      canToggleCompletion ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-sm break-words ${
                          item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}
                      >
                        {item.description}
                      </span>
                      {item.isRequired && (
                        <span
                          title={t('checklistRequiredTooltip')}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100"
                        >
                          <ExclamationCircleIcon className="w-3 h-3" />
                          {t('checklistRequiredBadge')}
                        </span>
                      )}
                      {item.photoRequired && (
                        <span
                          title={t('checklistPhotoTooltip')}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            item.photoUrl
                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                        >
                          <CameraIcon className="w-3 h-3" />
                          {item.photoUrl ? t('photo') : t('checklistPhotoMissing')}
                        </span>
                      )}
                    </div>
                    {item.photoUrl && (
                      <a
                        href={item.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('checklistViewPhoto')}
                        className="inline-block mt-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photoUrl}
                          alt={item.description}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    )}
                  </div>

                  {/* PM authoring controls */}
                  {!isTerminal && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {confirmDeleteId === item.id ? (
                        <>
                          <span className="text-xs text-gray-500 mr-1">{t('confirmDeleteChecklistItem')}</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={busyItemId === item.id}
                            title={t('checklistDeleteItem')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                          >
                            {busyItemId === item.id ? (
                              <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                            ) : (
                              <CheckIcon className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={busyItemId === item.id}
                            title={t('cancel')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            title={t('checklistEditItem')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            title={t('checklistDeleteItem')}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add item row (hidden once the task is terminal) */}
          {!isTerminal && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder={t('checklistItemPlaceholder')}
                className="flex-1 min-w-0 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:border-solid transition-colors"
              />
              <button
                type="button"
                onClick={() => setNewIsRequired((v) => !v)}
                title={t('checklistRequiredTooltip')}
                aria-pressed={newIsRequired}
                className={flagToggleClass(newIsRequired, 'bg-red-50 border-red-200 text-red-600')}
              >
                <ExclamationCircleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('checklistRequiredBadge')}</span>
              </button>
              <button
                type="button"
                onClick={() => setNewPhotoRequired((v) => !v)}
                title={t('checklistPhotoTooltip')}
                aria-pressed={newPhotoRequired}
                className={flagToggleClass(newPhotoRequired, 'bg-blue-50 border-blue-200 text-blue-600')}
              >
                <CameraIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('photo')}</span>
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding || !newDescription.trim()}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {adding ? (
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <PlusIcon className="w-4 h-4" />
                )}
                {t('addChecklistItem')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
