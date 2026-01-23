'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createReportTemplate, getReportTemplates, cloneReportTemplate } from '@/services/reportTemplateService'
import type { ReportTemplate } from '@/services/types/reportTemplate'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'

interface CreateReportTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (newTemplate: ReportTemplate) => void
}

const CreateReportTemplateModal: React.FC<CreateReportTemplateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cloneFromId, setCloneFromId] = useState<string>('')
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load available templates for cloning when modal opens
  useEffect(() => {
    const loadTemplates = async () => {
      if (isOpen && profile?.id) {
        setLoadingTemplates(true)
        try {
          const res = await getReportTemplates(profile.id)
          if (res.status === 'success') {
            setAvailableTemplates(res.data || [])
          }
        } catch (error) {
          console.error('Error loading templates:', error)
        } finally {
          setLoadingTemplates(false)
        }
      }
    }

    loadTemplates()
  }, [isOpen, profile?.id])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setCloneFromId('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    if (!trimmedName) {
      showNotification('Template name is required', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      let res

      if (cloneFromId) {
        // Clone existing template
        res = await cloneReportTemplate(cloneFromId, {
          userId: profile.id,
          name: trimmedName,
        })
      } else {
        // Create new template
        res = await createReportTemplate({
          userId: profile.id,
          name: trimmedName,
          description: trimmedDescription || undefined,
        })
      }

      if (res.status === 'success') {
        showNotification(
          cloneFromId ? 'Template cloned successfully' : 'Template created successfully',
          'success'
        )
        onCreated(res.data)
      } else {
        showNotification(res.message || 'Failed to create template', 'error')
      }
    } catch (err) {
      console.error('Error creating template:', err)
      showNotification('Error creating template', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12 max-h-[80vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Create Report Template</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Monthly Revenue Report"
          />
        </div>

        {/* Description field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description of this template..."
            rows={3}
          />
        </div>

        {/* Clone from existing template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <DocumentDuplicateIcon className="w-4 h-4 inline-block mr-1" />
            Clone from Existing Template
          </label>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Loading templates...</span>
            </div>
          ) : (
            <>
              <select
                value={cloneFromId}
                onChange={(e) => setCloneFromId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Start from scratch</option>
                <optgroup label="System Templates">
                  {availableTemplates
                    .filter((t) => t.isSystemTemplate)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                        {template.isSystemDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                </optgroup>
                {availableTemplates.filter((t) => !t.isSystemTemplate).length > 0 && (
                  <optgroup label="Custom Templates">
                    {availableTemplates
                      .filter((t) => !t.isSystemTemplate)
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {cloneFromId
                  ? 'The new template will copy all sections and fields from the selected template.'
                  : 'Create a blank template with no sections or fields.'}
              </p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {cloneFromId ? 'Clone Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateReportTemplateModal
