'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  CameraIcon,
  CheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  applyChecklistTemplateBatch,
  getLinkedProperties,
  groupTemplateItemsByRoom,
} from '@/services/checklistTemplateService'
import { getProperties } from '@/services/propertyService'
import MultiSelectCheckbox from '@/components/shared/MultiSelectCheckbox'
import type { MultiSelectOption } from '@/components/shared/MultiSelectCheckbox'
import type { ChecklistTemplate, LinkedProperty } from '@/services/types/checklistTemplate'
import type { Property } from '@/services/types/property'

interface ApplyTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onApplied: () => void
  template: ChecklistTemplate | null
}

export default function ApplyTemplateModal({
  isOpen,
  onClose,
  onApplied,
  template,
}: ApplyTemplateModalProps) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [linkedProperties, setLinkedProperties] = useState<LinkedProperty[]>([])
  const [loadingLinked, setLoadingLinked] = useState(false)
  const [checklistName, setChecklistName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch properties and linked properties when modal opens
  useEffect(() => {
    if (isOpen && profile?.id && template) {
      setLoadingProperties(true)
      setLoadingLinked(true)

      Promise.all([
        getProperties(profile.id),
        getLinkedProperties(template.id),
      ])
        .then(([propRes, linkedRes]) => {
          if (propRes.status === 'success') setProperties(propRes.data || [])
          if (linkedRes.status === 'success') setLinkedProperties(linkedRes.data || [])
        })
        .catch(console.error)
        .finally(() => {
          setLoadingProperties(false)
          setLoadingLinked(false)
        })
    }
  }, [isOpen, profile?.id, template])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && template) {
      setSelectedPropertyIds([])
      setChecklistName(template.name)
      setIsDefault(false)
    }
  }, [isOpen, template])

  const propertyOptions: MultiSelectOption<string>[] = useMemo(() => {
    const linkedPropertyIds = new Set(linkedProperties.map((lp) => lp.propertyId))
    return properties.map((prop) => ({
      value: prop.id,
      label: prop.listingName || prop.internalName || prop.address,
      secondaryLabel: prop.address,
      disabled: linkedPropertyIds.has(prop.id),
      disabledReason: 'Already applied',
    }))
  }, [properties, linkedProperties])

  // Group items by room for preview
  const groupedItems = useMemo(() => {
    if (!template?.items) return {}
    return groupTemplateItemsByRoom(template.items)
  }, [template?.items])

  const handleSubmit = async () => {
    if (selectedPropertyIds.length === 0) {
      showNotification(t('pleaseSelectAtLeastOneProperty'), 'error')
      return
    }
    if (!checklistName.trim()) {
      showNotification(t('pleaseEnterChecklistName'), 'error')
      return
    }
    if (!template) return

    setSubmitting(true)
    try {
      const res = await applyChecklistTemplateBatch(template.id, {
        properties: selectedPropertyIds.map((pid) => ({
          propertyId: pid,
          name: checklistName.trim(),
          isDefault,
        })),
      })

      if (res.status === 'success') {
        showNotification(
          t('templateAppliedToCount', { count: selectedPropertyIds.length }),
          'success'
        )
        onApplied()
        onClose()
      } else {
        showNotification(res.message || t('failedToApplyTemplate'), 'error')
      }
    } catch (err) {
      console.error('Error applying template:', err)
      showNotification(
        err instanceof Error ? err.message : t('failedToApplyTemplate'),
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !template) return null

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ArrowRightIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('applyTemplateTitle')}</h2>
                <p className="text-sm text-gray-500">
                  Create a property checklist from &ldquo;{template.name}&rdquo;
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
            {/* Template Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardDocumentListIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">{template.name}</span>
              </div>
              {template.description && (
                <p className="text-sm text-emerald-700 mt-1">{template.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-emerald-600">
                  {template.items?.length || template.itemCount || 0} tasks
                </span>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex gap-1">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tasks Preview */}
            {template.items && template.items.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tasks to Copy
                </label>
                <div className="bg-gray-50 border border-gray-100 rounded-xl max-h-48 overflow-y-auto">
                  {Object.entries(groupedItems).map(([room, roomItems]) => (
                    <div key={room}>
                      <div className="px-4 py-2 bg-gray-100/80 border-b border-gray-100 sticky top-0">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {room}
                        </span>
                      </div>
                      {roomItems.map((item) => (
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
            )}

            {/* Property Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <HomeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                Target Properties <span className="text-red-500">*</span>
              </label>
              {loadingProperties || loadingLinked ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Loading properties...</span>
                </div>
              ) : (
                <MultiSelectCheckbox
                  options={propertyOptions}
                  selectedValues={selectedPropertyIds}
                  onChange={setSelectedPropertyIds}
                  placeholder="Search properties..."
                  emptyText="No properties found"
                  maxHeight="12rem"
                  selectAllLabel="Select All Properties"
                />
              )}
            </div>

            {/* Checklist Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                Checklist Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                placeholder="Enter a name for the property checklist"
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
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedPropertyIds.length === 0 || !checklistName.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('applying')}
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  {t('applyToCount', { count: selectedPropertyIds.length })}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
