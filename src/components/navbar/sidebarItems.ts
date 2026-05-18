import {
  HomeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  CloudArrowUpIcon,
  CalendarDaysIcon,
  InboxArrowDownIcon,
  BanknotesIcon,
  ClockIcon,
  RectangleStackIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  FolderIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  MegaphoneIcon,
  InformationCircleIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

export const ADMIN_USER_IDS: string[] = [
  'fbb14321-b067-4a0d-af82-d43a8a6d9b5a',
  'c3639f35-7dd7-4373-874b-d929c260454e',
  '440f746a-392b-4334-95e0-64505aac29f7',
  '70c69238-88e2-47ad-80f0-053bc3169a3c',
]

export interface SidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface SidebarGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: SidebarItem[]
}

export type SidebarNavEntry =
  | { type: 'item'; item: SidebarItem }
  | { type: 'group'; group: SidebarGroup }

export interface SidebarNavConfig {
  top: SidebarNavEntry[]
  bottom: SidebarItem[]
}

// Grouped navigation config for property manager sidebar
// NOTE: `name` and `label` values are i18n keys resolved via t(key, { ns: 'nav' })
export const managerNavConfig: SidebarNavConfig = {
  top: [
    {
      type: 'item',
      item: {
        name: 'dashboard',
        href: '/property-manager/dashboard',
        icon: HomeIcon,
      },
    },
    {
      type: 'group',
      group: {
        label: 'portfolio',
        icon: FolderIcon,
        items: [
          { name: 'clients', href: '/property-manager/clients', icon: UserGroupIcon },
          { name: 'properties', href: '/property-manager/properties', icon: BuildingOfficeIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'bookings',
        icon: BookOpenIcon,
        items: [
          { name: 'bookings', href: '/property-manager/bookings', icon: CalendarDaysIcon },
          { name: 'incomingBookings', href: '/property-manager/incoming-bookings', icon: InboxArrowDownIcon },
          { name: 'uploadBookings', href: '/property-manager/upload-bookings', icon: CloudArrowUpIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'reports',
        icon: DocumentTextIcon,
        items: [
          { name: 'reports', href: '/property-manager/reports', icon: DocumentTextIcon },
          { name: 'scheduledReports', href: '/property-manager/scheduled-reports', icon: ClockIcon },
          { name: 'reportTemplates', href: '/property-manager/report-templates', icon: RectangleStackIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'turnover',
        icon: WrenchScrewdriverIcon,
        items: [
          { name: 'calendar', href: '/property-manager/turnover', icon: ClipboardDocumentListIcon },
          { name: 'checklists', href: '/property-manager/checklists', icon: ClipboardDocumentCheckIcon },
          { name: 'supplyLists', href: '/property-manager/supply-lists', icon: ShoppingCartIcon },
          { name: 'cleaners', href: '/property-manager/cleaners', icon: UserCircleIcon },
          { name: 'invoices', href: '/property-manager/invoices', icon: BanknotesIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'financial',
        icon: CurrencyDollarIcon,
        items: [
          { name: 'expenses', href: '/property-manager/expenses', icon: BanknotesIcon },
          { name: 'receipts', href: '/property-manager/receipts', icon: ReceiptPercentIcon },
          { name: 'analytics', href: '/property-manager/analytics', icon: ChartBarIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'aiAutomations',
        icon: BoltIcon,
        items: [
          { name: 'automationDashboard', href: '/property-manager/ai-automations/dashboard', icon: Squares2X2Icon },
          { name: 'reviewNudge', href: '/property-manager/ai-automations/review-nudge', icon: MegaphoneIcon },
          { name: 'guestReview', href: '/property-manager/ai-automations/guest-review', icon: StarIcon },
          { name: 'messageAutomation', href: '/property-manager/ai-automations/message-automation', icon: ChatBubbleLeftRightIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'info',
        icon: InformationCircleIcon,
        items: [
          { name: 'whatsNew', href: '/property-manager/whats-new', icon: SparklesIcon },
        ],
      },
    },
  ],
  bottom: [
    { name: 'clientPortal', href: '/property-manager/client-portal', icon: UserGroupIcon },
    { name: 'teamMembers', href: '/property-manager/team', icon: UsersIcon },
    { name: 'timeSheet', href: '/property-manager/time-sheet', icon: ClockIcon },
    { name: 'auditLog', href: '/property-manager/audit', icon: ClipboardDocumentListIcon },
    { name: 'settings', href: '/property-manager/settings', icon: CogIcon },
  ],
}

// Flat item lists (kept for backward compatibility and cleaner sidebar)
// NOTE: `name` values are i18n keys resolved via t(key, { ns: 'nav' })
export const managerSidebarItems: SidebarItem[] = [
  { name: 'dashboard', href: '/property-manager/dashboard', icon: HomeIcon },
  { name: 'clients', href: '/property-manager/clients', icon: UserGroupIcon },
  { name: 'properties', href: '/property-manager/properties', icon: BuildingOfficeIcon },
  { name: 'bookings', href: '/property-manager/bookings', icon: CalendarDaysIcon },
  { name: 'incomingBookings', href: '/property-manager/incoming-bookings', icon: InboxArrowDownIcon },
  { name: 'uploadBookings', href: '/property-manager/upload-bookings', icon: CloudArrowUpIcon },
  { name: 'reports', href: '/property-manager/reports', icon: DocumentTextIcon },
  { name: 'scheduledReports', href: '/property-manager/scheduled-reports', icon: ClockIcon },
  { name: 'reportTemplates', href: '/property-manager/report-templates', icon: RectangleStackIcon },
  { name: 'expenses', href: '/property-manager/expenses', icon: BanknotesIcon },
  { name: 'receipts', href: '/property-manager/receipts', icon: ReceiptPercentIcon },
  { name: 'calendar', href: '/property-manager/turnover', icon: ClipboardDocumentListIcon },
  { name: 'checklists', href: '/property-manager/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'supplyLists', href: '/property-manager/supply-lists', icon: ShoppingCartIcon },
  { name: 'cleaners', href: '/property-manager/cleaners', icon: UserCircleIcon },
  { name: 'invoices', href: '/property-manager/invoices', icon: BanknotesIcon },
  { name: 'analytics', href: '/property-manager/analytics', icon: ChartBarIcon },
  { name: 'teamMembers', href: '/property-manager/team', icon: UsersIcon },
  { name: 'timeSheet', href: '/property-manager/time-sheet', icon: ClockIcon },
  { name: 'automationDashboard', href: '/property-manager/ai-automations/dashboard', icon: Squares2X2Icon },
  { name: 'reviewNudge', href: '/property-manager/ai-automations/review-nudge', icon: MegaphoneIcon },
  { name: 'guestReview', href: '/property-manager/ai-automations/guest-review', icon: StarIcon },
  { name: 'messageAutomation', href: '/property-manager/ai-automations/message-automation', icon: ChatBubbleLeftRightIcon },
  { name: 'whatsNew', href: '/property-manager/whats-new', icon: SparklesIcon },
  { name: 'auditLog', href: '/property-manager/audit', icon: ClipboardDocumentListIcon },
  { name: 'settings', href: '/property-manager/settings', icon: CogIcon },
]

export const cleanerSidebarItems: SidebarItem[] = [
  { name: 'dashboard', href: '/cleaner/dashboard', icon: HomeIcon },
  { name: 'schedule', href: '/cleaner/schedule', icon: CalendarDaysIcon },
  { name: 'tasks', href: '/cleaner/tasks', icon: ClipboardDocumentListIcon },
  { name: 'myProperties', href: '/cleaner/properties', icon: BuildingOfficeIcon },
  { name: 'mySupplies', href: '/cleaner/supplies', icon: ShoppingCartIcon },
  { name: 'receipts', href: '/cleaner/receipts', icon: ReceiptPercentIcon },
  { name: 'invoices', href: '/cleaner/invoices', icon: BanknotesIcon },
  { name: 'whatsNew', href: '/cleaner/whats-new', icon: SparklesIcon },
  { name: 'settings', href: '/cleaner/settings', icon: CogIcon },
]

export const clientSidebarItems: SidebarItem[] = [
  { name: 'dashboard', href: '/client/dashboard', icon: HomeIcon },
  { name: 'myProperties', href: '/client/properties', icon: BuildingOfficeIcon },
  { name: 'bookings', href: '/client/bookings', icon: CalendarDaysIcon },
  { name: 'reports', href: '/client/reports', icon: DocumentTextIcon },
  { name: 'schedule', href: '/client/cleaning', icon: ClipboardDocumentListIcon },
  { name: 'projects', href: '/client/projects', icon: WrenchScrewdriverIcon },
  { name: 'checklists', href: '/client/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'issues', href: '/client/issues', icon: ExclamationTriangleIcon },
  { name: 'whatsNew', href: '/client/whats-new', icon: SparklesIcon },
  { name: 'settings', href: '/client/settings', icon: CogIcon },
]
