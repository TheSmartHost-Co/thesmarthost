'use client'

import { useTranslation } from 'react-i18next'
import { DocumentTextIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import type { NotesSectionProps } from '../types'

const VARIANTS = {
  pm: {
    Icon: DocumentTextIcon,
    labelKey: 'pmNotes',
    header: 'text-gray-500',
    body: 'bg-gray-50',
  },
  cleaner: {
    Icon: PencilSquareIcon,
    labelKey: 'cleanerNotes',
    header: 'text-teal-600',
    body: 'bg-teal-50 border-l-4 border-teal-400',
  },
} as const

/** PM or cleaner notes block (cleaner notes are read-only for the PM). */
export default function NotesSection({ variant, text }: NotesSectionProps) {
  const { t } = useTranslation('turnover')
  const { Icon, labelKey, header, body } = VARIANTS[variant]
  return (
    <div className="border-t border-gray-100 pt-4">
      <div className={`flex items-center gap-2 mb-2 ${header}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{t(labelKey)}</span>
      </div>
      <p className={`text-sm text-gray-700 rounded-lg p-3 ${body}`}>{text}</p>
    </div>
  )
}
