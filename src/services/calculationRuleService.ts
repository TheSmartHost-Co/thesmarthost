import apiClient from './apiClient';
import { 
  CalculationRuleResponse, 
  CalculationRulesResponse, 
  UserCustomFieldsResponse,
  BulkCalculationRuleResponse,
  DeleteCalculationRuleResponse,
  CreateCalculationRulePayload, 
  UpdateCalculationRulePayload,
  BulkCalculationRulePayload,
  Platform 
} from './types/calculationRule';

/**
 * Get all calculation rules for a property
 */
export function getCalculationRules(propertyId: string, platform?: Platform): Promise<CalculationRulesResponse> {
  const params = new URLSearchParams({ propertyId });
  if (platform) {
    params.append('platform', platform);
  }
  return apiClient<CalculationRulesResponse>(`/calculation-rules?${params.toString()}`);
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
 * Create multiple calculation rules in bulk
 */
export function createBulkCalculationRules(bulkData: BulkCalculationRulePayload): Promise<BulkCalculationRuleResponse> {
  return apiClient<BulkCalculationRuleResponse>(`/calculation-rules/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bulkData,
  });
}

/**
 * Get user's custom fields across all properties (for template features)
 */
export function getUserCustomFields(userId: string): Promise<UserCustomFieldsResponse> {
  return apiClient<UserCustomFieldsResponse>(`/calculation-rules/user-custom-fields/${userId}`);
}