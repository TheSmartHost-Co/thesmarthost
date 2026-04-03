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
export const managerNavConfig: SidebarNavConfig = {
  top: [
    {
      type: 'item',
      item: {
        name: 'Dashboard',
        href: '/property-manager/dashboard',
        icon: HomeIcon,
      },
    },
    {
      type: 'group',
      group: {
        label: 'Portfolio',
        icon: FolderIcon,
        items: [
          { name: 'Clients', href: '/property-manager/clients', icon: UserGroupIcon },
          { name: 'Properties', href: '/property-manager/properties', icon: BuildingOfficeIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'Bookings',
        icon: BookOpenIcon,
        items: [
          { name: 'Bookings', href: '/property-manager/bookings', icon: CalendarDaysIcon },
          { name: 'Incoming Bookings', href: '/property-manager/incoming-bookings', icon: InboxArrowDownIcon },
          { name: 'Upload Bookings', href: '/property-manager/upload-bookings', icon: CloudArrowUpIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'Reports',
        icon: DocumentTextIcon,
        items: [
          { name: 'Reports', href: '/property-manager/reports', icon: DocumentTextIcon },
          { name: 'Scheduled Reports', href: '/property-manager/scheduled-reports', icon: ClockIcon },
          { name: 'Report Templates', href: '/property-manager/report-templates', icon: RectangleStackIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'Turnover',
        icon: WrenchScrewdriverIcon,
        items: [
          { name: 'Calendar', href: '/property-manager/turnover', icon: ClipboardDocumentListIcon },
          { name: 'Checklists', href: '/property-manager/checklists', icon: ClipboardDocumentCheckIcon },
          { name: 'Supply Lists', href: '/property-manager/supply-lists', icon: ShoppingCartIcon },
          { name: 'Cleaners', href: '/property-manager/cleaners', icon: UserCircleIcon },
          { name: 'Invoices', href: '/property-manager/invoices', icon: BanknotesIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'Financial',
        icon: CurrencyDollarIcon,
        items: [
          { name: 'Expenses', href: '/property-manager/expenses', icon: BanknotesIcon },
          { name: 'Receipts', href: '/property-manager/receipts', icon: ReceiptPercentIcon },
          { name: 'Analytics', href: '/property-manager/analytics', icon: ChartBarIcon },
        ],
      },
    },
    {
      type: 'group',
      group: {
        label: 'Info',
        icon: InformationCircleIcon,
        items: [
          { name: "What's New", href: '/property-manager/whats-new', icon: SparklesIcon },
        ],
      },
    },
  ],
  bottom: [
    { name: 'Client Portal', href: '/property-manager/client-portal', icon: UserGroupIcon },
    { name: 'Team Members', href: '/property-manager/team', icon: UsersIcon },
    { name: 'Settings', href: '/property-manager/settings', icon: CogIcon },
  ],
}

// Flat item lists (kept for backward compatibility and cleaner sidebar)
export const managerSidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/property-manager/dashboard', icon: HomeIcon },
  { name: 'Clients', href: '/property-manager/clients', icon: UserGroupIcon },
  { name: 'Properties', href: '/property-manager/properties', icon: BuildingOfficeIcon },
  { name: 'Bookings', href: '/property-manager/bookings', icon: CalendarDaysIcon },
  { name: 'Incoming Bookings', href: '/property-manager/incoming-bookings', icon: InboxArrowDownIcon },
  { name: 'Upload Bookings', href: '/property-manager/upload-bookings', icon: CloudArrowUpIcon },
  { name: 'Reports', href: '/property-manager/reports', icon: DocumentTextIcon },
  { name: 'Scheduled Reports', href: '/property-manager/scheduled-reports', icon: ClockIcon },
  { name: 'Report Templates', href: '/property-manager/report-templates', icon: RectangleStackIcon },
  { name: 'Expenses', href: '/property-manager/expenses', icon: BanknotesIcon },
  { name: 'Receipts', href: '/property-manager/receipts', icon: ReceiptPercentIcon },
  { name: 'Calendar', href: '/property-manager/turnover', icon: ClipboardDocumentListIcon },
  { name: 'Checklists', href: '/property-manager/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'Supply Lists', href: '/property-manager/supply-lists', icon: ShoppingCartIcon },
  { name: 'Cleaners', href: '/property-manager/cleaners', icon: UserCircleIcon },
  { name: 'Invoices', href: '/property-manager/invoices', icon: BanknotesIcon },
  { name: 'Analytics', href: '/property-manager/analytics', icon: ChartBarIcon },
  { name: 'Team Members', href: '/property-manager/team', icon: UsersIcon },
  { name: "What's New", href: '/property-manager/whats-new', icon: SparklesIcon },
  { name: 'Settings', href: '/property-manager/settings', icon: CogIcon },
]

export const cleanerSidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/cleaner/dashboard', icon: HomeIcon },
  { name: 'My Properties', href: '/cleaner/properties', icon: BuildingOfficeIcon },
  { name: 'Tasks', href: '/cleaner/tasks', icon: ClipboardDocumentListIcon },
  { name: 'My Supplies', href: '/cleaner/supplies', icon: ShoppingCartIcon },
  { name: 'Receipts', href: '/cleaner/receipts', icon: ReceiptPercentIcon },
  { name: 'Schedule', href: '/cleaner/schedule', icon: CalendarDaysIcon },
  { name: 'Invoices', href: '/cleaner/invoices', icon: BanknotesIcon },
  { name: "What's New", href: '/cleaner/whats-new', icon: SparklesIcon },
  { name: 'Settings', href: '/cleaner/settings', icon: CogIcon },
]

export const clientSidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/client/dashboard', icon: HomeIcon },
  { name: 'My Properties', href: '/client/properties', icon: BuildingOfficeIcon },
  { name: 'Bookings', href: '/client/bookings', icon: CalendarDaysIcon },
  { name: 'Reports', href: '/client/reports', icon: DocumentTextIcon },
  { name: 'Schedule', href: '/client/cleaning', icon: ClipboardDocumentListIcon },
  { name: 'Projects', href: '/client/projects', icon: WrenchScrewdriverIcon },
  { name: 'Checklists', href: '/client/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'Issues', href: '/client/issues', icon: ExclamationTriangleIcon },
  { name: "What's New", href: '/client/whats-new', icon: SparklesIcon },
  { name: 'Settings', href: '/client/settings', icon: CogIcon },
]
