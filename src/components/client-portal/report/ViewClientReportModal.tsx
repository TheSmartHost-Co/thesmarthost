'use client'

import { useState } from 'react'
import Modal from '@/components/shared/modal'
import type { ClientPortalReport } from '@/services/types/clientPortal'
import {
  DocumentTextIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  UserIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'

interface ViewClientReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: ClientPortalReport | null
}

const ViewClientReportModal: React.FC<ViewClientReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null)

  if (!report) return null

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const formatIcons: Record<string, React.FC<{ className?: string }>> = {
    pdf: DocumentTextIcon,
    csv: TableCellsIcon,
    excel: DocumentChartBarIcon,
  }

  const formatLabels: Record<string, string> = {
    pdf: 'PDF Report',
    csv: 'CSV Spreadsheet',
    excel: 'Excel Workbook',
  }

  const formatColors: Record<string, string> = {
    pdf: 'text-red-600 bg-red-50 border-red-200',
    csv: 'text-green-600 bg-green-50 border-green-200',
    excel: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  }

  const handleDownload = async (file: { format: string; downloadUrl: string; fileName: string }) => {
    setDownloading(file.format)
    try {
      const response = await fetch(file.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(file.downloadUrl, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  const pdfFile = report.files.find((f) => f.format === 'pdf')

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-2xl p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Report Details</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatDate(report.startDate)} — {formatDate(report.endDate)}
        </p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
          <CalendarDaysIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs text-gray-500">Properties</div>
            <div className="text-sm text-gray-900">
              {report.properties.map((p) => p.listingName).join(', ')}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
          <UserIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs text-gray-500">Shared by</div>
            <div className="text-sm text-gray-900">{report.sentBy}</div>
            <div className="text-xs text-gray-400">{formatDate(report.sentAt)}</div>
          </div>
        </div>
      </div>

      {/* PM Message */}
      {report.message && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100 mb-5">
          <ChatBubbleLeftIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs text-blue-600 font-medium mb-0.5">Note from your property manager</div>
            <div className="text-sm text-blue-900">{report.message}</div>
          </div>
        </div>
      )}

      {/* Download Files */}
      <div className="mb-5">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Available Files</h3>
        <div className="space-y-2">
          {report.files.map((file) => {
            const Icon = formatIcons[file.format] || DocumentTextIcon
            const colors = formatColors[file.format] || 'text-gray-600 bg-gray-50 border-gray-200'
            return (
              <div
                key={file.format}
                className={`flex items-center justify-between p-3 rounded-lg border ${colors}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-medium">{formatLabels[file.format] || file.format.toUpperCase()}</div>
                    <div className="text-xs opacity-70">{file.fileName}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloading === file.format}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-white/80 border border-current/20 hover:bg-white transition-colors disabled:opacity-50"
                >
                  {downloading === file.format ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  )}
                  Download
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* PDF Preview */}
      {pdfFile && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">PDF Preview</h3>
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-100" style={{ height: '400px' }}>
            <iframe
              src={pdfFile.downloadUrl}
              className="w-full h-full"
              title="Report PDF Preview"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ViewClientReportModal
