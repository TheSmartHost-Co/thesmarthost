'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronUpIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getICalSubscriptions,
  createICalSubscription,
  updateICalSubscription,
  deleteICalSubscription,
  syncICalSubscription,
} from '@/services/icalSubscriptionService'
import type { Property } from '@/services/types/property'
import type {
  ICalSubscription,
  ICalPlatform,
  SyncResults,
  CreateICalSubscriptionPayload,
  UpdateICalSubscriptionPayload,
} from '@/services/types/icalSubscription'

interface ICalSubscriptionsSectionProps {
  userId: string
  properties: Property[]
  loadingProperties: boolean
}

const PLATFORM_OPTIONS: { value: ICalPlatform; label: string }[] = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'vrbo', label: 'VRBO' },
  { value: 'google', label: 'Google' },
  { value: 'direct', label: 'Direct' },
  { value: 'wechalet', label: 'WeChalet' },
  { value: 'monsieurchalets', label: 'Monsieur Chalets' },
  { value: 'direct-etransfer', label: 'Direct (e-Transfer)' },
  { value: 'hostaway', label: 'Hostaway' },
  { value: 'guesty', label: 'Guesty' },
]

const PLATFORM_COLORS: Record<ICalPlatform, { bg: string; text: string }> = {
  airbnb: { bg: 'bg-rose-100', text: 'text-rose-700' },
  booking: { bg: 'bg-blue-100', text: 'text-blue-700' },
  vrbo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  google: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  direct: { bg: 'bg-gray-100', text: 'text-gray-700' },
  wechalet: { bg: 'bg-teal-100', text: 'text-teal-700' },
  monsieurchalets: { bg: 'bg-amber-100', text: 'text-amber-700' },
  'direct-etransfer': { bg: 'bg-purple-100', text: 'text-purple-700' },
  hostaway: { bg: 'bg-orange-100', text: 'text-orange-700' },
  guesty: { bg: 'bg-violet-100', text: 'text-violet-700' },
}

