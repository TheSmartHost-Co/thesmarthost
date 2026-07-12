'use client'

import { notifyError } from '@/utils/notify'
import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import { createIssue, uploadIssuePhotos, getIssueTypeOptions } from '@/services/projectIssueService'
import type { IssueType, ProjectIssue } from '@/services/types/projectIssue'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  CloudArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface ReportIssueModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  cleanerId?: string | null
  onIssueCreated: (issue: ProjectIssue) => void
}

const ISSUE_TYPE_OPTIONS = getIssueTypeOptions()

const ISSUE_TYPE_ICONS: Record<IssueType, React.ComponentType<{ className?: string }>> = {
  damage: ExclamationTriangleIcon,
  missing_item: QuestionMarkCircleIcon,
  maintenance: WrenchScrewdriverIcon,
  other: DocumentTextIcon
}

const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  damage: 'border-red-300 bg-red-50 text-red-700 hover:border-red-400',
  missing_item: 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400',
  maintenance: 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400',
  other: 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
}

const ISSUE_TYPE_SELECTED: Record<IssueType, string> = {
  damage: 'ring-2 ring-red-500 border-red-500 bg-red-100',
  missing_item: 'ring-2 ring-amber-500 border-amber-500 bg-amber-100',
  maintenance: 'ring-2 ring-blue-500 border-blue-500 bg-blue-100',
  other: 'ring-2 ring-gray-500 border-gray-500 bg-gray-100'
}

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
  const [isDragOver, setIsDragOver] = useState(false)
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

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files)
    const validFiles: File[] = []

    for (const file of newFiles) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
      if (!allowedTypes.includes(file.type)) {
        showNotification(t('invalidFileTypeImage', { name: file.name }), 'error')
        continue
      }

      // Validate file size (5MB)
      if (file.size > 20 * 1024 * 1024) {
        showNotification(t('fileTooLargeNamed', { name: file.name }), 'error')
        continue
      }

      validFiles.push(file)
    }

    // Max 5 files total
    const totalFiles = [...selectedFiles, ...validFiles]
    setSelectedFiles(totalFiles)
  }, [selectedFiles, showNotification])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

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
      notifyError(err, t('failedToReportIssue'))
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('addPhotos')} ({t('maxPhotos')})
                </label>

                {/* Selected Photos Preview */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative group"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Photo ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drop Zone */}
                {selectedFiles.length < 5 && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                      border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
                      ${isDragOver
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-300 hover:border-gray-400'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {isDragOver ? (
                        <PhotoIcon className="w-10 h-10 text-amber-500" />
                      ) : (
                        <CloudArrowUpIcon className="w-10 h-10 text-gray-400" />
                      )}
                      <p className="text-sm text-gray-600">
                        {t('dragPhotosHere')}{' '}
                        <label className="text-amber-600 font-medium cursor-pointer hover:underline">
                          {t('browse')}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
                            multiple
                            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-400">
                        {t('supportedFormats')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

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
