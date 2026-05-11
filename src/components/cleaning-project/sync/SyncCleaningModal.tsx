'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import type { Property } from '@/services/types/property'
import type {
  SyncCandidate,
  SyncDateField,
  SyncSource,
  SyncStats,
  SyncApplyResultItem,
} from '@/services/types/cleaningProject'
import {
  previewCleaningSync,
  applyCleaningSync,
} from '@/services/cleaningProjectService'
import { useNotificationStore } from '@/store/useNotificationStore'
import ConfigureStep, { type ConfigureFormState } from './steps/ConfigureStep'
import PreviewStep from './steps/PreviewStep'
import ApplyStep from './steps/ApplyStep'
import DoneStep from './steps/DoneStep'

export type WizardStep = 'configure' | 'preview' | 'apply' | 'done'

interface SyncCleaningModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  properties: Property[]
  onSyncComplete?: (createdCount: number) => void
  onOpenProject?: (projectId: string) => void
}

const STEP_ORDER: WizardStep[] = ['configure', 'preview', 'apply', 'done']
const STEP_LABELS: Record<WizardStep, string> = {
  configure: 'Configure',
  preview: 'Review',
  apply: 'Apply',
  done: 'Done',
}

const APPLY_BATCH_SIZE = 25

const SyncCleaningModal: React.FC<SyncCleaningModalProps> = ({
  isOpen,
  onClose,
  userId,
  properties,
  onSyncComplete,
  onOpenProject,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<WizardStep>('configure')
  const [config, setConfig] = useState<ConfigureFormState>(() => ({
    startDate: '',
    endDate: '',
    dateField: 'checkout',
    propertyIds: properties.map((p) => p.id),
    sources: ['local', 'pms'],
    createBookings: true,
  }))

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<SyncCandidate[]>([])
  const [stats, setStats] = useState<SyncStats>({ new: 0, duplicate: 0, notManaged: 0, unmapped: 0 })
  const [warnings, setWarnings] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 })
  const [applyResults, setApplyResults] = useState<SyncApplyResultItem[]>([])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.removeProperty('overflow')
    }
    return () => {
      document.body.style.removeProperty('overflow')
    }
  }, [isOpen])

  const resetState = useCallback(() => {
    setStep('configure')
    setConfig({
      startDate: '',
      endDate: '',
      dateField: 'checkout',
      propertyIds: properties.map((p) => p.id),
      sources: ['local', 'pms'],
      createBookings: true,
    })
    setPreviewLoading(false)
    setPreviewError(null)
    setCandidates([])
    setStats({ new: 0, duplicate: 0, notManaged: 0, unmapped: 0 })
    setWarnings([])
    setSelectedKeys(new Set())
    setApplyProgress({ done: 0, total: 0 })
    setApplyResults([])
  }, [properties])

  // Re-sync property selection when the modal opens (handles the case where
  // properties were fetched after this component mounted).
  useEffect(() => {
    if (isOpen) {
      setConfig((prev) => ({
        ...prev,
        propertyIds: properties.map((p) => p.id),
      }))
    }
  }, [isOpen, properties])

  const handleClose = useCallback(() => {
    if (step === 'apply') return // don't allow closing mid-apply
    resetState()
    onClose()
  }, [step, resetState, onClose])

  const runPreview = useCallback(async () => {
    setPreviewLoading(true)
    setPreviewError(null)
    setCandidates([])
    try {
      const res = await previewCleaningSync({
        userId,
        startDate: config.startDate,
        endDate: config.endDate,
        dateField: config.dateField,
        propertyIds: config.propertyIds,
        sources: config.sources,
      })
      if (res.status !== 'success') {
        throw new Error(res.message || 'Failed to preview')
      }
      setCandidates(res.data.candidates)
      setStats(res.data.stats)
      setWarnings(res.data.warnings || [])
      // Default-select all candidates with status='new'
      setSelectedKeys(new Set(res.data.candidates.filter((c) => c.status === 'new').map((c) => c.key)))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to preview sync'
      setPreviewError(msg)
      showNotification(msg, 'error')
    } finally {
      setPreviewLoading(false)
    }
  }, [userId, config, showNotification])

  const handleNextFromConfigure = useCallback(() => {
    setStep('preview')
    runPreview()
  }, [runPreview])

  const handleApply = useCallback(async () => {
    const chosen = candidates.filter((c) => selectedKeys.has(c.key) && c.status === 'new' && c.propertyId)
    if (chosen.length === 0) {
      showNotification('Select at least one candidate to apply', 'info')
      return
    }
    setStep('apply')
    setApplyProgress({ done: 0, total: chosen.length })
    setApplyResults([])

    const allResults: SyncApplyResultItem[] = []
    for (let i = 0; i < chosen.length; i += APPLY_BATCH_SIZE) {
      const batch = chosen.slice(i, i + APPLY_BATCH_SIZE)
      try {
        const res = await applyCleaningSync({
          userId,
          candidates: batch,
          createBookings: config.createBookings,
        })
        if (res.status === 'success') {
          allResults.push(...res.data.results)
        } else {
          for (const c of batch) {
            allResults.push({ key: c.key, outcome: 'failed', reason: res.message || 'apply failed' })
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error'
        for (const c of batch) {
          allResults.push({ key: c.key, outcome: 'failed', reason: msg })
        }
      }
      setApplyProgress({ done: Math.min(i + batch.length, chosen.length), total: chosen.length })
      setApplyResults([...allResults])
    }

    const created = allResults.filter((r) => r.outcome === 'created').length
    if (created > 0 && onSyncComplete) {
      onSyncComplete(created)
    }
    setStep('done')
  }, [candidates, selectedKeys, userId, config.createBookings, showNotification, onSyncComplete])

  if (!isOpen || !mounted) return null

  const currentStepIndex = STEP_ORDER.indexOf(step)

  const modal = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/25">
              <ArrowPathIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Sync Cleaning Projects</h2>
              <p className="text-xs text-gray-500">Find and backfill missed cleanings from your PMS or local bookings</p>
            </div>
          </div>
          {step !== 'apply' && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            {STEP_ORDER.map((s, i) => {
              const isCurrent = s === step
              const isComplete = i < currentStepIndex
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-purple-100 text-purple-700'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-purple-600 text-white'
                          : isComplete
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isComplete ? '✓' : i + 1}
                    </span>
                    {STEP_LABELS[s]}
                  </div>
                  {i < STEP_ORDER.length - 1 && (
                    <div className="flex-1 h-0.5 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: i < currentStepIndex ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'configure' && (
              <motion.div key="configure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ConfigureStep
                  config={config}
                  properties={properties}
                  onChange={setConfig}
                  onNext={handleNextFromConfigure}
                  onCancel={handleClose}
                />
              </motion.div>
            )}
            {step === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PreviewStep
                  loading={previewLoading}
                  error={previewError}
                  candidates={candidates}
                  stats={stats}
                  warnings={warnings}
                  selectedKeys={selectedKeys}
                  onToggleKey={(key) => {
                    setSelectedKeys((prev) => {
                      const next = new Set(prev)
                      if (next.has(key)) next.delete(key)
                      else next.add(key)
                      return next
                    })
                  }}
                  onSelectAllNew={() => {
                    setSelectedKeys(new Set(candidates.filter((c) => c.status === 'new').map((c) => c.key)))
                  }}
                  onSelectNone={() => setSelectedKeys(new Set())}
                  onBack={() => setStep('configure')}
                  onApply={handleApply}
                  onRetry={runPreview}
                />
              </motion.div>
            )}
            {step === 'apply' && (
              <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ApplyStep progress={applyProgress} />
              </motion.div>
            )}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DoneStep
                  results={applyResults}
                  candidates={candidates}
                  onClose={handleClose}
                  onOpenProject={onOpenProject}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}

export default SyncCleaningModal
