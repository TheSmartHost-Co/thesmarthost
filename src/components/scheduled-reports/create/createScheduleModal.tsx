'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import { getLogos } from '@/services/reportService'
import { createSchedule, updateSchedule, sendTestEmail, getScheduleById } from '@/services/scheduleService'
import type { Property } from '@/services/types/property'
import type { Client } from '@/services/types/client'
import type { Logo } from '@/services/types/report'
import type { Schedule, ScheduleFrequency, DateRangeType, ReportFormat, ReportMode, RecipientFormData, CreateSchedulePayload } from '@/services/types/schedule'
import { FREQUENCY_LABELS, DATE_RANGE_LABELS, FORMAT_LABELS, REPORT_MODE_LABELS, DAYS_OF_WEEK, TIMEZONES, DEFAULT_SCHEDULE_FORM } from '@/services/types/schedule'
import {
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import Modal from '@/components/shared/modal'

type WizardStep = 'basics' | 'properties' | 'recipients' | 'review'

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'basics', label: 'Schedule & Report', icon: Cog6ToothIcon },
  { id: 'properties', label: 'Properties', icon: BuildingOffice2Icon },
  { id: 'recipients', label: 'Recipients', icon: EnvelopeIcon },
  { id: 'review', label: 'Review', icon: CheckIcon },
]

