'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import type { LinkedProperty } from '@/services/types/checklistTemplate'

interface PropagateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedChecklistIds: string[]) => void
  onSkip: () => void
  linkedProperties: LinkedProperty[]
  templateName: string
  saving: boolean
}

export default function PropagateTemplateModal({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  linkedProperties,
  templateName,
  saving,
}: PropagateTemplateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(linkedProperties.map((lp) => lp.checklistId))
  )

  // Reset selections when linkedProperties changes (e.g., modal opens with new data)
  useEffect(() => {
    setSelectedIds(new Set(linkedProperties.map((lp) => lp.checklistId)))
  }, [linkedProperties])

  const allIds = useMemo(
    () => new Set(linkedProperties.map((lp) => lp.checklistId)),
    [linkedProperties]
  )

  const allSelected = selectedIds.size === allIds.size && allIds.size > 0
  const noneSelected = selectedIds.size === 0

  const handleToggle = (checklistId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(checklistId)) {
        next.delete(checklistId)
      } else {
        next.add(checklistId)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg max-h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ArrowPathIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Update Linked Properties</h2>
                <p className="text-sm text-gray-500">
                  &ldquo;{templateName}&rdquo; is linked to {linkedProperties.length}{' '}
                  {linkedProperties.length === 1 ? 'property' : 'properties'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Warning */}
          <div className="mx-6 mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Selected property checklists will have <span className="font-semibold">all their tasks replaced</span> with
              the updated template tasks. Any manual edits to those checklists will be overwritten.
            </p>
          </div>

          {/* Property list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Select All */}
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-3 pb-3 border-b border-gray-100 cursor-pointer w-full"
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  allSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {allSelected && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium text-gray-700 text-left">
                {allSelected ? 'Deselect All' : 'Select All'}
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                {selectedIds.size} of {linkedProperties.length} selected
              </span>
            </button>

            {/* Individual properties */}
            <div className="divide-y divide-gray-50 mt-1">
              {linkedProperties.map((lp) => {
                const isSelected = selectedIds.has(lp.checklistId)
                return (
                  <label
                    key={lp.checklistId}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-blue-50/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(lp.checklistId)}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lp.propertyName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {lp.checklistName}
                        {lp.isDefault && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700">
                            DEFAULT
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSkip}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
              >
                Save Template Only
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || noneSelected}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-4 h-4" />
                    Save & Update {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
