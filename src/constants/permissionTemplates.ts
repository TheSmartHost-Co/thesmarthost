// Permission keys map to pages/resources in the property manager portal
export const PERMISSION_KEYS = [
  'dashboard',
  'clients',
  'properties',
  'bookings',
  'incoming_bookings',
  'upload_bookings',
  'reports',
  'scheduled_reports',
  'report_templates',
  'expenses',
  'turnover',
  'checklists',
  'supply_lists',
  'cleaners',
  'analytics',
  'settings',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]
export type PermissionLevel = 'none' | 'read' | 'read-write'
export type Permissions = Record<PermissionKey, PermissionLevel>

// Human-readable labels for each permission key (used in PermissionEditor UI)
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  properties: 'Properties',
  bookings: 'Bookings',
  incoming_bookings: 'Incoming Bookings',
  upload_bookings: 'Upload Bookings',
  reports: 'Reports',
  scheduled_reports: 'Scheduled Reports',
  report_templates: 'Report Templates',
  expenses: 'Expenses',
  turnover: 'Calendar (Turnover)',
  checklists: 'Checklists',
  supply_lists: 'Supply Lists',
  cleaners: 'Cleaners',
  analytics: 'Analytics',
  settings: 'Settings',
}

// Default permissions for new team members (deny by default)
export const DEFAULT_PERMISSIONS: Permissions = {
  dashboard: 'read',
  clients: 'none',
  properties: 'none',
  bookings: 'none',
  incoming_bookings: 'none',
  upload_bookings: 'none',
  reports: 'none',
  scheduled_reports: 'none',
  report_templates: 'none',
  expenses: 'none',
  turnover: 'none',
  checklists: 'none',
  supply_lists: 'none',
  cleaners: 'none',
  analytics: 'none',
  settings: 'none',
}

// Preset templates for common team member roles
export interface PermissionTemplate {
  label: string
  description: string
  permissions: Permissions
}

export const PERMISSION_TEMPLATES: Record<string, PermissionTemplate> = {
  full_access: {
    label: 'Full Access',
    description: 'Read-write access to all pages except settings',
    permissions: {
      dashboard: 'read-write',
      clients: 'read-write',
      properties: 'read-write',
      bookings: 'read-write',
      incoming_bookings: 'read-write',
      upload_bookings: 'read-write',
      reports: 'read-write',
      scheduled_reports: 'read-write',
      report_templates: 'read-write',
      expenses: 'read-write',
      turnover: 'read-write',
      checklists: 'read-write',
      supply_lists: 'read-write',
      cleaners: 'read-write',
      analytics: 'read-write',
      settings: 'none',
    },
  },
  reports_only: {
    label: 'Reports & Analytics',
    description: 'View data, manage reports and analytics',
    permissions: {
      dashboard: 'read',
      clients: 'read',
      properties: 'read',
      bookings: 'read',
      incoming_bookings: 'read',
      upload_bookings: 'none',
      reports: 'read-write',
      scheduled_reports: 'read-write',
      report_templates: 'read-write',
      expenses: 'read',
      turnover: 'none',
      checklists: 'none',
      supply_lists: 'none',
      cleaners: 'none',
      analytics: 'read-write',
      settings: 'none',
    },
  },
  read_only: {
    label: 'View Only',
    description: 'Read-only access to all pages',
    permissions: {
      dashboard: 'read',
      clients: 'read',
      properties: 'read',
      bookings: 'read',
      incoming_bookings: 'read',
      upload_bookings: 'none',
      reports: 'read',
      scheduled_reports: 'read',
      report_templates: 'read',
      expenses: 'read',
      turnover: 'read',
      checklists: 'read',
      supply_lists: 'read',
      cleaners: 'read',
      analytics: 'read',
      settings: 'none',
    },
  },
  operations: {
    label: 'Operations',
    description: 'Manage turnover, cleaners, and supplies',
    permissions: {
      dashboard: 'read',
      clients: 'read',
      properties: 'read',
      bookings: 'read',
      incoming_bookings: 'read',
      upload_bookings: 'none',
      reports: 'none',
      scheduled_reports: 'none',
      report_templates: 'none',
      expenses: 'read-write',
      turnover: 'read-write',
      checklists: 'read-write',
      supply_lists: 'read-write',
      cleaners: 'read-write',
      analytics: 'none',
      settings: 'none',
    },
  },
  custom: {
    label: 'Custom',
    description: 'Set permissions manually',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
}

// Utility: check if a permission level meets a required level
export function meetsPermissionLevel(
  actual: PermissionLevel | undefined,
  required: PermissionLevel
): boolean {
  if (required === 'none') return true
  if (!actual || actual === 'none') return false
  if (required === 'read') return actual === 'read' || actual === 'read-write'
  if (required === 'read-write') return actual === 'read-write'
  return false
}
