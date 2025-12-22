'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckIcon } from '@heroicons/react/24/solid'
import {
  CloudArrowUpIcon,
  BuildingOffice2Icon,
  TableCellsIcon,
  EyeIcon,
  CogIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { WizardStep } from '../types/wizard'

interface StepIndicatorProps {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  onStepClick?: (step: WizardStep) => void
}

interface StepInfo {
  step: WizardStep
  label: string
  shortLabel: string
  number: number
  icon: React.ComponentType<{ className?: string }>
}

const steps: StepInfo[] = [
  { step: WizardStep.UPLOAD, label: 'Upload File', shortLabel: 'Upload', number: 1, icon: CloudArrowUpIcon },
  { step: WizardStep.PROPERTY_IDENTIFICATION, label: 'Identify Properties', shortLabel: 'Properties', number: 2, icon: BuildingOffice2Icon },
  { step: WizardStep.FIELD_MAPPING, label: 'Map Fields', shortLabel: 'Fields', number: 3, icon: TableCellsIcon },
  { step: WizardStep.PREVIEW, label: 'Preview Data', shortLabel: 'Preview', number: 4, icon: EyeIcon },
  { step: WizardStep.PROCESS, label: 'Process Import', shortLabel: 'Process', number: 5, icon: CogIcon },
  { step: WizardStep.COMPLETE, label: 'Complete', shortLabel: 'Done', number: 6, icon: CheckCircleIcon },
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

  return (
    <div className="w-full">
      <nav aria-label="Progress">
        {/* Desktop View */}
        <div className="hidden lg:flex items-center justify-between">
          {steps.map((stepInfo, stepIndex) => {
            const stepState = getStepState(stepInfo.step)
            const clickable = isClickable(stepInfo.step)
            const Icon = stepInfo.icon

            return (
              <React.Fragment key={stepInfo.step}>
                {/* Step Container */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stepIndex * 0.05 }}
                  className="flex flex-col items-center relative"
                >
                  {/* Step Circle */}
                  <motion.button
                    onClick={() => handleStepClick(stepInfo.step)}
                    disabled={!clickable}
                    whileHover={clickable ? { scale: 1.05 } : {}}
                    whileTap={clickable ? { scale: 0.95 } : {}}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 shadow-sm
                      ${stepState === 'completed'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25'
                        : stepState === 'current'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25 shadow-lg ring-4 ring-blue-100'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }
                      ${clickable
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed'
                      }
                    `}
                  >
                    {stepState === 'completed' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <CheckIcon className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}

                    {/* Active Pulse Animation */}
                    {stepState === 'current' && (
                      <motion.span
                        className="absolute inset-0 rounded-2xl bg-blue-400"
                        initial={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.3 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.button>

                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <span
                      className={`
                        text-xs font-semibold transition-colors duration-200 whitespace-nowrap
                        ${stepState === 'completed'
                          ? 'text-emerald-600'
                          : stepState === 'current'
                            ? 'text-blue-600'
                            : 'text-gray-400'
                        }
                      `}
                    >
                      {stepInfo.label}
                    </span>
                  </div>
                </motion.div>

                {/* Connector Line */}
                {stepIndex < steps.length - 1 && (
                  <div className="flex-1 mx-3 relative h-1">
                    {/* Background Track */}
                    <div className="absolute inset-0 bg-gray-200 rounded-full" />

                    {/* Progress Fill */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{
                        width: completedSteps.includes(stepInfo.step) ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Mobile/Tablet View */}
        <div className="lg:hidden">
          {/* Current Step Display */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {(() => {
                const currentStepInfo = steps.find(s => s.step === currentStep)
                const Icon = currentStepInfo?.icon || CloudArrowUpIcon
                return (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Step {currentStepInfo?.number} of {steps.length}
                      </p>
                      <p className="text-sm text-gray-500">
                        {currentStepInfo?.label}
                      </p>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Progress Badge */}
            <div className="px-3 py-1.5 bg-blue-50 rounded-full">
              <span className="text-xs font-semibold text-blue-600">
                {Math.round((completedSteps.length / steps.length) * 100)}% Complete
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{
                width: `${((steps.findIndex(s => s.step === currentStep) + 1) / steps.length) * 100}%`
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Step Dots */}
          <div className="flex justify-between mt-3">
            {steps.map((stepInfo, stepIndex) => {
              const stepState = getStepState(stepInfo.step)
              const clickable = isClickable(stepInfo.step)

              return (
                <motion.button
                  key={stepInfo.step}
                  onClick={() => handleStepClick(stepInfo.step)}
                  disabled={!clickable}
                  whileTap={clickable ? { scale: 0.9 } : {}}
                  className={`
                    flex flex-col items-center gap-1
                    ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                >
                  <div
                    className={`
                      w-3 h-3 rounded-full transition-all duration-300
                      ${stepState === 'completed'
                        ? 'bg-emerald-500 scale-100'
                        : stepState === 'current'
                          ? 'bg-blue-500 scale-125 ring-4 ring-blue-100'
                          : 'bg-gray-300'
                      }
                    `}
                  />
                  <span className={`
                    text-[10px] font-medium
                    ${stepState === 'current' ? 'text-blue-600' : 'text-gray-400'}
                  `}>
                    {stepInfo.shortLabel}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

export default StepIndicator
