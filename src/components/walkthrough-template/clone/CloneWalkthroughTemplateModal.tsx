'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { DocumentDuplicateIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { cloneWalkthroughTemplate } from '@/services/walkthroughTemplateService'
import type { WalkthroughTemplate } from '@/services/types/walkthroughTemplate'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCloned: (template: WalkthroughTemplate) => void
  source: WalkthroughTemplate | null
}

export default function CloneWalkthroughTemplateModal({
  isOpen,
  onClose,
  onCloned,
  source,
}: Props) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore(state => state.showNotification)
  const [name, setName] = useState('')
  const [cloning, setCloning] = useState(false)

  useEffect(() => {
    if (isOpen && source) {
      setName(`${source.name} (Copy)`)
      setCloning(false)
    }
  }, [isOpen, source])

  if (!isOpen || !source) return null

  const handleClone = async () => {
    if (!profile?.id) return
    const trimmed = name.trim()
    if (!trimmed) {
      showNotification(t('nameIsRequired'), 'error')
      return
    }
    setCloning(true)
    try {
      const res = await cloneWalkthroughTemplate(source.id, {
        userId: profile.id,
        name: trimmed,
      })
      if (res.status === 'success') {
        showNotification(t('templateCloned'), 'success')
        onCloned(res.data)
        onClose()
      } else {
        showNotification(res.message || t('failedToCloneTemplate'), 'error')
      }
    } catch (err) {
      console.error('Error cloning walkthrough template:', err)
      showNotification(
        err instanceof Error ? err.message : t('errorCloningTemplate'),
        'error'
      )
    } finally {
      setCloning(false)
    }
  }

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
            <div className="p-2 bg-purple-50 rounded-xl">
              <DocumentDuplicateIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{t('cloneTemplateTitle')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('cloneTemplateDescription')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {t('newTemplateName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={cloning}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleClone()
              }
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={cloning}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleClone}
            disabled={cloning || !name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
          >
            {cloning && (
              <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {t('clone')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
