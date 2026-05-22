'use client'

import { useTranslation } from 'react-i18next'
import { ArchiveBoxXMarkIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { isAudited, type EntityRefType } from './auditFieldRegistry'

interface Props {
  entityType: EntityRefType
  entityId: string
  onClose: () => void
  onViewAuditHistory?: () => void
}

export default function EntityTombstoneModal({
  entityType,
  entityId,
  onClose,
  onViewAuditHistory,
}: Props) {
  const { t } = useTranslation('audit')
  const showHistoryCta = isAudited(entityType) && onViewAuditHistory

  return (
    <div className="relative flex flex-col items-center text-center p-6 gap-3">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        aria-label={t('tombstone.close')}
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      <div className="mt-2 h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
        <ArchiveBoxXMarkIcon className="h-8 w-8 text-slate-400" />
      </div>

      <h3 className="text-base font-semibold text-slate-900">
        {t('tombstone.title')}
      </h3>

      <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
        {t('tombstone.message', { entityType: t(`entityType.${entityType}`) })}
      </p>

      <div className="mt-1 px-3 py-1.5 bg-slate-50 rounded font-mono text-[11px] text-slate-500 break-all max-w-full">
        {entityId}
      </div>

      {showHistoryCta && (
        <button
          type="button"
          onClick={onViewAuditHistory}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors cursor-pointer"
        >
          <ClockIcon className="h-4 w-4" />
          {t('tombstone.viewHistory')}
        </button>
      )}
    </div>
  )
}
