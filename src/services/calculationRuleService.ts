import apiClient from './apiClient';
import { 
  CalculationRuleResponse, 
  CalculationRulesResponse, 
  CalculationRuleTemplatesResponse,
  UserCustomFieldsResponse,
  DeleteCalculationRuleResponse,
  CreateTemplateResponse,
  UpdateTemplateResponse,
  CreateCalculationRulePayload, 
  UpdateCalculationRulePayload,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  Platform 
} from './types/calculationRule';

/**
 * Get calculation rules for a user
 * Can filter by platform and/or template ID
 */
export function getCalculationRules(userId: string, platform?: Platform, templateId?: string): Promise<CalculationRulesResponse> {
  const params = new URLSearchParams({ userId });
  if (platform) {
    params.append('platform', platform);
  }
  if (templateId) {
    params.append('templateId', templateId);
  }
  return apiClient<CalculationRulesResponse>(`/calculation-rules?${params.toString()}`);
}

/**
 * Get all templates for a user
 */
export function getUserTemplates(userId: string): Promise<CalculationRuleTemplatesResponse> {
  return apiClient<CalculationRuleTemplatesResponse>(`/calculation-rules/templates/user/${userId}`);
}

/**
 * Get rules for a specific template
 */
export function getTemplateRules(templateId: string): Promise<CalculationRulesResponse> {
  return apiClient<CalculationRulesResponse>(`/calculation-rules/templates/${templateId}`);
}

/**
 * Get calculation rule by ID
 */
export function getCalculationRuleById(id: string): Promise<CalculationRuleResponse> {
  return apiClient<CalculationRuleResponse>(`/calculation-rules/${id}`);
}

/**
 * Create a new calculation rule
 */
export function createCalculationRule(ruleData: CreateCalculationRulePayload): Promise<CalculationRuleResponse> {
  return apiClient<CalculationRuleResponse>(`/calculation-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: ruleData,
  });
}

/**
 * Update an existing calculation rule
 */
export function updateCalculationRule(id: string, updateData: UpdateCalculationRulePayload): Promise<CalculationRuleResponse> {
  return apiClient<CalculationRuleResponse>(`/calculation-rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  });
}

/**
 * Delete (soft delete) a calculation rule
 */
export function deleteCalculationRule(id: string): Promise<DeleteCalculationRuleResponse> {
  return apiClient<DeleteCalculationRuleResponse>(`/calculation-rules/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Delete an entire template
 */
export function deleteTemplate(templateId: string, userId: string): Promise<DeleteCalculationRuleResponse> {
  return apiClient<DeleteCalculationRuleResponse>(`/calculation-rules/templates/${templateId}?userId=${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Update an existing template
 */
export function updateTemplate(templateId: string, updateData: UpdateTemplatePayload): Promise<UpdateTemplateResponse> {
  return apiClient<UpdateTemplateResponse>(`/calculation-rules/templates/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  });
}

/**
 * Create a new template with rules
 * Can copy from existing template or create with new rules
 */
export function createTemplate(templateData: CreateTemplatePayload): Promise<CreateTemplateResponse> {
  return apiClient<CreateTemplateResponse>(`/calculation-rules/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: templateData,
  });
}

/**
 * Get user's custom fields across all templates
 * Used for field suggestions
 */
export function getUserCustomFields(userId: string): Promise<UserCustomFieldsResponse> {
  return apiClient<UserCustomFieldsResponse>(`/calculation-rules/user-custom-fields/${userId}`);
}

/**
 * Get template rules by template name (backward compatibility)
 * Finds template by name first, then gets rules
 */
export async function getTemplateRulesByName(userId: string, templateName: string): Promise<CalculationRulesResponse> {
  // First get all templates to find the one with matching name
  const templatesResponse = await getUserTemplates(userId);
  if (templatesResponse.status === 'success') {
    const template = templatesResponse.data.find(t => t.templateName === templateName);
    if (template) {
      return getTemplateRules(template.templateId);
    }
  }
  
  // Return empty result if template not found
  return {
    status: 'failed',
    data: [],
    message: `Template '${templateName}' not found`
  };
}

/**
 * Get all user's calculation rules (across all templates)
 * This is a convenience function that calls getCalculationRules without filters
 */
export function getUserCalculationRules(userId: string): Promise<CalculationRulesResponse> {
  return getCalculationRules(userId);
}