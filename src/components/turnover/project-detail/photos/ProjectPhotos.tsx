'use client'

import { notifyError } from '@/utils/notify'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PhotoIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { CleaningProject, ProjectChecklistItem, ProjectWalkthrough } from '@/services/types/cleaningProject'
import type { ProjectIssue } from '@/services/types/projectIssue'
import WalkthroughAccordion, {
  type WalkthroughUploadTarget,
  type OptimisticPhoto,
} from '@/components/walkthrough/WalkthroughAccordion'
import DeleteWalkthroughPhotosModal from '@/components/walkthrough/DeleteWalkthroughPhotosModal'
import ImagePreviewModal from '@/components/shared/ImagePreviewModal'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  uploadProjectChecklistItemPhoto,
  deleteProjectChecklistItemPhoto,
  downloadChecklistPhotoWatermarked,
  downloadWalkthroughPhotoWatermarked,
  findWalkthroughPhotoByUrl,
  isValidPhotoFile,
  describePhotoRejection,
} from '@/services/cleaningProjectService'
import {
  uploadIssuePhotos,
  deleteIssuePhoto,
  downloadIssuePhotoWatermarked,
  getPhotoPublicUrl,
  getIssueTypeDisplay,
} from '@/services/projectIssueService'

/** A photo prepared for the shared enlarged viewer (with optional carousel). */
interface ViewerPhoto {
  url: string
  title: string
  photoTakenAt?: string | null
  photoUploadedAt?: string | null
  downloadFn?: () => Promise<void>
  onDeleteRequested?: () => void
}

/** Walkthrough interaction props — owned by the parent, forwarded to the accordion. */
export interface WalkthroughControls {
  uploadingKey: string | null
  optimisticPhotos: OptimisticPhoto[]
  expandedGroupIds: Set<string>
  selectionMode: boolean
  selectedPhotoIds: Set<string>
  onUpload: (target: WalkthroughUploadTarget, files: File[]) => void
  onDelete: (photoId: string) => void
  onToggleGroup: (groupId: string) => void
  onToggleSelect: (photoId: string) => void
  onSetSelection: (photoIds: string[], selected: boolean) => void
  onEnterSelectionMode: () => void
  onExitSelectionMode: () => void
  onRequestDeleteSelected: () => void
}

interface ProjectPhotosProps {
  project: CleaningProject
  walkthrough: ProjectWalkthrough | null
  checklistItems: ProjectChecklistItem[]
  projectIssues: ProjectIssue[]
  canEdit: boolean
  onChecklistRefetch: () => Promise<void> | void
  onIssuesRefetch: () => Promise<void> | void
  walkthroughControls: WalkthroughControls
}

type Segment = 'walkthrough' | 'checklist' | 'issues'

/**
 * Unified per-project photo management for the PM. Three segments — Walkthrough
 * (the existing accordion, structured by room), Checklist (grid by task), and
 * Issues (grid by issue) — share one enlarged viewer (with carousel) and one
 * delete-confirm. Checklist/issue adds are contextual (pick a task / an issue).
 * Checklist add+delete are gated to in_progress (backend rule); issues are not.
 */
