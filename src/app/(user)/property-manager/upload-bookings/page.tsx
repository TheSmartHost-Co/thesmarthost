"use client"

import { useState } from 'react'
import { CloudArrowUpIcon, DocumentTextIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export default function UploadBookingsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    setIsUploading(true)
    // TODO: Implement upload logic
    setTimeout(() => {
      setIsUploading(false)
      console.log('File uploaded:', selectedFile.name)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Upload Bookings</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Import booking data from CSV files to update your property management system
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Upload Instructions
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Please ensure your CSV file contains the required columns and follows the expected format.
                    Supported file formats: CSV, Excel (.xlsx)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Select Booking File
                </h2>
                
                {/* File Upload Drop Zone */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <p className="text-lg font-medium text-gray-900">
                      Drop your file here, or{' '}
                      <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Supports CSV, Excel files up to 10MB
                    </p>
                  </div>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                {selectedFile && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                          Upload File
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Supported PMS Section */}
                <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-green-800 mb-2">
                      Supported PMS Platforms
                    </h3>
                    <div className="flex justify-center items-center space-x-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-green-700 border border-green-200">
                        Hostaway
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-green-700 border border-green-200">
                        VRBO
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-green-700 border border-green-200">
                        Airbnb
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload History */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Uploads
              </h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No uploads yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your first booking file to see the history here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}