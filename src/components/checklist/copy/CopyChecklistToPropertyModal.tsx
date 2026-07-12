'use client'

import { notifyError } from '@/utils/notify'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  CameraIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getChecklistById,
  duplicateChecklist,
  groupItemsByRoom,
} from '@/services/checklistService'
import MultiSelectCheckbox from '@/components/shared/MultiSelectCheckbox'
import type { MultiSelectOption } from '@/components/shared/MultiSelectCheckbox'
import type { Checklist } from '@/services/types/checklist'
import type { Property } from '@/services/types/property'

interface CopyChecklistToPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onCopied: () => void
  checklist: Checklist | null
  properties: Property[]
}

export default function CopyChecklistToPropertyModal({
  isOpen,
  onClose,
  onCopied,
  checklist,
  properties,
}: CopyChecklistToPropertyModalProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [fullChecklist, setFullChecklist] = useState<Checklist | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch full checklist details (with items) when modal opens
  useEffect(() => {
    if (isOpen && checklist?.id) {
      setLoadingDetails(true)
      getChecklistById(checklist.id)
        .then((res) => {
          if (res.status === 'success') {
            setFullChecklist(res.data)
          }
        })
        .catch((err) => {
          console.error('Error fetching checklist details:', err)
          showNotification(t('failedToLoadChecklistDetails'), 'error')
        })
        .finally(() => setLoadingDetails(false))
    }
  }, [isOpen, checklist?.id, showNotification])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && checklist) {
      setSelectedPropertyIds([])
      setNewName(`${checklist.name} (Copy)`)
      setFullChecklist(null)
    }
  }, [isOpen, checklist])

  // Group items by room for preview
  const groupedItems = useMemo(() => {
    if (!fullChecklist?.items) return {}
    return groupItemsByRoom(fullChecklist.items)
  }, [fullChecklist?.items])

  // Property options — filter out the source property
  const propertyOptions: MultiSelectOption<string>[] = useMemo(() => {
    return properties
      .filter((prop) => prop.id !== checklist?.propertyId)
      .map((prop) => ({
        value: prop.id,
        label: prop.listingName || prop.internalName || prop.address,
        secondaryLabel: prop.address,
      }))
  }, [properties, checklist?.propertyId])

  const handleSubmit = async () => {
    if (selectedPropertyIds.length === 0) {
      showNotification(t('pleaseSelectAtLeastOneProperty'), 'error')
      return
    }
    if (!newName.trim()) {
      showNotification(t('pleaseEnterChecklistName'), 'error')
      return
    }
    if (!checklist) return

    setSubmitting(true)
    try {
      const results = await Promise.allSettled(
        selectedPropertyIds.map((propertyId) =>
          duplicateChecklist(checklist.id, {
            name: newName.trim(),
            targetPropertyId: propertyId,
          })
        )
      )

      const succeeded = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'success'
      ).length
      const failed = results.length - succeeded

      if (failed === 0) {
        showNotification(
          t('checklistCopiedToProperties', { count: succeeded }),
          'success'
        )
        onCopied()
      } else if (succeeded > 0) {
        showNotification(
          t('checklistCopiedPartial', { succeeded, failed }),
          'error'
        )
        onCopied()
      } else {
        showNotification(t('failedToCopyChecklist'), 'error')
      }
    } catch (err) {
      console.error('Error copying checklist:', err)
      notifyError(err, t('failedToCopyChecklist'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !checklist) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
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
                  {t('copyChecklistTitle')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('copyChecklistDescription', { name: checklist.name })}
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
            {/* Source Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardDocumentListIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">
                  {checklist.name}
                </span>
                {checklist.isDefault && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                    DEFAULT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-emerald-600">
                  <HomeIcon className="w-3 h-3 inline mr-0.5" />
                  {checklist.propertyName || t('unknownProperty')}
                </span>
                <span className="text-xs text-emerald-600">
                  {checklist.itemCount || fullChecklist?.items?.length || 0} {t('tasks')}
                </span>
              </div>
            </div>

            {/* Tasks Preview */}
            {loadingDetails ? (
              <div className="flex items-center justify-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <span className="ml-2 text-sm text-gray-500">{t('loadingTasks')}</span>
              </div>
            ) : fullChecklist?.items && fullChecklist.items.length > 0 ? (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t('tasksToCopy')}
                </label>
                <div className="bg-gray-50 border border-gray-100 rounded-xl max-h-48 overflow-y-auto">
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
            ) : fullChecklist?.items?.length === 0 ? (
              <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-1 text-yellow-400" />
                <p className="text-sm text-yellow-700">{t('checklistHasNoTasks')}</p>
                <p className="text-xs text-yellow-500 mt-0.5">
                  {t('willBeCopiedAsEmpty')}
                </p>
              </div>
            ) : null}

            {/* Target Properties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <HomeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                {t('copyToProperties')} <span className="text-red-500">*</span>
              </label>
              {propertyOptions.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                  <p className="text-sm text-gray-500">{t('noOtherPropertiesAvailable')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('addMorePropertiesToCopy')}
                  </p>
                </div>
              ) : (
                <MultiSelectCheckbox
                  options={propertyOptions}
                  selectedValues={selectedPropertyIds}
                  onChange={setSelectedPropertyIds}
                  placeholder={t('searchProperties')}
                  emptyText={t('noPropertiesFound')}
                  maxHeight="12rem"
                  selectAllLabel={t('selectAllProperties')}
                />
              )}
            </div>

            {/* Checklist Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                {t('checklistName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('enterCopiedChecklistName')}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedPropertyIds.length === 0 || !newName.trim()}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('copying')}
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  {t('copyToCount', { count: selectedPropertyIds.length })}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
