// Contractor entity - trade workers (handymen, lawn care, repairs) managed by PM
export interface Contractor {
  id: string
  userId: string           // PM who manages this contractor
  authUserId?: string      // Supabase auth user (for contractor login)
  name: string
  email?: string
  phone?: string
  trade?: string           // Free-text specialty, e.g. "Lawn care", "Plumbing"
  hourlyRate?: number
  status: 'invited' | 'active' | 'inactive'
  invoicePrefix?: string | null
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
  createdAt: string
  updatedAt?: string
}

// Create payload - email is required for auth invite
export interface CreateContractorPayload {
  userId: string
  name: string
  email: string  // Required for contractor login
  phone?: string
  trade?: string
  hourlyRate?: number
}

// Update payload
export interface UpdateContractorPayload {
  name?: string
  email?: string | null
  phone?: string | null
  trade?: string | null
  hourlyRate?: number | null
  status?: 'active' | 'inactive'
  invoicePrefix?: string | null
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
}

// API responses
export interface ContractorResponse {
  status: 'success' | 'failed'
  data: Contractor
  message?: string
}

export interface ContractorsResponse {
  status: 'success' | 'failed'
  data: Contractor[]
  message?: string
}

export interface DeleteContractorResponse {
  status: 'success' | 'failed'
  message: string
}

// Stats for dashboard
export interface ContractorStats {
  total: number
  active: number
  inactive: number
  invited: number
}

export interface ContractorStatsResponse {
  status: 'success' | 'failed'
  data: ContractorStats
  message?: string
}
