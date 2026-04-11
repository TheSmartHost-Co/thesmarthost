'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  CalendarDaysIcon,
  HomeIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  UsersIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { updateCleaningProject, initializeProjectChecklist } from '@/services/cleaningProjectService'
import { getChecklists, getChecklistById } from '@/services/checklistService'
import { getBookings } from '@/services/bookingService'
import { parseLocalDate } from '@/utils/dateUtils'
import SearchableSelect from '@/components/shared/SearchableSelect'
import TimeSelect, { roundToNearest15 } from '@/components/shared/TimeSelect'
import DurationSelect, { roundDurationToNearest15 } from '@/components/shared/DurationSelect'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'
import type { UpdateCleaningProjectPayload, CleaningProject } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import type { Cleaner } from '@/services/types/cleaner'
import type { Checklist, ChecklistItem } from '@/services/types/checklist'
import type { Booking } from '@/services/types/booking'
import { isValidationError } from '@/services/validationError'

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (project: CleaningProject) => void
  project: CleaningProject
  properties: Property[]
  cleaners: Cleaner[]
}

export default function EditProjectModal({
  isOpen,
  onClose,
  onUpdate,
  project,
  properties,
  cleaners,
}: EditProjectModalProps) {
  const { t } = useTranslation('turnover')
  const { profile } = useUserStore()
  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Form state
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [cleanerId, setCleanerId] = useState<string | null>(null)
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [previousBookingId, setPreviousBookingId] = useState<string | null>(null)
  const [nextBookingId, setNextBookingId] = useState<string | null>(null)
  const [projectDate, setProjectDate] = useState('')
  const [projectStartTime, setProjectStartTime] = useState('')
  const [projectEndTime, setProjectEndTime] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [isSameDayTurnover, setIsSameDayTurnover] = useState(false)
  const [pmNotes, setPmNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [showChecklistPreview, setShowChecklistPreview] = useState(false)
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false)
  const [showReinitDialog, setShowReinitDialog] = useState(false)
  const [reinitProjectId, setReinitProjectId] = useState<string | null>(null)
  const [isReinitializing, setIsReinitializing] = useState(false)
  const [pendingUpdatedProject, setPendingUpdatedProject] = useState<CleaningProject | null>(null)

  // Track if property changed (to know if we should refetch checklists/bookings)
  const [initialPropertyId, setInitialPropertyId] = useState<string | null>(null)

  // Convert properties to SearchableSelect options
  const propertyOptions = useMemo(
    () =>
      properties.map((prop) => ({
        value: prop.id,
        label: prop.listingName || prop.internalName || prop.address,
        secondaryLabel: prop.address,
      })),
    [properties]
  )

  // Convert cleaners to SearchableSelect options
  const cleanerOptions = useMemo(
    () =>
      cleaners.map((cleaner) => ({
        value: cleaner.id,
        label: cleaner.name,
        secondaryLabel: cleaner.email || cleaner.phone || undefined,
      })),
    [cleaners]
  )

  // Convert checklists to SearchableSelect options
  const checklistOptions = useMemo(
    () =>
      checklists.map((checklist) => ({
        value: checklist.id,
        label: checklist.name + (checklist.isDefault ? ' (Default)' : ''),
        secondaryLabel: checklist.itemCount ? `${checklist.itemCount} tasks` : undefined,
      })),
    [checklists]
  )

  // Convert bookings to SearchableSelect options
  const previousBookingOptions = useMemo(
    () =>
      bookings.map((booking) => ({
        value: booking.id,
        label: `${booking.guestName || 'Guest'} - ${booking.checkInDate} → ${booking.checkOutDate || '?'}`,
        secondaryLabel: booking.reservationCode || undefined,
      })),
    [bookings]
  )

  const nextBookingOptions = useMemo(
    () =>
      bookings.map((booking) => ({
        value: booking.id,
        label: `${booking.guestName || 'Guest'} - ${booking.checkInDate} → ${booking.checkOutDate || '?'}`,
        secondaryLabel: booking.reservationCode || undefined,
      })),
    [bookings]
  )

  // Pre-populate form when modal opens
  useEffect(() => {
    if (isOpen && project) {
      setPropertyId(project.propertyId || null)
      setCleanerId(project.cleanerId || null)
      setChecklistId(project.checklistId || null)
      setPreviousBookingId(project.previousBookingId || null)
      setNextBookingId(project.nextBookingId || null)
      setProjectDate(project.projectDate ? project.projectDate.split('T')[0] : '')
      setProjectStartTime(project.projectStartTime ? roundToNearest15(project.projectStartTime.substring(0, 5)) : '')
      setProjectEndTime(project.projectEndTime ? roundToNearest15(project.projectEndTime.substring(0, 5)) : '')
      setEstimatedDuration(project.estimatedDurationMinutes ? roundDurationToNearest15(project.estimatedDurationMinutes) : '')
      setGuestCount(project.guestCount?.toString() || '')
      setIsSameDayTurnover(project.isSameDayTurnover || false)
      setPmNotes(project.pmNotes || '')
      setSelectedChecklist(null)
      setShowChecklistPreview(false)
      setInitialPropertyId(project.propertyId || null)
    }
  }, [isOpen, project])

  // Fetch checklists when property changes
  useEffect(() => {
    const fetchChecklists = async () => {
      if (!propertyId) {
        setChecklists([])
        // Only clear checklist if property actually changed
        if (propertyId !== initialPropertyId) {
          setChecklistId(null)
        }
        return
      }

      try {
        const res = await getChecklists({ propertyId })
        if (res.status === 'success') {
          setChecklists(res.data)
          // Don't auto-select default for edit - keep the existing selection
        }
      } catch (err) {
        console.error('Failed to fetch checklists:', err)
      }
    }

    if (isOpen) {
      fetchChecklists()
    }
  }, [propertyId, isOpen, initialPropertyId])

  // Fetch bookings when property changes
  useEffect(() => {
    const fetchBookings = async () => {
      if (!propertyId || !effectiveUserId) {
        setBookings([])
        // Only clear bookings if property actually changed
        if (propertyId !== initialPropertyId) {
          setPreviousBookingId(null)
          setNextBookingId(null)
        }
        return
      }

      setLoadingBookings(true)
      try {
        const res = await getBookings({ userId: effectiveUserId!, propertyId })
        if (res.status === 'success') {
          // Filter to upcoming/recent bookings
          const now = new Date()
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const relevantBookings = res.data.filter((b) => {
            const checkIn = parseLocalDate(b.checkInDate)
            return checkIn >= thirtyDaysAgo
          })
          setBookings(relevantBookings)
        }
      } catch (err) {
        console.error('Failed to fetch bookings:', err)
      } finally {
        setLoadingBookings(false)
      }
    }

    if (isOpen) {
      fetchBookings()
    }
  }, [propertyId, effectiveUserId, isOpen, initialPropertyId])

  // Fetch checklist details when checklist changes
  useEffect(() => {
    const fetchChecklistDetails = async () => {
      if (!checklistId) {
        setSelectedChecklist(null)
        return
      }

      setLoadingChecklist(true)
      try {
        const res = await getChecklistById(checklistId)
        if (res.status === 'success') {
          setSelectedChecklist(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch checklist details:', err)
      } finally {
        setLoadingChecklist(false)
      }
    }

    if (isOpen && checklistId) {
      fetchChecklistDetails()
    }
  }, [checklistId, isOpen])

  // Group checklist items by room
  const groupedItems = useMemo(() => {
    if (!selectedChecklist?.items) return {}
    return selectedChecklist.items.reduce(
      (acc, item) => {
        const room = item.roomName || 'General'
        if (!acc[room]) acc[room] = []
        acc[room].push(item)
        return acc
      },
      {} as Record<string, ChecklistItem[]>
    )
  }, [selectedChecklist])

  // Handle new checklist created
  const handleChecklistCreated = (newChecklist: Checklist) => {
    setChecklists((prev) => [...prev, newChecklist])
    setChecklistId(newChecklist.id)
    setShowCreateChecklistModal(false)
  }

  const handleConfirmReinit = async () => {
    if (!reinitProjectId) return
    setIsReinitializing(true)
    try {
      const res = await initializeProjectChecklist(reinitProjectId, { force: true })
      if (res.status === 'success') {
        showNotification(t('checklistReinitialized', { count: res.data.initialized }), 'success')
      } else {
        showNotification(res.message || t('failedToReinitializeChecklist'), 'error')
      }
    } catch (err) {
      console.error('Error re-initializing checklist:', err)
      showNotification(t('errorReinitializingChecklist'), 'error')
    } finally {
      setIsReinitializing(false)
      setShowReinitDialog(false)
      if (pendingUpdatedProject) {
        onUpdate(pendingUpdatedProject)
      }
      onClose()
    }
  }

  const handleSkipReinit = () => {
    setShowReinitDialog(false)
    showNotification(t('projectUpdatedChecklistKept'), 'info')
    if (pendingUpdatedProject) {
      onUpdate(pendingUpdatedProject)
    }
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!propertyId) {
      showNotification(t('pleaseSelectProperty'), 'error')
      return
    }

    if (!projectDate) {
      showNotification(t('pleaseSelectProjectDate'), 'error')
      return
    }

    setLoading(true)

    try {
      const payload: UpdateCleaningProjectPayload = {
        propertyId,
        projectDate,
        previousBookingId: previousBookingId || null,
        nextBookingId: nextBookingId || null,
        cleanerId: cleanerId || null,
        checklistId: checklistId || null,
        projectStartTime: projectStartTime || null,
        projectEndTime: projectEndTime || null,
        estimatedDurationMinutes: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
        guestCount: guestCount ? parseInt(guestCount, 10) : null,
        isSameDayTurnover,
        pmNotes: pmNotes.trim() || null,
      }

      const res = await updateCleaningProject(project.id, payload)

      if (res.status === 'success') {
        if (res.data.checklistChanged) {
          // Checklist was swapped (A → B) — prompt PM before re-initializing
          setPendingUpdatedProject(res.data)
          setReinitProjectId(res.data.id)
          setShowReinitDialog(true)
        } else {
          const autoInitMsg = res.data.checklistAutoInitialized
            ? ` (${res.data.checklistAutoInitialized} checklist items initialized)`
            : ''
          showNotification(`Project updated successfully${autoInitMsg}`, 'success')
          onUpdate(res.data)
          onClose()
        }
      } else {
        showNotification(res.message || 'Failed to update project', 'error')
      }
    } catch (err) {
      console.error('Error updating project:', err)
      if (isValidationError(err)) {
        err.errors.forEach((e) => showNotification(e, 'error'))
      } else {
        showNotification(err instanceof Error ? err.message : 'Failed to update project', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PencilSquareIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('editCleaningProject')}</h2>
                  <p className="text-sm text-gray-500">{t('projectDetails')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Property & Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Property Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <HomeIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('property')} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={propertyOptions}
                      value={propertyId}
                      onChange={setPropertyId}
                      placeholder={t('searchProperties')}
                      emptyText={t('noPropertiesFound')}
                      clearable={false}
                    />
                  </div>

                  {/* Project Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <CalendarDaysIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('projectDateLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={projectDate}
                      onChange={(e) => setProjectDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Previous Booking (Departing Guest) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <DocumentTextIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('previousBookingDeparting')} <span className="text-gray-400">({t('optional')})</span>
                  </label>
                  <SearchableSelect
                    options={previousBookingOptions}
                    value={previousBookingId}
                    onChange={setPreviousBookingId}
                    placeholder={
                      !propertyId
                        ? t('selectPropertyFirst')
                        : loadingBookings
                          ? t('loadingBookings')
                          : t('searchBookings')
                    }
                    disabled={!propertyId || loadingBookings}
                    loading={loadingBookings}
                    emptyText={t('noRecentBookings')}
                    clearable
                  />
                </div>

                {/* Next Booking (Arriving Guest) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <DocumentTextIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('nextBookingArriving')} <span className="text-gray-400">({t('optional')})</span>
                  </label>
                  <SearchableSelect
                    options={nextBookingOptions}
                    value={nextBookingId}
                    onChange={setNextBookingId}
                    placeholder={
                      !propertyId
                        ? t('selectPropertyFirst')
                        : loadingBookings
                          ? t('loadingBookings')
                          : t('searchBookings')
                    }
                    disabled={!propertyId || loadingBookings}
                    loading={loadingBookings}
                    emptyText={t('noRecentBookings')}
                    clearable
                  />
                </div>

                {/* Cleaner & Checklist Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cleaner Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <UserIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('assignCleaner')} <span className="text-gray-400">({t('optional')})</span>
                    </label>
                    <SearchableSelect
                      options={cleanerOptions}
                      value={cleanerId}
                      onChange={setCleanerId}
                      placeholder={t('unassigned')}
                      emptyText={t('noCleanersFound')}
                      clearable
                    />
                  </div>

                  {/* Checklist Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ClipboardDocumentListIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('checklistTemplate')}
                    </label>
                    <SearchableSelect
                      options={checklistOptions}
                      value={checklistId}
                      onChange={setChecklistId}
                      placeholder={!propertyId ? t('selectPropertyFirst') : t('searchChecklists')}
                      disabled={!propertyId}
                      emptyText={t('noChecklistsForProperty')}
                      clearable
                      headerAction={
                        propertyId
                          ? {
                              label: t('createNewChecklist'),
                              icon: <PlusIcon className="w-4 h-4" />,
                              onClick: () => setShowCreateChecklistModal(true),
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>

                {/* Checklist Preview */}
                {selectedChecklist && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setShowChecklistPreview(!showChecklistPreview)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardDocumentListIcon className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {selectedChecklist.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({selectedChecklist.items?.length || 0} tasks)
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          showChecklistPreview ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {showChecklistPreview && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 max-h-48 overflow-y-auto"
                        >
                          {loadingChecklist ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : Object.keys(groupedItems).length > 0 ? (
                            <div className="space-y-3">
                              {Object.entries(groupedItems).map(([room, items]) => (
                                <div key={room}>
                                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    {room}
                                  </div>
                                  <div className="space-y-1">
                                    {items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center gap-2 text-sm text-gray-600"
                                      >
                                        <CheckCircleIcon className="w-3.5 h-3.5 text-gray-300" />
                                        <span className="flex-1">{item.taskDescription}</span>
                                        {item.requiresPhoto && (
                                          <CameraIcon className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">
                              {t('noChecklistItems')}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Time Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ClockIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('startTime')}
                    </label>
                    <TimeSelect
                      value={projectStartTime}
                      onChange={setProjectStartTime}
                      placeholder="Start time"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ClockIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('endTime')}
                    </label>
                    <TimeSelect
                      value={projectEndTime}
                      onChange={setProjectEndTime}
                      placeholder="End time"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ClockIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('estimatedDurationLabel')}
                    </label>
                    <DurationSelect
                      value={estimatedDuration}
                      onChange={setEstimatedDuration}
                      placeholder="Duration"
                    />
                  </div>
                </div>

                {/* Guest Count & Same Day Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <UsersIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      {t('guestCountLabel')}
                    </label>
                    <input
                      type="number"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      placeholder={t('numberOfGuests')}
                      min="0"
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors w-full">
                      <input
                        type="checkbox"
                        checked={isSameDayTurnover}
                        onChange={(e) => setIsSameDayTurnover(e.target.checked)}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">{t('isSameDayTurnover')}</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <DocumentTextIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {t('notesForCleaner')}
                  </label>
                  <textarea
                    value={pmNotes}
                    onChange={(e) => setPmNotes(e.target.value)}
                    placeholder={t('specialInstructionsPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !propertyId || !projectDate}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      {t('saveChanges')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Create Checklist Modal */}
      <CreateChecklistModal
        isOpen={showCreateChecklistModal}
        onClose={() => setShowCreateChecklistModal(false)}
        onAdd={handleChecklistCreated}
        properties={properties}
        initialPropertyId={propertyId || undefined}
      />

      {/* Checklist Re-initialization Confirmation Dialog */}
      <AnimatePresence>
        {showReinitDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('checklistChangedTitle')}</h3>
                    <p className="text-sm text-gray-500">{t('newTemplateSelected')}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-700">
                  {t('checklistChangedDescription')} <span className="font-medium text-amber-700">{t('checklistChangedWarning')}</span>
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={handleSkipReinit}
                  disabled={isReinitializing}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  {t('keepExistingItems')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReinit}
                  disabled={isReinitializing}
                  className="px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isReinitializing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('reinitializing')}
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      {t('reinitialize')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
