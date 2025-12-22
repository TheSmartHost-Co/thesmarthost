'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, DocumentArrowDownIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import Modal from '../../shared/modal'
import { getSingleReport, deleteReportFile } from '../../../services/reportService'
import { SingleReportResponse, ReportFile } from '../../../services/types/report'
import { useNotificationStore } from '../../../store/useNotificationStore'

interface ViewReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  onReportUpdated?: () => void
}

const ViewReportModal: React.FC<ViewReportModalProps> = ({
  isOpen,
  onClose,
  reportId,
  onReportUpdated
}) => {
  const [report, setReport] = useState<SingleReportResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<ReportFile | null>(null)
  const { showNotification } = useNotificationStore()

  const loadReport = async () => {
    if (!reportId) return
    
    setLoading(true)
    try {
      const res = await getSingleReport(reportId)
      if (res.status === 'success') {
        setReport(res.data)
      } else {
        showNotification(res.message || 'Failed to load report', 'error')
      }
    } catch (err) {
      console.error('Error loading report:', err)
      const message = err instanceof Error ? err.message : 'Network error'
      showNotification(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && reportId) {
      loadReport()
    }
  }, [isOpen, reportId])

  const handleDownload = async (file: ReportFile) => {
    try {
      const response = await fetch(file.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback to direct link if fetch fails
      const link = document.createElement('a')
      link.href = file.downloadUrl
      link.download = file.fileName
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDeleteClick = (file: ReportFile) => {
    setFileToDelete(file)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return

    setDeletingFileId(fileToDelete.id)
    try {
      const res = await deleteReportFile(fileToDelete.id)
      if (res.status === 'success') {
        showNotification('File deleted successfully', 'success')
        await loadReport() // Refresh report data
        onReportUpdated?.() // Refresh parent list
      } else {
        showNotification(res.message || 'Failed to delete file', 'error')
      }
    } catch (err) {
      console.error('Error deleting file:', err)
      const message = err instanceof Error ? err.message : 'Network error'
      showNotification(message, 'error')
    } finally {
      setDeletingFileId(null)
      setShowDeleteConfirm(false)
      setFileToDelete(null)
    }
  }

  const toggleSection = (format: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [format]: !prev[format]
    }))
  }

  const getCurrentFiles = () => {
    if (!report?.filesByFormat) return []
    
    const currentFiles: ReportFile[] = []
    Object.values(report.filesByFormat).forEach(formatFiles => {
      const current = formatFiles.find(file => file.isCurrent)
      if (current) currentFiles.push(current)
    })
    return currentFiles
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} style="max-w-4xl">
        <div className="p-6">
          <div className="border-b border-gray-200 pb-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900">Report Details</h2>
          </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : report ? (
          <div className="space-y-8">
            {/* Report Metadata */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Information</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Report ID:</span>
                  <p className="text-gray-900 mt-1 font-mono text-xs">{report.id}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Date Range:</span>
                  <p className="text-gray-900 mt-1">
                    {formatDate(report.startDate)} - {formatDate(report.endDate)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Properties:</span>
                  <p className="text-gray-900 mt-1">
                    {report.isMultiProperty 
                      ? `${report.propertyCount} properties` 
                      : report.propertyName
                    }
                  </p>
                  {report.isMultiProperty && (
                    <ul className="text-gray-700 text-xs mt-1 space-y-1">
                      {report.properties.map(prop => (
                        <li key={prop.id}>• {prop.listingName}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <span className="font-medium text-gray-600">Created:</span>
                  <p className="text-gray-900 mt-1">{formatDateTime(report.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Current Files Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Files</h3>
              <div className="space-y-3">
                {getCurrentFiles().length > 0 ? (
                  getCurrentFiles().map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <DocumentArrowDownIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{file.format.toUpperCase()}</p>
                          <p className="text-sm text-gray-600">Version {file.version} (Current)</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(file)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Download
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No files available</p>
                )}
              </div>
            </div>

            {/* File History Section */}
            {report.filesByFormat && Object.keys(report.filesByFormat).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">File History</h3>
                <div className="space-y-4">
                  {Object.entries(report.filesByFormat).map(([format, files]) => (
                    <div key={format} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection(format)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {expandedSections[format] ? (
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900">
                            {format.toUpperCase()} Files ({files.length} version{files.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </button>
                      
                      {expandedSections[format] && (
                        <div className="border-t border-gray-200 p-4 space-y-3">
                          {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                              <div>
                                <p className="font-medium text-gray-900">
                                  Version {file.version}
                                  {file.isCurrent && (
                                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                      Current
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Generated {formatDateTime(file.generatedAt)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleDownload(file)}
                                  className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(file)}
                                  disabled={deletingFileId === file.id}
                                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                                >
                                  {deletingFileId === file.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load report details</p>
          </div>
        )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && fileToDelete && (
        <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} style="max-w-md">
          <div className="text-center py-4">
            <TrashIcon className="mx-auto h-12 w-12 text-red-600 mb-6" />
            <h3 className="text-lg font-medium text-gray-900 mb-3">Delete File</h3>
            <p className="text-sm text-gray-600 mb-8">
              Are you sure you want to delete {fileToDelete.format.toUpperCase()} version {fileToDelete.version}?
              {fileToDelete.isCurrent && (
                <span className="block text-orange-600 font-medium mt-2">
                  This is the current version of this file.
                </span>
              )}
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingFileId === fileToDelete.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingFileId === fileToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

export default ViewReportModal