function getPlatformLabel(platform: ICalPlatform): string {
  return PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function SyncStatusBadge({ status }: { status: ICalSubscription['syncStatus'] }) {
  const config = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Never synced', Icon: ClockIcon },
    never: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Never synced', Icon: ClockIcon },
    success: { bg: 'bg-green-100', text: 'text-green-700', label: 'Synced', Icon: CheckCircleIcon },
    partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial', Icon: ExclamationTriangleIcon },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error', Icon: XCircleIcon },
  }
  const { bg, text, label, Icon } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function ActionBadge({ action }: { action: 'created' | 'updated' | 'skipped' | 'imported' | 'cancelled' }) {
  const config: Record<string, { bg: string; text: string }> = {
    created: { bg: 'bg-green-100', text: 'text-green-700' },
    updated: { bg: 'bg-amber-100', text: 'text-amber-700' },
    skipped: { bg: 'bg-gray-100', text: 'text-gray-600' },
    imported: { bg: 'bg-blue-100', text: 'text-blue-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  }
  const { bg, text } = config[action] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {action}
    </span>
  )
}

export default function ICalSubscriptionsSection({
  userId,
  properties,
  loadingProperties,
}: ICalSubscriptionsSectionProps) {
  const { showNotification } = useNotificationStore()

  // State
  const [subscriptions, setSubscriptions] = useState<Record<string, ICalSubscription[]>>({})
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
  const [loadingSubscriptions, setLoadingSubscriptions] = useState<Record<string, boolean>>({})
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<Record<string, SyncResults>>({})
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState<Record<string, boolean>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add form state
  const [addFormData, setAddFormData] = useState<Record<string, { url: string; platform: ICalPlatform; name: string }>>({})
  const [addFormLoading, setAddFormLoading] = useState<Record<string, boolean>>({})
  const [addFormError, setAddFormError] = useState<Record<string, string | null>>({})

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Record<string, { url: string; platform: ICalPlatform; name: string }>>({})
  const [editFormLoading, setEditFormLoading] = useState<Record<string, boolean>>({})
  const [editFormError, setEditFormError] = useState<Record<string, string | null>>({})
  const [togglingAutoSync, setTogglingAutoSync] = useState<string | null>(null)

  const getAddForm = (propertyId: string) => addFormData[propertyId] || { url: '', platform: 'direct' as ICalPlatform, name: '' }

  const fetchSubscriptions = useCallback(async (propertyId: string) => {
    setLoadingSubscriptions(prev => ({ ...prev, [propertyId]: true }))
    try {
      const res = await getICalSubscriptions(propertyId)
      if (res.status === 'success' && res.data) {
        setSubscriptions(prev => ({ ...prev, [propertyId]: res.data! }))
      } else {
        setSubscriptions(prev => ({ ...prev, [propertyId]: [] }))
      }
    } catch (err) {
      console.error('Error fetching iCal subscriptions:', err)
      setSubscriptions(prev => ({ ...prev, [propertyId]: [] }))
    } finally {
      setLoadingSubscriptions(prev => ({ ...prev, [propertyId]: false }))
    }
  }, [])

  const toggleProperty = (propertyId: string) => {
    setExpandedProperties(prev => {
      const next = new Set(prev)
      if (next.has(propertyId)) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
        // Fetch subscriptions when expanding if not loaded yet
        if (!subscriptions[propertyId]) {
          fetchSubscriptions(propertyId)
        }
      }
      return next
    })
  }

  const handleAddFeed = async (propertyId: string) => {
    const form = getAddForm(propertyId)

    // Validate URL
    if (!form.url.trim()) {
      setAddFormError(prev => ({ ...prev, [propertyId]: 'URL is required' }))
      return
    }
    if (!form.url.startsWith('http://') && !form.url.startsWith('https://')) {
      setAddFormError(prev => ({ ...prev, [propertyId]: 'URL must start with http:// or https://' }))
      return
    }

    setAddFormError(prev => ({ ...prev, [propertyId]: null }))
    setAddFormLoading(prev => ({ ...prev, [propertyId]: true }))

    try {
      const payload: CreateICalSubscriptionPayload = {
        propertyId,
        icalUrl: form.url.trim(),
        platform: form.platform,
      }
      if (form.name.trim()) {
        payload.name = form.name.trim()
      }

      const res = await createICalSubscription(payload)
      if (res.status === 'success' && res.data) {
        showNotification(res.message || 'iCal feed added successfully', 'success')
        // Add to local state
        setSubscriptions(prev => ({
          ...prev,
          [propertyId]: [...(prev[propertyId] || []), res.data!],
        }))
        // Reset form
        setAddFormData(prev => ({ ...prev, [propertyId]: { url: '', platform: 'direct', name: '' } }))
        setShowAddForm(prev => ({ ...prev, [propertyId]: false }))
      } else {
        setAddFormError(prev => ({ ...prev, [propertyId]: res.message || 'Failed to add feed' }))
      }
    } catch (err) {
      console.error('Error adding iCal feed:', err)
      setAddFormError(prev => ({ ...prev, [propertyId]: err instanceof Error ? err.message : 'Network error' }))
    } finally {
      setAddFormLoading(prev => ({ ...prev, [propertyId]: false }))
    }
  }

  const handleSync = async (sub: ICalSubscription) => {
    setSyncingId(sub.id)
    // Clear previous results for this sub
    setSyncResults(prev => {
      const next = { ...prev }
      delete next[sub.id]
      return next
    })

    try {
      const res = await syncICalSubscription(sub.id)
      if (res.status === 'success' && res.data) {
        // Update the subscription in local state
        setSubscriptions(prev => {
          const propSubs = prev[sub.propertyId] || []
          return {
            ...prev,
            [sub.propertyId]: propSubs.map(s =>
              s.id === sub.id
                ? { ...s, ...res.data!.subscription }
                : s
            ),
          }
        })
        setSyncResults(prev => ({ ...prev, [sub.id]: res.data!.syncResults }))
        setExpandedResults(prev => new Set(prev).add(sub.id))

        const { created, updated, skipped, cancelled } = res.data.syncResults
        showNotification(`Sync complete: ${created} created, ${updated} updated, ${skipped} skipped, ${cancelled} cancelled`, 'success')
      } else {
        showNotification(res.message || 'Sync failed', 'error')
      }
    } catch (err) {
      console.error('Error syncing iCal:', err)
      showNotification(err instanceof Error ? err.message : 'Sync failed', 'error')
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (sub: ICalSubscription) => {
    try {
      const res = await deleteICalSubscription(sub.id)
      if (res.status === 'success') {
        showNotification('Feed removed', 'success')
        setSubscriptions(prev => ({
          ...prev,
          [sub.propertyId]: (prev[sub.propertyId] || []).filter(s => s.id !== sub.id),
        }))
        // Clean up related state
        setSyncResults(prev => {
          const next = { ...prev }
          delete next[sub.id]
          return next
        })
        setExpandedResults(prev => {
          const next = new Set(prev)
          next.delete(sub.id)
          return next
        })
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch (err) {
      console.error('Error deleting iCal subscription:', err)
      showNotification(err instanceof Error ? err.message : 'Failed to delete', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartEdit = (sub: ICalSubscription) => {
    setEditingId(sub.id)
    setEditFormData(prev => ({
      ...prev,
      [sub.id]: { url: sub.icalUrl, platform: sub.platform, name: sub.name || '' },
    }))
    setEditFormError(prev => ({ ...prev, [sub.id]: null }))
  }

  const handleCancelEdit = () => {
    if (editingId) {
      setEditFormError(prev => ({ ...prev, [editingId]: null }))
    }
    setEditingId(null)
  }

  const handleUpdate = async (sub: ICalSubscription) => {
    const form = editFormData[sub.id]
    if (!form) return

    // Validate URL
    if (!form.url.trim()) {
      setEditFormError(prev => ({ ...prev, [sub.id]: 'URL is required' }))
      return
    }
    if (!form.url.startsWith('http://') && !form.url.startsWith('https://')) {
      setEditFormError(prev => ({ ...prev, [sub.id]: 'URL must start with http:// or https://' }))
      return
    }

    // Build payload with only changed fields
    const payload: UpdateICalSubscriptionPayload = {}
    if (form.url.trim() !== sub.icalUrl) payload.icalUrl = form.url.trim()
    if (form.platform !== sub.platform) payload.platform = form.platform
    const newName = form.name.trim() || null
    if (newName !== (sub.name || null)) payload.name = newName

    if (Object.keys(payload).length === 0) {
      setEditingId(null)
      return
    }

    setEditFormError(prev => ({ ...prev, [sub.id]: null }))
    setEditFormLoading(prev => ({ ...prev, [sub.id]: true }))

    try {
      const res = await updateICalSubscription(sub.id, payload)
      if (res.status === 'success' && res.data) {
        showNotification('Feed updated successfully', 'success')
        setSubscriptions(prev => ({
          ...prev,
          [sub.propertyId]: (prev[sub.propertyId] || []).map(s =>
            s.id === sub.id ? res.data! : s
          ),
        }))
        setEditingId(null)
      } else {
        setEditFormError(prev => ({ ...prev, [sub.id]: res.message || 'Failed to update feed' }))
      }
    } catch (err) {
      console.error('Error updating iCal subscription:', err)
      setEditFormError(prev => ({ ...prev, [sub.id]: err instanceof Error ? err.message : 'Network error' }))
    } finally {
      setEditFormLoading(prev => ({ ...prev, [sub.id]: false }))
    }
  }

  const handleToggleAutoSync = async (sub: ICalSubscription) => {
    const newValue = !sub.autoSync
    setTogglingAutoSync(sub.id)

    // Optimistic update
    setSubscriptions(prev => ({
      ...prev,
      [sub.propertyId]: (prev[sub.propertyId] || []).map(s =>
        s.id === sub.id ? { ...s, autoSync: newValue } : s
      ),
    }))

    try {
      const res = await updateICalSubscription(sub.id, { autoSync: newValue })
      if (res.status === 'success') {
        showNotification(`Auto-sync ${newValue ? 'enabled' : 'disabled'}`, 'success')
      } else {
        // Revert on failure
        setSubscriptions(prev => ({
          ...prev,
          [sub.propertyId]: (prev[sub.propertyId] || []).map(s =>
            s.id === sub.id ? { ...s, autoSync: !newValue } : s
          ),
        }))
        showNotification(res.message || 'Failed to update auto-sync', 'error')
      }
    } catch (err) {
      console.error('Error toggling auto-sync:', err)
      // Revert on failure
      setSubscriptions(prev => ({
        ...prev,
        [sub.propertyId]: (prev[sub.propertyId] || []).map(s =>
          s.id === sub.id ? { ...s, autoSync: !newValue } : s
        ),
      }))
      showNotification(err instanceof Error ? err.message : 'Failed to update auto-sync', 'error')
    } finally {
      setTogglingAutoSync(null)
    }
  }

  const getSubCount = (propertyId: string): number => {
    return subscriptions[propertyId]?.length || 0
  }

  const activeProperties = properties.filter(p => p.isActive)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Section Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <CalendarDaysIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">iCal Calendar Feeds</h3>
            <p className="text-sm text-gray-500">Subscribe to iCal feeds to import bookings from any calendar source</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loadingProperties ? (
          <div className="flex justify-center items-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">Loading properties...</p>
            </div>
          </div>
        ) : activeProperties.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDaysIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No active properties found. Add properties first to set up iCal feeds.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProperties.map(property => {
              const isExpanded = expandedProperties.has(property.id)
              const propSubs = subscriptions[property.id] || []
              const isLoading = loadingSubscriptions[property.id]
              const subCount = getSubCount(property.id)
              const isAddFormOpen = showAddForm[property.id]
              const form = getAddForm(property.id)
              const formError = addFormError[property.id]
              const formLoading = addFormLoading[property.id]

              return (
                <div key={property.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Property Header (Accordion Toggle) */}
                  <button
                    onClick={() => toggleProperty(property.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {property.internalName || property.externalName || property.listingName || property.address}
                      </span>
                      {subscriptions[property.id] !== undefined && subCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                          {subCount} {subCount === 1 ? 'feed' : 'feeds'}
                        </span>
                      )}
                    </div>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-gray-100">
                          {/* Loading state */}
                          {isLoading && (
                            <div className="flex justify-center py-6">
                              <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}

                          {/* Subscription list */}
                          {!isLoading && propSubs.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {propSubs.map(sub => {
                                const colors = PLATFORM_COLORS[sub.platform] || PLATFORM_COLORS.direct
                                const isDeleting = deletingId === sub.id
                                const isSyncing = syncingId === sub.id
                                const isEditing = editingId === sub.id
                                const results = syncResults[sub.id]
                                const isResultsExpanded = expandedResults.has(sub.id)
                                const editForm = editFormData[sub.id]
                                const editError = editFormError[sub.id]
                                const editLoading = editFormLoading[sub.id]

                                return (
                                  <div key={sub.id} className="bg-gray-50 rounded-xl p-3">
                                    {/* Inline edit form */}
                                    <AnimatePresence mode="wait">
                                      {isEditing && editForm ? (
                                        <motion.div
                                          key="edit-form"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          transition={{ duration: 0.15 }}
                                          className="p-4 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-3"
                                        >
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              iCal URL <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                              type="url"
                                              value={editForm.url}
                                              onChange={e => setEditFormData(prev => ({
                                                ...prev,
                                                [sub.id]: { ...editForm, url: e.target.value },
                                              }))}
                                              placeholder="https://www.airbnb.com/calendar/ical/..."
                                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                            />
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
                                              <select
                                                value={editForm.platform}
                                                onChange={e => setEditFormData(prev => ({
                                                  ...prev,
                                                  [sub.id]: { ...editForm, platform: e.target.value as ICalPlatform },
                                                }))}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                              >
                                                {PLATFORM_OPTIONS.map(opt => (
                                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Name (optional)</label>
                                              <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditFormData(prev => ({
                                                  ...prev,
                                                  [sub.id]: { ...editForm, name: e.target.value },
                                                }))}
                                                placeholder="e.g. Airbnb Calendar"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                              />
                                            </div>
                                          </div>

                                          {editError && (
                                            <p className="text-xs text-red-600">{editError}</p>
                                          )}

                                          <div className="flex items-center gap-2 pt-1">
                                            <motion.button
                                              onClick={() => handleUpdate(sub)}
                                              disabled={editLoading}
                                              whileHover={{ scale: 1.02 }}
                                              whileTap={{ scale: 0.98 }}
                                              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {editLoading ? (
                                                <>
                                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                  Saving...
                                                </>
                                              ) : (
                                                'Save Changes'
                                              )}
                                            </motion.button>
                                            <button
                                              onClick={handleCancelEdit}
                                              disabled={editLoading}
                                              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </motion.div>
                                      ) : (
                                        <motion.div key="display-row" initial={false} animate={{ opacity: 1 }}>
                                    {/* Main row */}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                              {sub.name || 'Unnamed feed'}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                                              {getPlatformLabel(sub.platform)}
                                            </span>
                                            <SyncStatusBadge status={sub.syncStatus} />
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-gray-500 truncate max-w-[300px]" title={sub.icalUrl}>
                                              {sub.icalUrl}
                                            </span>
                                            {sub.lastSyncedAt && (
                                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                                Synced {getRelativeTime(sub.lastSyncedAt)}
                                              </span>
                                            )}
                                          </div>
                                          {sub.errorMessage && sub.syncStatus === 'error' && (
                                            <p className="text-xs text-red-600 mt-1">{sub.errorMessage}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* AutoSync toggle */}
                                        <button
                                          onClick={() => handleToggleAutoSync(sub)}
                                          disabled={togglingAutoSync === sub.id}
                                          className="flex items-center gap-1.5 group"
                                          title={sub.autoSync ? 'Auto-sync enabled' : 'Auto-sync disabled'}
                                        >
                                          <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">Auto</span>
                                          <div className={`relative w-8 h-[18px] rounded-full transition-colors ${sub.autoSync ? 'bg-cyan-500' : 'bg-gray-300'} ${togglingAutoSync === sub.id ? 'opacity-50' : ''}`}>
                                            <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${sub.autoSync ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                                          </div>
                                        </button>

                                        {/* Sync button */}
                                        <motion.button
                                          onClick={() => handleSync(sub)}
                                          disabled={isSyncing}
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <ArrowPathIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                                        </motion.button>

                                        {/* Edit button */}
                                        {!isDeleting && (
                                          <button
                                            onClick={() => handleStartEdit(sub)}
                                            className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                            title="Edit feed"
                                          >
                                            <PencilIcon className="w-4 h-4" />
                                          </button>
                                        )}

                                        {/* Delete button / confirmation */}
                                        {isDeleting ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-gray-500">Delete?</span>
                                            <button
                                              onClick={() => handleDelete(sub)}
                                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                              Yes
                                            </button>
                                            <button
                                              onClick={() => setDeletingId(null)}
                                              className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                            >
                                              No
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setDeletingId(sub.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove feed"
                                          >
                                            <TrashIcon className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Sync results */}
                                    {results && (
                                      <div className="mt-3 border-t border-gray-200 pt-3">
                                        <button
                                          onClick={() => {
                                            setExpandedResults(prev => {
                                              const next = new Set(prev)
                                              if (next.has(sub.id)) {
                                                next.delete(sub.id)
                                              } else {
                                                next.add(sub.id)
                                              }
                                              return next
                                            })
                                          }}
                                          className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                          <span className="text-green-600">{results.created} created</span>
                                          <span className="text-gray-300">|</span>
                                          <span className="text-amber-600">{results.updated} updated</span>
                                          <span className="text-gray-300">|</span>
                                          <span className="text-gray-500">{results.skipped} skipped</span>
                                          <span className="text-gray-300">|</span>
                                          <span className="text-red-600">{results.cancelled} cancelled</span>
                                          {results.events.length > 0 && (
                                            isResultsExpanded
                                              ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" />
                                              : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                                          )}
                                        </button>

                                        {/* Events table */}
                                        <AnimatePresence>
                                          {isResultsExpanded && results.events.length > 0 && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.15 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="mt-2 overflow-x-auto">
                                                <table className="w-full text-xs">
                                                  <thead>
                                                    <tr className="text-gray-500 border-b border-gray-200">
                                                      <th className="text-left py-1.5 pr-3 font-medium">Reservation</th>
                                                      <th className="text-left py-1.5 pr-3 font-medium">Guest</th>
                                                      <th className="text-left py-1.5 pr-3 font-medium">Dates</th>
                                                      <th className="text-left py-1.5 font-medium">Action</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {results.events.map((event, idx) => (
                                                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                        <td className="py-1.5 pr-3 font-mono text-gray-700">{event.reservationCode}</td>
                                                        <td className="py-1.5 pr-3 text-gray-900">{event.guestName}</td>
                                                        <td className="py-1.5 pr-3 text-gray-600">
                                                          {event.checkIn && event.checkOut
                                                            ? `${new Date(event.checkIn).toLocaleDateString()} → ${new Date(event.checkOut).toLocaleDateString()}`
                                                            : '—'}
                                                        </td>
                                                        <td className="py-1.5">
                                                          <ActionBadge action={event.action} />
                                                          {event.reason && (
                                                            <span className="ml-1 text-gray-400" title={event.reason}>
                                                              ({event.reason})
                                                            </span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                              {results.errors.length > 0 && (
                                                <div className="mt-2 p-2 bg-red-50 rounded-lg">
                                                  <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                                                  {results.errors.map((error, idx) => (
                                                    <p key={idx} className="text-xs text-red-600">
                                                      {typeof error === 'string' ? error : `${error.summary}: ${error.error}`}
                                                    </p>
                                                  ))}
                                                </div>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Empty state */}
                          {!isLoading && propSubs.length === 0 && !isAddFormOpen && (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-400">No iCal feeds for this property</p>
                            </div>
                          )}

                          {/* Add form */}
                          <AnimatePresence>
                            {isAddFormOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 p-4 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      iCal URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="url"
                                      value={form.url}
                                      onChange={e => setAddFormData(prev => ({
                                        ...prev,
                                        [property.id]: { ...getAddForm(property.id), url: e.target.value },
                                      }))}
                                      placeholder="https://www.airbnb.com/calendar/ical/..."
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
                                      <select
                                        value={form.platform}
                                        onChange={e => setAddFormData(prev => ({
                                          ...prev,
                                          [property.id]: { ...getAddForm(property.id), platform: e.target.value as ICalPlatform },
                                        }))}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                      >
                                        {PLATFORM_OPTIONS.map(opt => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Name (optional)</label>
                                      <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setAddFormData(prev => ({
                                          ...prev,
                                          [property.id]: { ...getAddForm(property.id), name: e.target.value },
                                        }))}
                                        placeholder="e.g. Airbnb Calendar"
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                      />
                                    </div>
                                  </div>

                                  {formError && (
                                    <p className="text-xs text-red-600">{formError}</p>
                                  )}

                                  <div className="flex items-center gap-2 pt-1">
                                    <motion.button
                                      onClick={() => handleAddFeed(property.id)}
                                      disabled={formLoading}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {formLoading ? (
                                        <>
                                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                          Adding...
                                        </>
                                      ) : (
                                        <>
                                          <PlusIcon className="w-4 h-4 mr-1.5" />
                                          Add Feed
                                        </>
                                      )}
                                    </motion.button>
                                    <button
                                      onClick={() => {
                                        setShowAddForm(prev => ({ ...prev, [property.id]: false }))
                                        setAddFormError(prev => ({ ...prev, [property.id]: null }))
                                      }}
                                      disabled={formLoading}
                                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Add feed button */}
                          {!isAddFormOpen && !isLoading && (
                            <div className="mt-3">
                              <button
                                onClick={() => setShowAddForm(prev => ({ ...prev, [property.id]: true }))}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                              >
                                <PlusIcon className="w-4 h-4" />
                                Add Feed
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}

        {/* Info note */}
        {activeProperties.length > 0 && (
          <div className="mt-4 p-3 bg-cyan-50 rounded-xl">
            <p className="text-xs text-cyan-700">
              iCal feeds sync bookings from external calendars. Synced bookings automatically create cleaning projects on the turnover calendar.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
