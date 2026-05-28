'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface SignedFilePreviewProps {
  signedUrl: string | null
  mimeType: string
  fileName: string
  onRefresh?: () => void
  className?: string
}

export default function SignedFilePreview({
  signedUrl,
  mimeType,
  fileName,
  onRefresh,
  className = '',
}: SignedFilePreviewProps) {
  const { t } = useTranslation('clientPortal')
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!signedUrl) return
    setDownloading(true)
    try {
      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(signedUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  if (!signedUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-dashed border-gray-200 bg-gray-50 ${className}`}
      >
        <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-medium text-gray-700">{t('previewUnavailable')}</p>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          {t('previewUnavailableHint')}
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            {t('tryAgain')}
          </button>
        )}
      </div>
    )
  }

  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'

  return (
    <div className={className}>
      {isImage && (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={fileName}
            className="max-w-full max-h-[400px] object-contain"
          />
        </div>
      )}

      {isPdf && (
        <div
          className="rounded-lg border border-gray-200 overflow-hidden bg-gray-100"
          style={{ height: '400px' }}
        >
          <iframe src={signedUrl} className="w-full h-full" title={fileName} />
        </div>
      )}

      {!isImage && !isPdf && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <DocumentIcon className="w-8 h-8 text-gray-400" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 truncate">{fileName}</div>
            <div className="text-xs text-gray-500">{mimeType}</div>
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowDownTrayIcon className="w-4 h-4" />
          )}
          {t('download')}
        </button>
      </div>
    </div>
  )
}
