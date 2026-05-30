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
import type { GroupedListingMapping } from '@/services/types/pmsListingMapping'

interface EditListingMappingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  /** The listing being reassigned. */
  mapping: GroupedListingMapping | null
  properties: Property[]
  onSaved: () => void
}

const EditListingMappingModal: React.FC<EditListingMappingModalProps> = ({
  isOpen,
  onClose,
  userId,
  mapping,
  properties,
  onSaved,
}) => {
  const { showNotification } = useNotificationStore()
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset the selection to the mapping's current property each time it opens.
  useEffect(() => {
    if (isOpen) {
      setPropertyId(mapping?.propertyId ?? null)
      setSaving(false)
    }
  }, [isOpen, mapping])

  // The property this listing is mapped to right now — shown read-only above the
  // editable select so the user keeps a stable reference while picking a new one.
  const current = useMemo(() => {
    if (!mapping) return null
    const prop = mapping.propertyId
      ? properties.find((p) => p.id === mapping.propertyId)
      : undefined
    const name = mapping.propertyName || prop?.listingName || prop?.address || null
    const address = prop?.address && prop.address !== name ? prop.address : null
    return name ? { name, address } : null
  }, [mapping, properties])

  const propertyOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      properties.map((p) => ({
        value: p.id,
        label: p.listingName || p.address,
        secondaryLabel: p.listingName ? p.address : undefined,
      })),
    [properties]
  )

  const handleSave = async () => {
    if (!mapping) return
    if (!propertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    // Keep the mapping's client in sync with the chosen property's primary owner.
    const selected = properties.find((p) => p.id === propertyId)
    const clientId = selected ? getPrimaryOwner(selected)?.clientId ?? null : null

    setSaving(true)
    try {
      const res = await upsertMappingByListing({
        userId,
        externalListingId: mapping.externalListingId,
        propertyId,
        clientId,
      })
      if (res.status === 'success') {
        showNotification('Listing mapping updated', 'success')
        onSaved()
        onClose()
      } else {
        showNotification(res.message || 'Failed to update mapping', 'error')
      }
    } catch (err) {
      console.error('Error updating listing mapping:', err)
      showNotification(
        err instanceof Error ? err.message : 'Network error',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!mapping) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-md">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Edit listing mapping</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose which property webhooks for this listing should be assigned to.
          The change applies to every channel
          {mapping.platforms.length > 0
            ? ` (${mapping.platforms.join(', ')})`
            : ''}{' '}
          for this listing.
        </p>

        <div className="mt-4 space-y-1">
          <div className="text-xs font-medium text-gray-500">Hostaway listing ID</div>
          <div className="font-mono text-sm text-gray-900">
            {mapping.externalListingId}
          </div>
        </div>

        {/* Current mapping — read-only reference */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-medium text-gray-500">Currently mapped to</div>
          {current ? (
            <>
              <div className="text-sm font-medium text-gray-900">{current.name}</div>
              {current.address && (
                <div className="text-xs text-gray-500">{current.address}</div>
              )}
            </>
          ) : (
            <div className="text-sm font-medium text-amber-600">Not yet mapped</div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Change to <span className="text-red-500">*</span>
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
            {saving ? 'Saving...' : 'Save mapping'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default EditListingMappingModal
