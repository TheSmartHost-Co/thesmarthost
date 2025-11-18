/**
 * CSV Upload Service
 * Handles CSV file upload tracking and metadata
 */

import apiClient from './apiClient'

/**
 * CSV Upload interfaces
 */
export interface CsvUpload {
  id: string
  propertyId?: string
  fileName: string
  filePath?: string
  uploadDate: string
  userId: string
}

export interface CreateCsvUploadPayload {
  file: File
  user_id: string
  property_id: string
}

export interface CsvUploadResponse {
  status: 'success' | 'failed'
  message?: string
  data: CsvUpload
}

/**
 * Upload a CSV file and create upload record
 * @param data - CSV upload payload with file
 * @returns Promise with created CSV upload record
 */
export async function uploadCsvFile(
  data: CreateCsvUploadPayload
): Promise<CsvUploadResponse> {
  // Validate file before creating FormData
  if (!data.file || !(data.file instanceof File)) {
    throw new Error('Invalid file provided for upload')
  }

  if (!data.file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('File must be a CSV file')
  }

  // Create a fresh File object to avoid any corruption from React state management
  const fileContent = await data.file.text()
  const freshFile = new File([fileContent], data.file.name, { type: 'text/csv' })

  // Create FormData for file upload
  const formData = new FormData()
  formData.append('csvFile', freshFile)
  formData.append('user_id', data.user_id)
  formData.append('property_id', data.property_id)

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/csv-uploads`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    throw error
  }
}

/**
 * Get CSV uploads by user
 * @param userId - User ID to filter by
 * @returns Promise with CSV uploads list
 */
export async function getCsvUploadsByUser(userId: string): Promise<{
  status: 'success' | 'failed'
  message?: string
  data: CsvUpload[]
}> {
  return apiClient(`/csv-uploads?user_id=${userId}`)
}