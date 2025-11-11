'use client'

import React, { useReducer, useCallback } from 'react'
import { 
  WizardStep, 
  WizardState, 
  WizardAction, 
  WizardActionType, 
  WizardConfig,
  RequiredField,
  OptionalField
} from './types/wizard'

// Step Components
import UploadStep from './steps/UploadStep'
import PreviewStep from './steps/PreviewStep'
import ValidateStep from './steps/ValidateStep'
import ProcessStep from './steps/ProcessStep'
import CompleteStep from './steps/CompleteStep'

// Shared Components
import StepIndicator from './shared/StepIndicator'

interface UploadWizardProps {
  onComplete?: () => void
  onCancel?: () => void
}

// Default wizard configuration
const defaultConfig: WizardConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.csv', '.xlsx', '.xls'],
  supportedPlatforms: ['Hostaway', 'Airbnb', 'VRBO', 'Booking.com'],
  requiredFields: [
    RequiredField.RESERVATION_ID,
    RequiredField.GUEST_NAME,
    RequiredField.PROPERTY_NAME,
    RequiredField.CHECK_IN_DATE,
    RequiredField.CHECK_OUT_DATE,
    RequiredField.TOTAL_AMOUNT,
    RequiredField.PLATFORM,
  ],
  optionalFields: [
    OptionalField.GUEST_EMAIL,
    OptionalField.GUEST_PHONE,
    OptionalField.NIGHTS,
    OptionalField.ADULTS,
    OptionalField.CHILDREN,
    OptionalField.COMMISSION_RATE,
    OptionalField.TAXES,
    OptionalField.FEES,
    OptionalField.NET_AMOUNT,
  ]
}

// Initial wizard state
const initialState: WizardState = {
  currentStep: WizardStep.UPLOAD,
  completedSteps: [],
  canGoBack: false,
  canGoNext: false,
}

// Wizard state reducer
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case WizardActionType.SET_STEP:
      return {
        ...state,
        currentStep: action.payload,
        canGoBack: action.payload > WizardStep.UPLOAD,
        canGoNext: false, // Will be set by individual steps
      }

    case WizardActionType.NEXT_STEP:
      const nextStep = Math.min(state.currentStep + 1, WizardStep.COMPLETE) as WizardStep
      const newCompletedSteps = state.completedSteps.includes(state.currentStep)
        ? state.completedSteps
        : [...state.completedSteps, state.currentStep]
      
      return {
        ...state,
        currentStep: nextStep,
        completedSteps: newCompletedSteps,
        canGoBack: nextStep > WizardStep.UPLOAD,
        canGoNext: false,
      }

    case WizardActionType.PREV_STEP:
      const prevStep = Math.max(state.currentStep - 1, WizardStep.UPLOAD) as WizardStep
      return {
        ...state,
        currentStep: prevStep,
        canGoBack: prevStep > WizardStep.UPLOAD,
        canGoNext: true,
      }

    case WizardActionType.SET_UPLOADED_FILE:
      return {
        ...state,
        uploadedFile: action.payload,
        canGoNext: true,
      }

    case WizardActionType.SET_PREVIEW_STATE:
      return {
        ...state,
        previewState: action.payload,
        canGoNext: true,
      }

    case WizardActionType.SET_VALIDATION_STATE:
      return {
        ...state,
        validationState: action.payload,
        canGoNext: action.payload?.results?.isValid || false,
      }

    case WizardActionType.SET_PROCESSING_STATE:
      return {
        ...state,
        processingState: action.payload,
        canGoNext: action.payload?.status === 'complete',
        canGoBack: false, // Can't go back during processing
      }

    case WizardActionType.SET_COMPLETION_STATE:
      return {
        ...state,
        completionState: action.payload,
        canGoNext: false,
        canGoBack: false,
      }

    case WizardActionType.RESET_WIZARD:
      return initialState

    default:
      return state
  }
}

const UploadWizard: React.FC<UploadWizardProps> = ({ onComplete, onCancel }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (state.canGoNext) {
      dispatch({ type: WizardActionType.NEXT_STEP })
    }
  }, [state.canGoNext])

  const handleBack = useCallback(() => {
    if (state.canGoBack) {
      dispatch({ type: WizardActionType.PREV_STEP })
    }
  }, [state.canGoBack])

  const handleStepClick = useCallback((step: WizardStep) => {
    // Only allow clicking on completed steps or current step
    if (state.completedSteps.includes(step) || step === state.currentStep) {
      dispatch({ type: WizardActionType.SET_STEP, payload: step })
    }
  }, [state.completedSteps, state.currentStep])

  // Step-specific handlers
  const handleFileUploaded = useCallback((uploadedFile: any) => {
    dispatch({ type: WizardActionType.SET_UPLOADED_FILE, payload: uploadedFile })
  }, [])

  const handlePreviewComplete = useCallback((previewState: any) => {
    dispatch({ type: WizardActionType.SET_PREVIEW_STATE, payload: previewState })
  }, [])

  const handleValidationComplete = useCallback((validationState: any) => {
    dispatch({ type: WizardActionType.SET_VALIDATION_STATE, payload: validationState })
  }, [])

  const handleProcessingUpdate = useCallback((processingState: any) => {
    dispatch({ type: WizardActionType.SET_PROCESSING_STATE, payload: processingState })
  }, [])

  const handleWizardComplete = useCallback((completionState: any) => {
    dispatch({ type: WizardActionType.SET_COMPLETION_STATE, payload: completionState })
    onComplete?.()
  }, [onComplete])

  const handleCancel = useCallback(() => {
    dispatch({ type: WizardActionType.RESET_WIZARD })
    onCancel?.()
  }, [onCancel])

  const handleReset = useCallback(() => {
    dispatch({ type: WizardActionType.RESET_WIZARD })
  }, [])

  // Render current step component
  const renderCurrentStep = () => {
    const commonProps = {
      onNext: handleNext,
      onBack: handleBack,
      onCancel: handleCancel,
      canGoNext: state.canGoNext,
      canGoBack: state.canGoBack,
      config: defaultConfig,
    }

    switch (state.currentStep) {
      case WizardStep.UPLOAD:
        return (
          <UploadStep
            {...commonProps}
            onFileUploaded={handleFileUploaded}
            uploadedFile={state.uploadedFile}
          />
        )

      case WizardStep.VALIDATE:
        return (
          <ValidateStep
            {...commonProps}
            uploadedFile={state.uploadedFile}
            validationState={state.validationState}
            onValidationComplete={handleValidationComplete}
          />
        )

      case WizardStep.PREVIEW:
        return (
          <PreviewStep
            {...commonProps}
            uploadedFile={state.uploadedFile!}
            previewState={state.previewState}
            onPreviewComplete={handlePreviewComplete}
          />
        )

      case WizardStep.PROCESS:
        return (
          <ProcessStep
            {...commonProps}
            validationState={state.validationState!}
            processingState={state.processingState}
            onProcessingUpdate={handleProcessingUpdate}
            onProcessingComplete={handleWizardComplete}
          />
        )

      case WizardStep.COMPLETE:
        return (
          <CompleteStep
            {...commonProps}
            completionState={state.completionState!}
            onReset={handleReset}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        {renderCurrentStep()}
      </div>
    </div>
  )
}

export default UploadWizard