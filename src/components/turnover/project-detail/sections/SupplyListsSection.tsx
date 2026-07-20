'use client'

import { useTranslation } from 'react-i18next'
import { ClipboardDocumentCheckIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { SupplyListsSectionProps } from '../types'

/** Supply-list summary card (opens the review modal) or empty state with CTA. */
export default function SupplyListsSection({ count, onView, onRequest }: SupplyListsSectionProps) {
  const { t } = useTranslation('turnover')

  if (count === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <ClipboardDocumentCheckIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-sm text-gray-500">{t('noSupplyRequests')}</p>
        <button
          onClick={onRequest}
          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          {t('requestButton')}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onView}
      className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-100">
            <ClipboardDocumentCheckIcon className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {t('supplyListCountLabel', { count })}
            </p>
            <p className="text-xs text-gray-500">{t('tapToReview')}</p>
          </div>
        </div>
        <span className="text-sm text-purple-600 font-medium">{t('viewButton')} →</span>
      </div>
    </button>
  )
}
