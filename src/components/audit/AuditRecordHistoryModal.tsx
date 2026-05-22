'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import DualModalContainer from '@/components/shared/DualModalContainer'
import AuditHistoryPanel from './AuditHistoryPanel'
import EntityPreviewLoader from './EntityPreviewLoader'
import type { AuditEntityType } from '@/services/types/audit'
import type { EntityRef, EntityRefType } from './auditFieldRegistry'

interface Props {
  entityType: AuditEntityType
  entityId: string
  onClose: () => void
  initialExpandedId?: string
  zIndex?: number
}

// EntityRefType is a superset that can include 'property' and 'cleaner';
// AuditEntityType is narrower. Only audited refs can be nested.
function toAuditEntityType(t: EntityRefType): AuditEntityType | null {
  if (t === 'booking' || t === 'cleaning_project') return t
  return null
}

// Reverse mapping: which AuditEntityTypes have a preview modal we can open
// from the modal header? incoming_booking has no preview.
function auditTypeToRef(t: AuditEntityType): EntityRefType | null {
  if (t === 'booking' || t === 'cleaning_project') return t
  return null
}

export default function AuditRecordHistoryModal({
  entityType, entityId, onClose, initialExpandedId, zIndex = 65,
}: Props) {
  const { t } = useTranslation('audit')
  const [preview, setPreview] = useState<EntityRef | null>(null)
  const [nestedHistory, setNestedHistory] = useState<EntityRef | null>(null)

  const headerRefType = auditTypeToRef(entityType)
  const refLabel = `${t(`entityType.${entityType}`)} / ${entityId}`

  const primary = (
    <>
      <header className="px-5 py-4 border-b border-gray-200 shrink-0 mr-8">
        <h2 className="text-lg font-semibold text-gray-900">{t('panel.recordTitle')}</h2>
        {headerRefType ? (
          <button
            type="button"
            onClick={() => setPreview({ entityType: headerRefType, entityId })}
            aria-label={t('header.viewRecord')}
            className="group mt-0.5 inline-flex items-center gap-1 max-w-full text-[11px] text-gray-500 font-mono hover:text-sky-700 hover:underline transition-colors cursor-pointer"
          >
            <span className="truncate">{refLabel}</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <p className="text-[11px] text-gray-500 font-mono truncate">{refLabel}</p>
        )}
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AuditHistoryPanel
          entityType={entityType}
          entityId={entityId}
          initialExpandedId={initialExpandedId}
          onOpenEntityPreview={setPreview}
        />
      </div>
    </>
  )

  const secondary = preview ? (
    <EntityPreviewLoader
      entityType={preview.entityType}
      entityId={preview.entityId}
      onClose={() => setPreview(null)}
      onOpenEntity={setPreview}
      onViewAuditHistory={() => {
        const audited = toAuditEntityType(preview.entityType)
        if (!audited) return
        setNestedHistory(preview)
        setPreview(null)
      }}
    />
  ) : null

  const nestedAudited = nestedHistory ? toAuditEntityType(nestedHistory.entityType) : null

  return (
    <>
      <DualModalContainer
        isOpen
        onClose={onClose}
        primaryModal={primary}
        secondaryModal={secondary}
        isSecondaryOpen={!!preview}
        onSecondaryClose={() => setPreview(null)}
        primaryStyle="p-0 max-w-3xl w-11/12 max-h-[85vh] flex flex-col"
        primaryPairedStyle="p-0 max-w-xl w-[36vw] max-h-[85vh] flex flex-col"
        secondaryStyle="p-0 max-w-4xl w-[50vw] max-h-[85vh]"
        zIndex={zIndex}
      />
      {nestedHistory && nestedAudited && (
        <AuditRecordHistoryModal
          entityType={nestedAudited}
          entityId={nestedHistory.entityId}
          onClose={() => setNestedHistory(null)}
          zIndex={zIndex + 15}
        />
      )}
    </>
  )
}
