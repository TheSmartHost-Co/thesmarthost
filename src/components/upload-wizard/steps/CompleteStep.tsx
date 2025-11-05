'use client'

import React from 'react'

interface CompleteStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  completionState?: any
  onReset?: () => void
}

const CompleteStep: React.FC<CompleteStepProps> = (props) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Complete Step</h2>
      <p>Complete step content coming soon...</p>
    </div>
  )
}

export default CompleteStep