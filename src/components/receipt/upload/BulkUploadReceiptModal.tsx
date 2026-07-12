'use client'

import { notifyError } from '@/utils/notify'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentArrowUpIcon,
  SparklesIcon,
  HomeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  initBulkBatch,
  uploadReceipt,
  rescanReceipt,
  bulkApplyReceipts,
  checkReceiptDuplicates,
} from '@/services/receiptService'
import { computeFileHash } from '@/utils/fileHash'
import { isBackendError } from '@/services/backendError'
import { getProperties } from '@/services/propertyService'
import { usePermissions } from '@/hooks/usePermissions'
import type {
  BulkBatchSource,
  BulkApplyAssignment,
  ScanReceiptOcrData,
  UploadReceiptResponse,
  DuplicateExistingReceipt,
} from '@/services/types/receipt'
import type { Property } from '@/services/types/property'
import SelectFilesStep from './steps/SelectFilesStep'
import ScanStep from './steps/ScanStep'
import AssignReceiptsStep from './steps/AssignReceiptsStep'
import ReviewApplyStep from './steps/ReviewApplyStep'

export type BulkRowStatus =
  | 'queued'
  | 'scanning'
  | 'scanned'
  | 'failed'
  | 'applying'
  | 'applied'
  | 'apply-failed'
  | 'skipped'
  | 'duplicate'

export interface BulkRowDuplicateOf {
  id?: string                  // Existing receipt ID (only for source='db')
  originalName: string         // Filename of the duplicate-of receipt
  createdAt?: string           // When the duplicate-of receipt was uploaded (only for source='db')
  vendorName?: string | null   // OCR'd vendor on the existing receipt — what the user actually recognizes (only for source='db')
  source: 'db' | 'in-batch'    // 'db' = matches an existing receipt; 'in-batch' = matches another file in this same drag-drop batch
}

export interface BulkRowState {
  id: string
  file: File
  /** Local blob URL for preview/thumbnail. Revoked when the modal closes. */
  previewUrl?: string
  status: BulkRowStatus
  receiptId?: string
  /** SHA-256 hash of the file contents — set during handleFilesSelected for the dedup pre-flight. */
  contentHash?: string
  /**
   * When status='duplicate', describes which existing receipt this file duplicates.
   * When the user clicks "Upload anyway", this is preserved on the row so the UI can
   * still surface why it was originally flagged.
   */
  duplicateOf?: BulkRowDuplicateOf
  /** When true, the next upload of this row bypasses backend dedup (forceUpload=true). Set by "Upload anyway". */
  forceUpload?: boolean
  extracted?: {
    vendorName?: string | null
    expenseDate?: string | null
    subtotal?: number | null
    taxGst?: number | null
    taxPst?: number | null
    taxHst?: number | null
    taxTotal?: number | null
    total?: number | null
  }
  propertyId?: string
  expenseMonth?: string
  applyAsExpense: boolean
  errorMessage?: string
  expenseId?: string
}

type Step = 'select' | 'scan' | 'assign' | 'review'

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'select', label: 'Select Files', icon: DocumentArrowUpIcon },
  { key: 'scan', label: 'AI Scan', icon: SparklesIcon },
  { key: 'assign', label: 'Assign', icon: HomeIcon },
  { key: 'review', label: 'Review & Apply', icon: CheckCircleIcon },
]

const MAX_FILES = 50
const OCR_CONCURRENCY = 6

interface BulkUploadReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (summary: { applied: number; failed: number; skipped: number }) => void
  source?: BulkBatchSource
}

/**
 * Run async tasks across `items` with at most `limit` in flight at once.
 * Resolves only after every task settles. Per-task errors are captured by the
 * task fn itself (writing into row state); we never throw out of here.
 */
async function pool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      try {
        await fn(items[i], i)
      } catch {
        // Per-task error is the task fn's responsibility (it writes row state).
      }
    }
  })
  await Promise.all(workers)
}

