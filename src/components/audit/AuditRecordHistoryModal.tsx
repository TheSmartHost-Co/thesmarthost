'use client'

import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import AuditHistoryPanel from './AuditHistoryPanel'
import type { AuditEntityType } from '@/services/types/audit'

interface Props {
  entityType: AuditEntityType
  entityId: string
  onClose: () => void
}

export default function AuditRecordHistoryModal({ entityType, entityId, onClose }: Props) {
  const { t } = useTranslation('audit')

  return (
    <Modal
      isOpen
      onClose={onClose}
      style="p-0 max-w-3xl w-11/12 !max-h-[85vh] !overflow-y-hidden flex flex-col"
      zIndex={65}
    >
      <header className="px-5 py-4 border-b border-gray-200 shrink-0 mr-8">
        <h2 className="text-lg font-semibold text-gray-900">{t('panel.recordTitle')}</h2>
        <p className="text-[11px] text-gray-500 font-mono truncate">
          {t(`entityType.${entityType}`)} / {entityId}
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AuditHistoryPanel entityType={entityType} entityId={entityId} />
      </div>
    </Modal>
  )
}
