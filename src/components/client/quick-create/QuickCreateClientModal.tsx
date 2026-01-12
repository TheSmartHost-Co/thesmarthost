'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/services/clientService'
import { CreateClientPayload, Client } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'

interface QuickCreateClientModalProps {
  onCancel: () => void
  onCreate: (client: Client) => void
}

const QuickCreateClientModal: React.FC<QuickCreateClientModalProps> = ({
  onCancel,
  onCreate,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [showExtras, setShowExtras] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form when component mounts
  useEffect(() => {
    setName('')
    setEmail('')
    setPhone('')
    setShowExtras(false)
  }, [])

  // Focus name input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const nameInput = document.getElementById('quick-create-client-name')
      if (nameInput) {
        nameInput.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification('Client name is required', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    // Validate email format if provided
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const emails = trimmedEmail.split(',').map(e => e.trim()).filter(e => e)
      const allValid = emails.length > 0 && emails.every(e => emailRegex.test(e))
      if (!allValid) {
        showNotification('Please enter a valid email address', 'error')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload: CreateClientPayload = {
        parentId: profile.id,
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        status: 'active',
      }

      const res = await createClient(payload)

      if (res.status === 'success') {
        showNotification('Client created', 'success')
        onCreate(res.data)
      } else {
        showNotification(res.message || 'Failed to create client', 'error')
      }
    } catch (err) {
      console.error('Error creating client:', err)
      showNotification('Error creating client', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Quick Create</h3>
        <p className="text-sm text-gray-500 mt-0.5">Add a new client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field - always visible */}
        <div>
          <label htmlFor="quick-create-client-name" className="block text-sm font-medium text-gray-700 mb-1">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            id="quick-create-client-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            placeholder="e.g. John Smith"
            disabled={isSubmitting}
          />
        </div>

        {/* Expandable section */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            {showExtras ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
            {showExtras ? 'Hide details' : 'Add email & phone'}
          </button>

          <AnimatePresence>
            {showExtras && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-3">
                  {/* Email field */}
                  <div>
                    <label htmlFor="quick-create-client-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="quick-create-client-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="john@email.com"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Phone field */}
                  <div>
                    <label htmlFor="quick-create-client-phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      id="quick-create-client-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="(555) 123-4567"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-400">
          You can add more details later from the Clients page.
        </p>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default QuickCreateClientModal
