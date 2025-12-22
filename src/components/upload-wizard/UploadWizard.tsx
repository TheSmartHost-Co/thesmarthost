'use client'

import React, { useReducer, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import FieldMappingStep from './steps/FieldMappingStep'
import PropertyIdentificationStep from './steps/PropertyIdentificationStep'
import PreviewStep from './steps/PreviewStep'
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
    RequiredField.LISTING_NAME,
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
  fieldMappings: undefined,
  completeFieldMappingState: undefined,
  propertyMappings: undefined,
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
      // Only allow next step if canGoNext is true
      if (!state.canGoNext) {
        console.log('NEXT_STEP blocked: canGoNext is false')
        return state
      }

      const nextStep = Math.min(state.currentStep + 1, WizardStep.COMPLETE) as WizardStep
      const newCompletedSteps = state.completedSteps.includes(state.currentStep)
        ? state.completedSteps
        : [...state.completedSteps, state.currentStep]

      console.log('NEXT_STEP: transitioning from', state.currentStep, 'to', nextStep)
      return {
        ...state,
        currentStep: nextStep,
        completedSteps: newCompletedSteps,
        canGoBack: nextStep > WizardStep.UPLOAD,
        canGoNext: false,
      }

    case WizardActionType.PREV_STEP:
      const prevStep = Math.max(state.currentStep - 1, WizardStep.UPLOAD) as WizardStep
      console.log('PREV_STEP: transitioning from', state.currentStep, 'to', prevStep)
      return {
        ...state,
        currentStep: prevStep,
        canGoBack: prevStep > WizardStep.UPLOAD,
        canGoNext: true,
      }

    case WizardActionType.SET_SELECTED_PROPERTY:
      return {
        ...state,
        selectedProperty: action.payload,
        // Legacy support - for backwards compatibility with single property flow
        canGoNext: state.uploadedFile ? true : false,
      }

    case WizardActionType.SET_UPLOADED_FILE:
      return {
        ...state,
        uploadedFile: action.payload, // Only metadata for navigation state
        canGoNext: action.payload ? true : false, // Only need file uploaded for multi-property flow
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
        fieldMappings: action.payload?.fieldMappings, // Store field mappings separately
        canGoNext: action.payload?.results?.isValid || false,
      }

    case WizardActionType.SET_PROPERTY_MAPPING_STATE:
      return {
        ...state,
        propertyMappingState: action.payload,
        propertyMappings: action.payload?.propertyMappings, // Store property mappings separately
        canGoNext: action.payload?.isValid || false,
      }

    case WizardActionType.SET_PROPERTY_IDENTIFICATION_STATE:
      return {
        ...state,
        propertyIdentificationState: action.payload,
        propertyMappings: action.payload?.propertyMappings, // Store property mappings separately
        canGoNext: action.payload?.isValid || false,
      }

    case WizardActionType.SET_FIELD_MAPPING_STATE:
      return {
        ...state,
        fieldMappingState: action.payload,
        canGoNext: action.payload?.isValid || false,
      }

    case WizardActionType.SET_FIELD_MAPPINGS:
      return {
        ...state,
        fieldMappings: action.payload,
        validationState: state.validationState ? {
          ...state.validationState,
          fieldMappings: action.payload
        } : undefined
      }

    case WizardActionType.SET_COMPLETE_FIELD_MAPPING_STATE:
      return {
        ...state,
        completeFieldMappingState: action.payload,
        fieldMappings: action.payload?.fieldMappings, // Also update legacy field mappings
        validationState: state.validationState ? {
          ...state.validationState,
          fieldMappings: action.payload?.fieldMappings
        } : undefined
      }

    case WizardActionType.SET_PROPERTY_MAPPINGS:
      return {
        ...state,
        propertyMappings: action.payload,
        propertyMappingState: state.propertyMappingState ? {
          ...state.propertyMappingState,
          propertyMappings: action.payload
        } : undefined
      }

    case WizardActionType.SET_PROCESSING_STATE:
      const statusValue = action.payload?.status
      const isCompleteStatus = statusValue === 'complete'
      console.log('Wizard reducer SET_PROCESSING_STATE:', {
        statusValue,
        statusType: typeof statusValue,
        isCompleteStatus,
        stringComparison: `"${statusValue}" === "complete"`,
        currentCanGoNext: state.canGoNext
      })
      const newCanGoNext = isCompleteStatus
      console.log('Setting canGoNext to:', newCanGoNext)
      return {
        ...state,
        processingState: action.payload,
        canGoNext: newCanGoNext,
        canGoBack: false, // Can't go back during processing
      }

    case WizardActionType.SET_COMPLETION_STATE:
      console.log('SET_COMPLETION_STATE: not changing canGoNext, keeping it as:', state.canGoNext)
      return {
        ...state,
        completionState: action.payload,
        // Don't change canGoNext here - let SET_PROCESSING_STATE control it
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
  const uploadedFileRef = useRef<any>(null)

  // Navigation handlers
  const handleNext = useCallback(() => {
    console.log('handleNext called')
    dispatch({ type: WizardActionType.NEXT_STEP })
  }, [])

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
  const handlePropertySelected = useCallback((property: any) => {
    dispatch({ type: WizardActionType.SET_SELECTED_PROPERTY, payload: property })
  }, [])

  const handleFileUploaded = useCallback((uploadedFile: any) => {
    uploadedFileRef.current = uploadedFile
    const uploadedFileState = {
      file: uploadedFile.file,
      name: uploadedFile.name,
      size: uploadedFile.size,
      type: uploadedFile.file?.type || 'text/csv',
      uploadedAt: new Date()
    }
    dispatch({ type: WizardActionType.SET_UPLOADED_FILE, payload: uploadedFileState })
  }, [])

  const handlePreviewComplete = useCallback((previewState: any) => {
    dispatch({ type: WizardActionType.SET_PREVIEW_STATE, payload: previewState })
  }, [])

  const handleValidationComplete = useCallback((validationState: any) => {
    dispatch({ type: WizardActionType.SET_VALIDATION_STATE, payload: validationState })
  }, [])

  const handlePropertyMappingComplete = useCallback((propertyMappingState: any) => {
    dispatch({ type: WizardActionType.SET_PROPERTY_MAPPING_STATE, payload: propertyMappingState })
  }, [])

  const handlePropertyIdentificationComplete = useCallback((propertyIdentificationState: any) => {
    dispatch({ type: WizardActionType.SET_PROPERTY_IDENTIFICATION_STATE, payload: propertyIdentificationState })
  }, [])

  const handleFieldMappingComplete = useCallback((fieldMappingState: any) => {
    dispatch({ type: WizardActionType.SET_FIELD_MAPPING_STATE, payload: fieldMappingState })
  }, [])

  const handleProcessingUpdate = useCallback((processingState: any) => {
    console.log('UploadWizard handleProcessingUpdate called with STATUS:', processingState?.status, 'FULL PAYLOAD:', processingState)
    dispatch({ type: WizardActionType.SET_PROCESSING_STATE, payload: processingState })
  }, [])

  const handleProcessingComplete = useCallback((completionState: any) => {
    dispatch({ type: WizardActionType.SET_COMPLETION_STATE, payload: completionState })
    // Don't automatically call onComplete - let user choose from CompleteStep
  }, [])

  const handleWizardComplete = useCallback(() => {
    // This is called when user explicitly chooses to finish from CompleteStep
    onComplete?.()
  }, [onComplete])

  const handleFieldMappingsUpdate = useCallback((mappings: any[]) => {
    dispatch({ type: WizardActionType.SET_FIELD_MAPPINGS, payload: mappings })
  }, [])

  const handleCompleteFieldMappingStateUpdate = useCallback((completeState: any) => {
    dispatch({ type: WizardActionType.SET_COMPLETE_FIELD_MAPPING_STATE, payload: completeState })
  }, [])

  const handlePropertyMappingsUpdate = useCallback((mappings: any[]) => {
    dispatch({ type: WizardActionType.SET_PROPERTY_MAPPINGS, payload: mappings })
  }, [])

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
            uploadedFile={uploadedFileRef.current}
            selectedProperty={state.selectedProperty}
            onPropertySelected={handlePropertySelected}
          />
        )

      case WizardStep.PROPERTY_IDENTIFICATION:
        return (
          <PropertyIdentificationStep
            {...commonProps}
            uploadedFile={uploadedFileRef.current}
            uniqueListings={state.propertyIdentificationState?.uniqueListings || []}
            bookingCounts={state.propertyIdentificationState?.bookingCounts || {}}
            propertyMappingState={state.propertyIdentificationState}
            onPropertyMappingComplete={handlePropertyIdentificationComplete}
            propertyMappings={state.propertyMappings}
            onPropertyMappingsUpdate={handlePropertyMappingsUpdate}
          />
        )

      case WizardStep.FIELD_MAPPING:
        return (
          <FieldMappingStep
            {...commonProps}
            uploadedFile={uploadedFileRef.current}
            fieldMappingState={state.fieldMappingState}
            propertyIdentificationState={state.propertyIdentificationState}
            onValidationComplete={handleFieldMappingComplete}
          />
        )

      case WizardStep.PREVIEW:
        return (
          <PreviewStep
            {...commonProps}
            uploadedFile={uploadedFileRef.current!}
            previewState={state.previewState}
            validationState={state.validationState}
            fieldMappingState={state.fieldMappingState}
            propertyIdentificationState={state.propertyIdentificationState}
            propertyMappingState={state.propertyMappingState || state.propertyIdentificationState}
            onPreviewComplete={handlePreviewComplete}
          />
        )

      case WizardStep.PROCESS:
        return (
          <ProcessStep
            {...commonProps}
            validationState={state.validationState!}
            previewState={state.previewState}
            propertyMappingState={state.propertyMappingState || state.propertyIdentificationState}
            propertyIdentificationState={state.propertyIdentificationState}
            fieldMappingState={state.fieldMappingState}
            uploadedFile={uploadedFileRef.current}
            processingState={state.processingState}
            onProcessingUpdate={handleProcessingUpdate}
            onProcessingComplete={handleProcessingComplete}
          />
        )

      case WizardStep.COMPLETE:
        return (
          <CompleteStep
            {...commonProps}
            completionState={state.completionState!}
            onReset={handleReset}
            onComplete={handleWizardComplete}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8"
      >
        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={handleStepClick}
        />
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default UploadWizard
