'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import ReactMarkdown from 'react-markdown'
import type { PatchNote } from '@/services/types/patchNote'

interface PreviewPatchNoteModalProps {
  isOpen: boolean
  note: PatchNote
  onClose: () => void
}

const ROLE_LABELS: Record<string, string> = {
  property_manager: 'Property Manager',
  team_member: 'Team Member',
  client: 'Client',
  cleaner: 'Cleaner',
}

const PreviewPatchNoteModal: React.FC<PreviewPatchNoteModalProps> = ({
  isOpen,
  note,
  onClose,
}) => {
  const { t } = useTranslation('common')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="max-w-2xl w-11/12 p-0 overflow-hidden">
      {/* Header - matches the popup modal style */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <h2 className="text-lg font-bold text-white">{t('previewTitle', { title: note.title })}</h2>
            <p className="text-sm text-amber-100">{t('previewDescription')}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {note.version && (
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {note.version}
            </span>
          )}
          {note.publishedAt && (
            <span className="text-xs text-gray-400">{formatDate(note.publishedAt)}</span>
          )}
          {!note.publishedAt && (
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{t('draft')}</span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            note.status === 'published' ? 'bg-green-100 text-green-700' :
            note.status === 'expired' ? 'bg-gray-100 text-gray-500' :
            'bg-gray-100 text-gray-600'
          }`}>
            {note.status?.charAt(0).toUpperCase()}{note.status?.slice(1)}
          </span>
        </div>

        {/* Targets */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {note.targetRoles.map(role => (
            <span key={role} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {ROLE_LABELS[role] || role}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{note.title}</h3>

        {/* Markdown content */}
        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>

        {/* Images */}
        {note.images && note.images.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('screenshotsCount', { count: note.images.length })}
            </h4>
            <div className="space-y-3">
              {note.images.map((img, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/patch-note-images/${img.url}`}
                    alt={img.caption}
                    className="w-full h-auto"
                  />
                  {img.caption && (
                    <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No images indicator */}
        {(!note.images || note.images.length === 0) && (
          <div className="mt-6 text-center py-4 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
            {t('noScreenshotsAttached')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="text-xs text-gray-400">
          {note.dismissCount !== undefined && `${note.dismissCount} users dismissed`}
        </div>
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700"
        >
          {t('closePreview')}
        </button>
      </div>
    </Modal>
  )
}

export default PreviewPatchNoteModal
