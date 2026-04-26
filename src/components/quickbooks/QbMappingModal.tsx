'use client'

import Modal from '@/components/shared/modal'
import CategoryMappingTable from '@/components/quickbooks/CategoryMappingTable'

interface QbMappingModalProps {
  isOpen: boolean
  onClose: () => void
  /**
   * False when QB is disconnected or token has expired. The wrapped table
   * renders a guidance message in that state instead of the full UI.
   */
  isConnected: boolean
}

/**
 * Lifts the persistent category↔QBO-account mapping table out of Settings →
 * Integrations and into a modal that can be opened from anywhere (currently
 * the /expenses toolbar). Mutations to mappings are still routed through the
 * existing `/quickbooks/account-mappings` endpoints — this is purely a
 * relocation of the management surface.
 */
export default function QbMappingModal({ isOpen, onClose, isConnected }: QbMappingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-4xl">
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">QuickBooks Category Mappings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Map each expense category to a QuickBooks Online account. Mappings are reused
            for every expense you send.
          </p>
        </div>
        <CategoryMappingTable isConnected={isConnected} />
      </div>
    </Modal>
  )
}
