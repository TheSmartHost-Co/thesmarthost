// Cleaner entity - staff managed by PM
export interface Cleaner {
  id: string
  userId: string           // PM who manages this cleaner
  authUserId?: string      // Supabase auth user (for cleaner login)
  name: string
  email?: string
  phone?: string
  hourlyRate?: number
  defaultTurnaroundMinutes: number
  status: 'invited' | 'active' | 'inactive'
  invoicePrefix?: string | null
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
  createdAt: string
  updatedAt?: string
  // Joined data
  assignedProperties?: CleanerProperty[]
}

// Cleaner-Property assignment
export interface CleanerProperty {
  id: string
  cleanerId: string
  propertyId: string
  propertyName?: string    // Joined from properties
  propertyAddress?: string // Joined from properties
  isDefault: boolean       // Primary cleaner for this property
  priority: number         // Backup order (1 = highest)
  rateType?: 'flat' | 'hourly' | null   // null = use cleaner's global hourlyRate
  rateAmount?: number | null             // Dollar amount (per cleaning or per hour)
  cleaningDurationMinutes?: number | null // Per-cleaner override for cleaning duration
  createdAt: string
  // Property specifications (joined from properties)
  numBeds?: number | null
  numBedrooms?: number | null
  numBathrooms?: number | null
  // Property WiFi & Access (joined from properties)
  wifiSsid?: string | null
  wifiPassword?: string | null
  accessCodes?: string | null
}

// Create payload - email is required for auth invite
export interface CreateCleanerPayload {
  userId: string
  name: string
  email: string  // Required for cleaner login
  phone?: string
  hourlyRate?: number
  defaultTurnaroundMinutes?: number
}

// Update payload
export interface UpdateCleanerPayload {
  name?: string
  email?: string | null
  phone?: string | null
  hourlyRate?: number | null
  defaultTurnaroundMinutes?: number
  status?: 'active' | 'inactive'
  invoicePrefix?: string | null
  taxHstEnabled?: boolean
  taxGstEnabled?: boolean
  taxQstEnabled?: boolean
}

// Assign properties payload
export interface AssignPropertiesPayload {
  assignments: {
    propertyId: string
    isDefault: boolean
    priority: number
    rateType?: 'flat' | 'hourly' | null
    rateAmount?: number | null
    cleaningDurationMinutes?: number | null
  }[]
}

// API responses
export interface CleanerResponse {
  status: 'success' | 'failed'
  data: Cleaner
  message?: string
}

export interface CleanersResponse {
  status: 'success' | 'failed'
  data: Cleaner[]
  message?: string
}

export interface DeleteCleanerResponse {
  status: 'success' | 'failed'
  message: string
}

// Stats for dashboard
export interface CleanerStats {
  total: number
  active: number
  inactive: number
  invited: number
  withAssignments: number
}

export interface CleanerStatsResponse {
  status: 'success' | 'failed'
  data: CleanerStats
  message?: string
}

// Unified schedule endpoint response
export interface CleanerScheduleResponse {
  status: 'success' | 'failed'
  data: {
    cleaner: Omit<Cleaner, 'assignedProperties'>
    assignedProperties: CleanerProperty[]
    bookings: import('./booking').Booking[]
    cleaningProjects: import('./cleaningProject').CleaningProject[]
  }
  message?: string
}