export default function ProjectPhotos({
  project,
  walkthrough,
  checklistItems,
  projectIssues,
  canEdit,
  onChecklistRefetch,
  onIssuesRefetch,
  walkthroughControls,
}: ProjectPhotosProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)

  const checklistInProgress = canEdit && project.status === 'in_progress'

  // ---- counts + default segment -------------------------------------------
  const walkthroughCount = useMemo(() => {
    if (!walkthrough) return 0
    const groups = walkthrough.effectiveTemplate.groups.reduce(
      (acc, g) => acc + g.photos.length + g.items.reduce((a, it) => a + it.photos.length, 0),
      0
    )
    const orphans = walkthrough.orphanedGroups.reduce((acc, o) => acc + o.photos.length, 0)
    return groups + orphans + walkthrough.freeformPhotos.length
  }, [walkthrough])
  const checklistPhotos = useMemo(() => checklistItems.filter((i) => i.photoUrl), [checklistItems])
  const issuePhotoCount = useMemo(
    () => projectIssues.reduce((acc, iss) => acc + iss.photoUrls.length, 0),
    [projectIssues]
  )

  const [segment, setSegment] = useState<Segment>('walkthrough')
  // Default to Walkthrough once it loads (walkthrough is null on first render
  // while it fetches). Don't override a segment the user manually selected.
  const userPickedSegment = useRef(false)
  useEffect(() => {
    if (userPickedSegment.current) return
    setSegment(walkthrough ? 'walkthrough' : 'checklist')
  }, [walkthrough])

  // ---- shared viewer -------------------------------------------------------
  const [viewer, setViewer] = useState<{ photos: ViewerPhoto[]; index: number } | null>(null)
  const openViewer = (photos: ViewerPhoto[], index: number) => setViewer({ photos, index })
  const closeViewer = () => setViewer(null)
  const current = viewer ? viewer.photos[viewer.index] : null

  // ---- flat-segment delete confirm (checklist + issue) ---------------------
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'checklist'; itemId: string }
    | { kind: 'issue'; issueId: string; photoIndex: number }
    | null
  >(null)

  const performFlatDelete = async () => {
    const p = pendingDelete
    if (!p) return
    try {
      if (p.kind === 'checklist') {
        const res = await deleteProjectChecklistItemPhoto(project.id, p.itemId)
        if (res.status === 'success') {
          showNotification(t('photoDeletedSuccess'), 'success')
          await onChecklistRefetch()
        } else {
          showNotification(res.message || t('failedToDeletePhoto'), 'error')
        }
      } else {
        const res = await deleteIssuePhoto(p.issueId, p.photoIndex)
        if (res.status === 'success') {
          showNotification(t('photoDeletedSuccess'), 'success')
          await onIssuesRefetch()
        } else {
          showNotification(res.message || t('failedToDeletePhoto'), 'error')
        }
      }
    } catch (err) {
      notifyError(err, t('errorDeletingPhoto'))
    } finally {
      setPendingDelete(null)
    }
  }

  // ---- viewer photo builders per segment -----------------------------------
  const openWalkthroughPhoto = (url: string) => {
    if (!walkthrough) return
    const ordered = [
      ...walkthrough.effectiveTemplate.groups.flatMap((g) => [
        ...g.photos,
        ...g.items.flatMap((it) => it.photos),
      ]),
      ...walkthrough.orphanedGroups.flatMap((o) => o.photos),
      ...walkthrough.freeformPhotos,
    ]
    const idx = Math.max(0, ordered.findIndex((p) => p.photoUrl === url))
    const photos: ViewerPhoto[] = ordered.map((p) => ({
      url: p.photoUrl,
      title: p.itemNameSnapshot ?? p.groupNameSnapshot ?? t('walkthroughLabel'),
      photoTakenAt: p.photoTakenAt,
      photoUploadedAt: p.photoUploadedAt,
      downloadFn: () => downloadWalkthroughPhotoWatermarked(project.id, p.id),
      onDeleteRequested: canEdit
        ? () => { closeViewer(); walkthroughControls.onDelete(p.id) }
        : undefined,
    }))
    openViewer(photos, idx)
  }

  const openChecklistPhoto = (itemId: string) => {
    const idx = Math.max(0, checklistPhotos.findIndex((i) => i.id === itemId))
    const photos: ViewerPhoto[] = checklistPhotos.map((i) => ({
      url: i.photoUrl as string,
      title: i.taskDescription,
      photoTakenAt: i.photoTakenAt,
      photoUploadedAt: i.photoUploadedAt,
      downloadFn: () => downloadChecklistPhotoWatermarked(project.id, i.id),
      onDeleteRequested: checklistInProgress
        ? () => { closeViewer(); setPendingDelete({ kind: 'checklist', itemId: i.id }) }
        : undefined,
    }))
    openViewer(photos, idx)
  }

  const openIssuePhoto = (issueId: string, photoIndex: number) => {
    // Flatten every issue photo so the carousel spans all issues.
    const flat: { issueId: string; photoIndex: number; issue: ProjectIssue }[] = []
    projectIssues.forEach((iss) =>
      iss.photoUrls.forEach((_, pi) => flat.push({ issueId: iss.id, photoIndex: pi, issue: iss }))
    )
    const idx = Math.max(0, flat.findIndex((f) => f.issueId === issueId && f.photoIndex === photoIndex))
    const photos: ViewerPhoto[] = flat.map((f) => ({
      url: getPhotoPublicUrl(f.issue.photoUrls[f.photoIndex]),
      title: `${getIssueTypeDisplay(f.issue.issueType).label} — ${t('photo')} ${f.photoIndex + 1}`,
      photoTakenAt: f.issue.photoTakenAt?.[f.photoIndex] ?? null,
      photoUploadedAt: f.issue.photoUploadedAt?.[f.photoIndex] ?? null,
      downloadFn: () => downloadIssuePhotoWatermarked(f.issueId, f.photoIndex),
      onDeleteRequested: canEdit
        ? () => { closeViewer(); setPendingDelete({ kind: 'issue', issueId: f.issueId, photoIndex: f.photoIndex }) }
        : undefined,
    }))
    openViewer(photos, idx)
  }

  const segments: { key: Segment; label: string; count: number; show: boolean }[] = [
    { key: 'walkthrough', label: t('walkthroughSegment'), count: walkthroughCount, show: !!walkthrough },
    { key: 'checklist', label: t('checklistSegment'), count: checklistPhotos.length, show: true },
    { key: 'issues', label: t('issuesSegment'), count: issuePhotoCount, show: true },
  ]

  return (
    <div>
      {/* Segment switcher */}
      <div className="flex items-center gap-1 mb-3 border-b border-gray-100">
        {segments.filter((s) => s.show).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { userPickedSegment.current = true; setSegment(s.key) }}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors cursor-pointer ${
              segment === s.key
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label} <span className="text-xs text-gray-400">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Active segment */}
      {segment === 'walkthrough' && walkthrough && (
        <WalkthroughAccordion
          walkthrough={walkthrough}
          canEdit={canEdit}
          uploadingKey={walkthroughControls.uploadingKey}
          onUpload={walkthroughControls.onUpload}
          onDelete={walkthroughControls.onDelete}
          onViewPhoto={openWalkthroughPhoto}
          optimisticPhotos={walkthroughControls.optimisticPhotos}
          expandedGroupIds={walkthroughControls.expandedGroupIds}
          onToggleGroup={walkthroughControls.onToggleGroup}
          selectionMode={walkthroughControls.selectionMode}
          selectedPhotoIds={walkthroughControls.selectedPhotoIds}
          onToggleSelect={walkthroughControls.onToggleSelect}
          onSetSelection={walkthroughControls.onSetSelection}
          onEnterSelectionMode={walkthroughControls.onEnterSelectionMode}
          onExitSelectionMode={walkthroughControls.onExitSelectionMode}
          onRequestDeleteSelected={walkthroughControls.onRequestDeleteSelected}
        />
      )}

      {segment === 'checklist' && (
        <ChecklistPhotosSegment
          items={checklistPhotos}
          allItems={checklistItems}
          projectId={project.id}
          canAdd={checklistInProgress}
          onView={openChecklistPhoto}
          onUploaded={onChecklistRefetch}
        />
      )}

      {segment === 'issues' && (
        <IssuePhotosSegment
          issues={projectIssues}
          canAdd={canEdit}
          onView={openIssuePhoto}
          onUploaded={onIssuesRefetch}
        />
      )}

      {/* Shared enlarged viewer with carousel */}
      {current && (
        <ImagePreviewModal
          isOpen
          onClose={closeViewer}
          imageUrl={current.url}
          title={current.title}
          photoTakenAt={current.photoTakenAt}
          photoUploadedAt={current.photoUploadedAt}
          onDownloadWatermarked={current.downloadFn}
          onDelete={current.onDeleteRequested}
          hasPrev={!!viewer && viewer.index > 0}
          onPrev={() => setViewer((v) => (v ? { ...v, index: Math.max(0, v.index - 1) } : v))}
          hasNext={!!viewer && viewer.index < viewer.photos.length - 1}
          onNext={() => setViewer((v) => (v ? { ...v, index: Math.min(v.photos.length - 1, v.index + 1) } : v))}
        />
      )}

      {/* Flat-segment (checklist/issue) delete confirm */}
      <DeleteWalkthroughPhotosModal
        isOpen={pendingDelete !== null}
        count={1}
        onClose={() => setPendingDelete(null)}
        onConfirm={performFlatDelete}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checklist segment
