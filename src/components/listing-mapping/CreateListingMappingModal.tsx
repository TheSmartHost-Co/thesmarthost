'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import SearchableSelect, {
  SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import { useNotificationStore } from '@/store/useNotificationStore'
import { upsertMappingByListing } from '@/services/pmsListingMappingService'
import { getPrimaryOwner } from '@/services/propertyService'
import type { Property } from '@/services/types/property'

interface CreateListingMappingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  properties: Property[]
  /** Listing ids that already have a mapping (to warn about duplicates). */
  existingListingIds: string[]
  onSaved: () => void
}

const CreateListingMappingModal: React.FC<CreateListingMappingModalProps> = ({
  isOpen,
  onClose,
  userId,
  properties,
  existingListingIds,
  onSaved,
}) => {
  const { showNotification } = useNotificationStore()
  const [externalListingId, setExternalListingId] = useState('')
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setExternalListingId('')
      setPropertyId(null)
      setSaving(false)
    }
  }, [isOpen])

  const propertyOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      properties.map((p) => ({
        value: p.id,
        label: p.listingName || p.address,
        secondaryLabel: p.listingName ? p.address : undefined,
      })),
    [properties]
  )

  const trimmedId = externalListingId.trim()
  const isDuplicate = trimmedId.length > 0 && existingListingIds.includes(trimmedId)

  const handleSave = async () => {
    if (!trimmedId) {
      showNotification('Please enter a Hostaway listing ID', 'error')
      return
    }
    if (!propertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    const selected = properties.find((p) => p.id === propertyId)
    const clientId = selected ? getPrimaryOwner(selected)?.clientId ?? null : null

    setSaving(true)
    try {
      const res = await upsertMappingByListing({
        userId,
        externalListingId: trimmedId,
        propertyId,
        clientId,
      })
      if (res.status === 'success') {
        showNotification('Listing mapping created', 'success')
        onSaved()
        onClose()
      } else {
        showNotification(res.message || 'Failed to create mapping', 'error')
      }
    } catch (err) {
      console.error('Error creating listing mapping:', err)
      showNotification(
        err instanceof Error ? err.message : 'Network error',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-md">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Add listing mapping</h3>
        <p className="mt-1 text-sm text-gray-500">
          Pre-assign a Hostaway listing to a property before any booking arrives.
          Future webhooks for this listing will route to the chosen property.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hostaway listing ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={externalListingId}
            onChange={(e) => setExternalListingId(e.target.value)}
            placeholder="e.g. 123456"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            This is Hostaway&apos;s <span className="font-mono">listingMapId</span>{' '}
            for the listing.
          </p>
          {isDuplicate && (
            <p className="mt-1 text-xs text-amber-600">
              A mapping already exists for this listing — saving will overwrite it.
            </p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mapped property <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={propertyOptions}
            value={propertyId}
            onChange={setPropertyId}
            placeholder="Select a property..."
            clearable={false}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create mapping'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateListingMappingModal
