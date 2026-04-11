'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import ReactMarkdown from 'react-markdown'
import type { PatchNote } from '@/services/types/patchNote'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface PatchNotesModalProps {
  isOpen: boolean
  notes: PatchNote[]
  loading: boolean
  onDismissAll: () => void
  onClose: () => void
}

const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  isOpen,
  notes,
  loading,
  onDismissAll,
  onClose,
}) => {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!isOpen || notes.length === 0) return null

  const note = notes[currentIndex]
  const hasMultiple = notes.length > 1
  const isFirst = currentIndex === 0
  const isLast = currentIndex === notes.length - 1

  const handleViewAll = () => {
    onClose()
    router.push('/property-manager/whats-new')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-xl w-11/12 p-0 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <h2 className="text-lg font-bold text-white">{t('whatsNew')}</h2>
            <p className="text-sm text-amber-100">{t('latestUpdatesToHostMetrics')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 max-h-[50vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          {note.version && (
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {note.version}
            </span>
          )}
          <span className="text-xs text-gray-400">{formatDate(note.publishedAt)}</span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">{note.title}</h3>

        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>

        {note.images && note.images.length > 0 && (
          <div className="mt-4 space-y-2">
            {note.images.map((img, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/patch-note-images/${img.url}`}
                  alt={img.caption}
                  className="w-full h-auto"
                />
                {img.caption && (
                  <p className="text-xs text-gray-500 px-3 py-1.5 bg-gray-50">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation + Actions */}
      <div className="border-t border-gray-100 px-6 py-4">
        {hasMultiple && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setCurrentIndex(i => i - 1)}
              disabled={isFirst}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            </button>

            <div className="flex gap-1.5">
              {notes.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i === currentIndex ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={isLast}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={onDismissAll}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('dontShowAgain')}
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleViewAll}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {t('viewAllNotes')}
            </button>
            <button
              onClick={onDismissAll}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
            >
              {loading ? t('dismissing') : t('gotIt')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PatchNotesModal