/** Try to extract a numeric value from a possibly-{value,confidence} OCR field. */
function ocrNum(field: unknown): number | null {
  if (field == null) return null
  if (typeof field === 'number') return field
  if (typeof field === 'object' && field !== null && 'value' in field) {
    const v = (field as { value: unknown }).value
    return typeof v === 'number' ? v : null
  }
  return null
}

function ocrStr(field: unknown): string | null {
  if (field == null) return null
  if (typeof field === 'string') return field
  if (typeof field === 'object' && field !== null && 'value' in field) {
    const v = (field as { value: unknown }).value
    return typeof v === 'string' ? v : null
  }
  return null
}

function defaultMonthFromDate(dateStr: string | null | undefined): string {
  if (dateStr && /^\d{4}-\d{2}/.test(dateStr)) return dateStr.slice(0, 7)
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const BulkUploadReceiptModal: React.FC<BulkUploadReceiptModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  source = 'bulk_upload',
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)
  const { effectiveUserId } = usePermissions()

  const [step, setStep] = useState<Step>('select')
  const [rows, setRows] = useState<BulkRowState[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [scanRunning, setScanRunning] = useState(false)
  const [applying, setApplying] = useState(false)

  // Reset when modal closes — also revoke any blob URLs we created for previews
  useEffect(() => {
    if (!isOpen) {
      setRows((prev) => {
        prev.forEach((r) => {
          if (r.previewUrl) URL.revokeObjectURL(r.previewUrl)
        })
        return []
      })
      setStep('select')
      setBatchId(null)
      setScanRunning(false)
      setApplying(false)
    }
  }, [isOpen])

  // Revoke any in-memory blob URLs when the modal unmounts entirely
  useEffect(() => {
    return () => {
      setRows((prev) => {
        prev.forEach((r) => {
          if (r.previewUrl) URL.revokeObjectURL(r.previewUrl)
        })
        return prev
      })
    }
  }, [])

  // Fetch properties on open
  useEffect(() => {
    if (!isOpen || !effectiveUserId) return
    let cancelled = false
    setPropertiesLoading(true)
    getProperties(effectiveUserId)
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success' && Array.isArray(res.data)) {
          setProperties(res.data.filter((p) => p.isActive))
        } else {
          showNotification(res.message || 'Failed to load properties', 'error')
        }
      })
      .catch(() => {
        if (!cancelled) showNotification('Failed to load properties', 'error')
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, effectiveUserId, showNotification])

  const updateRow = useCallback((id: string, patch: Partial<BulkRowState>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const capped = files.slice(0, MAX_FILES)
      if (files.length > MAX_FILES) {
        showNotification(
          `Selected ${files.length} files; only the first ${MAX_FILES} will be uploaded`,
          'info'
        )
      }
      const initialRows: BulkRowState[] = capped.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued',
        applyAsExpense: true,
      }))
      // Show the rows immediately so the user gets responsive feedback;
      // the duplicate badges populate in a follow-up state update.
      setRows(initialRows)

      // Hash all files in parallel — Web Crypto is fast, even for 10MB images.
      let hashes: string[]
      try {
        hashes = await Promise.all(initialRows.map((r) => computeFileHash(r.file)))
      } catch (err) {
        // If hashing itself fails, fall through with no dedup. The server-side
        // ON CONFLICT is the correctness backstop; we just lose the cost saving.
        console.warn('Failed to compute file hashes for dedup:', err)
        return
      }

      // 1. In-batch dedup pass — first occurrence of each hash is kept; later
      // occurrences are flagged as duplicates of the earlier file in the batch.
      // Doing this client-side avoids a race where two in-batch dupes both
      // pass the DB pre-flight (the file isn't in the DB *yet*) and then race
      // for the INSERT, surfacing the loser as a generic 409.
      const seen = new Map<string, { id: string; originalName: string }>()
      const inBatchDupes = new Map<string, BulkRowDuplicateOf>()
      const survivingHashes: string[] = []
      initialRows.forEach((row, i) => {
        const hash = hashes[i]
        const earlier = seen.get(hash)
        if (earlier) {
          inBatchDupes.set(row.id, {
            originalName: earlier.originalName,
            source: 'in-batch',
          })
        } else {
          seen.set(hash, { id: row.id, originalName: row.file.name })
          survivingHashes.push(hash)
        }
      })

      // 2. Bulk DB check for survivors. Fail-open if the endpoint errors —
      // a failed dedup check should never block uploads; the server-side
      // ON CONFLICT will catch any duplicates that slip through.
      let dbDupes = new Map<string, DuplicateExistingReceipt>()
      try {
        const res = await checkReceiptDuplicates(survivingHashes)
        if (res.status === 'success') {
          for (const d of res.data.duplicates) {
            dbDupes.set(d.hash, d.existingReceipt)
          }
        }
      } catch (err) {
        console.warn('Duplicate check failed — proceeding with upload, server-side will catch dupes:', err)
        showNotification(
          'Could not pre-check for duplicates; uploads will proceed normally.',
          'info'
        )
        dbDupes = new Map()
      }

      // 3. Apply hash + dedup state to each row in one setRows call.
      setRows((prev) =>
        prev.map((row, i) => {
          const hash = hashes[i]
          if (!hash) return row
          const inBatch = inBatchDupes.get(row.id)
          if (inBatch) {
            return { ...row, contentHash: hash, status: 'duplicate', duplicateOf: inBatch }
          }
          const dbMatch = dbDupes.get(hash)
          if (dbMatch) {
            return {
              ...row,
              contentHash: hash,
              status: 'duplicate',
              duplicateOf: {
                id: dbMatch.id,
                originalName: dbMatch.originalName,
                createdAt: dbMatch.createdAt,
                vendorName: dbMatch.vendorName,
                source: 'db',
              },
            }
          }
          return { ...row, contentHash: hash }
        })
      )
    },
    [showNotification]
  )

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const target = prev.find((r) => r.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  // Run a single OCR upload for one row.
  const runUploadForRow = useCallback(
    async (row: BulkRowState, currentBatchId: string | null) => {
      updateRow(row.id, { status: 'scanning', errorMessage: undefined })
      try {
        const res = (await uploadReceipt(
          row.file,
          undefined,
          undefined,
          undefined,
          currentBatchId || undefined,
          row.forceUpload
        )) as UploadReceiptResponse
        if (res.status !== 'success' || !res.data) {
          updateRow(row.id, {
            status: 'failed',
            errorMessage: res.message || 'OCR failed',
          })
          return
        }
        const receipt = res.data.receipt
        const ocr = receipt.ocrRaw as ScanReceiptOcrData | null
        const extracted = {
          vendorName: receipt.vendorName ?? ocrStr(ocr?.vendorName),
          expenseDate: receipt.expenseDate ?? ocrStr(ocr?.expenseDate),
          subtotal: receipt.subtotal ?? ocrNum(ocr?.subtotal),
          taxGst: receipt.taxGst ?? ocrNum(ocr?.taxGst),
          taxPst: receipt.taxPst ?? ocrNum(ocr?.taxPst),
          taxHst: receipt.taxHst ?? ocrNum(ocr?.taxHst),
          taxTotal: receipt.taxTotal ?? ocrNum(ocr?.taxTotal),
          total: receipt.total ?? ocrNum(ocr?.total),
        }
        updateRow(row.id, {
          status: 'scanned',
          receiptId: receipt.id,
          extracted,
          expenseMonth: defaultMonthFromDate(extracted.expenseDate),
        })
      } catch (err) {
        // Server-side ON CONFLICT can return 409 if a race slipped past the
        // pre-flight check (or if check-duplicates failed open). Map it to
        // the same `'duplicate'` row state the pre-flight uses, so the user
        // sees a consistent UI regardless of which layer caught the dup.
        if (isBackendError(err) && err.status === 409 && err.body) {
          const code = (err.body as { code?: unknown }).code
          if (code === 'RECEIPT_DUPLICATE') {
            const existing = (err.body as { data?: { existingReceipt?: DuplicateExistingReceipt } }).data
              ?.existingReceipt
            updateRow(row.id, {
              status: 'duplicate',
              duplicateOf: existing
                ? {
                    id: existing.id,
                    originalName: existing.originalName,
                    createdAt: existing.createdAt,
                    vendorName: existing.vendorName,
                    source: 'db',
                  }
                : { originalName: row.file.name, source: 'db' },
            })
            return
          }
        }
        updateRow(row.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Network error',
        })
      }
    },
    [updateRow]
  )

  // Kick off the OCR fan-out when we enter the scan step.
  const startScan = useCallback(async () => {
    if (scanRunning || rows.length === 0) return
    setScanRunning(true)

    let currentBatchId = batchId
    try {
      if (!currentBatchId) {
        const initRes = await initBulkBatch({ source, expectedCount: rows.length })
        if (initRes.status !== 'success' || !initRes.data?.batchId) {
          showNotification(initRes.message || 'Failed to initialize batch', 'error')
          setScanRunning(false)
          return
        }
        currentBatchId = initRes.data.batchId
        setBatchId(currentBatchId)
      }
    } catch {
      showNotification('Failed to initialize batch', 'error')
      setScanRunning(false)
      return
    }

    // Snapshot the rows that need scanning at this moment. Subsequent state
    // updates by `runUploadForRow` won't reshuffle the in-flight tasks.
    // Duplicates are excluded — they'll only re-enter the pool if the user
    // explicitly clicks "Upload anyway" (which sets forceUpload=true).
    const targets = rows.filter((r) => r.status === 'queued' || r.status === 'failed')
    await pool(targets, OCR_CONCURRENCY, (row) => runUploadForRow(row, currentBatchId))

    setScanRunning(false)
  }, [batchId, rows, runUploadForRow, scanRunning, showNotification, source])

  // "Upload anyway" override — re-queue a duplicate row with forceUpload=true so
  // the next upload bypasses backend dedup. The backend stores content_hash=NULL
  // for the resulting row; future re-uploads still match against the original.
  const handleUploadAnyway = useCallback(
    async (row: BulkRowState) => {
      // Mark the row as queued + forced; reset its scan state so the pool can pick it up.
      updateRow(row.id, {
        status: 'queued',
        forceUpload: true,
        errorMessage: undefined,
      })
      // Kick off a single upload immediately rather than waiting for the user
      // to navigate steps. A batch is required for the upload — re-use the
      // existing one or open a new one if the user is still on the scan step.
      let currentBatchId = batchId
      if (!currentBatchId) {
        try {
          const initRes = await initBulkBatch({ source, expectedCount: rows.length })
          if (initRes.status === 'success' && initRes.data?.batchId) {
            currentBatchId = initRes.data.batchId
            setBatchId(currentBatchId)
          }
        } catch {
          // Fall through — runUploadForRow will surface the error
        }
      }
      // The forceUpload flag must be on the row when the service call runs;
      // updateRow's batched setRows means we re-derive the row here.
      await runUploadForRow({ ...row, forceUpload: true }, currentBatchId)
    },
    [batchId, rows.length, runUploadForRow, source, updateRow]
  )

  // Retry one specific row (rescan if uploaded, else re-upload).
  const retryRow = useCallback(
    async (row: BulkRowState) => {
      if (row.status === 'scanning' || row.status === 'applying') return
      updateRow(row.id, { status: 'scanning', errorMessage: undefined })
      try {
        if (row.receiptId) {
          const res = await rescanReceipt(row.receiptId)
          if (res.status === 'success' && res.data?.receipt) {
            const receipt = res.data.receipt
            const ocr = receipt.ocrRaw as ScanReceiptOcrData | null
            const extracted = {
              vendorName: receipt.vendorName ?? ocrStr(ocr?.vendorName),
              expenseDate: receipt.expenseDate ?? ocrStr(ocr?.expenseDate),
              subtotal: receipt.subtotal ?? ocrNum(ocr?.subtotal),
              taxGst: receipt.taxGst ?? ocrNum(ocr?.taxGst),
              taxPst: receipt.taxPst ?? ocrNum(ocr?.taxPst),
              taxHst: receipt.taxHst ?? ocrNum(ocr?.taxHst),
              taxTotal: receipt.taxTotal ?? ocrNum(ocr?.taxTotal),
              total: receipt.total ?? ocrNum(ocr?.total),
            }
            updateRow(row.id, {
              status: 'scanned',
              extracted,
              expenseMonth: row.expenseMonth || defaultMonthFromDate(extracted.expenseDate),
            })
            return
          }
          updateRow(row.id, {
            status: 'failed',
            errorMessage: res.message || 'Rescan failed',
          })
        } else {
          await runUploadForRow(row, batchId)
        }
      } catch (err) {
        updateRow(row.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Network error',
        })
      }
    },
    [batchId, runUploadForRow, updateRow]
  )

  // Bulk-assign (top bar in step 3) — apply property/month to every non-skipped scanned row.
  // Duplicates that haven't been overridden have no receiptId yet, so the apply
  // step would skip them anyway — excluding here keeps the UI consistent.
  const bulkAssign = useCallback(
    (patch: { propertyId?: string; expenseMonth?: string }) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.status === 'skipped' || r.status === 'failed' || r.status === 'duplicate') return r
          return {
            ...r,
            ...(patch.propertyId !== undefined ? { propertyId: patch.propertyId } : {}),
            ...(patch.expenseMonth !== undefined ? { expenseMonth: patch.expenseMonth } : {}),
          }
        })
      )
    },
    []
  )

  // Step 4 — apply
  const handleApply = useCallback(async () => {
    if (applying) return
    const toApply = rows.filter(
      (r) => r.status === 'scanned' && r.applyAsExpense && r.receiptId
    )
    if (toApply.length === 0) {
      showNotification('No receipts selected to apply', 'error')
      return
    }
    setApplying(true)
    toApply.forEach((r) => updateRow(r.id, { status: 'applying' }))

    const assignments: Record<string, BulkApplyAssignment> = {}
    for (const r of toApply) {
      if (!r.propertyId || !r.expenseMonth) continue
      const expenseDate =
        r.extracted?.expenseDate &&
        r.extracted.expenseDate.startsWith(r.expenseMonth)
          ? r.extracted.expenseDate
          : `${r.expenseMonth}-01`
      assignments[r.receiptId!] = {
        propertyId: r.propertyId,
        expenseDate,
        vendorName: r.extracted?.vendorName ?? undefined,
        subtotal: r.extracted?.subtotal ?? undefined,
        taxGst: r.extracted?.taxGst ?? undefined,
        taxPst: r.extracted?.taxPst ?? undefined,
        taxHst: r.extracted?.taxHst ?? undefined,
        taxTotal: r.extracted?.taxTotal ?? undefined,
        supplyList: { mode: 'none' },
      }
    }

    try {
      const res = await bulkApplyReceipts({
        receiptIds: toApply.map((r) => r.receiptId!),
        assignments,
      })
      if (res.status !== 'success' || !res.data) {
        showNotification(res.message || 'Bulk apply failed', 'error')
        toApply.forEach((r) =>
          updateRow(r.id, {
            status: 'apply-failed',
            errorMessage: res.message || 'Bulk apply failed',
          })
        )
        setApplying(false)
        return
      }

      const appliedSet = new Map(res.data.applied.map((a) => [a.receiptId, a.expenseId]))
      const failedSet = new Map(res.data.failed.map((f) => [f.receiptId, f.error]))

      for (const r of toApply) {
        if (appliedSet.has(r.receiptId!)) {
          updateRow(r.id, { status: 'applied', expenseId: appliedSet.get(r.receiptId!) })
        } else if (failedSet.has(r.receiptId!)) {
          updateRow(r.id, {
            status: 'apply-failed',
            errorMessage: failedSet.get(r.receiptId!),
          })
        } else {
          updateRow(r.id, { status: 'apply-failed', errorMessage: 'Unknown error' })
        }
      }

      const summary = res.data.summary
      const skippedCount = rows.filter((r) => !r.applyAsExpense || r.status === 'skipped').length
      const duplicateCount = rows.filter((r) => r.status === 'duplicate').length
      const parts = [
        `${summary.applied} applied`,
        `${summary.failed} failed`,
        ...(skippedCount ? [`${skippedCount} skipped`] : []),
        ...(duplicateCount ? [`${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped`] : []),
      ]
      showNotification(
        parts.join(', '),
        summary.failed === 0 ? 'success' : 'info'
      )
      onComplete({
        applied: summary.applied,
        failed: summary.failed,
        skipped: skippedCount + duplicateCount,
      })
    } catch (err) {
      notifyError(err, 'Network error during bulk apply')
      toApply.forEach((r) => updateRow(r.id, { status: 'apply-failed' }))
    } finally {
      setApplying(false)
    }
  }, [applying, rows, showNotification, updateRow, onComplete])

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  const canGoNext = useMemo(() => {
    if (step === 'select') return rows.length > 0
    if (step === 'scan') {
      if (scanRunning) return false
      // Allow advancing once at least one row is scanned (failed rows skip).
      return rows.some((r) => r.status === 'scanned')
    }
    if (step === 'assign') {
      const active = rows.filter(
        (r) => r.status === 'scanned' && r.applyAsExpense
      )
      return active.length > 0 && active.every((r) => r.propertyId && r.expenseMonth)
    }
    return false
  }, [step, rows, scanRunning])

  const goNext = () => {
    const i = stepIndex
    if (i < STEPS.length - 1) {
      const next = STEPS[i + 1].key
      setStep(next)
      if (next === 'scan') void startScan()
    }
  }

  const goBack = () => {
    if (stepIndex === 0) return
    // Leaving Review backwards: reset apply-failed rows so the user can fix
    // assignments and retry. canGoNext + handleApply both filter on 'scanned'.
    if (step === 'review') {
      setRows((prev) =>
        prev.map((r) =>
          r.status === 'apply-failed'
            ? { ...r, status: 'scanned' as const, errorMessage: undefined }
            : r
        )
      )
    }
    setStep(STEPS[stepIndex - 1].key)
  }

  const handleClose = () => {
    if (scanRunning || applying) {
      const ok = window.confirm(
        'Receipts are still uploading. Cancel will stop further uploads. Already-uploaded receipts are saved to your receipts list.'
      )
      if (!ok) return
    }
    onClose()
  }

  // Counts for footer
  const scannedCount = rows.filter((r) => r.status === 'scanned').length
  const failedCount = rows.filter((r) => r.status === 'failed').length
  const appliedCount = rows.filter((r) => r.status === 'applied').length

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      style="w-full max-w-5xl max-h-[90vh]"
      closable={!scanRunning && !applying}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Bulk Upload Receipts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Drop multiple receipts at once. AI extracts vendor, date, and totals automatically.
          </p>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isActive = s.key === step
              const isComplete = stepIndex > i
              const Icon = s.icon
              return (
                <React.Fragment key={s.key}>
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : isComplete
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`ml-3 text-sm font-medium hidden sm:block ${
                        isActive
                          ? 'text-purple-600'
                          : isComplete
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        isComplete ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <SelectFilesStep
              rows={rows}
              maxFiles={MAX_FILES}
              onFilesSelected={handleFilesSelected}
              onRemoveRow={removeRow}
            />
          )}
          {step === 'scan' && (
            <ScanStep
              rows={rows}
              scanRunning={scanRunning}
              scannedCount={scannedCount}
              failedCount={failedCount}
              onRetry={retryRow}
              onSkip={(id) => updateRow(id, { status: 'skipped' })}
              onUploadAnyway={handleUploadAnyway}
            />
          )}
          {step === 'assign' && (
            <AssignReceiptsStep
              rows={rows}
              properties={properties}
              propertiesLoading={propertiesLoading}
              onUpdateRow={updateRow}
              onBulkAssign={bulkAssign}
            />
          )}
          {step === 'review' && (
            <ReviewApplyStep
              rows={rows}
              properties={properties}
              applying={applying}
              appliedCount={appliedCount}
              onRetryRow={(row) => {
                // Re-apply just this row by calling bulk-apply with one id.
                void (async () => {
                  if (!row.receiptId || !row.propertyId || !row.expenseMonth) return
                  updateRow(row.id, { status: 'applying', errorMessage: undefined })
                  const expenseDate =
                    row.extracted?.expenseDate &&
                    row.extracted.expenseDate.startsWith(row.expenseMonth)
                      ? row.extracted.expenseDate
                      : `${row.expenseMonth}-01`
                  try {
                    const res = await bulkApplyReceipts({
                      receiptIds: [row.receiptId],
                      assignments: {
                        [row.receiptId]: {
                          propertyId: row.propertyId,
                          expenseDate,
                          vendorName: row.extracted?.vendorName ?? undefined,
                          subtotal: row.extracted?.subtotal ?? undefined,
                          taxGst: row.extracted?.taxGst ?? undefined,
                          taxPst: row.extracted?.taxPst ?? undefined,
                          taxHst: row.extracted?.taxHst ?? undefined,
                          taxTotal: row.extracted?.taxTotal ?? undefined,
                          supplyList: { mode: 'none' },
                        },
                      },
                    })
                    if (res.status === 'success' && res.data?.applied?.length) {
                      updateRow(row.id, {
                        status: 'applied',
                        expenseId: res.data.applied[0].expenseId,
                      })
                    } else {
                      updateRow(row.id, {
                        status: 'apply-failed',
                        errorMessage:
                          res.data?.failed?.[0]?.error || res.message || 'Apply failed',
                      })
                    }
                  } catch (err) {
                    updateRow(row.id, {
                      status: 'apply-failed',
                      errorMessage: err instanceof Error ? err.message : 'Network error',
                    })
                  }
                })()
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {stepIndex > 0 &&
                (step !== 'review' || (!applying && appliedCount === 0)) && (
                  <motion.button
                    type="button"
                    onClick={goBack}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back
                  </motion.button>
                )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {step === 'review' && appliedCount > 0 ? 'Close' : 'Cancel'}
              </button>
              {step === 'review' ? (
                <motion.button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || rows.every((r) => r.status === 'applied')}
                  whileHover={{ scale: applying ? 1 : 1.02 }}
                  whileTap={{ scale: applying ? 1 : 0.98 }}
                  className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                    applying || rows.every((r) => r.status === 'applied')
                      ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                      : 'text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25'
                  }`}
                >
                  {applying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Applying…
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Apply {rows.filter((r) => r.status === 'scanned' && r.applyAsExpense).length}{' '}
                      Receipts
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  whileHover={{ scale: canGoNext ? 1.02 : 1 }}
                  whileTap={{ scale: canGoNext ? 0.98 : 1 }}
                  className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                    canGoNext
                      ? 'text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default BulkUploadReceiptModal
