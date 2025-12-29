import apiClient from './apiClient'
import { createClient } from '@/utils/supabase/component'
import type {
  PropertyLicenseResponse,
  PropertyLicensesResponse,
  PropertyLicenseCountResponse,
  PropertyLicenseDownloadResponse,
  DeletePropertyLicenseResponse,
  CreatePropertyLicensePayload,
  UpdatePropertyLicensePayload,
} from './types/propertyLicense'

/**
 * Get all licenses for a property
 */
export function getLicensesByPropertyId(propertyId: string): Promise<PropertyLicensesResponse> {
  return apiClient<PropertyLicensesResponse>(`/property-licenses/${propertyId}`)
}

/**
 * Get license count for a property
 */
export function getLicenseCount(propertyId: string): Promise<PropertyLicenseCountResponse> {
  return apiClient<PropertyLicenseCountResponse>(`/property-licenses/${propertyId}/count`)
}

/**
 * Get a specific license by ID
 */
export function getLicenseById(id: string): Promise<PropertyLicenseResponse> {
  return apiClient<PropertyLicenseResponse>(`/property-licenses/detail/${id}`)
}

/**
 * Upload a new license for a property
 */
export async function createLicense(
  licenseData: CreatePropertyLicensePayload
): Promise<PropertyLicenseResponse> {
  const formData = new FormData()
  formData.append('file', licenseData.file)
  formData.append('propertyId', licenseData.propertyId)
  formData.append('licenseTitle', licenseData.licenseTitle)
  formData.append('uploadedBy', licenseData.uploadedBy)

  if (licenseData.notes) {
    formData.append('notes', licenseData.notes)
  }

  // Get auth token for the request
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers: HeadersInit = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/property-licenses`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Update license metadata
 */
export function updateLicense(
  id: string,
  updateData: UpdatePropertyLicensePayload
): Promise<PropertyLicenseResponse> {
  return apiClient<PropertyLicenseResponse>(`/property-licenses/${id}`, {
    method: 'PUT',
    body: updateData,
  })
}

/**
 * Delete a license
 */
export function deleteLicense(id: string): Promise<DeletePropertyLicenseResponse> {
  return apiClient<DeletePropertyLicenseResponse>(`/property-licenses/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Get signed download URL for a license
 */
export function getLicenseDownloadUrl(id: string): Promise<PropertyLicenseDownloadResponse> {
  return apiClient<PropertyLicenseDownloadResponse>(`/property-licenses/download/${id}`)
}

/**
 * Helper function to download a license file
 */
export async function downloadLicense(id: string, filename?: string): Promise<void> {
  try {
    const response = await getLicenseDownloadUrl(id)
    if (response.status === 'success') {
      // Fetch the file and trigger browser download
      const fileResponse = await fetch(response.data.downloadUrl)
      const blob = await fileResponse.blob()

      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `${response.data.licenseTitle}${response.data.fileExtension}`
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

/**
 * Helper function to get document URL for preview
 */
export async function getLicensePreviewUrl(id: string): Promise<string> {
  try {
    const response = await getLicenseDownloadUrl(id)
    if (response.status === 'success') {
      return response.data.downloadUrl
    }
    throw new Error('Failed to get preview URL')
  } catch (error) {
    console.error('Preview URL failed:', error)
    throw error
  }
}
