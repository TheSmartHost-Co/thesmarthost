'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type { SyncCandidate } from '@/services/types/cleaningProject'

interface OverrideConfirmModalProps {
  isOpen: boolean
  candidate: SyncCandidate | null
  createBookings: boolean
  onConfirm: (key: string) => void
  onCancel: () => void
}

// Statuses where work has been done — extra safety: require explicit acknowledgment.
const DANGEROUS_STATUSES = new Set(['in_progress', 'completed'])

const OverrideConfirmModal: React.FC<OverrideConfirmModalProps> = ({
  isOpen,
  candidate,
  createBookings,
  onConfirm,
  onCancel,
}) => {
  const [mounted, setMounted] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => setMounted(true), [])

  // Reset acknowledgement when modal opens for a new candidate.
  useEffect(() => {
    if (isOpen) setAcknowledged(false)
  }, [isOpen, candidate?.key])

  const isDangerous = useMemo(
    () => !!candidate?.existingProjectStatus && DANGEROUS_STATUSES.has(candidate.existingProjectStatus),
    [candidate?.existingProjectStatus]
  )

  if (!isOpen || !mounted || !candidate) return null

  const willCancelBooking = createBookings && !!candidate.existingBookingId
  const canConfirm = !isDangerous || acknowledged

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(candidate.key)
  }

  const modal = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDangerous ? 'bg-red-100' : 'bg-amber-100'
                }`}
              >
                {isDangerous ? (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                ) : (
                  <ArrowPathIcon className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {isDangerous ? 'Override active cleaning project?' : 'Override duplicate?'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {candidate.propertyName || 'Property'} · {candidate.projectDate}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-gray-700">
              The existing cleaning project will be <strong>permanently deleted</strong>, and a
              fresh one will be created from the PMS data.
              {willCancelBooking && (
                <>
                  {' '}The linked <strong>booking will also be deleted</strong>, and a new one
                  will be created with fresh financial data.
                </>
              )}
              {!createBookings && candidate.existingBookingId && (
                <>
                  {' '}The linked booking will stay as-is.
                </>
              )}
            </p>

            {/* Existing project facts */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Existing status</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    isDangerous
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {candidate.existingProjectStatus || 'unknown'}
                </span>
              </div>
              {candidate.existingCleanerName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Assigned cleaner</span>
                  <span className="font-medium text-gray-800">{candidate.existingCleanerName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Linked booking</span>
                <span className="font-medium text-gray-800">
                  {candidate.existingBookingId ? 'yes' : 'none'}
                </span>
              </div>
            </div>

            {/* Danger warning + acknowledgment */}
            {isDangerous && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 space-y-2">
                <p className="text-xs text-red-700">
                  <strong>Warning:</strong> this project is{' '}
                  <strong>{candidate.existingProjectStatus}</strong>. Deleting will permanently
                  discard the cleaner&apos;s checklist progress, photos, and time entries.
                  This can&apos;t be undone.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs text-red-700">
                    I understand this destroys cleaner work that&apos;s already been logged.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors ${
                isDangerous
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
            >
              {isDangerous ? 'Override anyway' : 'Override'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}

export default OverrideConfirmModal
