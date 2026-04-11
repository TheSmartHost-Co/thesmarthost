'use client'

import { useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  MagnifyingGlassPlusIcon,
  PhotoIcon,
  CameraIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import type {
  ProjectWalkthrough,
  WalkthroughPhoto,
  ProjectWalkthroughGroup,
  ProjectWalkthroughItem,
} from '@/services/types/cleaningProject'
import WalkthroughUploadMenu from './WalkthroughUploadMenu'

// Identifies which upload slot files should be attached to.
export type WalkthroughUploadTarget =
  | { kind: 'group'; groupId: string }
  | { kind: 'item'; groupId: string; itemId: string }
  | { kind: 'freeform' }

// String key matching a target for tracking which slot is currently uploading.
// Must match the encoding used by callers when building `uploadingKey`.
export function targetKey(target: WalkthroughUploadTarget): string {
  if (target.kind === 'freeform') return 'freeform'
  if (target.kind === 'item') return `item:${target.itemId}`
  return `group:${target.groupId}`
}

export interface WalkthroughAccordionProps {
  walkthrough: ProjectWalkthrough
  canEdit: boolean
  uploadingKey: string | null
  onUpload: (target: WalkthroughUploadTarget, files: File[]) => void
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
  missingGroupIds?: Set<string>
  expandedGroupIds: Set<string>
  onToggleGroup: (groupId: string) => void
}

/**
 * Shared walkthrough renderer. Used by:
 *   - Cleaner: ChecklistModal walkthrough tab (canEdit = true)
 *   - PM: ProjectDetailModal walkthrough tab (canEdit = true)
 *   - Client portal: ClientProjectDetail walkthrough view (canEdit = false)
 *
 * Renders the effective template as a collapsible accordion, then orphaned
 * groups (read-only with delete), then a freeform "Other Photos" section.
 */
export default function WalkthroughAccordion({
  walkthrough,
  canEdit,
  uploadingKey,
  onUpload,
  onDelete,
  onViewPhoto,
  missingGroupIds,
  expandedGroupIds,
  onToggleGroup,
}: WalkthroughAccordionProps) {
  const { t } = useTranslation('turnover')
  const { effectiveTemplate, orphanedGroups, freeformPhotos } = walkthrough
  const groups = [...effectiveTemplate.groups].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="p-4 space-y-4">
      {!effectiveTemplate.requiresCompletion && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <PhotoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            {t('walkthroughOptional')}
          </p>
        </div>
      )}

      {groups.length === 0 && orphanedGroups.length === 0 && freeformPhotos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CameraIcon className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{t('noWalkthroughTemplate')}</p>
          {canEdit && (
            <p className="text-xs text-gray-400 mt-1">{t('useFreeformBelow')}</p>
          )}
        </div>
      )}

      {groups.map(group => {
        const isMissing = missingGroupIds?.has(group.id) ?? false
        const isExpanded = expandedGroupIds.has(group.id)
        return (
          <GroupCard
            key={group.id}
            group={group}
            isExpanded={isExpanded}
            isMissing={isMissing}
            canEdit={canEdit}
            uploadingKey={uploadingKey}
            onToggle={() => onToggleGroup(group.id)}
            onUpload={onUpload}
            onDelete={onDelete}
            onViewPhoto={onViewPhoto}
          />
        )
      })}

      {orphanedGroups.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
            {t('archivedFromPrevious')}
          </div>
          {orphanedGroups.map(bucket => (
            <OrphanBucket
              key={bucket.groupNameSnapshot}
              groupName={bucket.groupNameSnapshot || 'Unlabeled'}
              photos={bucket.photos}
              canEdit={canEdit}
              onDelete={onDelete}
              onViewPhoto={onViewPhoto}
            />
          ))}
        </div>
      )}

      <FreeformSection
        photos={freeformPhotos}
        canEdit={canEdit}
        uploadingKey={uploadingKey}
        onUpload={onUpload}
        onDelete={onDelete}
        onViewPhoto={onViewPhoto}
      />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Group card
// -----------------------------------------------------------------------------

interface GroupCardProps {
  group: ProjectWalkthroughGroup
  isExpanded: boolean
  isMissing: boolean
  canEdit: boolean
  uploadingKey: string | null
  onToggle: () => void
  onUpload: (target: WalkthroughUploadTarget, files: File[]) => void
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
}

