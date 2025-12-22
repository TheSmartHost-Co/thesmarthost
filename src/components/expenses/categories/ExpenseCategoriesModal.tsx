'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import {
  getCategoriesByUserId,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/services/expenseCategoriesService'
import type {
  ExpenseCategory,
  CreateExpenseCategoryPayload,
  UpdateExpenseCategoryPayload
} from '@/services/types/expenseCategories'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

interface ExpenseCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  onCategoryUpdate?: () => void
}

const ExpenseCategoriesModal: React.FC<ExpenseCategoriesModalProps> = ({
  isOpen,
  onClose,
  onCategoryUpdate,
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [colorHex, setColorHex] = useState('#6B7280')
  const [isDefault, setIsDefault] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && profile?.id) {
      fetchCategories()
    }
  }, [isOpen, profile?.id])

  const fetchCategories = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      const response = await getCategoriesByUserId(profile.id)
      if (response.status === 'success') {
        setCategories(response.data)
      } else {
        showNotification('Failed to fetch expense categories', 'error')
      }
    } catch (error) {
      console.error('Error fetching expense categories:', error)
      showNotification('Error fetching expense categories', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCode('')
    setLabel('')
    setDescription('')
    setColorHex('#6B7280')
    setIsDefault(false)
    setEditingCategory(null)
    setShowCreateForm(false)
  }

  const handleCreateNew = () => {
    resetForm()
    setShowCreateForm(true)
  }

  const handleEdit = (category: ExpenseCategory) => {
    setCode(category.code)
    setLabel(category.label)
    setDescription(category.description || '')
    setColorHex(category.colorHex || '#6B7280')
    setIsDefault(category.isDefault)
    setEditingCategory(category)
    setShowCreateForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedCode = code.trim().toUpperCase()
    const trimmedLabel = label.trim()

    if (!trimmedCode || !trimmedLabel) {
      showNotification('Code and label are required', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    try {
      if (editingCategory) {
        // Update existing category
        const updateData: UpdateExpenseCategoryPayload = {
          code: trimmedCode,
          label: trimmedLabel,
          description: description.trim() || undefined,
          colorHex,
          isDefault,
        }

        const response = await updateCategory(editingCategory.id, updateData)
        if (response.status === 'success') {
          showNotification('Category updated successfully', 'success')
          fetchCategories()
          resetForm()
          onCategoryUpdate?.()
        } else {
          showNotification(response.message || 'Failed to update category', 'error')
        }
      } else {
        // Create new category
        const createData: CreateExpenseCategoryPayload = {
          userId: profile.id,
          code: trimmedCode,
          label: trimmedLabel,
          description: description.trim() || undefined,
          colorHex,
          isDefault,
        }

        const response = await createCategory(createData)
        if (response.status === 'success') {
          showNotification('Category created successfully', 'success')
          fetchCategories()
          resetForm()
          onCategoryUpdate?.()
        } else {
          showNotification(response.message || 'Failed to create category', 'error')
        }
      }
    } catch (error) {
      console.error('Error saving category:', error)
      showNotification('Error saving category', 'error')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Expenses using this category will keep their category value.')) {
      return
    }

    try {
      const response = await deleteCategory(categoryId)
      if (response.status === 'success') {
        showNotification('Category deleted successfully', 'success')
        fetchCategories()
        onCategoryUpdate?.()
      } else {
        showNotification(response.message || 'Failed to delete category', 'error')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      showNotification('Error deleting category', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Manage Expense Categories</h2>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Categories list */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-black">Current Categories</h3>
              <button
                onClick={handleCreateNew}
                className="cursor-pointer flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-y-auto max-h-64">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{category.code}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>{category.label}</div>
                            {category.description && (
                              <div className="text-xs text-gray-500">{category.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: category.colorHex || '#6B7280' }}
                            ></div>
                            <span className="text-gray-600">{category.colorHex || '#6B7280'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {category.isDefault && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="cursor-pointer text-blue-600 hover:text-blue-800 pr-5"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="cursor-pointer text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No expense categories found. Create your first category to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Create/Edit form */}
          {showCreateForm && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-black mb-4">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4 text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Code field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Code *</label>
                    <input
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="e.g. MAINT"
                    />
                    <p className="mt-1 text-xs text-gray-500">Unique code for this category</p>
                  </div>

                  {/* Label field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Label *</label>
                    <input
                      required
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Maintenance & Repairs"
                    />
                  </div>

                  {/* Description field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Property maintenance, repairs, and upkeep expenses"
                    />
                  </div>

                  {/* Color field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#6B7280"
                      />
                    </div>
                  </div>

                  {/* Default checkbox */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Category</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Set as default category for new expenses</span>
                    </div>
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end space-x-4 pt-4 pb-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Modal buttons */}
      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={onClose}
          className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ExpenseCategoriesModal
