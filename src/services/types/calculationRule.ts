// Calculation Rule Types for HostMetrics Frontend

/**
 * Platform enum matching backend
 */
export type Platform = 'ALL' | 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' | 'direct-etransfer' | 'vrbo' | 'hostaway';

/**
 * Main Calculation Rule interface
 * Matches backend response structure (now user-based with templates)
 */
export interface CalculationRule {
  id: string;
  userId: string;
  templateId?: string;
  platform: Platform;
  bookingField: string;
  csvFormula: string;
  priority?: number;
  isActive: boolean;
  notes?: string;
  templateName?: string;
  templateDescription?: string;
  isTemplateDefault?: boolean;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template summary interface
 */
export interface CalculationRuleTemplate {
  templateId: string;
  templateName: string;
  templateDescription?: string;
  isTemplateDefault: boolean;
  ruleCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User custom field for suggestions
 */
export interface UserCustomField {
  bookingField: string;
  csvFormula: string;
  usageCount: number;
  usedInTemplates?: string;
}

/**
 * Payload for creating a new calculation rule
 */
export interface CreateCalculationRulePayload {
  userId: string;
  templateId?: string;
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
  templateId?: string;
}

/**
 * Template creation payload
 */
export interface CreateTemplatePayload {
  userId: string;
  templateName: string;
  templateDescription?: string;
  isTemplateDefault?: boolean;
  rules?: {
    platform: Platform;
    bookingField: string;
    csvFormula: string;
    priority?: number;
    notes?: string;
  }[];
  copyFromTemplateId?: string;
}

/**
 * Template update payload
 */
export interface UpdateTemplatePayload {
  userId: string;
  templateName?: string;
  templateDescription?: string;
  isTemplateDefault?: boolean;
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
 * API response for templates
 */
export interface CalculationRuleTemplatesResponse {
  status: 'success' | 'failed';
  data: CalculationRuleTemplate[];
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
 * API response for delete operation
 */
export interface DeleteCalculationRuleResponse {
  status: 'success' | 'failed';
  message: string;
}

/**
 * Template data interface
 */
export interface TemplateData {
  templateId: string;
  templateName: string;
  templateDescription?: string;
  isTemplateDefault: boolean;
  createdAt: string;
  updatedAt: string;
  rulesCount?: number;
}

/**
 * API response for template creation
 */
export interface CreateTemplateResponse {
  status: 'success' | 'failed';
  data?: TemplateData;
  message: string;
}

/**
 * API response for template update
 */
export interface UpdateTemplateResponse {
  status: 'success' | 'failed';
  data?: TemplateData;
  message?: string;
}