import type { PermissionKey } from './permissionTemplates'

// Maps each /property-manager/* route segment to its permission key
// Used by usePermissionGuard to check access and by sidebar filtering
export const ROUTE_PERMISSION_MAP: Record<string, PermissionKey> = {
  '/property-manager/dashboard': 'dashboard',
  '/property-manager/clients': 'clients',
  '/property-manager/properties': 'properties',
  '/property-manager/bookings': 'bookings',
  '/property-manager/incoming-bookings': 'incoming_bookings',
  '/property-manager/upload-bookings': 'upload_bookings',
  '/property-manager/reports': 'reports',
  '/property-manager/scheduled-reports': 'scheduled_reports',
  '/property-manager/report-templates': 'report_templates',
  '/property-manager/expenses': 'expenses',
  '/property-manager/turnover': 'turnover',
  '/property-manager/checklists': 'checklists',
  '/property-manager/supply-lists': 'supply_lists',
  '/property-manager/cleaners': 'cleaners',
  '/property-manager/analytics': 'analytics',
  '/property-manager/settings': 'settings',
}

// Maps sidebar item hrefs to permission keys (same data, different index)
export const SIDEBAR_PERMISSION_MAP: Record<string, PermissionKey> = ROUTE_PERMISSION_MAP
