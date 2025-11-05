'use client'

import React from 'react'

interface UploadStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  onFileUploaded?: (file: any) => void
  uploadedFile?: any
}

const UploadStep: React.FC<UploadStepProps> = (props) => {
  return (
    <div className="p-6">
      <h2 className="text-xl text-black font-semibold mb-4">Upload Step</h2>
      <p>Upload step content coming soon...</p>
    </div>
  )
}

export default UploadStep