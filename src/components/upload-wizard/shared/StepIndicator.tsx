'use client'

import React from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { WizardStep } from '../types/wizard'

interface StepIndicatorProps {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  onStepClick?: (step: WizardStep) => void
}

interface StepInfo {
  step: WizardStep
  label: string
  number: number
}

const steps: StepInfo[] = [
  { step: WizardStep.UPLOAD, label: 'Upload', number: 1 },
  { step: WizardStep.VALIDATE, label: 'Validate', number: 2 },
  { step: WizardStep.PROPERTY_MAPPING, label: 'Map Properties', number: 3 },
  { step: WizardStep.PREVIEW, label: 'Preview', number: 4 },
  { step: WizardStep.PROCESS, label: 'Process', number: 5 },
  { step: WizardStep.COMPLETE, label: 'Complete', number: 6 },
]

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const getStepState = (step: WizardStep) => {
    if (completedSteps.includes(step)) {
      return 'completed'
    }
    if (step === currentStep) {
      return 'current'
    }
    return 'upcoming'
  }

  const isClickable = (step: WizardStep) => {
    return completedSteps.includes(step) || step === currentStep
  }

  const handleStepClick = (step: WizardStep) => {
    if (isClickable(step) && onStepClick) {
      onStepClick(step)
    }
  }

  const getCircleClasses = (stepState: string) => {
    switch (stepState) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500'
      case 'current':
        return 'bg-blue-600 text-white border-blue-600'
      case 'upcoming':
        return 'bg-gray-200 text-gray-500 border-gray-300'
      default:
        return 'bg-gray-200 text-gray-500 border-gray-300'
    }
  }

  const getLabelClasses = (stepState: string) => {
    switch (stepState) {
      case 'completed':
        return 'text-green-600 font-medium'
      case 'current':
        return 'text-blue-600 font-medium'
      case 'upcoming':
        return 'text-gray-500'
      default:
        return 'text-gray-500'
    }
  }

  const getConnectorClasses = (stepIndex: number) => {
    const nextStep = steps[stepIndex + 1]
    if (!nextStep) return '' // Last step, no connector

    const nextStepState = getStepState(nextStep.step)
    
    if (nextStepState === 'completed' || completedSteps.includes(steps[stepIndex].step)) {
      return 'bg-green-500'
    }
    return 'bg-gray-300'
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <nav aria-label="Progress">
        <div className="flex items-center justify-between">
          {steps.map((stepInfo, stepIndex) => {
            const stepState = getStepState(stepInfo.step)
            const clickable = isClickable(stepInfo.step)

            return (
              <React.Fragment key={stepInfo.step}>
                {/* Step Container */}
                <div className="flex flex-col items-center">
                  {/* Step Circle */}
                  <button
                    onClick={() => handleStepClick(stepInfo.step)}
                    disabled={!clickable}
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                      ${getCircleClasses(stepState)}
                      ${clickable 
                        ? 'cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                        : 'cursor-not-allowed'
                      }
                    `}
                  >
                    {stepState === 'completed' ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {stepInfo.number}
                      </span>
                    )}
                  </button>

                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <span 
                      className={`
                        text-sm transition-colors duration-200 whitespace-nowrap
                        ${getLabelClasses(stepState)}
                      `}
                    >
                      {stepInfo.label}
                    </span>
                  </div>
                </div>

                {/* Connector Line */}
                {stepIndex < steps.length - 1 && (
                  <div 
                    className={`
                      flex-1 h-0.5 mx-4 transition-colors duration-300
                      ${getConnectorClasses(stepIndex)}
                    `}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default StepIndicator