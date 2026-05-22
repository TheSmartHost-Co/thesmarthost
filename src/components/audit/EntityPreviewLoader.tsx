'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { isBackendError } from '@/services/backendError'
import { getBookingById } from '@/services/bookingService'
import { getPropertyById } from '@/services/propertyService'
import { getCleanerById } from '@/services/cleanerService'
import { getCleaningProjectById } from '@/services/cleaningProjectService'
import type { Booking } from '@/services/types/booking'
import type { Property } from '@/services/types/property'
import type { Cleaner } from '@/services/types/cleaner'
import type { CleaningProject } from '@/services/types/cleaningProject'
import PreviewBookingModal from '@/components/booking/preview/previewBookingModal'
import PreviewPropertyModal from '@/components/property/preview/previewPropertyModal'
import PreviewCleanerModal from '@/components/cleaner/preview/previewCleanerModal'
import PreviewCleaningProjectModal from '@/components/turnover/preview/PreviewCleaningProjectModal'
import EntityTombstoneModal from './EntityTombstoneModal'
import type { EntityRefType } from './auditFieldRegistry'

interface Props {
  entityType: EntityRefType
  entityId: string
  onClose: () => void
  onViewAuditHistory?: () => void
  onOpenEntity?: (ref: import('./auditFieldRegistry').EntityRef) => void
}

type LoadedEntity =
  | { type: 'booking'; data: Booking }
  | { type: 'property'; data: Property }
  | { type: 'cleaner'; data: Cleaner }
  | { type: 'cleaning_project'; data: CleaningProject }

export default function EntityPreviewLoader({
  entityType,
  entityId,
  onClose,
  onViewAuditHistory,
  onOpenEntity,
}: Props) {
  const { t } = useTranslation('audit')
  const { effectiveUserId } = usePermissions()
  const [entity, setEntity] = useState<LoadedEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)
    setEntity(null)

    const load = async () => {
      try {
        if (entityType === 'booking') {
          if (!effectiveUserId) throw new Error('No user context')
          const res = await getBookingById(entityId, effectiveUserId)
          if (cancelled) return
          if (res.status === 'success') setEntity({ type: 'booking', data: res.data })
          else throw new Error(res.message || t('preview.loadError'))
        } else if (entityType === 'property') {
          const res = await getPropertyById(entityId)
          if (cancelled) return
          if (res.status === 'success') setEntity({ type: 'property', data: res.data })
          else throw new Error(res.message || t('preview.loadError'))
        } else if (entityType === 'cleaner') {
          const res = await getCleanerById(entityId)
          if (cancelled) return
          if (res.status === 'success') setEntity({ type: 'cleaner', data: res.data })
          else throw new Error(res.message || t('preview.loadError'))
        } else if (entityType === 'cleaning_project') {
          const res = await getCleaningProjectById(entityId)
          if (cancelled) return
          if (res.status === 'success') setEntity({ type: 'cleaning_project', data: res.data })
          else throw new Error(res.message || t('preview.loadError'))
        }
      } catch (err) {
        if (cancelled) return
        if (isBackendError(err) && err.status === 404) {
          setNotFound(true)
        } else {
          setError(err instanceof Error ? err.message : t('preview.loadError'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [entityType, entityId, effectiveUserId, t])

  if (loading) {
    return (
      <div className="flex flex-col p-4 gap-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
      </div>
    )
  }

  if (notFound) {
    return (
      <EntityTombstoneModal
        entityType={entityType}
        entityId={entityId}
        onClose={onClose}
        onViewAuditHistory={onViewAuditHistory}
      />
    )
  }

  if (error || !entity) {
    return (
      <div className="p-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
        {error || t('preview.loadError')}
      </div>
    )
  }

  if (entity.type === 'booking') {
    return <PreviewBookingModal embedded onClose={onClose} booking={entity.data} isOpen />
  }
  if (entity.type === 'property') {
    return <PreviewPropertyModal embedded onClose={onClose} property={entity.data} isOpen />
  }
  if (entity.type === 'cleaner') {
    return <PreviewCleanerModal embedded onClose={onClose} cleaner={entity.data} isOpen />
  }
  return <PreviewCleaningProjectModal embedded onClose={onClose} project={entity.data} onOpenEntity={onOpenEntity} />
}
