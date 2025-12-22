'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { Property } from '@/services/types/property'

interface UploadStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  onFileUploaded?: (file: any) => void
  uploadedFile?: any
  selectedProperty?: Property | null
  onPropertySelected?: (property: Property) => void
}

const platformLogos = [
  { name: 'Hostaway', color: 'from-blue-500 to-blue-600' },
  { name: 'Airbnb', color: 'from-rose-500 to-rose-600' },
  { name: 'VRBO', color: 'from-indigo-500 to-indigo-600' },
  { name: 'Booking.com', color: 'from-blue-600 to-blue-700' },
]

const UploadStep: React.FC<UploadStepProps> = ({
  onNext,
  onCancel,
  canGoNext,
  config,
  onFileUploaded,
  uploadedFile,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file type - CSV only for reliability
    const allowedTypes = ['.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(fileExtension)) {
      alert('Please upload a CSV file. If you have an Excel file, please save it as CSV first.')
      return
    }

    // Validate file size (10MB limit)
    const maxSize = config?.maxFileSize || 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size too large. Please upload a file smaller than 10MB.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    // Simulate upload delay
    setTimeout(() => {
      clearInterval(progressInterval)
      setUploadProgress(100)
      setIsUploading(false)
      if (onFileUploaded) {
        const uploadedFile = {
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          detectedFormat: 'CSV' as const,
          uploadedAt: new Date()
        }
        onFileUploaded(uploadedFile)
      }
    }, 1500)
  }

  const handleRemoveFile = () => {
    if (onFileUploaded) {
      onFileUploaded(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-5 shadow-lg shadow-blue-500/25"
        >
          <CloudArrowUpIcon className="w-8 h-8" />
        </motion.div>
        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Upload Your Booking Data
        </motion.h2>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 max-w-lg mx-auto"
        >
          Export your bookings from your PMS as a CSV file and upload it here.
          We&apos;ll help you map the columns to the right fields.
        </motion.p>
      </div>

      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div
            key="upload-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
          >
            {/* File Upload Area */}
            <div
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
                ${isDragging
                  ? 'border-blue-400 bg-blue-50/50 scale-[1.02]'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
                }
                ${isUploading ? 'pointer-events-none' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileSelect}
              />

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] rounded-2xl overflow-hidden pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="upload-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="currentColor" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#upload-grid)" />
                </svg>
              </div>

              <AnimatePresence mode="wait">
                {isUploading ? (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Progress Ring */}
                    <div className="relative w-20 h-20 mx-auto">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-gray-200"
                        />
                        <motion.circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-blue-500"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: "0 226" }}
                          animate={{ strokeDasharray: `${uploadProgress * 2.26} 226` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-700">{uploadProgress}%</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Processing file...</h3>
                      <p className="text-gray-500 text-sm mt-1">Please wait while we analyze your data</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5 relative"
                  >
                    <motion.div
                      animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                      className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center"
                    >
                      <CloudArrowUpIcon className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {isDragging ? 'Drop your file here' : 'Drop your CSV file here'}
                      </h3>
                      <p className="text-gray-500 mt-1">
                        or <span className="text-blue-600 font-medium hover:text-blue-700">browse from your computer</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                      <DocumentIcon className="w-4 h-4" />
                      <span>CSV files up to 10MB</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Help Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {/* Excel Conversion Help */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <InformationCircleIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-2">Have an Excel file?</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Convert it to CSV for best results:
                    </p>
                    <ol className="text-sm text-amber-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
                        Open in Excel
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
                        File → Save As
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center">3</span>
                        Select &quot;CSV (Comma delimited)&quot;
                      </li>
                    </ol>
                  </div>
                </div>
              </motion.div>

              {/* Supported Platforms */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100 rounded-xl p-5"
              >
                <h4 className="font-semibold text-gray-900 mb-4">Supported Platforms</h4>
                <div className="grid grid-cols-2 gap-2">
                  {platformLogos.map((platform, index) => (
                    <motion.div
                      key={platform.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 shadow-sm"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${platform.color}`} />
                      <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          /* File Uploaded Successfully */
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-start gap-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                >
                  <CheckIcon className="w-7 h-7 text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-emerald-900">File uploaded successfully</h3>
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg border border-emerald-100">
                      <DocumentIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800 truncate max-w-[200px]">
                        {uploadedFile.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                      {formatFileSize(uploadedFile.size)}
                    </span>
                    <span className="text-sm font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                      CSV
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFile()
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ready to continue message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-50 border border-blue-100 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ArrowRightIcon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">Ready to continue!</span> Click the button below to identify properties in your file.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-between items-center pt-8 mt-8 border-t border-gray-100"
      >
        <motion.button
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
        >
          Cancel
        </motion.button>

        <motion.button
          onClick={onNext}
          disabled={!canGoNext || !uploadedFile}
          whileHover={canGoNext && uploadedFile ? { scale: 1.02 } : {}}
          whileTap={canGoNext && uploadedFile ? { scale: 0.98 } : {}}
          className={`
            inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all
            ${canGoNext && uploadedFile
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Property Identification
          <ArrowRightIcon className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  )
}

export default UploadStep
