'use client'

import React from 'react'

interface ProcessStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  validationState?: any
  processingState?: any
  onProcessingUpdate?: (state: any) => void
  onProcessingComplete?: (state: any) => void
}

const ProcessStep: React.FC<ProcessStepProps> = (props) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Process Step</h2>
      <p>Process step content coming soon...</p>
    </div>
  )
}

export default ProcessStep