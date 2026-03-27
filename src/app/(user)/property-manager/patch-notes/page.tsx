'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getAllPatchNotes, publishPatchNote } from '@/services/patchNoteService'
import type { PatchNote } from '@/services/types/patchNote'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreatePatchNoteModal from '@/components/patch-notes/create/createPatchNoteModal'
import UpdatePatchNoteModal from '@/components/patch-notes/update/updatePatchNoteModal'
import DeletePatchNoteModal from '@/components/patch-notes/delete/deletePatchNoteModal'
import {
  MegaphoneIcon,
  PlusIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { ADMIN_USER_IDS } from '@/components/navbar/sidebarItems'
import PreviewPatchNoteModal from '@/components/patch-notes/preview/previewPatchNoteModal'

const ROLE_LABELS: Record<string, string> = {
  property_manager: 'Property Manager',
  team_member: 'Team Member',
  client: 'Client',
  cleaner: 'Cleaner',
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Published
        </span>
      )
    case 'draft':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Draft
        </span>
      )
    case 'expired':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Expired
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Unknown
        </span>
      )
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function PatchNotesAdminPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  const [notes, setNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [previewNote, setPreviewNote] = useState<PatchNote | null>(null)
  const [editNote, setEditNote] = useState<PatchNote | null>(null)
  const [deleteNote, setDeleteNote] = useState<PatchNote | null>(null)

  const isAdmin =
    profile?.role === 'ADMIN' || ADMIN_USER_IDS.includes(profile?.id || '')

  useEffect(() => {
    if (isAdmin) {
      fetchNotes()
    }
  }, [isAdmin])

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const res = await getAllPatchNotes()
      if (res.status === 'success') {
        setNotes(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load patch notes', 'error')
      }
    } catch (err) {
      console.error('Error fetching patch notes:', err)
      showNotification('Error loading patch notes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (note: PatchNote) => {
    try {
      const res = await publishPatchNote(note.id)
      if (res.status === 'success') {
        showNotification('Patch note published successfully', 'success')
        fetchNotes()
      } else {
        showNotification(res.message || 'Failed to publish', 'error')
      }
    } catch (err) {
      console.error('Error publishing patch note:', err)
      showNotification('Error publishing patch note', 'error')
    }
  }

  const getActionsForNote = (note: PatchNote): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View',
        icon: EyeIcon,
        onClick: () => setPreviewNote(note),
      },
      {
        label: 'Edit',
        icon: PencilSquareIcon,
        onClick: () => setEditNote(note),
      },
    ]

    if (note.status === 'draft') {
      actions.push({
        label: 'Publish',
        icon: RocketLaunchIcon,
        onClick: () => handlePublish(note),
      })
    }

    actions.push({
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => setDeleteNote(note),
      variant: 'danger',
    })

    return actions
  }

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <MegaphoneIcon className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 max-w-md">
          You do not have permission to manage patch notes. This page is
          restricted to administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <MegaphoneIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patch Notes</h1>
            <p className="text-sm text-gray-500">
              Manage release notes and announcements
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-sm transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading patch notes...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && notes.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <MegaphoneIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No patch notes yet
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first patch note to announce updates to your users.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create Patch Note
          </button>
        </div>
      )}

      {/* Notes List */}
      {!loading && notes.length > 0 && (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {note.title}
                    </h3>
                    {note.version && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {note.version}
                      </span>
                    )}
                    {getStatusBadge(note.status)}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>
                      Created {formatDate(note.createdAt)}
                    </span>
                    {note.publishedAt && (
                      <span>
                        Published {formatDate(note.publishedAt)}
                      </span>
                    )}
                    {typeof note.dismissCount === 'number' && (
                      <span>
                        {note.dismissCount} dismissed
                      </span>
                    )}
                  </div>

                  {/* Target roles */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {note.targetRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        {ROLE_LABELS[role] || role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions dropdown */}
                <div className="flex-shrink-0">
                  <TableActionsDropdown
                    actions={getActionsForNote(note)}
                    itemId={note.id}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewNote && (
        <PreviewPatchNoteModal
          isOpen={!!previewNote}
          note={previewNote}
          onClose={() => setPreviewNote(null)}
        />
      )}

      {/* Create Modal */}
      <CreatePatchNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false)
          fetchNotes()
        }}
      />

      {/* Update Modal */}
      {editNote && (
        <UpdatePatchNoteModal
          isOpen={!!editNote}
          note={editNote}
          onClose={() => setEditNote(null)}
          onUpdated={() => {
            setEditNote(null)
            fetchNotes()
          }}
        />
      )}

      {/* Delete Modal */}
      {deleteNote && (
        <DeletePatchNoteModal
          isOpen={!!deleteNote}
          note={deleteNote}
          onClose={() => setDeleteNote(null)}
          onDeleted={() => {
            setDeleteNote(null)
            fetchNotes()
          }}
        />
      )}
    </div>
  )
}
