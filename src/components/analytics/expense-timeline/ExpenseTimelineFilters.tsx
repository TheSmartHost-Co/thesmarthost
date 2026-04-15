'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  HomeModernIcon,
  TagIcon,
  CreditCardIcon,
  UserGroupIcon,
  BanknotesIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import MobileFilterDrawer from '@/components/shared/MobileFilterDrawer'
import { DATE_PRESETS } from '@/services/analyticsService'
import type { Property } from '@/services/types/property'
import type { DateRange, ExpenseGranularity } from '@/services/types/expenseAnalytics'
import type { CategoryInfo } from './useExpenseTimeline'
import { PAYMENT_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from './constants'

interface PaidByOption {
  id: string
  name: string
  type: string
}

interface ExpenseTimelineFiltersProps {
  dateRange: DateRange
  propertyIds: string[]
  categories: string[]
  paymentStatuses: string[]
  paidByIds: string[]
  paymentMethods: string[]
  isReimbursable: boolean | null
  isTaxDeductible: boolean | null
  granularity: ExpenseGranularity
  properties: Property[]
  categoryMap: Map<string, CategoryInfo>
  paidByOptions?: PaidByOption[]
  onDateRangeChange: (range: DateRange) => void
  onPropertyIdsChange: (ids: string[]) => void
  onCategoriesChange: (codes: string[]) => void
  onPaymentStatusesChange: (statuses: string[]) => void
  onPaidByIdsChange: (ids: string[]) => void
  onPaymentMethodsChange: (methods: string[]) => void
  onIsReimbursableChange: (value: boolean | null) => void
  onIsTaxDeductibleChange: (value: boolean | null) => void
  onGranularityChange: (g: ExpenseGranularity) => void
}

const GRANULARITY_OPTIONS: { value: ExpenseGranularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

// --- Reusable Dropdown ---
function Dropdown({
  trigger,
  children,
  isOpen,
  onOpenChange,
  align = 'left',
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onOpenChange])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => onOpenChange(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 z-50 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden min-w-[200px] ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Tri-State Toggle ---
function TriStateToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean | null) => void
}) {
  const options: { value: boolean | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
  ]

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium text-gray-500">{label}</span>
      <div className="flex items-center gap-0 rounded-lg bg-gray-100 p-0.5">
        {options.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
              value === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ExpenseTimelineFilters({
  dateRange,
  propertyIds,
  categories,
  paymentStatuses,
  paidByIds,
  paymentMethods,
  isReimbursable,
  isTaxDeductible,
  granularity,
  properties,
  categoryMap,
  paidByOptions = [],
  onDateRangeChange,
  onPropertyIdsChange,
  onCategoriesChange,
  onPaymentStatusesChange,
  onPaidByIdsChange,
  onPaymentMethodsChange,
  onIsReimbursableChange,
  onIsTaxDeductibleChange,
  onGranularityChange,
}: ExpenseTimelineFiltersProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [propOpen, setPropOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [paidByOpen, setPaidByOpen] = useState(false)
  const [customStart, setCustomStart] = useState(dateRange.startDate)
  const [customEnd, setCustomEnd] = useState(dateRange.endDate)

  const hasPropertyFilter = propertyIds.length > 0
  const hasCategoryFilter = categories.length > 0
  const hasStatusFilter = paymentStatuses.length > 0
  const hasPaidByFilter = paidByIds.length > 0
  const hasMethodFilter = paymentMethods.length > 0
  const hasReimbursableFilter = isReimbursable !== null
  const hasTaxDeductibleFilter = isTaxDeductible !== null

  const allCategories = Array.from(categoryMap.values())

  const hasActiveFilters = hasPropertyFilter || hasCategoryFilter || hasStatusFilter || hasPaidByFilter || hasMethodFilter || hasReimbursableFilter || hasTaxDeductibleFilter

  const activeFilterCount = (hasPropertyFilter ? 1 : 0) + (hasCategoryFilter ? 1 : 0) + (hasStatusFilter ? 1 : 0) + (hasPaidByFilter ? 1 : 0) + (hasMethodFilter ? 1 : 0) + (hasReimbursableFilter ? 1 : 0) + (hasTaxDeductibleFilter ? 1 : 0)

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const clearAllFilters = () => {
    onPropertyIdsChange([])
    onCategoriesChange([])
    onPaymentStatusesChange([])
    onPaidByIdsChange([])
    onPaymentMethodsChange([])
    onIsReimbursableChange(null)
    onIsTaxDeductibleChange(null)
  }

  // Mobile filter content (reused inside drawer)
  const mobileFilterContent = (
    <div className="space-y-4">
      {/* Date Range */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Date Range</p>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => { onDateRangeChange(preset.getValue()); setMobileDrawerOpen(false) }}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
        </div>
        {customStart && customEnd && (
          <button onClick={() => { onDateRangeChange({ startDate: customStart, endDate: customEnd }); setMobileDrawerOpen(false) }} className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">Apply Custom</button>
        )}
      </div>

      {/* Properties */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Properties</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {properties.map(prop => {
            const selected = propertyIds.includes(prop.id)
            return (
              <button key={prop.id} onClick={() => onPropertyIdsChange(selected ? propertyIds.filter(id => id !== prop.id) : [...propertyIds, prop.id])}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${selected ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="truncate">{prop.listingName || prop.externalName || prop.address || prop.id}</span>
                {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Categories</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {allCategories.map(cat => {
            const selected = categories.includes(cat.code)
            return (
              <button key={cat.code} onClick={() => onCategoriesChange(selected ? categories.filter(c => c !== cat.code) : [...categories, cat.code])}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${selected ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                <span className="flex-1 truncate text-left">{cat.label}</span>
                {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Payment Status */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Payment Status</p>
        <div className="space-y-1">
          {PAYMENT_STATUS_OPTIONS.map(opt => {
            const selected = paymentStatuses.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => onPaymentStatusesChange(selected ? paymentStatuses.filter(s => s !== opt.value) : [...paymentStatuses, opt.value])}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${selected ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                {opt.label}
                {selected && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Payment Method</p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHOD_OPTIONS.map(opt => {
            const selected = paymentMethods.includes(opt.value)
            return (
              <button key={opt.value} onClick={() => onPaymentMethodsChange(selected ? paymentMethods.filter(m => m !== opt.value) : [...paymentMethods, opt.value])}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toggles */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Flags</p>
        <div className="space-y-3">
          <TriStateToggle label="Reimbursable" value={isReimbursable} onChange={onIsReimbursableChange} />
          <TriStateToggle label="Tax Deductible" value={isTaxDeductible} onChange={onIsTaxDeductibleChange} />
        </div>
      </div>

      {/* Granularity */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Granularity</p>
        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onGranularityChange(opt.value)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${granularity === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-2 px-4 py-3">
      {/* Mobile filter trigger */}
      <div className="flex items-center gap-2 sm:hidden">
        <MobileFilterDrawer
          isOpen={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          activeCount={activeFilterCount}
          onClear={clearAllFilters}
        >
          {mobileFilterContent}
        </MobileFilterDrawer>
        <span className="text-xs text-gray-500">{formatDateDisplay(dateRange)}</span>
      </div>

      {/* Desktop: Primary filter row */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {/* Date Range */}
        <Dropdown
          isOpen={dateOpen}
          onOpenChange={setDateOpen}
          trigger={
            <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
              dateOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}>
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              {formatDateDisplay(dateRange)}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="p-2">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">Presets</p>
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => { onDateRangeChange(preset.getValue()); setDateOpen(false) }}
                className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                {preset.label}
              </button>
            ))}
            <div className="mt-2 border-t border-gray-100 pt-2">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">Custom</p>
              <div className="flex items-center gap-2 px-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs" />
              </div>
              <button
                onClick={() => { if (customStart && customEnd) { onDateRangeChange({ startDate: customStart, endDate: customEnd }); setDateOpen(false) } }}
                className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
        </Dropdown>

        {/* Property Multi-Select */}
        <Dropdown
          isOpen={propOpen}
          onOpenChange={setPropOpen}
          trigger={
            <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
              hasPropertyFilter ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : propOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}>
              <HomeModernIcon className="h-3.5 w-3.5" />
              {hasPropertyFilter ? `${propertyIds.length} properties` : 'All Properties'}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="max-h-60 overflow-y-auto p-2">
            {properties.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No properties found</p>
            ) : (
              properties.map(prop => {
                const selected = propertyIds.includes(prop.id)
                return (
                  <button
                    key={prop.id}
                    onClick={() => onPropertyIdsChange(selected ? propertyIds.filter(id => id !== prop.id) : [...propertyIds, prop.id])}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="truncate">{prop.listingName || prop.externalName || prop.address || prop.id}</span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </Dropdown>

        {/* Category Multi-Select */}
        <Dropdown
          isOpen={catOpen}
          onOpenChange={setCatOpen}
          trigger={
            <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
              hasCategoryFilter ? 'border-violet-300 bg-violet-50 text-violet-700'
                : catOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}>
              <TagIcon className="h-3.5 w-3.5" />
              {hasCategoryFilter ? `${categories.length} categories` : 'All Categories'}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="max-h-60 overflow-y-auto p-2">
            {allCategories.map(cat => {
              const selected = categories.includes(cat.code)
              return (
                <button
                  key={cat.code}
                  onClick={() => onCategoriesChange(selected ? categories.filter(c => c !== cat.code) : [...categories, cat.code])}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                  <span className="flex-1 truncate text-left">{cat.label}</span>
                  {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </Dropdown>

        {/* Payment Status Multi-Select */}
        <Dropdown
          isOpen={statusOpen}
          onOpenChange={setStatusOpen}
          trigger={
            <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
              hasStatusFilter ? 'border-amber-300 bg-amber-50 text-amber-700'
                : statusOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}>
              <CreditCardIcon className="h-3.5 w-3.5" />
              {hasStatusFilter ? `${paymentStatuses.length} statuses` : 'All Statuses'}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="p-2">
            {PAYMENT_STATUS_OPTIONS.map(opt => {
              const selected = paymentStatuses.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => onPaymentStatusesChange(selected ? paymentStatuses.filter(s => s !== opt.value) : [...paymentStatuses, opt.value])}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt.label}
                  {selected && <CheckIcon className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </Dropdown>

        {/* Paid By Multi-Select */}
        {paidByOptions.length > 0 && (
          <Dropdown
            isOpen={paidByOpen}
            onOpenChange={setPaidByOpen}
            trigger={
              <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                hasPaidByFilter ? 'border-teal-300 bg-teal-50 text-teal-700'
                  : paidByOpen ? 'border-gray-300 bg-gray-50 text-gray-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}>
                <UserGroupIcon className="h-3.5 w-3.5" />
                {hasPaidByFilter ? `${paidByIds.length} selected` : 'Paid By'}
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            }
          >
            <div className="max-h-60 overflow-y-auto p-2">
              {paidByOptions.map(opt => {
                const selected = paidByIds.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    onClick={() => onPaidByIdsChange(selected ? paidByIds.filter(id => id !== opt.id) : [...paidByIds, opt.id])}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="truncate">{opt.name}</span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </Dropdown>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Granularity */}
        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
          {GRANULARITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onGranularityChange(opt.value)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                granularity === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary filter row (desktop only) */}
      <div className="hidden flex-wrap items-center gap-3 sm:flex">
        {/* Payment Method chips */}
        <div className="flex flex-wrap items-center gap-1">
          {PAYMENT_METHOD_OPTIONS.map(opt => {
            const selected = paymentMethods.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => onPaymentMethodsChange(selected ? paymentMethods.filter(m => m !== opt.value) : [...paymentMethods, opt.value])}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                  selected
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Tri-state toggles */}
        <TriStateToggle label="Reimbursable" value={isReimbursable} onChange={onIsReimbursableChange} />
        <TriStateToggle label="Tax Deductible" value={isTaxDeductible} onChange={onIsTaxDeductibleChange} />
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          {propertyIds.map(id => {
            const prop = properties.find(p => p.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                {prop?.listingName || prop?.externalName || prop?.address || 'Property'}
                <button onClick={() => onPropertyIdsChange(propertyIds.filter(i => i !== id))} className="rounded-full p-0.5 hover:bg-emerald-200">
                  <XMarkIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}

          {categories.map(code => {
            const info = categoryMap.get(code)
            return (
              <span key={code} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: (info?.colorHex || '#6B7280') + '20', color: info?.colorHex || '#6B7280' }}>
                {info?.label || code}
                <button onClick={() => onCategoriesChange(categories.filter(c => c !== code))} className="rounded-full p-0.5 hover:opacity-70">
                  <XMarkIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}

          {paymentStatuses.map(status => (
            <span key={status} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {PAYMENT_STATUS_OPTIONS.find(o => o.value === status)?.label || status}
              <button onClick={() => onPaymentStatusesChange(paymentStatuses.filter(s => s !== status))} className="rounded-full p-0.5 hover:bg-amber-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          {paidByIds.map(id => {
            const opt = paidByOptions?.find(o => o.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                {opt?.name || 'User'}
                <button onClick={() => onPaidByIdsChange(paidByIds.filter(i => i !== id))} className="rounded-full p-0.5 hover:bg-teal-200">
                  <XMarkIcon className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })}

          {paymentMethods.map(method => (
            <span key={method} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              {PAYMENT_METHOD_OPTIONS.find(o => o.value === method)?.label || method}
              <button onClick={() => onPaymentMethodsChange(paymentMethods.filter(m => m !== method))} className="rounded-full p-0.5 hover:bg-blue-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          {isReimbursable !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
              {isReimbursable ? 'Reimbursable' : 'Not Reimbursable'}
              <button onClick={() => onIsReimbursableChange(null)} className="rounded-full p-0.5 hover:bg-orange-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          )}

          {isTaxDeductible !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
              {isTaxDeductible ? 'Tax Deductible' : 'Not Tax Deductible'}
              <button onClick={() => onIsTaxDeductibleChange(null)} className="rounded-full p-0.5 hover:bg-rose-200">
                <XMarkIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}

// --- Helpers ---

function formatDateDisplay(range: DateRange): string {
  const start = new Date(range.startDate + 'T00:00:00')
  const end = new Date(range.endDate + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (start.getFullYear() !== end.getFullYear()) {
    const fmtY = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    return `${fmtY(start)} – ${fmtY(end)}`
  }

  return `${fmt(start)} – ${fmt(end)}`
}
