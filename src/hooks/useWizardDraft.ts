import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  WizardState,
  WizardStep,
  PropertyIdentificationState,
  FieldMappingState,
  PropertyMapping,
} from '@/components/upload-wizard/types/wizard'

const STORAGE_KEY = 'upload-wizard-draft'
const DEBOUNCE_MS = 500

/**
 * Draft data structure stored in localStorage
 */
export interface WizardDraft {
  // Metadata
  savedAt: string // ISO timestamp
  fileName: string
  fileSize: number
  userId: string

  // CSV content (raw text, not File object)
  csvText: string

  // Wizard navigation state
  currentStep: WizardStep
  completedSteps: WizardStep[]

  // Step-specific state
  propertyIdentificationState?: PropertyIdentificationState
  fieldMappingState?: FieldMappingState
  propertyMappings?: PropertyMapping[]
  fieldMappings?: any[]
  completeFieldMappingState?: any

  // Override toggle
  overrideExisting?: boolean
}

export interface DraftInfo {
  fileName: string
  savedAt: Date
  currentStep: WizardStep
}

export interface UseWizardDraftReturn {
  // State
  hasDraft: boolean
  draftInfo: DraftInfo | null
  isRestoring: boolean

  // Actions
  saveDraft: (state: WizardState, csvText: string) => void
  loadDraft: () => WizardDraft | null
  clearDraft: () => void

  // Auto-save trigger (debounced)
  autoSave: (state: WizardState, csvText: string) => void
}

/**
 * Custom hook for managing Upload Wizard draft save/restore functionality.
 *
 * Saves wizard state to localStorage so users can resume if they accidentally
 * navigate away or refresh the page.
 */
export function useWizardDraft(): UseWizardDraftReturn {
  const [hasDraft, setHasDraft] = useState(false)
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)
  const user = useUserStore((state) => state.profile)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  // Check for existing draft on mount
  useEffect(() => {
    checkForDraft()
  }, [user?.id])

  /**
   * Check if a valid draft exists in localStorage
   */
  const checkForDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setHasDraft(false)
        setDraftInfo(null)
        return
      }

      const draft: WizardDraft = JSON.parse(stored)

      // Verify draft belongs to current user
      if (user?.id && draft.userId !== user.id) {
        // Draft from different user, clear it
        localStorage.removeItem(STORAGE_KEY)
        setHasDraft(false)
        setDraftInfo(null)
        return
      }

      // Draft is valid
      setHasDraft(true)
      setDraftInfo({
        fileName: draft.fileName,
        savedAt: new Date(draft.savedAt),
        currentStep: draft.currentStep,
      })
    } catch (error) {
      // Corrupted draft, clear it
      console.error('Error reading wizard draft:', error)
      localStorage.removeItem(STORAGE_KEY)
      setHasDraft(false)
      setDraftInfo(null)
    }
  }, [user?.id])

  /**
   * Save current wizard state to localStorage
   */
  const saveDraft = useCallback((state: WizardState, csvText: string) => {
    if (!user?.id) {
      console.warn('Cannot save draft: No user logged in')
      return
    }

    if (!csvText || !state.uploadedFile) {
      console.warn('Cannot save draft: No CSV data')
      return
    }

    // Don't save if we're on process or complete step
    if (state.currentStep >= WizardStep.PROCESS) {
      return
    }

    try {
      const draft: WizardDraft = {
        savedAt: new Date().toISOString(),
        fileName: state.uploadedFile.name,
        fileSize: state.uploadedFile.size,
        userId: user.id,
        csvText,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        propertyIdentificationState: state.propertyIdentificationState,
        fieldMappingState: state.fieldMappingState,
        propertyMappings: state.propertyMappings,
        fieldMappings: state.fieldMappings,
        completeFieldMappingState: state.completeFieldMappingState,
        overrideExisting: state.overrideExisting,
      }

      const serialized = JSON.stringify(draft)

      // Check if anything actually changed
      if (serialized === lastSaveRef.current) {
        return
      }

      localStorage.setItem(STORAGE_KEY, serialized)
      lastSaveRef.current = serialized

      // Note: Don't update hasDraft/draftInfo here - those are only for
      // detecting drafts on mount. Updating them here would trigger
      // the resume modal during an active session.

      showNotification('Draft saved', 'info')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        showNotification('Draft too large to save. Consider using a smaller CSV file.', 'error')
      } else {
        console.error('Error saving wizard draft:', error)
        showNotification('Failed to save draft', 'error')
      }
    }
  }, [user?.id, showNotification])

  /**
   * Auto-save with debounce to avoid excessive writes
   */
  const autoSave = useCallback((state: WizardState, csvText: string) => {
    // Clear any pending save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Schedule new save
    debounceRef.current = setTimeout(() => {
      saveDraft(state, csvText)
    }, DEBOUNCE_MS)
  }, [saveDraft])

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback((): WizardDraft | null => {
    try {
      setIsRestoring(true)
      const stored = localStorage.getItem(STORAGE_KEY)

      if (!stored) {
        return null
      }

      const draft: WizardDraft = JSON.parse(stored)

      // Verify draft belongs to current user
      if (user?.id && draft.userId !== user.id) {
        return null
      }

      return draft
    } catch (error) {
      console.error('Error loading wizard draft:', error)
      return null
    } finally {
      setIsRestoring(false)
    }
  }, [user?.id])

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    // Clear any pending auto-save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    localStorage.removeItem(STORAGE_KEY)
    lastSaveRef.current = ''
    setHasDraft(false)
    setDraftInfo(null)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    hasDraft,
    draftInfo,
    isRestoring,
    saveDraft,
    loadDraft,
    clearDraft,
    autoSave,
  }
}

export default useWizardDraft
