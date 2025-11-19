// Calculation Rule Types for HostMetrics Frontend

/**
 * Platform enum matching backend
 */
export type Platform = 'ALL' | 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' | 'direct-etransfer' | 'vrbo' | 'hostaway';

/**
 * Main Calculation Rule interface
 * Matches backend response structure
 */
export interface CalculationRule {
  id: string;
  propertyId: string;
  userId?: string;
  platform: Platform;
  bookingField: string;
  csvFormula: string;
  priority?: number;
  isActive: boolean;
  notes?: string;
  propertyName?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User custom field for templates
 */
export interface UserCustomField {
  bookingField: string;
  csvFormula: string;
  usageCount: number;
}

/**
 * Payload for creating a new calculation rule
 */
export interface CreateCalculationRulePayload {
  propertyId: string;
  userId?: string;
  platform: Platform;
  bookingField: string;
  csvFormula: string;
  priority?: number;
  notes?: string;
}

/**
 * Payload for updating a calculation rule
 */
export interface UpdateCalculationRulePayload {
  platform?: Platform;
  bookingField?: string;
  csvFormula?: string;
  priority?: number;
  isActive?: boolean;
  notes?: string;
}

/**
 * Bulk rule creation payload
 */
export interface BulkCalculationRulePayload {
  propertyId: string;
  userId?: string;
  rules: {
    platform: Platform;
    bookingField: string;
    csvFormula: string;
    priority?: number;
    notes?: string;
  }[];
}

/**
 * API response for single calculation rule
 */
export interface CalculationRuleResponse {
  status: 'success' | 'failed';
  data: CalculationRule;
  message?: string;
}

/**
 * API response for multiple calculation rules
 */
export interface CalculationRulesResponse {
  status: 'success' | 'failed';
  data: CalculationRule[];
  message?: string;
}

/**
 * API response for user custom fields
 */
export interface UserCustomFieldsResponse {
  status: 'success' | 'failed';
  data: UserCustomField[];
  message?: string;
}

/**
 * API response for bulk creation
 */
export interface BulkCalculationRuleResponse {
  status: 'success' | 'failed';
  data: CalculationRule[];
  message: string;
}

/**
 * API response for delete operation
 */
export interface DeleteCalculationRuleResponse {
  status: 'success' | 'failed';
  message: string;
}