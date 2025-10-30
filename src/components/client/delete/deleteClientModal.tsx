'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { deleteClient } from '@/services/clientService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Client } from '@/services/types/client'

interface DeleteClientModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onDeleted: (id: string) => void
}

const DeleteClientModal: React.FC<DeleteClientModalProps> = ({ 
  isOpen, 
  onClose, 
  client, 
  onDeleted 
}) => {
  const showNotification = useNotificationStore(state => state.showNotification)

  const handleDelete = async () => {
    try {
      await deleteClient(client.id)
      showNotification('Client deleted successfully', 'success')
      onDeleted(client.id)
      onClose()
    } catch (err) {
      showNotification('Error deleting client', 'error')
      console.error(err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-sm w-11/12">
      <h2 className="text-lg font-semibold mb-4 text-black">Delete Client</h2>
      <p className="text-black mb-6">
        Are you sure you want to delete <strong>{client.name}</strong>?
        <br />
        <span className="text-sm text-gray-600 mt-2 block">
          This action cannot be undone. All data associated with this client will be permanently removed.
        </span>
      </p>
      <div className="flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer transition-colors"
        >
          Delete Client
        </button>
      </div>
    </Modal>
  )
}

export default DeleteClientModal