'use client'

import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { parseCsvFile } from '@/utils/csvParser'
import { CsvData } from '@/services/types/csvMapping'

interface UploadStepProps {
  onFileProcessed: (data: CsvData, file: File) => void
  onFileRemoved?: () => void
  existingFile?: File | null
}

const UploadStep: React.FC<UploadStepProps> = ({ onFileProcessed, onFileRemoved, existingFile }) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(existingFile || null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const processFile = async (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const csvData = await parseCsvFile(file)

      if (csvData.totalRows === 0) {
        setError('CSV file has no data rows')
        return
      }

      if (csvData.totalRows > 1000) {
        setError('CSV file has too many rows (max 1000)')
        return
      }

      setSelectedFile(file)
      onFileProcessed(csvData, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileRemoved?.()
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>First row must contain column headers</li>
          <li>Supported columns: Listing Name, Listing ID, Address, Province, Property Type, Commission Rate, Postal Code</li>
          <li>Maximum 1000 rows per import</li>
          <li>File size limit: 5MB</li>
        </ul>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!selectedFile ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
        />

        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Processing file...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveFile()
              }}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="cursor-pointer">
            <motion.div
              animate={{ y: dragActive ? -5 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Sample Format */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4" />
          Sample CSV Format
        </h4>
        <div className="overflow-x-auto">
          <table className="text-xs text-gray-600 font-mono">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pr-4 py-1">Listing Name</th>
                <th className="text-left pr-4 py-1">Listing ID</th>
                <th className="text-left pr-4 py-1">Address</th>
                <th className="text-left pr-4 py-1">Province</th>
                <th className="text-left pr-4 py-1">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-4 py-1">Lakeview Cottage</td>
                <td className="pr-4 py-1">HOST-12345</td>
                <td className="pr-4 py-1">123 Lake Shore Dr</td>
                <td className="pr-4 py-1">Ontario</td>
                <td className="pr-4 py-1">STR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UploadStep
