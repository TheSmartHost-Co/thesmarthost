'use client'

import { useTranslation } from 'react-i18next'
import { ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import EntityChip from './EntityChip'
import type { EntityRef } from './auditFieldRegistry'

interface Props {
  beforeBookingId: string | null
  afterBookingId: string | null
  onOpenEntity: (ref: EntityRef) => void
}

function Side({ id, fallbackKey, onOpen }: {
  id: string | null
  fallbackKey: 'relink.noPrevious' | 'relink.noNext'
  onOpen: (ref: EntityRef) => void
}) {
  const { t } = useTranslation('audit')
  if (!id) {
    return (
      <span className="text-xs italic text-gray-400 px-2 py-0.5">
        {t(fallbackKey)}
      </span>
    )
  }
  return (
    <EntityChip
      entityType="booking"
      entityId={id}
      onClick={() => onOpen({ entityType: 'booking', entityId: id })}
    />
  )
}

export default function RelinkBookingsCard({ beforeBookingId, afterBookingId, onOpenEntity }: Props) {
  const { t } = useTranslation('audit')

  return (
    <div className="rounded-lg border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-3 mb-3">
      <div className="flex items-center gap-2 text-sm font-medium text-sky-900">
        <ArrowPathIcon className="h-4 w-4" />
        {t('relink.label')}
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <Side id={beforeBookingId} fallbackKey="relink.noPrevious" onOpen={onOpenEntity} />
        <ArrowRightIcon className="h-4 w-4 text-sky-400 shrink-0" />
        <Side id={afterBookingId} fallbackKey="relink.noNext" onOpen={onOpenEntity} />
      </div>
    </div>
  )
}
