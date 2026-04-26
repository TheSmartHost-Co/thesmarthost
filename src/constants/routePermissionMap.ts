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
  '/property-manager/invoices': 'invoices',
  '/property-manager/analytics': 'analytics',
  '/property-manager/receipts': 'receipts',
  '/property-manager/client-portal': 'client_portal',
  '/property-manager/whats-new': 'whats_new',
  '/property-manager/settings': 'settings',
  '/property-manager/ai-automations': 'automation_dashboard',
  '/property-manager/ai-automations/dashboard': 'automation_dashboard',
  '/property-manager/ai-automations/review-nudge': 'automation_review_nudge',
  '/property-manager/ai-automations/guest-review': 'automation_guest_review',
  '/property-manager/ai-automations/message-automation': 'automation_message',
}

// Maps sidebar item hrefs to permission keys (same data, different index)
export const SIDEBAR_PERMISSION_MAP: Record<string, PermissionKey> = ROUTE_PERMISSION_MAP
