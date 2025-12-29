export interface PropertyLicense {
  id: string
  propertyId: string
  filePath: string
  licenseTitle: string
  notes?: string
  uploadedBy: string
  uploadedByName?: string
  createdAt: string
}

export interface PropertyLicenseCount {
  propertyId: string
  totalLicenses: number
}

export interface CreatePropertyLicensePayload {
  propertyId: string
  licenseTitle: string
  notes?: string
  uploadedBy: string
  file: File
}

export interface UpdatePropertyLicensePayload {
  licenseTitle?: string
  notes?: string
}

export interface PropertyLicenseDownload {
  downloadUrl: string
  licenseTitle: string
  fileName: string
  fileExtension: string
}

// Response types
export interface PropertyLicenseResponse {
  status: 'success' | 'failed'
  data: PropertyLicense
  message?: string
}

export interface PropertyLicensesResponse {
  status: 'success' | 'failed'
  data: PropertyLicense[]
  message?: string
}

export interface PropertyLicenseCountResponse {
  status: 'success' | 'failed'
  data: PropertyLicenseCount
  message?: string
}

export interface PropertyLicenseDownloadResponse {
  status: 'success' | 'failed'
  data: PropertyLicenseDownload
  message?: string
}

export interface DeletePropertyLicenseResponse {
  status: 'success' | 'failed'
  message: string
}