// ---------------------------------------------------------------------------

function ChecklistPhotosSegment({
  items,
  allItems,
  projectId,
  canAdd,
  onView,
  onUploaded,
}: {
  items: ProjectChecklistItem[]
  allItems: ProjectChecklistItem[]
  projectId: string
  canAdd: boolean
  onView: (itemId: string) => void
  onUploaded: () => Promise<void> | void
}) {
  const { t } = useTranslation('turnover')
  return (
    <div className="space-y-3">
      {canAdd && (
        <ChecklistPhotoAdder items={allItems} projectId={projectId} onUploaded={onUploaded} />
      )}
      {items.length === 0 ? (
        <EmptyState label={t('noChecklistPhotos')} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {items.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => onView(i.id)}
              className="relative group cursor-pointer"
            >
              <img
                src={i.photoUrl as string}
                alt={i.taskDescription}
                className="w-full aspect-square object-cover rounded-lg border border-gray-200"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate">
                {i.taskDescription}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Issue segment
// ---------------------------------------------------------------------------

function IssuePhotosSegment({
  issues,
  canAdd,
  onView,
  onUploaded,
}: {
  issues: ProjectIssue[]
  canAdd: boolean
  onView: (issueId: string, photoIndex: number) => void
  onUploaded: () => Promise<void> | void
}) {
  const { t } = useTranslation('turnover')
  const withPhotos = issues.filter((i) => i.photoUrls.length > 0)
  return (
    <div className="space-y-3">
      {canAdd && issues.length > 0 && (
        <IssuePhotoAdder issues={issues} onUploaded={onUploaded} />
      )}
      {withPhotos.length === 0 ? (
        <EmptyState label={t('noIssuePhotos')} />
      ) : (
        <div className="space-y-4">
          {withPhotos.map((iss) => (
            <div key={iss.id}>
              <div className="text-xs font-medium text-amber-700 mb-1.5">
                {getIssueTypeDisplay(iss.issueType).label}
                <span className="text-gray-400 ml-1">{iss.photoUrls.length}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {iss.photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onView(iss.id, idx)}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={getPhotoPublicUrl(url)}
                      alt={`${getIssueTypeDisplay(iss.issueType).label} ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contextual adders
// ---------------------------------------------------------------------------

function ChecklistPhotoAdder({
  items,
  projectId,
  onUploaded,
}: {
  items: ProjectChecklistItem[]
  projectId: string
  onUploaded: () => Promise<void> | void
}) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const onPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itemId = e.target.value
    e.target.value = ''
    if (!itemId) return
    setPendingItemId(itemId)
    inputRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const itemId = pendingItemId
    setPendingItemId(null)
    if (!file || !itemId) return
    const v = isValidPhotoFile(file)
    if (!v.ok) {
      showNotification(describePhotoRejection(file, v.reason), 'error')
      return
    }
    setUploading(true)
    try {
      const res = await uploadProjectChecklistItemPhoto(projectId, itemId, file)
      if (res.status === 'success') {
        showNotification(t('photoUploadedSuccess'), 'success')
        await onUploaded()
      } else {
        showNotification(res.message || t('failedToUploadPhoto'), 'error')
      }
    } catch (err) {
      notifyError(err, t('failedToUploadPhoto'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <PlusIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
      <select
        onChange={onPick}
        disabled={uploading}
        defaultValue=""
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 disabled:opacity-50 cursor-pointer max-w-full"
      >
        <option value="">{uploading ? t('uploading') : t('addChecklistPhoto')}</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.taskDescription}{i.photoUrl ? ` (${t('replaceLabel')})` : ''}
          </option>
        ))}
      </select>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
    </div>
  )
}

function IssuePhotoAdder({
  issues,
  onUploaded,
}: {
  issues: ProjectIssue[]
  onUploaded: () => Promise<void> | void
}) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const onPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const issueId = e.target.value
    e.target.value = ''
    if (!issueId) return
    setPendingIssueId(issueId)
    inputRef.current?.click()
  }

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const issueId = pendingIssueId
    setPendingIssueId(null)
    if (files.length === 0 || !issueId) return
    const valid: File[] = []
    for (const f of files) {
      const v = isValidPhotoFile(f)
      if (v.ok) valid.push(f)
      else showNotification(describePhotoRejection(f, v.reason), 'error')
    }
    if (valid.length === 0) return
    setUploading(true)
    try {
      const res = await uploadIssuePhotos(issueId, valid)
      if (res.status === 'success') {
        showNotification(t('photoUploadedSuccess'), 'success')
        await onUploaded()
      } else {
        showNotification(res.message || t('failedToUploadPhoto'), 'error')
      }
    } catch (err) {
      notifyError(err, t('failedToUploadPhoto'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <PlusIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <select
        onChange={onPick}
        disabled={uploading}
        defaultValue=""
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 disabled:opacity-50 cursor-pointer max-w-full"
      >
        <option value="">{uploading ? t('uploading') : t('addIssuePhoto')}</option>
        {issues.map((i) => (
          <option key={i.id} value={i.id}>
            {getIssueTypeDisplay(i.issueType).label}
          </option>
        ))}
      </select>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <PhotoIcon className="w-10 h-10 text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