function GroupCard({
  group,
  isExpanded,
  isMissing,
  canEdit,
  uploadingKey,
  onToggle,
  onUpload,
  onDelete,
  onViewPhoto,
}: GroupCardProps) {
  const items = [...group.items].sort((a, b) => a.sortOrder - b.sortOrder)
  const groupPhotoCount = group.photos.length
  const itemPhotoCount = items.reduce((acc, it) => acc + it.photos.length, 0)
  const { t } = useTranslation('turnover')
  const totalPhotos = groupPhotoCount + itemPhotoCount

  // A group is "complete" when every item has ≥1 photo, OR (if no items) when
  // group.photos has ≥1 photo. Matches the backend completion rule.
  const isComplete =
    items.length > 0
      ? items.every(it => it.photos.length > 0)
      : group.photos.length > 0

  const borderClass = isMissing
    ? 'border-red-300 ring-1 ring-red-300'
    : 'border-gray-200'

  const groupUploadKey = `group:${group.id}`

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          {isMissing ? (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : isComplete ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-900 truncate">{group.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {totalPhotos} {totalPhotos !== 1 ? t('photos') : t('photo')}
          </span>
          {isMissing && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 flex-shrink-0">
              {t('missingLabel')}
            </span>
          )}
        </button>

        {canEdit && (
          <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            <WalkthroughUploadMenu
              onSelect={(files) => onUpload({ kind: 'group', groupId: group.id }, files)}
              isUploading={uploadingKey === groupUploadKey}
              label="Add"
            />
          </div>
        )}
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Group-level photos (no specific item) */}
          {group.photos.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase text-gray-400 mb-1.5 tracking-wide">
                {t('groupPhotos')}
              </div>
              <PhotoGrid
                photos={group.photos}
                canEdit={canEdit}
                onDelete={onDelete}
                onViewPhoto={onViewPhoto}
                altPrefix={group.name}
              />
            </div>
          )}

          {/* Items */}
          {items.length > 0 ? (
            items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                groupId={group.id}
                canEdit={canEdit}
                uploadingKey={uploadingKey}
                onUpload={onUpload}
                onDelete={onDelete}
                onViewPhoto={onViewPhoto}
              />
            ))
          ) : (
            group.photos.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                {t('noPhotosYet')}{canEdit ? ` ${t('tapAddAbove')}` : ''}
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Item row
// -----------------------------------------------------------------------------

interface ItemRowProps {
  item: ProjectWalkthroughItem
  groupId: string
  canEdit: boolean
  uploadingKey: string | null
  onUpload: (target: WalkthroughUploadTarget, files: File[]) => void
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
}

function ItemRow({
  item,
  groupId,
  canEdit,
  uploadingKey,
  onUpload,
  onDelete,
  onViewPhoto,
}: ItemRowProps) {
  const hasPhotos = item.photos.length > 0
  const itemUploadKey = `item:${item.id}`

  return (
    <div className="border border-gray-100 rounded-lg p-2.5 bg-gray-50/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {hasPhotos ? (
            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs font-medium text-gray-800 truncate">{item.name}</span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {item.photos.length}
          </span>
        </div>
        {canEdit && (
          <WalkthroughUploadMenu
            onSelect={(files) =>
              onUpload({ kind: 'item', groupId, itemId: item.id }, files)
            }
            isUploading={uploadingKey === itemUploadKey}
            variant="secondary"
            label="Add"
          />
        )}
      </div>
      {hasPhotos && (
        <PhotoGrid
          photos={item.photos}
          canEdit={canEdit}
          onDelete={onDelete}
          onViewPhoto={onViewPhoto}
          altPrefix={item.name}
        />
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Orphan bucket (read-only, except delete)
// -----------------------------------------------------------------------------

interface OrphanBucketProps {
  groupName: string
  photos: WalkthroughPhoto[]
  canEdit: boolean
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
}

function OrphanBucket({ groupName, photos, canEdit, onDelete, onViewPhoto }: OrphanBucketProps) {
  const { t } = useTranslation('turnover')
  return (
    <div className="bg-amber-50/50 border border-amber-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-100">
        <ArchiveBoxIcon className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-900">{groupName}</span>
        <span className="text-[10px] text-amber-600 ml-auto">
          {photos.length} {photos.length !== 1 ? t('photos') : t('photo')}
        </span>
      </div>
      <div className="p-2">
        <PhotoGrid
          photos={photos}
          canEdit={canEdit}
          onDelete={onDelete}
          onViewPhoto={onViewPhoto}
          altPrefix={groupName}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Freeform section
// -----------------------------------------------------------------------------

interface FreeformSectionProps {
  photos: WalkthroughPhoto[]
  canEdit: boolean
  uploadingKey: string | null
  onUpload: (target: WalkthroughUploadTarget, files: File[]) => void
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
}

function FreeformSection({
  photos,
  canEdit,
  uploadingKey,
  onUpload,
  onDelete,
  onViewPhoto,
}: FreeformSectionProps) {
  const { t } = useTranslation('turnover')
  if (!canEdit && photos.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <PhotoIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{t('otherPhotos')}</span>
          <span className="text-xs text-gray-400">
            {photos.length} {photos.length !== 1 ? t('photos') : t('photo')}
          </span>
        </div>
        {canEdit && (
          <WalkthroughUploadMenu
            onSelect={(files) => onUpload({ kind: 'freeform' }, files)}
            isUploading={uploadingKey === 'freeform'}
            label="Add"
          />
        )}
      </div>
      {photos.length > 0 && (
        <div className="p-3">
          <PhotoGrid
            photos={photos}
            canEdit={canEdit}
            onDelete={onDelete}
            onViewPhoto={onViewPhoto}
            altPrefix="Other"
          />
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Shared photo grid
// -----------------------------------------------------------------------------

interface PhotoGridProps {
  photos: WalkthroughPhoto[]
  canEdit: boolean
  onDelete: (photoId: string) => void
  onViewPhoto: (url: string) => void
  altPrefix: string
}

function PhotoGrid({ photos, canEdit, onDelete, onViewPhoto, altPrefix }: PhotoGridProps) {
  if (photos.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map(photo => (
        <div key={photo.id} className="relative group">
          <img
            src={photo.photoUrl}
            alt={`${altPrefix} walkthrough`}
            className="aspect-square rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 w-full"
            onClick={() => onViewPhoto(photo.photoUrl)}
          />
          <div
            className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => onViewPhoto(photo.photoUrl)}
          >
            <MagnifyingGlassPlusIcon className="w-5 h-5 text-white" />
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => onDelete(photo.id)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
