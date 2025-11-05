'use client'

import React from 'react'

interface ValidateStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  previewState?: any
  validationState?: any
  onValidationComplete?: (state: any) => void
}

const ValidateStep: React.FC<ValidateStepProps> = (props) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Validate Step</h2>
      <p>Validate step content coming soon...</p>
    </div>
  )
}

export default ValidateStep