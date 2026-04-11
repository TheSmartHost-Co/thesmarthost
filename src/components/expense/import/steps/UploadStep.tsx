'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { parseCsvFile, parseCsvText } from '@/utils/csvParser'
import { CsvData } from '@/services/types/csvMapping'

type InputMode = 'file' | 'paste'

interface UploadStepProps {
  onFileProcessed: (data: CsvData, file: File) => void
  onFileRemoved?: () => void
  existingFile?: File | null
}

const UploadStep: React.FC<UploadStepProps> = ({ onFileProcessed, onFileRemoved, existingFile }) => {
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(existingFile || null)
  const [pastedText, setPastedText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedPreview, setParsedPreview] = useState<CsvData | null>(null)
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
        setParsedPreview(null)
        return
      }

      if (csvData.totalRows > 1000) {
        setError('CSV file has too many rows (max 1000)')
        setParsedPreview(null)
        return
      }

      setSelectedFile(file)
      setParsedPreview(csvData)
      onFileProcessed(csvData, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
      setParsedPreview(null)
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
    setParsedPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileRemoved?.()
  }

  const handleModeSwitch = (newMode: InputMode) => {
    if (newMode === inputMode) return

    // Clear all state when switching modes
    setInputMode(newMode)
    setSelectedFile(null)
    setPastedText('')
    setError(null)
    setParsedPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileRemoved?.()
  }

  const processPastedText = (text: string) => {
    if (!text.trim()) {
      setSelectedFile(null)
      setError(null)
      setParsedPreview(null)
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const csvData = parseCsvText(text)

      if (csvData.totalRows === 0) {
        setError('Pasted text has no data rows')
        setSelectedFile(null)
        setParsedPreview(null)
        return
      }

      if (csvData.totalRows > 1000) {
        setError('Pasted text has too many rows (max 1000)')
        setSelectedFile(null)
        setParsedPreview(null)
        return
      }

      // Create a synthetic File object for compatibility with parent modal
      const syntheticFile = new File([text], 'pasted-data.csv', { type: 'text/csv' })
      setSelectedFile(syntheticFile)
      setParsedPreview(csvData)
      onFileProcessed(csvData, syntheticFile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV text')
      setSelectedFile(null)
      setParsedPreview(null)
    } finally {
      setProcessing(false)
    }
  }

  // Auto-parse pasted text with debounce
  useEffect(() => {
    if (inputMode !== 'paste') return

    const timeoutId = setTimeout(() => {
      processPastedText(pastedText)
    }, 300)

    return () => clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastedText, inputMode])

  const handleClearPastedText = () => {
    setPastedText('')
    setSelectedFile(null)
    setError(null)
    setParsedPreview(null)
    onFileRemoved?.()
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => handleModeSwitch('file')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            inputMode === 'file'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DocumentArrowUpIcon className="h-4 w-4" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('paste')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            inputMode === 'paste'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
          Paste Text
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>First row must contain column headers</li>
          <li>Required columns: Date, Amount</li>
          <li>Optional columns: Category, Vendor, Description, Property, Currency, Payment Status, etc.</li>
          <li>Maximum 1000 rows per import</li>
          {inputMode === 'file' && <li>File size limit: 5MB</li>}
        </ul>
      </div>

      {/* File Upload Drop Zone */}
      {inputMode === 'file' && (
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
      )}

      {/* Paste Text Area */}
      {inputMode === 'paste' && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Paste your CSV data here. Example:\n\nDate,Amount,Category,Vendor,Description\n2026-01-15,125.50,cleaning,CleanCo,Weekly cleaning\n2026-01-18,45.00,supplies,Home Depot,Light bulbs`}
              className={`w-full h-48 p-4 text-sm font-mono border-2 rounded-xl resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                selectedFile && !error
                  ? 'border-green-300 bg-green-50'
                  : error
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            />
            {pastedText && (
              <button
                type="button"
                onClick={handleClearPastedText}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Processing/Success indicator */}
          {processing ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : selectedFile && !error ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircleIcon className="h-4 w-4" />
              CSV parsed successfully
            </div>
          ) : null}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Parsed Data Preview */}
      {parsedPreview && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              Parsed Data Preview
            </h4>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              Showing {Math.min(5, parsedPreview.totalRows)} of {parsedPreview.totalRows} rows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100">
                  {parsedPreview.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="text-left px-3 py-2 font-medium text-gray-700 whitespace-nowrap"
                    >
                      {header.name || `Column ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedPreview.rows.slice(0, 5).map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {parsedPreview.headers.map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[200px] truncate"
                        title={row[colIdx] || ''}
                      >
                        {row[colIdx] || <span className="text-gray-400 italic">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sample Format - Hidden when preview is shown */}
      {!parsedPreview && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4" />
          Sample CSV Format
        </h4>
        <div className="overflow-x-auto">
          <table className="text-xs text-gray-600 font-mono">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pr-4 py-1">Date</th>
                <th className="text-left pr-4 py-1">Amount</th>
                <th className="text-left pr-4 py-1">Category</th>
                <th className="text-left pr-4 py-1">Vendor</th>
                <th className="text-left pr-4 py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-4 py-1">2026-01-15</td>
                <td className="pr-4 py-1">125.50</td>
                <td className="pr-4 py-1">cleaning</td>
                <td className="pr-4 py-1">CleanCo</td>
                <td className="pr-4 py-1">Weekly cleaning</td>
              </tr>
              <tr>
                <td className="pr-4 py-1">2026-01-18</td>
                <td className="pr-4 py-1">45.00</td>
                <td className="pr-4 py-1">supplies</td>
                <td className="pr-4 py-1">Home Depot</td>
                <td className="pr-4 py-1">Light bulbs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}

export default UploadStep
