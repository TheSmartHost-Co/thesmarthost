# Component Patterns

> **Full code examples for common component types in TheSmartHost**

---

## Modal Component Pattern (Create)

**File:** `src/components/[resource]/create/create[Resource]Modal.tsx`

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { create[Resource] } from '@/services/[resource]Service'
import { Create[Resource]Payload } from '@/services/types/[resource]'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'

interface Create[Resource]ModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (new[Resource]: any) => void
}

const Create[Resource]Modal: React.FC<Create[Resource]ModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  // Form state
  const [name, setName] = useState('')
  const [otherField, setOtherField] = useState('')

  // Global state
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setOtherField('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedOtherField = otherField.trim()

    // Validation
    if (!trimmedName || !trimmedOtherField) {
      showNotification('All fields are required', 'error')
      return
    }

    try {
      const payload: Create[Resource]Payload = {
        name: trimmedName,
        otherField: trimmedOtherField,
      }

      const res = await create[Resource](payload)

      if (res.status === 'success') {
        onAdd(res.data)
        showNotification('[Resource] created successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to create [resource]', 'error')
      }
    } catch (err) {
      console.error('Error creating [resource]:', err)
      const message = err instanceof Error ? err.message : 'Error creating [resource]'
      showNotification(message, 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Create New [Resource]</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-black">

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Example Name"
          />
        </div>

        {/* Select Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            required
            value={otherField}
            onChange={(e) => setOtherField(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a type</option>
            <option value="TYPE_A">Type A</option>
            <option value="TYPE_B">Type B</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create [Resource]
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default Create[Resource]Modal
```

---

## Modal Component Pattern (Update)

**File:** `src/components/[resource]/update/update[Resource]Modal.tsx`

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { update[Resource] } from '@/services/[resource]Service'
import { Update[Resource]Payload, [Resource] } from '@/services/types/[resource]'
import { useNotificationStore } from '@/store/useNotificationStore'

interface Update[Resource]ModalProps {
  isOpen: boolean
  onClose: () => void
  [resource]: [Resource] | null  // Current resource data
  onUpdate: (updated[Resource]: [Resource]) => void
}

const Update[Resource]Modal: React.FC<Update[Resource]ModalProps> = ({
  isOpen,
  onClose,
  [resource],
  onUpdate,
}) => {
  const [name, setName] = useState('')
  const [otherField, setOtherField] = useState('')

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Populate form when modal opens with existing data
  useEffect(() => {
    if (isOpen && [resource]) {
      setName([resource].name)
      setOtherField([resource].otherField)
    }
  }, [isOpen, [resource]])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (![resource]) return

    const trimmedName = name.trim()
    const trimmedOtherField = otherField.trim()

    // Validation
    if (!trimmedName || !trimmedOtherField) {
      showNotification('All fields are required', 'error')
      return
    }

    try {
      const payload: Update[Resource]Payload = {
        name: trimmedName,
        otherField: trimmedOtherField,
      }

      const res = await update[Resource]([resource].id, payload)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('[Resource] updated successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to update [resource]', 'error')
      }
    } catch (err) {
      console.error('Error updating [resource]:', err)
      const message = err instanceof Error ? err.message : 'Error updating [resource]'
      showNotification(message, 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Update [Resource]</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-black">
        {/* Form fields same as create modal */}
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Update [Resource]
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default Update[Resource]Modal
```

---

## Modal Component Pattern (Delete)

**File:** `src/components/[resource]/delete/delete[Resource]Modal.tsx`

```typescript
'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { delete[Resource] } from '@/services/[resource]Service'
import { [Resource] } from '@/services/types/[resource]'
import { useNotificationStore } from '@/store/useNotificationStore'

interface Delete[Resource]ModalProps {
  isOpen: boolean
  onClose: () => void
  [resource]: [Resource] | null
  onDelete: (id: string) => void
}

const Delete[Resource]Modal: React.FC<Delete[Resource]ModalProps> = ({
  isOpen,
  onClose,
  [resource],
  onDelete,
}) => {
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDelete = async () => {
    if (![resource]) return

    try {
      const res = await delete[Resource]([resource].id)

      if (res.status === 'success') {
        onDelete([resource].id)
        showNotification('[Resource] deleted successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to delete [resource]', 'error')
      }
    } catch (err) {
      console.error('Error deleting [resource]:', err)
      const message = err instanceof Error ? err.message : 'Error deleting [resource]'
      showNotification(message, 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <h2 className="text-xl mb-4 text-black">Delete [Resource]</h2>
      <p className="text-gray-700 mb-6">
        Are you sure you want to delete <strong>{[resource]?.name}</strong>?
        This action cannot be undone.
      </p>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </Modal>
  )
}

export default Delete[Resource]Modal
```

---

## Page Component Pattern (List/Table View)

**File:** `src/app/(user)/property-manager/[resources]/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { get[Resources] } from '@/services/[resource]Service'
import { [Resource] } from '@/services/types/[resource]'
import Create[Resource]Modal from '@/components/[resource]/create/create[Resource]Modal'
import Update[Resource]Modal from '@/components/[resource]/update/update[Resource]Modal'
import Delete[Resource]Modal from '@/components/[resource]/delete/delete[Resource]Modal'
import TableActionsDropdown from '@/components/shared/TableActionsDropdown'

export default function [Resources]Page() {
  const [resources, set[Resources]] = useState<[Resource][]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResource, setSelectedResource] = useState<[Resource] | null>(null)

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { profile, isAuthenticated } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const router = useRouter()

  // Fetch data on mount
  useEffect(() => {
    if (!isAuthenticated || !profile) {
      router.push('/login')
      return
    }

    fetchData()
  }, [profile?.id, isAuthenticated])

  const fetchData = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      const res = await get[Resources](profile.id)
      if (res.status === 'success') {
        set[Resources](res.data)
      }
    } catch (err) {
      console.error('Error fetching [resources]:', err)
      showNotification('Failed to load [resources]', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (new[Resource]: [Resource]) => {
    set[Resources](prev => [...prev, new[Resource]])
  }

  const handleUpdate = (updated[Resource]: [Resource]) => {
    set[Resources](prev =>
      prev.map(r => r.id === updated[Resource].id ? updated[Resource] : r)
    )
  }

  const handleDelete = (id: string) => {
    set[Resources](prev => prev.filter(r => r.id !== id))
  }

  const openUpdateModal = ([resource]: [Resource]) => {
    setSelectedResource([resource])
    setIsUpdateOpen(true)
  }

  const openDeleteModal = ([resource]: [Resource]) => {
    setSelectedResource([resource])
    setIsDeleteOpen(true)
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">[Resources]</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add [Resource]
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[resources].map(([resource]) => (
              <tr key={[resource].id}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {[resource].name}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    [resource].isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {[resource].isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <TableActionsDropdown
                    onEdit={() => openUpdateModal([resource])}
                    onDelete={() => openDeleteModal([resource])}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {[resources].length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No [resources] found. Create your first [resource] to get started.
          </div>
        )}
      </div>

      {/* Modals */}
      <Create[Resource]Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onAdd={handleAdd}
      />
      <Update[Resource]Modal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        [resource]={selectedResource}
        onUpdate={handleUpdate}
      />
      <Delete[Resource]Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        [resource]={selectedResource}
        onDelete={handleDelete}
      />
    </div>
  )
}
```

---

## Shared Modal Wrapper

**File:** `src/components/shared/modal.tsx`

Already exists in the project - use it as-is:

```typescript
'use client'

import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  style?: string
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, style = '' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      {/* Modal content */}
      <div className={`relative bg-white rounded-lg shadow-xl ${style}`}>
        {children}
      </div>
    </div>
  )
}

export default Modal
```

---

**Last Updated:** November 4, 2025
