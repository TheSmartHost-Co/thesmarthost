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

  console.log('Creating FormData with:', {
    fileName: data.file.name,
    fileSize: data.file.size,
    fileType: data.file.type,
    userId: data.user_id,
    propertyId: data.property_id
  })

  // Create FormData for file upload
  const formData = new FormData()
  formData.append('csvFile', data.file, data.file.name)
  formData.append('user_id', data.user_id)
  formData.append('property_id', data.property_id)

  // Log FormData contents for debugging
  console.log('FormData entries:')
  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value)
  }

  try {
    // Use fetch directly for FormData (apiClient might not handle it correctly)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/csv-uploads`, {
      method: 'POST',
      body: formData,
    })

    console.log('Upload response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Upload error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const result = await response.json()
    console.log('Upload success:', result)
    return result
  } catch (error) {
    console.error('Upload failed:', error)
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