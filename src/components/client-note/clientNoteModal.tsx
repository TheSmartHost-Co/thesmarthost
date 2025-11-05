'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { 
  getNotesByClientId, 
  createNote, 
  updateNote, 
  deleteNote
} from '@/services/clientNoteService'
import { ClientNote, CreateNotePayload, UpdateNotePayload } from '@/services/types/clientNote'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline'

interface ClientNoteModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onNoteUpdate?: () => void
}

type ModalMode = 'list' | 'create' | 'edit'

const ClientNoteModal: React.FC<ClientNoteModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onNoteUpdate,
}) => {
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('list')
  const [selectedNote, setSelectedNote] = useState<ClientNote | null>(null)
  
  // Form state
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const { showNotification } = useNotificationStore()
  const authorId = useUserStore((state) => state.profile?.id!);

  // Load notes when modal opens
  useEffect(() => {
    if (isOpen && clientId) {
      fetchNotes()
    }
  }, [isOpen, clientId])

  // Reset form when mode changes
  useEffect(() => {
    if (mode === 'create') {
      resetForm()
    } else if (mode === 'edit' && selectedNote) {
      setNoteTitle(selectedNote.noteTitle)
      setNoteContent(selectedNote.note)
    }
  }, [mode, selectedNote])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await getNotesByClientId(clientId)
      if (response.status === 'success') {
        setNotes(response.data)
      } else {
        showNotification(response.message || 'Failed to load notes', 'error')
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
      showNotification('Error loading notes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNoteTitle('')
    setNoteContent('')
    setSelectedNote(null)
  }

  const handleModeSwitch = (newMode: ModalMode) => {
    setMode(newMode)
  }

  const handleCreate = () => {
    setMode('create')
  }

  const handleEdit = (note: ClientNote) => {
    setSelectedNote(note)
    setMode('edit')
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await deleteNote(noteId)
      if (response.status === 'success') {
        showNotification('Note deleted successfully', 'success')
        await fetchNotes()
        onNoteUpdate?.()
      } else {
        showNotification(response.message || 'Failed to delete note', 'error')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      showNotification('Error deleting note', 'error')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!noteTitle.trim()) {
      showNotification('Note title is required', 'error')
      return
    }

    if (!noteContent.trim()) {
      showNotification('Note content is required', 'error')
      return
    }

    try {
      const payload: CreateNotePayload = {
        clientId,
        authorId,
        noteTitle: noteTitle.trim(),
        note: noteContent.trim()
      }

      const response = await createNote(payload)
      if (response.status === 'success') {
        showNotification('Note created successfully', 'success')
        await fetchNotes()
        setMode('list')
        resetForm()
        onNoteUpdate?.()
      } else {
        showNotification(response.message || 'Failed to create note', 'error')
      }
    } catch (error) {
      console.error('Error creating note:', error)
      showNotification('Error creating note', 'error')
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedNote) return

    // Validation
    if (!noteTitle.trim()) {
      showNotification('Note title is required', 'error')
      return
    }

    if (!noteContent.trim()) {
      showNotification('Note content is required', 'error')
      return
    }

    try {
      const payload: UpdateNotePayload = {
        noteTitle: noteTitle.trim(),
        note: noteContent.trim()
      }

      const response = await updateNote(selectedNote.id, payload)
      if (response.status === 'success') {
        showNotification('Note updated successfully', 'success')
        await fetchNotes()
        setMode('list')
        resetForm()
        onNoteUpdate?.()
      } else {
        showNotification(response.message || 'Failed to update note', 'error')
      }
    } catch (error) {
      console.error('Error updating note:', error)
      showNotification('Error updating note', 'error')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return formatDate(dateString)
  }

  const renderModeContent = () => {
    switch (mode) {
      case 'list':
        return (
          <div className="space-y-4">
            {/* Notes List Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-black">Client Notes ({notes.length})</h3>
              <button
                onClick={handleCreate}
                className="cursor-pointer inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Note
              </button>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first note for this client.</p>
                <button
                  onClick={handleCreate}
                  className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create First Note
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 flex-1">{note.noteTitle}</h4>
                      <div className="flex space-x-1 ml-4">
                        <button
                          onClick={() => handleEdit(note)}
                          className="cursor-pointer p-1 text-blue-600 hover:text-blue-800 rounded"
                          title="Edit note"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="cursor-pointer p-1 text-red-600 hover:text-red-800 rounded"
                          title="Delete note"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{note.note}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <UserIcon className="w-3 h-3 mr-1" />
                          {note.authorName || 'Unknown'}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {formatRelativeTime(note.createdAt)}
                        </span>
                      </div>
                      {note.updatedAt && note.updatedAt !== note.createdAt && (
                        <span className="text-gray-400">
                          Edited {formatRelativeTime(note.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'create':
        return (
          <div className="space-y-4">
            {/* Create Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-black">Create New Note</h3>
              <button
                onClick={() => handleModeSwitch('list')}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-black">
              <div>
                <label className="block text-sm font-medium mb-1">Note Title *</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Enter a descriptive title for this note"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note Content *</label>
                <textarea
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note content here..."
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('list')}
                  className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        )

      case 'edit':
        return (
          <div className="space-y-4">
            {/* Edit Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-black">Edit Note</h3>
              <button
                onClick={() => handleModeSwitch('list')}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-black">
              <div>
                <label className="block text-sm font-medium mb-1">Note Title *</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note Content *</label>
                <textarea
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {selectedNote && (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <p>Created by {selectedNote.authorName} on {formatDate(selectedNote.createdAt)}</p>
                  {selectedNote.updatedAt && selectedNote.updatedAt !== selectedNote.createdAt && (
                    <p>Last edited on {formatDate(selectedNote.updatedAt)}</p>
                  )}
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('list')}
                  className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Note
                </button>
              </div>
            </form>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Client Notes - {clientName}</h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => handleModeSwitch('list')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'list'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Notes ({notes.length})
        </button>
        <button
          onClick={() => handleModeSwitch('create')}
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            mode === 'create'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Create Note
        </button>
        {selectedNote && mode === 'edit' && (
          <button
            onClick={() => handleModeSwitch('edit')}
            className="cursor-pointer px-4 py-2 text-sm font-medium rounded-t-lg bg-blue-50 text-blue-600 border-b-2 border-blue-600"
          >
            Edit Note
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading notes...</div>
        </div>
      ) : (
        renderModeContent()
      )}

      {/* Modal Footer */}
      <div className="flex justify-end pt-6 border-t mt-6">
        <button
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ClientNoteModal