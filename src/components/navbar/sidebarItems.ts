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
  WrenchScrewdriverIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

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
          { name: 'Analytics', href: '/property-manager/analytics', icon: ChartBarIcon },
        ],
      },
    },
  ],
  bottom: [
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
  { name: 'Calendar', href: '/property-manager/turnover', icon: ClipboardDocumentListIcon },
  { name: 'Checklists', href: '/property-manager/checklists', icon: ClipboardDocumentCheckIcon },
  { name: 'Supply Lists', href: '/property-manager/supply-lists', icon: ShoppingCartIcon },
  { name: 'Cleaners', href: '/property-manager/cleaners', icon: UserCircleIcon },
  { name: 'Invoices', href: '/property-manager/invoices', icon: BanknotesIcon },
  { name: 'Analytics', href: '/property-manager/analytics', icon: ChartBarIcon },
  { name: 'Team Members', href: '/property-manager/team', icon: UsersIcon },
  { name: 'Settings', href: '/property-manager/settings', icon: CogIcon },
]

export const cleanerSidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/cleaner/dashboard', icon: HomeIcon },
  { name: 'My Properties', href: '/cleaner/properties', icon: BuildingOfficeIcon },
  { name: 'Tasks', href: '/cleaner/tasks', icon: ClipboardDocumentListIcon },
  { name: 'My Supplies', href: '/cleaner/supplies', icon: ShoppingCartIcon },
  { name: 'Schedule', href: '/cleaner/schedule', icon: CalendarDaysIcon },
  { name: 'Invoices', href: '/cleaner/invoices', icon: BanknotesIcon },
  { name: 'Settings', href: '/cleaner/settings', icon: CogIcon },
]
