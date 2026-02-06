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
  UserCircleIcon,
} from '@heroicons/react/24/outline'

export interface SidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const managerSidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/property-manager/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Clients',
    href: '/property-manager/clients',
    icon: UserGroupIcon,
  },
  {
    name: 'Properties',
    href: '/property-manager/properties',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Bookings',
    href: '/property-manager/bookings',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Incoming Bookings',
    href: '/property-manager/incoming-bookings',
    icon: InboxArrowDownIcon,
  },
  {
    name: 'Upload Bookings',
    href: '/property-manager/upload-bookings',
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Reports',
    href: '/property-manager/reports',
    icon: DocumentTextIcon,
  },
  {
    name: 'Scheduled Reports',
    href: '/property-manager/scheduled-reports',
    icon: ClockIcon,
  },
  {
    name: 'Report Templates',
    href: '/property-manager/report-templates',
    icon: RectangleStackIcon,
  },
  {
    name: 'Expenses',
    href: '/property-manager/expenses',
    icon: BanknotesIcon,
  },
  {
    name: 'Turnover',
    href: '/property-manager/turnover',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Cleaners',
    href: '/property-manager/cleaners',
    icon: UserCircleIcon,
  },
  {
    name: 'Analytics',
    href: '/property-manager/analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Settings',
    href: '/property-manager/settings',
    icon: CogIcon,
  },
]

export const cleanerSidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/cleaner/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'My Properties',
    href: '/cleaner/properties',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Tasks',
    href: '/cleaner/tasks',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Schedule',
    href: '/cleaner/schedule',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Settings',
    href: '/cleaner/settings',
    icon: CogIcon,
  },
]
