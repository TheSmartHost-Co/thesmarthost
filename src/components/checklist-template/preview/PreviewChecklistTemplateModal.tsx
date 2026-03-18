'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  CameraIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { groupTemplateItemsByRoom } from '@/services/checklistTemplateService'
import type { ChecklistTemplate } from '@/services/types/checklistTemplate'

interface PreviewChecklistTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  template: ChecklistTemplate | null
}

export default function PreviewChecklistTemplateModal({
  isOpen,
  onClose,
  template,
}: PreviewChecklistTemplateModalProps) {
  const groupedItems = useMemo(() => {
    if (!template?.items) return {}
    return groupTemplateItemsByRoom(template.items)
  }, [template?.items])

  const roomCount = Object.keys(groupedItems).length
  const photoCount = template?.items?.filter((i) => i.requiresPhoto).length || 0

  if (!isOpen || !template) return null

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
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
