'use client'

import { useState, useEffect } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getPublishedPatchNotes } from '@/services/patchNoteService'
import type { PatchNote } from '@/services/types/patchNote'
import ReactMarkdown from 'react-markdown'
import { SparklesIcon } from '@heroicons/react/24/outline'

export default function WhatsNewPage() {
  const showNotification = useNotificationStore(s => s.showNotification)
  const [notes, setNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const res = await getPublishedPatchNotes()
      if (res.status === 'success') {
        setNotes(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load updates', 'error')
      }
    } catch (err) {
      console.error('Error loading notes:', err)
      showNotification('Error loading updates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SparklesIcon className="w-8 h-8 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">What&apos;s New</h1>
          <p className="text-sm text-gray-500">See the latest updates and improvements</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading updates...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No updates yet. Check back soon!</p>
        </div>
      ) : (
        <div className="border-l-2 border-gray-200 pl-6 ml-2 space-y-8">
          {notes.map((note, idx) => (
            <div key={note.id} className="relative">
              <div
                className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                  idx === 0 ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              />
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  {note.version && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {note.version}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(note.publishedAt)}</span>
                  {note.dismissed === false && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{note.title}</h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
                {note.images && note.images.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {note.images.map((img, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/patch-note-images/${img.url}`}
                          alt={img.caption}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
