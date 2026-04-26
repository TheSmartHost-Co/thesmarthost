'use client'

import React, { useCallback, useState } from 'react'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { BulkRowState } from '../BulkUploadReceiptModal'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface SelectFilesStepProps {
  rows: BulkRowState[]
  maxFiles: number
  onFilesSelected: (files: File[]) => void
  onRemoveRow: (id: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const SelectFilesStep: React.FC<SelectFilesStepProps> = ({
  rows,
  maxFiles,
  onFilesSelected,
  onRemoveRow,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validateAndAdd = useCallback(
    (files: File[]) => {
      const errors: string[] = []
      const valid: File[] = []
      for (const f of files) {
        if (!ALLOWED_TYPES.includes(f.type)) {
          errors.push(`${f.name}: unsupported type`)
          continue
        }
        if (f.size > MAX_FILE_SIZE) {
          errors.push(`${f.name}: larger than 10MB`)
          continue
        }
        valid.push(f)
      }
      setValidationErrors(errors)
      if (valid.length > 0) onFilesSelected(valid)
    },
    [onFilesSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      validateAndAdd(Array.from(e.dataTransfer.files))
    },
    [validateAndAdd]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndAdd(Array.from(e.target.files || []))
      e.target.value = ''
    },
    [validateAndAdd]
  )

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragOver(false)
        }}
        onClick={() => document.getElementById('bulk-receipt-file-input')?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
        }`}
      >
        <input
          id="bulk-receipt-file-input"
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drop receipts here or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Up to {maxFiles} files • JPG, PNG, GIF, WebP, PDF • 10MB each
        </p>
      </div>

      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <p className="font-medium mb-1">Skipped files:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {rows.length} file{rows.length === 1 ? '' : 's'} ready
            </h3>
            <span className="text-xs text-gray-500">
              {rows.length}/{maxFiles}
            </span>
          </div>
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{row.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(row.file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveRow(row.id)}
                  className="p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
                  aria-label="Remove"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SelectFilesStep
