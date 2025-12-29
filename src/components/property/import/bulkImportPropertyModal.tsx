'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentArrowUpIcon,
  TableCellsIcon,
  UserGroupIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import UploadStep from './steps/UploadStep'
import MapFieldsStep from './steps/MapFieldsStep'
import AssignClientsStep, { ClientAssignment } from './steps/AssignClientsStep'
import PreviewStep, { PreviewRow } from './steps/PreviewStep'
import { CsvData } from '@/services/types/csvMapping'
import { Property, BulkImportPropertyPayload } from '@/services/types/property'
import { Client } from '@/services/types/client'
import { bulkImportProperties } from '@/services/propertyService'
import { useNotificationStore } from '@/store/useNotificationStore'

type Step = 'upload' | 'map' | 'assign' | 'preview'

interface BulkImportPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (importedProperties: Property[]) => void
  existingProperties: Property[]
  clients: Client[]
}

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'upload', label: 'Upload CSV', icon: DocumentArrowUpIcon },
  { key: 'map', label: 'Map Fields', icon: TableCellsIcon },
  { key: 'assign', label: 'Assign Clients', icon: UserGroupIcon },
  { key: 'preview', label: 'Preview & Import', icon: EyeIcon }
]

const BulkImportPropertyModal: React.FC<BulkImportPropertyModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingProperties,
  clients
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [isMappingValid, setIsMappingValid] = useState(false)
  const [clientAssignments, setClientAssignments] = useState<ClientAssignment[]>([])
  const [isAssignmentValid, setIsAssignmentValid] = useState(false)
  const [validatedRows, setValidatedRows] = useState<PreviewRow[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const { showNotification } = useNotificationStore()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload')
      setCsvData(null)
      setUploadedFile(null)
      setFieldMappings({})
      setIsMappingValid(false)
      setClientAssignments([])
      setIsAssignmentValid(false)
      setValidatedRows([])
      setIsImporting(false)
    }
  }, [isOpen])

  const getCurrentStepIndex = () => STEPS.findIndex(s => s.key === currentStep)

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'upload':
        return csvData !== null
      case 'map':
        return isMappingValid
      case 'assign':
        return isAssignmentValid
      case 'preview':
        return validatedRows.some(r => r.isValid)
      default:
        return false
    }
  }

  const canGoBack = (): boolean => {
    return currentStep !== 'upload'
  }

  const goNext = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].key)
    }
  }

  const goBack = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key)
    }
  }

  const handleFileProcessed = (data: CsvData, file: File) => {
    setCsvData(data)
    setUploadedFile(file)
  }

  const handleFileRemoved = () => {
    setCsvData(null)
    setUploadedFile(null)
    setFieldMappings({})
    setIsMappingValid(false)
    setClientAssignments([])
    setIsAssignmentValid(false)
    setValidatedRows([])
  }

  const handleImport = async () => {
    const validRows = validatedRows.filter(r => r.isValid)
    if (validRows.length === 0) {
      showNotification('No valid rows to import', 'error')
      return
    }

    setIsImporting(true)

    try {
      // Build the payload
      const properties: BulkImportPropertyPayload[] = validRows.map(row => ({
        clientId: row.data.clientId || '',
        listingName: row.data.listingName || '',
        listingId: row.data.listingId || '',
        address: row.data.address || '',
        province: row.data.province || '',
        propertyType: row.data.propertyType || 'STR',
        commissionRate: row.data.commissionRate,
        postalCode: row.data.postalCode,
        externalName: row.data.externalName,
        internalName: row.data.internalName,
        description: row.data.description
      }))

      const response = await bulkImportProperties({
        properties,
        skipDuplicates: true
      })

      if (response.status === 'success' && response.data) {
        const { summary, imported } = response.data
        showNotification(
          `Successfully imported ${summary.imported} properties${summary.skipped > 0 ? `. ${summary.skipped} skipped.` : ''}`,
          'success'
        )
        onImportComplete(imported)
        onClose()
      } else {
        showNotification(response.message || 'Import failed', 'error')
      }
    } catch (error) {
      console.error('Import error:', error)
      showNotification('Error during import', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <UploadStep
            onFileProcessed={handleFileProcessed}
            onFileRemoved={handleFileRemoved}
            existingFile={uploadedFile}
          />
        )
      case 'map':
        return csvData ? (
          <MapFieldsStep
            csvHeaders={csvData.headers}
            initialMappings={fieldMappings}
            onMappingsChange={setFieldMappings}
            onValidationChange={setIsMappingValid}
          />
        ) : null
      case 'assign':
        return csvData ? (
          <AssignClientsStep
            csvRows={csvData.rows}
            csvHeaders={csvData.headers}
            fieldMappings={fieldMappings}
            clients={clients}
            initialAssignments={clientAssignments}
            onAssignmentsChange={setClientAssignments}
            onValidationChange={setIsAssignmentValid}
          />
        ) : null
      case 'preview':
        return csvData ? (
          <PreviewStep
            csvRows={csvData.rows}
            csvHeaders={csvData.headers}
            fieldMappings={fieldMappings}
            clientAssignments={clientAssignments}
            existingProperties={existingProperties}
            clients={clients}
            onValidatedRows={setValidatedRows}
          />
        ) : null
      default:
        return null
    }
  }

  const validCount = validatedRows.filter(r => r.isValid).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-4xl max-h-[90vh]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Bulk Import Properties</h2>
          <p className="text-sm text-gray-500 mt-1">Import multiple properties from a CSV file</p>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.key === currentStep
              const isComplete = getCurrentStepIndex() > index
              const Icon = step.icon

              return (
                <React.Fragment key={step.key}>
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isComplete
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`ml-3 text-sm font-medium hidden sm:block ${
                        isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        isComplete ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {canGoBack() && (
                <motion.button
                  type="button"
                  onClick={goBack}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </motion.button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              {currentStep === 'preview' ? (
                <motion.button
                  type="button"
                  onClick={handleImport}
                  disabled={!canGoNext() || isImporting}
                  whileHover={{ scale: canGoNext() && !isImporting ? 1.02 : 1 }}
                  whileTap={{ scale: canGoNext() && !isImporting ? 0.98 : 1 }}
                  className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                    canGoNext() && !isImporting
                      ? 'text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Import {validCount} Properties
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext()}
                  whileHover={{ scale: canGoNext() ? 1.02 : 1 }}
                  whileTap={{ scale: canGoNext() ? 0.98 : 1 }}
                  className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                    canGoNext()
                      ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default BulkImportPropertyModal
