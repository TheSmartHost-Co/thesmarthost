// Property Field Mapping Service - API calls for field mapping template management

import apiClient from './apiClient'
import type {
  PropertyFieldMappingTemplate,
  PropertyFieldMappingTemplateWithProperty,
  CreatePropertyFieldMappingPayload,
  UpdatePropertyFieldMappingPayload,
  PropertyFieldMappingResponse,
  PropertyFieldMappingListResponse,
  PropertyFieldMappingWithPropertyListResponse,
  DeletePropertyFieldMappingResponse,
  TemplateOption,
  TemplateValidationResult,
  TemplateStats,
  PlatformFieldMappings
} from './types/propertyFieldMapping'
import type { FieldMapping, Platform, REQUIRED_BOOKING_FIELDS } from './types/csvMapping'

/**
 * Get all field mapping templates for a specific property
 * @param propertyId - Property ID
 * @returns Promise with templates array
 */
export async function getPropertyFieldMappings(
  propertyId: string
): Promise<PropertyFieldMappingListResponse> {
  return apiClient<PropertyFieldMappingListResponse>(`/property-field-mappings/property/${propertyId}`)
}

/**
 * Get the default field mapping template for a property
 * @param propertyId - Property ID  
 * @returns Promise with default template or 404 if none exists
 */
export async function getDefaultPropertyFieldMapping(
  propertyId: string
): Promise<PropertyFieldMappingResponse> {
  return apiClient<PropertyFieldMappingResponse>(`/property-field-mappings/property/${propertyId}/default`)
}

/**
 * Get single field mapping template by ID
 * @param id - Template ID
 * @returns Promise with template details
 */
export async function getPropertyFieldMappingById(
  id: string
): Promise<PropertyFieldMappingResponse> {
  return apiClient<PropertyFieldMappingResponse>(`/property-field-mappings/${id}`)
}

/**
 * Get all field mapping templates for a user across all their properties
 * @param userId - User ID
 * @returns Promise with templates array including property names
 */
export async function getUserPropertyFieldMappings(
  userId: string
): Promise<PropertyFieldMappingWithPropertyListResponse> {
  return apiClient<PropertyFieldMappingWithPropertyListResponse>(`/property-field-mappings/user/${userId}`)
}

/**
 * Create a new field mapping template
 * @param data - Template creation payload
 * @returns Promise with created template
 */
