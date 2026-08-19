'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import ImageDropzone, {
  IMAGE_TYPES_WITH_HEIC,
  type ImageDropzoneRejection,
} from '@/components/shared/ImageDropzone'
import { createIssue, uploadIssuePhotos, getIssueTypeOptions } from '@/services/projectIssueService'
import type { IssueType, ProjectIssue } from '@/services/types/projectIssue'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS, ISSUE_TYPE_SELECTED } from './issueTypeUi'

interface ReportIssueModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  cleanerId?: string | null
  onIssueCreated: (issue: ProjectIssue) => void
}

const ISSUE_TYPE_OPTIONS = getIssueTypeOptions()

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  projectId,
  cleanerId,
  onIssueCreated
}) => {
  const [issueType, setIssueType] = useState<IssueType | null>(null)
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'type' | 'details'>('type')

  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIssueType(null)
      setDescription('')
      setSelectedFiles([])
      setStep('type')
      setLoading(false)
    }
  }, [isOpen])

  // File selection, validation, previews and the 5-file cap now live in
  // ImageDropzone. This callback only translates rejections into toasts.
  const handleRejected = useCallback((rejections: ImageDropzoneRejection[]) => {
    for (const { file, reason } of rejections) {
      if (reason === 'type') {
        showNotification(t('invalidFileTypeImage', { name: file.name }), 'error')
      } else if (reason === 'size') {
        showNotification(t('fileTooLargeNamed', { name: file.name }), 'error')
      } else {
        showNotification(t('maxPhotos'), 'error')
      }
    }
  }, [showNotification, t])

  const handleSubmit = async () => {
    if (!issueType) {
      showNotification(t('pleaseSelectIssueType'), 'error')
      return
    }

    if (!description.trim()) {
      showNotification(t('pleaseDescribeIssue'), 'error')
      return
    }

    setLoading(true)

    try {
      // Step 1: Create the issue
      const createRes = await createIssue(projectId, {
        reportedBy: cleanerId || null,
        issueType,
        description: description.trim()
      })

      if (createRes.status !== 'success') {
        showNotification(createRes.message || t('failedToReportIssue'), 'error')
        setLoading(false)
        return
      }

      const newIssue = createRes.data

      // Step 2: Upload photos if any
      if (selectedFiles.length > 0) {
        try {
          const uploadRes = await uploadIssuePhotos(newIssue.id, selectedFiles)
          if (uploadRes.status === 'success') {
            // Use the updated issue with photos
            onIssueCreated(uploadRes.data)
          } else {
            // Issue created but photos failed
            showNotification(t('issueReportedPhotosPartial'), 'info')
            onIssueCreated(newIssue)
          }
        } catch (uploadErr) {
          console.error('Photo upload error:', uploadErr)
          showNotification(t('issueReportedPhotosPartial'), 'info')
          onIssueCreated(newIssue)
        }
      } else {
        onIssueCreated(newIssue)
      }

      showNotification(t('issueReported'), 'success')
      onClose()
    } catch (err) {
      console.error('Error reporting issue:', err)
      showNotification(
        err instanceof Error ? err.message : t('failedToReportIssue'),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const selectedTypeInfo = issueType ? ISSUE_TYPE_OPTIONS.find(t => t.value === issueType) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={!loading}>
      <div className="p-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
            <ExclamationTriangleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('reportIssueTitle')}</h2>
            <p className="text-sm text-gray-500">
              {step === 'type' ? t('selectIssueTypeStep') : t('describeIssueStep')}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'type' ? (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Issue Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {ISSUE_TYPE_OPTIONS.map((type) => {
                  const Icon = ISSUE_TYPE_ICONS[type.value]
                  const isSelected = issueType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setIssueType(type.value)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                        ${isSelected
                          ? ISSUE_TYPE_SELECTED[type.value]
                          : ISSUE_TYPE_COLORS[type.value]
                        }
                      `}
                    >
                      <Icon className="w-8 h-8" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={() => issueType && setStep('details')}
                disabled={!issueType}
                className={`
                  w-full py-3 px-4 rounded-xl font-medium transition-all
                  ${issueType
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {t('continue')}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Selected Type Badge */}
              {selectedTypeInfo && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setStep('type')}
                    className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                      ${ISSUE_TYPE_COLORS[issueType!]}
                      hover:opacity-80 transition-opacity
                    `}
                  >
                    {React.createElement(ISSUE_TYPE_ICONS[issueType!], { className: 'w-4 h-4' })}
                    {selectedTypeInfo.label}
                    <span className="text-xs opacity-60">({t('tapToChange')})</span>
                  </button>
                </div>
              )}

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('description')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('describeIssue')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>

              {/* Photo Upload */}
              <ImageDropzone
                className="mb-6"
                files={selectedFiles}
                onChange={setSelectedFiles}
                maxFiles={5}
                maxSizeBytes={20 * 1024 * 1024}
                accept={IMAGE_TYPES_WITH_HEIC}
                onRejected={handleRejected}
                disabled={loading}
                label={`${t('addPhotos')} (${t('maxPhotos')})`}
                helperText={t('supportedFormats')}
                promptText={t('dragPhotosHere')}
                browseLabel={t('browse')}
                accent="amber"
              />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('back')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                  className={`
                    flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                    ${loading || !description.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('submitting')}
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-5 h-5" />
                      {t('submitIssue')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}

export default ReportIssueModal