interface CreateScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => Promise<void>
  schedule?: Schedule | null
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schedule
}) => {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  const isEdit = !!schedule

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics')

  // Form state
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<ScheduleFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [timezone, setTimezone] = useState('America/Toronto')
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('previous_month')
  const [customDaysBack, setCustomDaysBack] = useState(30)
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [reportMode, setReportMode] = useState<ReportMode>('per_property')
  const [logoId, setLogoId] = useState<string | null>(null)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [recipients, setRecipients] = useState<RecipientFormData[]>([])
  const [ccSelf, setCcSelf] = useState(false)
  const [useCustomTemplate, setUseCustomTemplate] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [logos, setLogos] = useState<Logo[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // UI state
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false)
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [newCustomEmail, setNewCustomEmail] = useState('')
  const [newCustomName, setNewCustomName] = useState('')

  const propertyDropdownRef = useRef<HTMLDivElement>(null)
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  // Filter properties by search
  const filteredProperties = useMemo(() =>
    properties.filter(p =>
      (p.listingName ?? '').toLowerCase().includes(propertySearch.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(propertySearch.toLowerCase())
    ), [properties, propertySearch])

  // Get selected properties
  const selectedProperties = useMemo(() =>
    properties.filter(p => selectedPropertyIds.includes(p.id)), [properties, selectedPropertyIds])

  // Load data on mount
  useEffect(() => {
    if (isOpen && profile?.id) {
      loadData()
    }
  }, [isOpen, profile])

  // Populate form when editing
  useEffect(() => {
    if (isOpen && schedule) {
      populateForm(schedule)
    }
  }, [isOpen, schedule])

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  // Initialize test email with user's email when modal opens
  useEffect(() => {
    if (isOpen && profile?.email && !testEmail) {
      setTestEmail(profile.email)
    }
  }, [isOpen, profile?.email])

  // Close dropdowns on outside click (only when modal is open)
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target as Node)) {
        setIsPropertyDropdownOpen(false)
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [propertiesRes, clientsRes, logosRes] = await Promise.all([
        getProperties(profile!.id),
        getClientsByParentId(profile!.id),
        getLogos()
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }
      if (clientsRes.status === 'success') {
        setClients(clientsRes.data || [])
      }
      if (logosRes.status === 'success') {
        setLogos(logosRes.data || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
      showNotification('Failed to load data', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  const populateForm = async (schedule: Schedule) => {
    // Fetch full schedule details if needed
    try {
      const res = await getScheduleById(schedule.id)
      if (res.status === 'success' && res.data) {
        const s = res.data
        setName(s.name)
        setFrequency(s.frequency)
        setDayOfMonth(s.dayOfMonth || 1)
        setDayOfWeek(s.dayOfWeek || 1)
        setTimeOfDay(s.timeOfDay?.slice(0, 5) || '09:00')
        setTimezone(s.timezone || 'America/Toronto')
        setDateRangeType(s.dateRangeType)
        setCustomDaysBack(s.customDaysBack || 30)
        setFormat(s.format)
        setReportMode(s.reportMode)
        setLogoId(s.logoId)
        setCcSelf(s.ccSelf)
        setIsActive(s.isActive)

        if (s.emailSubjectTemplate || s.emailBodyTemplate) {
          setUseCustomTemplate(true)
          setEmailSubject(s.emailSubjectTemplate || '')
          setEmailBody(s.emailBodyTemplate || '')
        }

        if (s.properties) {
          setSelectedPropertyIds(s.properties.map(p => p.propertyId))
        }

        if (s.recipients) {
          setRecipients(s.recipients.map(r => ({
            id: r.id,
            type: r.type,
            clientId: r.clientId || undefined,
            email: r.email || undefined,
            name: r.name || undefined,
            propertyFilterIds: r.propertyFilterIds || undefined,
          })))
        }
      }
    } catch (err) {
      console.error('Error loading schedule details:', err)
    }
  }

  const resetForm = () => {
    setCurrentStep('basics')
    setName('')
    setFrequency('monthly')
    setDayOfMonth(1)
    setDayOfWeek(1)
    setTimeOfDay('09:00')
    setTimezone('America/Toronto')
    setDateRangeType('previous_month')
    setCustomDaysBack(30)
    setFormat('pdf')
    setReportMode('per_property')
    setLogoId(null)
    setSelectedPropertyIds([])
    setRecipients([])
    setCcSelf(false)
    setUseCustomTemplate(false)
    setEmailSubject('')
    setEmailBody('')
    setIsActive(true)
    setPropertySearch('')
    setTestEmail(profile?.email || '')
    setNewCustomEmail('')
    setNewCustomName('')
  }

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }

  const handleSelectAllProperties = () => {
    if (selectedPropertyIds.length === properties.length) {
      setSelectedPropertyIds([])
    } else {
      setSelectedPropertyIds(properties.map(p => p.id))
    }
  }

  const handleAddClientRecipient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client && !recipients.some(r => r.type === 'client' && r.clientId === clientId)) {
      setRecipients(prev => [...prev, {
        type: 'client',
        clientId: client.id,
        email: client.email,
        name: client.name
      }])
    }
    setIsClientDropdownOpen(false)
  }

  const handleAddCustomRecipient = () => {
    if (!newCustomEmail.trim()) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newCustomEmail.trim())) {
      showNotification('Please enter a valid email address', 'error')
      return
    }

    setRecipients(prev => [...prev, {
      type: 'custom',
      email: newCustomEmail.trim(),
      name: newCustomName.trim() || undefined
    }])
    setNewCustomEmail('')
    setNewCustomName('')
  }

  const handleRemoveRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index))
  }

  const canProceed = (step: WizardStep): boolean => {
    switch (step) {
      case 'basics':
        return !!name.trim()
      case 'properties':
        return selectedPropertyIds.length > 0
      case 'recipients':
        return recipients.length > 0 || ccSelf
      case 'review':
        return true
      default:
        return false
    }
  }

  const getValidationMessage = (step: WizardStep): string | null => {
    switch (step) {
      case 'basics':
        if (!name.trim()) return 'Enter a schedule name to continue'
        return null
      case 'properties':
        if (selectedPropertyIds.length === 0) return 'Select at least one property'
        return null
      case 'recipients':
        if (recipients.length === 0 && !ccSelf) return 'Add at least one recipient or enable CC yourself'
        return null
      default:
        return null
    }
  }

  const handleNext = () => {
    const stepIndex = STEPS.findIndex(s => s.id === currentStep)
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id)
    }
  }

  const handleBack = () => {
    const stepIndex = STEPS.findIndex(s => s.id === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const payload: CreateSchedulePayload = {
        name: name.trim(),
        frequency,
        dayOfMonth: frequency === 'monthly' || frequency === 'quarterly' ? dayOfMonth : null,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
        timeOfDay,
        timezone,
        dateRangeType,
        customDaysBack: dateRangeType === 'custom_days_back' ? customDaysBack : null,
        format,
        reportMode,
        logoId: format === 'pdf' ? logoId : null,
        emailSubjectTemplate: useCustomTemplate ? emailSubject : null,
        emailBodyTemplate: useCustomTemplate ? emailBody : null,
        ccSelf,
        isActive,
        propertyIds: selectedPropertyIds,
        recipients: recipients.map(r => ({
          type: r.type,
          clientId: r.type === 'client' ? r.clientId : null,
          email: r.type === 'custom' ? r.email : null,
          name: r.type === 'custom' ? r.name : null,
          propertyFilterIds: r.propertyFilterIds || null,
        }))
      }

      const res = isEdit
        ? await updateSchedule(schedule!.id, payload)
        : await createSchedule(payload)

      if (res.status === 'success') {
        showNotification(isEdit ? 'Schedule updated' : 'Schedule created', 'success')
        await onSave()
      } else {
        showNotification(res.message || 'Failed to save schedule', 'error')
      }
    } catch (err) {
      console.error('Error saving schedule:', err)
      showNotification('Failed to save schedule', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      showNotification('Please enter an email address', 'error')
      return
    }

    if (!isEdit || !schedule?.id) {
      showNotification('Save the schedule first to send a test email', 'info')
      return
    }

    try {
      setSendingTest(true)
      const res = await sendTestEmail(schedule.id, testEmail.trim())
      if (res.status === 'success') {
        showNotification('Test email sent!', 'success')
        // Keep the email so user can easily resend if needed
      } else {
        showNotification(res.message || 'Failed to send test email', 'error')
      }
    } catch (err) {
      console.error('Error sending test email:', err)
      showNotification('Failed to send test email', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            {/* Schedule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Owner Reports"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Frequency */}
            <div>
              <label id="frequency-label" className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <div
                role="group"
                aria-labelledby="frequency-label"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {(Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setFrequency(freq)}
                    aria-pressed={frequency === freq}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      frequency === freq
                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-500'
                        : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {FREQUENCY_LABELS[freq]}
                  </button>
                ))}
              </div>
            </div>

            {/* Day Selection */}
            {frequency === 'monthly' || frequency === 'quarterly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`}
                    </option>
                  ))}
                </select>
              </div>
            ) : frequency === 'weekly' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <div className="flex gap-2">
                  {/* Hour */}
                  <select
                    value={(() => {
                      const hour = parseInt(timeOfDay.split(':')[0], 10);
                      return hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    })()}
                    onChange={(e) => {
                      const hour12 = parseInt(e.target.value, 10);
                      const currentHour = parseInt(timeOfDay.split(':')[0], 10);
                      const isPM = currentHour >= 12;
                      let hour24 = hour12;
                      if (isPM && hour12 !== 12) hour24 = hour12 + 12;
                      if (!isPM && hour12 === 12) hour24 = 0;
                      setTimeOfDay(`${hour24.toString().padStart(2, '0')}:${timeOfDay.split(':')[1]}`);
                    }}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-gray-400">:</span>
                  {/* Minute */}
                  <select
                    value={timeOfDay.split(':')[1]}
                    onChange={(e) => {
                      setTimeOfDay(`${timeOfDay.split(':')[0]}:${e.target.value}`);
                    }}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  >
                    {['00', '15', '30', '45'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {/* AM/PM */}
                  <select
                    value={parseInt(timeOfDay.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                    onChange={(e) => {
                      const currentHour = parseInt(timeOfDay.split(':')[0], 10);
                      const isPM = e.target.value === 'PM';
                      let newHour = currentHour;
                      if (isPM && currentHour < 12) newHour = currentHour + 12;
                      if (!isPM && currentHour >= 12) newHour = currentHour - 12;
                      setTimeOfDay(`${newHour.toString().padStart(2, '0')}:${timeOfDay.split(':')[1]}`);
                    }}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Date Range */}
            <div>
              <label id="date-range-label" className="block text-sm font-medium text-gray-700 mb-2">Report Date Range</label>
              <div
                role="group"
                aria-labelledby="date-range-label"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {(Object.keys(DATE_RANGE_LABELS) as DateRangeType[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRangeType(range)}
                    aria-pressed={dateRangeType === range}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      dateRangeType === range
                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-500'
                        : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {DATE_RANGE_LABELS[range]}
                  </button>
                ))}
              </div>
              {dateRangeType === 'custom_days_back' && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Days back from run date</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDaysBack}
                    onChange={(e) => setCustomDaysBack(Number(e.target.value))}
                    className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Format & Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ReportFormat)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  {(Object.keys(FORMAT_LABELS) as ReportFormat[]).map((f) => (
                    <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Mode</label>
                <select
                  value={reportMode}
                  onChange={(e) => setReportMode(e.target.value as ReportMode)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  {(Object.keys(REPORT_MODE_LABELS) as ReportMode[]).map((mode) => (
                    <option key={mode} value={mode}>{REPORT_MODE_LABELS[mode]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logo (PDF only) */}
            {format === 'pdf' && logos.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={logoId || ''}
                  onChange={(e) => setLogoId(e.target.value || null)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  <option value="">No logo</option>
                  {logos.map((logo) => (
                    <option key={logo.id} value={logo.id}>{logo.originalName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )

      case 'properties':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Select Properties <span className="text-red-500">*</span>
              </label>
              <button
                onClick={handleSelectAllProperties}
                className="text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                {selectedPropertyIds.length === properties.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Property Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                placeholder="Search properties..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Property List */}
            <div className="border border-gray-200 rounded-xl max-h-[300px] overflow-y-auto divide-y divide-gray-100">
              {filteredProperties.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {properties.length === 0 ? 'No properties found' : 'No properties match your search'}
                </div>
              ) : (
                filteredProperties.map((property) => {
                  const isSelected = selectedPropertyIds.includes(property.id)
                  return (
                    <button
                      key={property.id}
                      onClick={() => handlePropertyToggle(property.id)}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                        isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium truncate ${isSelected ? 'text-amber-800' : 'text-gray-900'}`}>
                          {property.listingName}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{property.address}</div>
                      </div>
                      {isSelected && (
                        <CheckCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })
              )}
            </div>

            <div className="text-sm text-gray-500">
              {selectedPropertyIds.length} of {properties.length} properties selected
            </div>
          </div>
        )

      case 'recipients':
        return (
          <div className="space-y-6">
            {/* CC Self */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div>
                <div className="font-medium text-amber-800">CC yourself</div>
                <div className="text-sm text-amber-600">Receive a copy of all scheduled reports</div>
              </div>
              <button
                onClick={() => setCcSelf(!ccSelf)}
                role="switch"
                aria-checked={ccSelf}
                aria-label="CC yourself on scheduled reports"
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  ccSelf ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  ccSelf ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Add Client Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Existing Clients</label>
              <div ref={clientDropdownRef} className="relative">
                <button
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-gray-300 transition-all"
                >
                  <span className="text-gray-500">Select a client to add...</span>
                  <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isClientDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {clients.filter(c => !recipients.some(r => r.type === 'client' && r.clientId === c.id)).map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleAddClientRecipient(client.id)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </button>
                        ))}
                        {clients.filter(c => !recipients.some(r => r.type === 'client' && r.clientId === c.id)).length === 0 && (
                          <div className="px-4 py-6 text-center text-gray-500 text-sm">
                            All clients have been added
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Add Custom Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Custom Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newCustomEmail}
                  onChange={(e) => setNewCustomEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-40 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  onClick={handleAddCustomRecipient}
                  className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Recipients List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients ({recipients.length})
              </label>
              {recipients.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                  No recipients added yet. Add clients or custom emails above.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {recipients.map((recipient, index) => (
                    <div key={index} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          recipient.type === 'client' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {recipient.type === 'client' ? (
                            <UserGroupIcon className="w-4 h-4 text-blue-600" />
                          ) : (
                            <EnvelopeIcon className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {recipient.name || recipient.email}
                          </div>
                          {recipient.name && (
                            <div className="text-sm text-gray-500 truncate">{recipient.email}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRecipient(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Email Template Toggle */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium text-gray-900">Custom Email Template</div>
                  <div className="text-sm text-gray-500">Customize the subject and body of scheduled emails</div>
                </div>
                <button
                  onClick={() => setUseCustomTemplate(!useCustomTemplate)}
                  role="switch"
                  aria-checked={useCustomTemplate}
                  aria-label="Use custom email template"
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    useCustomTemplate ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    useCustomTemplate ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {useCustomTemplate && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g., Your {{month}} Report for {{property_name}}"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Write your email message here. Use {{variables}} for dynamic content."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <div className="font-medium mb-1">Available variables:</div>
                    <code className="text-amber-600">{'{{recipient_name}}'}</code>,{' '}
                    <code className="text-amber-600">{'{{property_name}}'}</code>,{' '}
                    <code className="text-amber-600">{'{{month}}'}</code>,{' '}
                    <code className="text-amber-600">{'{{year}}'}</code>,{' '}
                    <code className="text-amber-600">{'{{start_date}}'}</code>,{' '}
                    <code className="text-amber-600">{'{{end_date}}'}</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Schedule</div>
                <div className="font-semibold text-gray-900">{name || 'Untitled'}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {FREQUENCY_LABELS[frequency]}
                  {frequency === 'monthly' || frequency === 'quarterly' ? ` on day ${dayOfMonth}` : ''}
                  {frequency === 'weekly' ? ` on ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label}` : ''}
                  {' at '}{(() => {
                    const [hourStr, minute] = timeOfDay.split(':');
                    const hour = parseInt(hourStr, 10);
                    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const ampm = hour < 12 ? 'AM' : 'PM';
                    return `${hour12}:${minute} ${ampm}`;
                  })()}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Report</div>
                <div className="font-semibold text-gray-900">{FORMAT_LABELS[format]}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {DATE_RANGE_LABELS[dateRangeType]}
                  {dateRangeType === 'custom_days_back' ? ` (${customDaysBack} days)` : ''}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Properties</div>
                <div className="font-semibold text-gray-900">{selectedPropertyIds.length} selected</div>
                <div className="text-sm text-gray-600 mt-1">{REPORT_MODE_LABELS[reportMode]}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recipients</div>
                <div className="font-semibold text-gray-900">{recipients.length + (ccSelf ? 1 : 0)} total</div>
                <div className="text-sm text-gray-600 mt-1">
                  {ccSelf ? 'CC to self enabled' : 'CC to self disabled'}
                </div>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
              <div>
                <div className="font-medium text-green-800">Start Active</div>
                <div className="text-sm text-green-600">Schedule will run immediately when conditions are met</div>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                role="switch"
                aria-checked={isActive}
                aria-label="Start schedule as active"
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Test Email (Edit only) */}
            {isEdit && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Send Test Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email to send test..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail.trim()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {sendingTest ? (
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                    Send Test
                  </button>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (loadingData) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-2xl mx-4">
        <div className="p-12 flex flex-col items-center justify-center">
          <ArrowPathIcon className="w-8 h-8 text-amber-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-2xl mx-4" closable={false}>
      <div className="relative overflow-hidden bg-white rounded-2xl">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEdit ? 'Edit Schedule' : 'Create Schedule'}
                </h2>
                <p className="text-sm text-gray-500">
                  {STEPS.find(s => s.id === currentStep)?.label}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id
              const stepIndex = STEPS.findIndex(s => s.id === currentStep)
              const isComplete = index < stepIndex
              const StepIcon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => index <= stepIndex && setCurrentStep(step.id)}
                    disabled={index > stepIndex}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-amber-100 text-amber-800'
                        : isComplete
                        ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-amber-500 text-white'
                        : isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isComplete ? (
                        <CheckIcon className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${
                      index < stepIndex ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <button
              onClick={currentStep === 'basics' ? onClose : handleBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {currentStep === 'basics' ? 'Cancel' : 'Back'}
            </button>

            <div className="flex items-center gap-3">
              {/* Validation feedback */}
              {currentStep !== 'review' && !canProceed(currentStep) && (
                <div className="flex items-center gap-1.5 text-sm text-amber-600">
                  <ExclamationCircleIcon className="w-4 h-4" />
                  <span>{getValidationMessage(currentStep)}</span>
                </div>
              )}

              {currentStep === 'review' ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      {isEdit ? 'Update Schedule' : 'Create Schedule'}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed(currentStep)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronDownIcon className="w-4 h-4 -rotate-90" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default CreateScheduleModal
