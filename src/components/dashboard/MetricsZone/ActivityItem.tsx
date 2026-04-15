'use client'

import { useRouter } from 'next/navigation'
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  HomeModernIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
  CheckBadgeIcon,
  DocumentCurrencyDollarIcon,
  PaperAirplaneIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  ReceiptPercentIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import type { DashboardActivity } from '@/services/types/dashboard'
import { TimeAgo } from '../shared/TimeAgo'

interface ActivityItemProps {
  activity: DashboardActivity
  showConnector: boolean
  onViewReport?: (reportId: string) => void
}

const getIconConfig = (type: DashboardActivity['type']) => {
  switch (type) {
    case 'report_generated':
      return { icon: DocumentTextIcon, dotBg: 'bg-gray-100', iconColor: 'text-slate-400' }
    case 'csv_uploaded':
      return { icon: CloudArrowUpIcon, dotBg: 'bg-gray-100', iconColor: 'text-slate-400' }
    case 'property_created':
    case 'property_updated':
      return { icon: HomeModernIcon, dotBg: 'bg-gray-100', iconColor: 'text-slate-400' }
    case 'client_created':
    case 'client_updated':
      return { icon: UserCircleIcon, dotBg: 'bg-gray-100', iconColor: 'text-slate-400' }
    case 'cleaning_project_created':
      return { icon: WrenchScrewdriverIcon, dotBg: 'bg-teal-50', iconColor: 'text-teal-600' }
    case 'cleaning_project_completed':
      return { icon: CheckBadgeIcon, dotBg: 'bg-teal-50', iconColor: 'text-teal-600' }
    case 'invoice_created':
      return { icon: DocumentCurrencyDollarIcon, dotBg: 'bg-blue-50', iconColor: 'text-blue-500' }
    case 'invoice_sent':
      return { icon: PaperAirplaneIcon, dotBg: 'bg-blue-50', iconColor: 'text-blue-500' }
    case 'invoice_paid':
      return { icon: BanknotesIcon, dotBg: 'bg-green-50', iconColor: 'text-green-600' }
    case 'supply_list_submitted':
      return { icon: ClipboardDocumentListIcon, dotBg: 'bg-amber-50', iconColor: 'text-amber-600' }
    case 'supply_list_fulfilled':
      return { icon: ClipboardDocumentCheckIcon, dotBg: 'bg-green-50', iconColor: 'text-green-600' }
    case 'receipt_uploaded':
      return { icon: ReceiptPercentIcon, dotBg: 'bg-purple-50', iconColor: 'text-purple-500' }
    case 'expense_added':
      return { icon: CurrencyDollarIcon, dotBg: 'bg-red-50', iconColor: 'text-red-500' }
    default:
      return null
  }
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, showConnector, onViewReport }) => {
  const router = useRouter()

  const iconConfig = getIconConfig(activity.type)

  const getViewAction = () => {
    if (activity.type === 'report_generated' && activity.metadata.reportId) {
      return () => onViewReport?.(activity.metadata.reportId!)
    }
    if (activity.type === 'csv_uploaded' && activity.metadata.propertyId) {
      return () => router.push(`/property-manager/bookings?propertyId=${activity.metadata.propertyId}`)
    }
    if ((activity.type === 'property_created' || activity.type === 'property_updated') && activity.metadata.propertyId) {
      return () => router.push('/property-manager/properties')
    }
    if ((activity.type === 'client_created' || activity.type === 'client_updated') && activity.metadata.clientId) {
      return () => router.push('/property-manager/clients')
    }
    if (activity.type === 'cleaning_project_created' || activity.type === 'cleaning_project_completed') {
      return () => router.push('/property-manager/turnover')
    }
    if (activity.type === 'invoice_created' || activity.type === 'invoice_sent' || activity.type === 'invoice_paid') {
      return () => router.push('/property-manager/invoices')
    }
    if (activity.type === 'supply_list_submitted' || activity.type === 'supply_list_fulfilled') {
      return () => router.push('/property-manager/supply-lists')
    }
    if (activity.type === 'receipt_uploaded') {
      return () => router.push('/property-manager/receipts')
    }
    if (activity.type === 'expense_added') {
      return () => router.push('/property-manager/expenses')
    }
    return null
  }

  const viewAction = getViewAction()
  const IconComponent = iconConfig?.icon

  return (
    <div className="relative flex gap-2.5 group">
      {/* Timeline connector */}
      {showConnector && (
        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-150" style={{ backgroundColor: '#e8e8e8' }} />
      )}

      {/* Dot */}
      <div className={`relative z-10 flex-shrink-0 w-[15px] h-[15px] rounded-full ${iconConfig?.dotBg ?? 'bg-gray-100'} ${iconConfig?.iconColor ?? 'text-slate-400'} flex items-center justify-center mt-0.5`}>
        {IconComponent && <IconComponent className="w-3 h-3" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-slate-700 leading-snug">{activity.description}</p>
            <TimeAgo timestamp={activity.timestamp} className="text-xs text-slate-400" />
          </div>
          {viewAction && (
            <button
              onClick={viewAction}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-pointer"
            >
              View
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
