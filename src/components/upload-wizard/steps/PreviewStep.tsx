'use client'

import React from 'react'

interface PreviewStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  uploadedFile?: any
  previewState?: any
  onPreviewComplete?: (state: any) => void
}

const PreviewStep: React.FC<PreviewStepProps> = (props) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Preview Step</h2>
      <p>Preview step content coming soon...</p>
    </div>
  )
}

export default PreviewStep