export async function createPropertyFieldMapping(
  data: CreatePropertyFieldMappingPayload
): Promise<PropertyFieldMappingResponse> {
  return apiClient<PropertyFieldMappingResponse, CreatePropertyFieldMappingPayload>('/property-field-mappings', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update an existing field mapping template
 * Supports partial updates (only send fields to update)
 * @param id - Template ID
 * @param data - Template update payload
 * @returns Promise with updated template
 */
export async function updatePropertyFieldMapping(
  id: string,
  data: UpdatePropertyFieldMappingPayload
): Promise<PropertyFieldMappingResponse> {
  return apiClient<PropertyFieldMappingResponse, UpdatePropertyFieldMappingPayload>(
    `/property-field-mappings/${id}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Set a template as the default for its property
 * Automatically unsets other defaults for the same property
 * @param id - Template ID
 * @returns Promise with updated template
 */
export async function setPropertyFieldMappingAsDefault(
  id: string
): Promise<PropertyFieldMappingResponse> {
  return apiClient<PropertyFieldMappingResponse>(`/property-field-mappings/${id}/set-default`, {
    method: 'PUT',
  })
}

/**
 * Delete a field mapping template
 * @param id - Template ID
 * @returns Promise with success message
 */
export async function deletePropertyFieldMapping(
  id: string
): Promise<DeletePropertyFieldMappingResponse> {
  return apiClient<DeletePropertyFieldMappingResponse>(`/property-field-mappings/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Convert platform field mappings object to FieldMapping array
 * Used when loading templates into the CSV upload wizard
 * @param platformMappings - Platform-specific field mappings object
 * @returns Array of FieldMapping objects
 */
export function platformFieldMappingsToFieldMappings(
  platformMappings: Record<Platform, Record<string, string>>
): FieldMapping[] {
  const fieldMappings: FieldMapping[] = []
  
  Object.entries(platformMappings).forEach(([platform, fields]) => {
    Object.entries(fields).forEach(([bookingField, csvFormula]) => {
      if (csvFormula && csvFormula.trim()) {
        fieldMappings.push({
          bookingField,
          csvFormula: csvFormula.trim(),
          platform: platform as Platform,
          isOverride: platform !== 'ALL'
        })
      }
    })
  })
  
  return fieldMappings
}

/**
 * Convert FieldMapping array to platform field mappings object
 * Used when saving current wizard state as a template
 * @param fieldMappings - Array of FieldMapping objects
 * @returns Platform-specific field mappings object
 */
export function fieldMappingsToPlatformFieldMappings(
  fieldMappings: FieldMapping[]
): Record<Platform, Record<string, string>> {
  const platformMappings: Record<Platform, Record<string, string>> = {
    'ALL': {},
    'airbnb': {},
    'booking': {},
    'google': {},
    'direct': {},
    'wechalet': {},
    'monsieurchalets': {},
    'direct-etransfer': {},
    'vrbo': {},
    'hostaway': {}
  }
  
  fieldMappings.forEach(mapping => {
    if (mapping.csvFormula && mapping.csvFormula.trim()) {
      platformMappings[mapping.platform][mapping.bookingField] = mapping.csvFormula.trim()
    }
  })
  
  return platformMappings
}

/**
 * Convert templates to dropdown options
 * @param templates - Array of templates
 * @returns Array of template options for dropdowns
 */
export function convertTemplatesToOptions(
  templates: PropertyFieldMappingTemplate[]
): TemplateOption[] {
  return templates.map(template => ({
    value: template.id,
    label: template.mappingName,
    isDefault: template.isDefault,
    platforms: Object.keys(template.fieldMappings).filter(
      platform => Object.keys(template.fieldMappings[platform as Platform]).length > 0
    ) as Platform[],
    createdAt: template.createdAt
  }))
}

/**
 * Validate a field mapping template
 * Checks for required fields and platform coverage
 * @param fieldMappings - Platform field mappings to validate
 * @returns Validation result with errors and warnings
 */
export function validateTemplate(
  fieldMappings: Record<Platform, Record<string, string>>
): TemplateValidationResult {
  const result: TemplateValidationResult = {
    isValid: true,
    missingRequiredFields: [],
    emptyPlatforms: [],
    warnings: []
  }
  
  // Check if ALL platform has required fields
  const allPlatformMappings = fieldMappings['ALL'] || {}
  const requiredFieldNames = ['reservation_code', 'guest_name', 'check_in_date', 'num_nights', 'platform', 'listing_name']
  
  requiredFieldNames.forEach(fieldName => {
    const hasMappingInAll = allPlatformMappings[fieldName] && allPlatformMappings[fieldName].trim()
    
    // Check if any platform has this required field
    const hasInAnyPlatform = Object.values(fieldMappings).some(platformFields => 
      platformFields[fieldName] && platformFields[fieldName].trim()
    )
    
    if (!hasMappingInAll && !hasInAnyPlatform) {
      result.missingRequiredFields.push(fieldName)
      result.isValid = false
    }
  })
  
  // Check for empty platforms
  Object.entries(fieldMappings).forEach(([platform, fields]) => {
    if (platform !== 'ALL' && Object.keys(fields).length === 0) {
      result.emptyPlatforms.push(platform as Platform)
    }
  })
  
  // Warnings for potential issues
  if (Object.keys(allPlatformMappings).length === 0) {
    result.warnings.push('No base mappings in ALL platform - template may not work well for unknown platforms')
  }
  
  const platformsWithMappings = Object.keys(fieldMappings).filter(
    platform => platform !== 'ALL' && Object.keys(fieldMappings[platform as Platform]).length > 0
  )
  
  if (platformsWithMappings.length === 0) {
    result.warnings.push('No platform-specific mappings - consider adding overrides for better accuracy')
  }
  
  return result
}

/**
 * Calculate statistics from templates array
 * @param templates - Array of templates
 * @returns Template statistics object
 */
export function calculateTemplateStats(
  templates: PropertyFieldMappingTemplate[]
): TemplateStats {
  const totalTemplates = templates.length
  const defaultTemplates = templates.filter(t => t.isDefault).length
  
  let templatesWithPlatformOverrides = 0
  const platformCounts: Record<string, number> = {}
  
  templates.forEach(template => {
    const platforms = Object.keys(template.fieldMappings).filter(
      platform => platform !== 'ALL' && Object.keys(template.fieldMappings[platform as Platform]).length > 0
    )
    
    if (platforms.length > 0) {
      templatesWithPlatformOverrides++
    }
    
    platforms.forEach(platform => {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1
    })
  })
  
  const mostUsedPlatforms = Object.entries(platformCounts)
    .map(([platform, count]) => ({ platform: platform as Platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5
  
  return {
    totalTemplates,
    defaultTemplates,
    templatesWithPlatformOverrides,
    mostUsedPlatforms
  }
}

/**
 * Get template name suggestions based on platform mappings
 * @param fieldMappings - Platform field mappings
 * @returns Array of suggested template names
 */
export function suggestTemplateName(
  fieldMappings: Record<Platform, Record<string, string>>
): string[] {
  const suggestions: string[] = []
  
  const platformsWithMappings = Object.keys(fieldMappings).filter(
    platform => platform !== 'ALL' && Object.keys(fieldMappings[platform as Platform]).length > 0
  ) as Platform[]
  
  // Platform-specific suggestions
  if (platformsWithMappings.includes('hostaway')) {
    suggestions.push('Hostaway Template', 'Hostaway Export')
  }
  if (platformsWithMappings.includes('airbnb')) {
    suggestions.push('Airbnb Template', 'Airbnb Export')
  }
  if (platformsWithMappings.includes('booking')) {
    suggestions.push('Booking.com Template')
  }
  
  // General suggestions
  if (platformsWithMappings.length > 1) {
    suggestions.push('Multi-Platform Template', 'Universal Template')
  } else if (platformsWithMappings.length === 0) {
    suggestions.push('Basic Template', 'Standard Template')
  }
  
  // Date-based suggestion
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
  suggestions.push(`Template ${today}`)
  
  return suggestions
}

/**
 * Check if a template has platform-specific overrides
 * @param template - Template to check
 * @returns True if template has platform overrides
 */
export function hasplatformOverrides(template: PropertyFieldMappingTemplate): boolean {
  return Object.keys(template.fieldMappings).some(
    platform => platform !== 'ALL' && Object.keys(template.fieldMappings[platform as Platform]).length > 0
  )
}

/**
 * Get platforms configured in a template
 * @param template - Template to analyze
 * @returns Array of platforms with mappings
 */
export function getTemplatePlatforms(template: PropertyFieldMappingTemplate): Platform[] {
  return Object.keys(template.fieldMappings).filter(
    platform => Object.keys(template.fieldMappings[platform as Platform]).length > 0
  ) as Platform[]
}