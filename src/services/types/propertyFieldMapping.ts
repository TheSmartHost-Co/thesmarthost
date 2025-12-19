// Property Field Mapping Types - For CSV upload template management

import { FieldMapping, Platform } from './csvMapping'

/**
 * Property Field Mapping Template
 * Stores reusable field mapping configurations for properties
 */
export interface PropertyFieldMappingTemplate {
  id: string
  propertyId: string
  userId: string
  mappingName: string
  fieldMappings: Record<Platform, Record<string, string>> // Platform-specific field mappings
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Property Field Mapping Template with property name
 * Extended version for user's template list across all properties
 */
export interface PropertyFieldMappingTemplateWithProperty extends PropertyFieldMappingTemplate {
  propertyName: string
}

/**
 * Payload for creating a new property field mapping template
 */
export interface CreatePropertyFieldMappingPayload {
  propertyId: string
  userId: string
  mappingName: string
  fieldMappings: Record<Platform, Record<string, string>>
  isDefault?: boolean
}

/**
 * Payload for updating an existing property field mapping template
 */
export interface UpdatePropertyFieldMappingPayload {
  mappingName?: string
  fieldMappings?: Record<Platform, Record<string, string>>
  isDefault?: boolean
}

/**
 * API response for single property field mapping template
 */
export interface PropertyFieldMappingResponse {
  status: 'success' | 'failed'
  data: PropertyFieldMappingTemplate
  message?: string
}

/**
 * API response for multiple property field mapping templates
 */
export interface PropertyFieldMappingListResponse {
  status: 'success' | 'failed'
  data: PropertyFieldMappingTemplate[]
  message?: string
}

/**
 * API response for property field mapping templates with property names
 */
export interface PropertyFieldMappingWithPropertyListResponse {
  status: 'success' | 'failed'
  data: PropertyFieldMappingTemplateWithProperty[]
  message?: string
}

/**
 * API response for delete operation
 */
export interface DeletePropertyFieldMappingResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * Template summary for display in dropdowns/lists
 */
export interface TemplateOption {
  value: string // template ID
  label: string // template name
  isDefault: boolean
  platforms: Platform[] // platforms configured in this template
  createdAt: string
}

/**
 * Field mapping conversion utility types
 * For converting between FieldMapping[] and platform-specific object format
 */
export interface PlatformFieldMappings {
  [platform: string]: {
    [bookingField: string]: string // csvFormula
  }
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  isValid: boolean
  missingRequiredFields: string[]
  emptyPlatforms: Platform[]
  warnings: string[]
}

/**
 * Template statistics for dashboard display
 */
export interface TemplateStats {
  totalTemplates: number
  defaultTemplates: number
  templatesWithPlatformOverrides: number
  mostUsedPlatforms: Array<{
    platform: Platform
    count: number
  }>
}