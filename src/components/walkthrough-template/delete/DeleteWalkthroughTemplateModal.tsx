'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { deleteWalkthroughTemplate } from '@/services/walkthroughTemplateService'
import type { WalkthroughTemplate } from '@/services/types/walkthroughTemplate'

interface Props {
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
  template: WalkthroughTemplate | null
}

export default function DeleteWalkthroughTemplateModal({
  isOpen,
  onClose,
  onDeleted,
  template,
}: Props) {
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(state => state.showNotification)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !template) return null

  const handleDelete = async () => {
    if (!profile?.id) return
    setDeleting(true)
    try {
      const res = await deleteWalkthroughTemplate(template.id, profile.id)
      if (res.status === 'success') {
        showNotification('Template deleted', 'success')
        onDeleted()
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete template', 'error')
      }
    } catch (err) {
      console.error('Error deleting walkthrough template:', err)
      showNotification(
        err instanceof Error ? err.message : 'Error deleting template',
        'error'
      )
    } finally {
      setDeleting(false)
    }
  }

  const assignedCount = template.assignedProperties.length

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-[90vw] max-w-md"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Delete Walkthrough Template</h2>
              <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">
            Delete <span className="font-semibold">{template.name}</span>?
          </p>
          {assignedCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-800">
                This template is currently assigned to {assignedCount} propert
                {assignedCount === 1 ? 'y' : 'ies'}. Those properties will fall back to your default template.
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Photos that were uploaded against this template will still be visible in their projects as &ldquo;archived&rdquo; entries.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
          >
            {deleting && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            Delete
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
