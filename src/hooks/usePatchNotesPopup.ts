'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { getUnreadPatchNotes, dismissAllPatchNotes } from '@/services/patchNoteService'
import type { PatchNote } from '@/services/types/patchNote'

export function usePatchNotesPopup() {
  const profile = useUserStore(s => s.profile)
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!profile?.id || checkedRef.current) return
    checkedRef.current = true

    const check = async () => {
      try {
        const res = await getUnreadPatchNotes()
        if (res.status === 'success' && res.data && res.data.length > 0) {
          setNotes(res.data)
          setShowModal(true)
        }
      } catch (err) {
        console.error('Failed to check patch notes:', err)
      }
    }

    check()
  }, [profile?.id])

  const handleDismissAll = useCallback(async () => {
    setLoading(true)
    try {
      await dismissAllPatchNotes()
    } catch (err) {
      console.error('Failed to dismiss patch notes:', err)
    } finally {
      setLoading(false)
      setShowModal(false)
    }
  }, [])

  const handleCloseForSession = useCallback(() => {
    setShowModal(false)
  }, [])

  return {
    showModal,
    notes,
    loading,
    dismissAll: handleDismissAll,
    closeForSession: handleCloseForSession,
  }
}
