'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUserStore } from '@/store/useUserStore'
import type { QbStepOverrides } from '@/services/types/quickbooks'

const STORAGE_KEY = 'qb-send-wizard-draft'

/**
 * Status of a step in the wizard. Drives the progress strip rendering, the
 * step's editability, and which steps are collected for "Send All".
 */
export type WizardStepStatus =
  | 'pending-config' // initial — user hasn't touched it
  | 'configured' // overrides set, no blockers, ready to stage
  | 'staged' // user clicked "Stage & Next" — locked for submit
  | 'blocked' // preflight returned a blocker (e.g. category_unmapped)
  | 'skipped' // user explicitly skipped — won't be in submit batch

export interface WizardStepEntry {
  expenseId: string
  stepStatus: WizardStepStatus
  /** Null until the user (or auto-fill) populates the form. */
  overrides: QbStepOverrides | null
  /** Surfaced from preflight; rendered as warnings on the step. */
  blockers: string[]
}

/**
 * What we persist to localStorage. Identifies the user (drafts are scoped) and
 * keeps enough state to faithfully restore a wizard session.
 *
 * Notably we do NOT persist the qbDefaults bundle — those are re-fetched on
 * resume because they could be stale (the user may have edited mappings, or
 * accounts may have changed in QBO).
 */
export interface QbWizardDraft {
  savedAt: string
  userId: string
  expenseIds: string[]
  currentStepIndex: number
  stepStates: WizardStepEntry[]
}

export interface DraftInfo {
  savedAt: Date
  expenseCount: number
  currentStepIndex: number
}

export interface UseSendToQbWizardDraftReturn {
  hasDraft: boolean
  draftInfo: DraftInfo | null
  saveDraft: (state: QbWizardDraft) => void
  loadDraft: () => QbWizardDraft | null
  clearDraft: () => void
}

/**
 * localStorage-backed persistence for the bulk SendToQbWizard. Mirrors the
 * upload-wizard's `useWizardDraft` shape but scoped to QB and with a smaller
 * draft payload — no large CSV text, just per-expense overrides.
 *
 * Save semantics: the wizard calls saveDraft() explicitly on every "Stage &
 * Next" click. Low-frequency, no debounce required. clearDraft() runs on
 * successful submit OR explicit "Discard draft" action.
 */
export function useSendToQbWizardDraft(): UseSendToQbWizardDraftReturn {
  const [hasDraft, setHasDraft] = useState(false)
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null)
  const user = useUserStore((state) => state.profile)

  // Detect existing draft on mount or when user switches.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setHasDraft(false)
        setDraftInfo(null)
        return
      }
      const draft = JSON.parse(stored) as QbWizardDraft
      if (user?.id && draft.userId !== user.id) {
        // Draft belongs to a different user — clear it.
        localStorage.removeItem(STORAGE_KEY)
        setHasDraft(false)
        setDraftInfo(null)
        return
      }
      setHasDraft(true)
      setDraftInfo({
        savedAt: new Date(draft.savedAt),
        expenseCount: draft.expenseIds.length,
        currentStepIndex: draft.currentStepIndex,
      })
    } catch (err) {
      // Corrupted draft — wipe it.
      console.error('Error reading QB wizard draft:', err)
      localStorage.removeItem(STORAGE_KEY)
      setHasDraft(false)
      setDraftInfo(null)
    }
  }, [user?.id])

  const saveDraft = useCallback(
    (state: QbWizardDraft) => {
      if (!user?.id) return
      try {
        const payload: QbWizardDraft = {
          ...state,
          savedAt: new Date().toISOString(),
          userId: user.id,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch (err) {
        // Quota errors are unlikely (small payload) but worth logging.
        console.error('Error saving QB wizard draft:', err)
      }
    },
    [user?.id]
  )

  const loadDraft = useCallback((): QbWizardDraft | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      const draft = JSON.parse(stored) as QbWizardDraft
      if (user?.id && draft.userId !== user.id) return null
      return draft
    } catch (err) {
      console.error('Error loading QB wizard draft:', err)
      return null
    }
  }, [user?.id])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setHasDraft(false)
    setDraftInfo(null)
  }, [])

  return { hasDraft, draftInfo, saveDraft, loadDraft, clearDraft }
}

export default useSendToQbWizardDraft
