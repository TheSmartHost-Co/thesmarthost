'use client'

import { useTranslation } from 'react-i18next'
import { CameraIcon } from '@heroicons/react/24/outline'
import type { ProjectWalkthrough } from '@/services/types/cleaningProject'
import WalkthroughAccordion, {
  type WalkthroughUploadTarget,
  type OptimisticPhoto,
} from '@/components/walkthrough/WalkthroughAccordion'

interface WalkthroughContentProps {
  walkthrough: ProjectWalkthrough | null
  loading: boolean
  canEdit: boolean
  uploadingKey: string | null
  onUpload: (target: WalkthroughUploadTarget, files: File[]) => void
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
  missingGroupIds: Set<string>
  expandedGroupIds: Set<string>
  onToggleGroup: (groupId: string) => void
  optimisticPhotos?: OptimisticPhoto[]
}

/**
 * Cleaner-side wrapper around the shared WalkthroughAccordion. Handles the
 * loading + empty states for the cleaner view.
 */
export default function WalkthroughContent({
  walkthrough,
  loading,
  canEdit,
  uploadingKey,
  onUpload,
  onDelete,
  onViewPhoto,
  missingGroupIds,
  expandedGroupIds,
  onToggleGroup,
  optimisticPhotos,
}: WalkthroughContentProps) {
  const { t } = useTranslation('cleanerPortal')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!walkthrough) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <CameraIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">{t('couldNotLoadWalkthrough')}</p>
      </div>
    )
  }

  return (
    <WalkthroughAccordion
      walkthrough={walkthrough}
      canEdit={canEdit}
      uploadingKey={uploadingKey}
      onUpload={onUpload}
      onDelete={onDelete}
      onViewPhoto={onViewPhoto}
      missingGroupIds={missingGroupIds}
      expandedGroupIds={expandedGroupIds}
      onToggleGroup={onToggleGroup}
      optimisticPhotos={optimisticPhotos}
    />
  )
}
