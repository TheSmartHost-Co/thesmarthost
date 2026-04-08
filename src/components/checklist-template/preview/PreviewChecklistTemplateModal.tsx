'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  CameraIcon,
  TagIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  LinkSlashIcon,
} from '@heroicons/react/24/outline'
import { groupTemplateItemsByRoom, getLinkedProperties, unlinkPropertyFromTemplate } from '@/services/checklistTemplateService'
import type { ChecklistTemplate, LinkedProperty } from '@/services/types/checklistTemplate'
import UnlinkPropertyConfirmModal from '../unlink/UnlinkPropertyConfirmModal'

interface PreviewChecklistTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit?: (template: ChecklistTemplate) => void
  onApply?: (template: ChecklistTemplate) => void
  template: ChecklistTemplate | null
}

export default function PreviewChecklistTemplateModal({
  isOpen,
  onClose,
  onEdit,
  onApply,
  template,
}: PreviewChecklistTemplateModalProps) {
  const [linkedProperties, setLinkedProperties] = useState<LinkedProperty[]>([])
  const [loadingLinked, setLoadingLinked] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedProperty | null>(null)
  const [showUnlinkModal, setShowUnlinkModal] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const groupedItems = useMemo(() => {
    if (!template?.items) return {}
    return groupTemplateItemsByRoom(template.items)
  }, [template?.items])

  const roomCount = Object.keys(groupedItems).length
  const photoCount = template?.items?.filter((i) => i.requiresPhoto).length || 0

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
    }
  }, [isOpen, template])

  const handleUnlink = async (action: 'unlink' | 'delete') => {
    if (!unlinkTarget || !template) return
    setUnlinking(true)
    try {
      const res = await unlinkPropertyFromTemplate(template.id, {
        checklistId: unlinkTarget.checklistId,
        action,
      })
      if (res.status === 'success') {
        setLinkedProperties((prev) =>
          prev.filter((lp) => lp.checklistId !== unlinkTarget.checklistId)
        )
      }
    } catch (err) {
      console.error('Error unlinking:', err)
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
                <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
                <p className="text-sm text-gray-500">Template preview</p>
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
            {/* Description */}
            {template.description && (
              <p className="text-sm text-gray-600">{template.description}</p>
            )}

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <TagIcon className="w-4 h-4 text-gray-400" />
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {template.items?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Tasks</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{roomCount}</p>
                <p className="text-xs text-gray-500">Rooms</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{photoCount}</p>
                <p className="text-xs text-gray-500">Photos Required</p>
              </div>
            </div>

            {template.requiresWalkthrough && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg">
                <CameraIcon className="w-4 h-4" />
                Walkthrough Required
              </div>
            )}

            {/* Linked Properties */}
            {linkedProperties.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <BuildingOfficeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  Applied to {linkedProperties.length} {linkedProperties.length === 1 ? 'property' : 'properties'}
                </label>
                <div className="bg-blue-50 border border-blue-100 rounded-xl divide-y divide-blue-100 max-h-32 overflow-y-auto">
                  {linkedProperties.map((lp) => (
                    <div
                      key={lp.checklistId}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{lp.propertyName}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {lp.checklistName}
                          {lp.isDefault && (
                            <span className="ml-1 text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 rounded-full">DEFAULT</span>
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
                        title="Unlink"
                      >
                        <LinkSlashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items by Room */}
            {template.items && template.items.length > 0 ? (
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
                <p className="text-sm">This template has no tasks</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Close
            </button>
            <div className="flex items-center gap-3">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEdit(template)
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-2"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit Template
                </button>
              )}
              {onApply && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onApply(template)
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <ArrowRightIcon className="w-4 h-4" />
                  Apply to Property
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

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
