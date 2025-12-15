# CSV Upload Wizard Redesign Plan

## Executive Summary

This document outlines the plan to redesign the CSV upload wizard to support property-specific field mappings, moving from the current rigid global mapping approach to a flexible per-property configuration system.

## Current Flow vs New Flow

### Current Flow (6 Steps)
1. **UPLOAD** → Upload CSV file
2. **VALIDATE** → Map fields globally (one mapping for all properties)
3. **PROPERTY_MAPPING** → Map listing names to properties
4. **PREVIEW** → Review with global mappings applied
5. **PROCESS** → Import bookings
6. **COMPLETE** → Show summary

**Problem**: All properties in a CSV must use the same field mappings and formulas.

### New Flow (6 Steps)
1. **UPLOAD** → Upload CSV file
2. **PROPERTY_IDENTIFICATION** → Map listing names to properties (moved earlier)
3. **FIELD_MAPPING** → Choose global vs property-specific mappings
4. **PREVIEW** → Review with appropriate mappings applied
5. **PROCESS** → Import bookings
6. **COMPLETE** → Show summary

**Solution**: Identify properties first, then allow flexible field mapping configurations.

## Key Changes

### 1. Step Reordering
- Move property identification immediately after upload
- This enables property-specific decisions in subsequent steps
- Rename "PROPERTY_MAPPING" to "PROPERTY_IDENTIFICATION" for clarity
- Rename "VALIDATE" to "FIELD_MAPPING" to better reflect its purpose

### 2. New Field Mapping Step Features
- **Mapping Mode Selection**: User chooses between:
  - "Apply same mappings to all properties" (current behavior)
  - "Configure mappings per property" (new capability)
- **Property Tabs**: When in per-property mode, show tabs for each property
- **Mapping Inheritance**: Option to copy mappings from one property to others
- **Template System**: Save/load mapping templates for reuse

### 3. Data Model Extensions

#### Wizard State Structure
```typescript
interface WizardState {
  // ... existing fields ...
  
  propertyIdentificationState?: {
    propertyMappings: Array<{
      listingName: string
      propertyId: string
      propertyName: string
    }>
    isValid: boolean
  }
  
  fieldMappingState?: {
    mappingMode: 'global' | 'per-property'
    globalMappings?: FieldMapping[]
    propertyMappings?: {
      [propertyId: string]: {
        fieldMappings: FieldMapping[]
        platformOverrides?: {
          [platform: string]: FieldMapping[]
        }
      }
    }
    isValid: boolean
  }
}
```

#### Database Schema Addition
```sql
-- New table for saving CSV field mapping templates
CREATE TABLE csv_field_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  template_name TEXT NOT NULL,
  field_mappings JSONB NOT NULL,
  platform platform,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add to csv_uploads table
ALTER TABLE csv_uploads 
ADD COLUMN field_mapping_mode TEXT DEFAULT 'global',
ADD COLUMN property_field_mappings JSONB;
```

## Implementation Plan

### Phase 1: Infrastructure (Week 1)
1. **Update Wizard Types**
   - Add new state interfaces
   - Update step enum and navigation logic
   - Create new reducer actions

2. **Create Property Identification Step**
   - Extract logic from current PropertyMappingStep
   - Move to step 2 position
   - Maintain backward compatibility

3. **Database Updates**
   - Run migrations for new columns/tables
   - Update backend models and services

### Phase 2: Field Mapping Redesign (Week 1-2)
1. **Create New Field Mapping Step**
   - Add mapping mode selector UI
   - Implement property tabs for per-property mode
   - Reuse existing FieldMappingForm component
   - Add template save/load functionality

2. **Update State Management**
   - Modify wizard reducer for new data structure
   - Handle mode switching and data migration
   - Implement proper validation

3. **Backend API Updates**
   - Add endpoints for field mapping templates
   - Update CSV upload endpoints to handle new data structure

### Phase 3: Preview & Processing Updates (Week 2)
1. **Update Preview Step**
   - Apply correct mappings based on mode and property
   - Show which mapping configuration is being used
   - Maintain edit capabilities

2. **Update Processing Logic**
   - Modify booking generation to use property-specific mappings
   - Update backend processing to handle new structure

### Phase 4: UX Enhancements (Week 3)
1. **Template Management**
   - UI for saving/managing templates
   - Quick apply templates to properties
   - Import templates from webhook mappings

2. **Bulk Operations**
   - Copy mappings between properties
   - Apply template to multiple properties
   - Reset to auto-suggestions

3. **Migration Helpers**
   - Convert existing uploads to new format
   - Import webhook mappings as templates

## Technical Implementation Details

### 1. Property Identification Step Component
```typescript
// New component structure
const PropertyIdentificationStep: React.FC<StepProps> = ({
  wizardState,
  onNext,
  onBack,
}) => {
  // Extract unique listings from CSV
  // Reuse existing property mapping logic
  // Focus only on property identification
}
```

### 2. Field Mapping Step Enhancements
```typescript
interface FieldMappingStepProps extends StepProps {
  mappingMode: 'global' | 'per-property'
  propertyMappings: PropertyMapping[]
}

// UI Structure:
// 1. Mode selector at top
// 2. If global: Single FieldMappingForm
// 3. If per-property: Tabs with FieldMappingForm per property
```

### 3. Mapping Application Logic
```typescript
function getApplicableMapping(
  propertyId: string,
  platform: string,
  fieldMappingState: FieldMappingState
): FieldMapping[] {
  if (fieldMappingState.mappingMode === 'global') {
    return fieldMappingState.globalMappings || []
  }
  
  const propertyConfig = fieldMappingState.propertyMappings?.[propertyId]
  if (!propertyConfig) return []
  
  // Check for platform-specific overrides
  const platformOverride = propertyConfig.platformOverrides?.[platform]
  return platformOverride || propertyConfig.fieldMappings
}
```

### 4. Integration with Webhook Mappings
```typescript
// Allow importing webhook mappings as CSV templates
async function importWebhookMappingAsTemplate(
  propertyId: string,
  platform: string
): Promise<FieldMapping[]> {
  const webhookMapping = await getPropertyWebhookMapping(propertyId, platform)
  return convertWebhookMappingToFieldMapping(webhookMapping)
}
```

## Migration Strategy

### For Existing Code
1. **Maintain Backward Compatibility**
   - Support existing wizard state structure
   - Auto-migrate old state to new format
   - Keep existing API endpoints working

2. **Gradual Rollout**
   - Feature flag for new flow
   - A/B test with subset of users
   - Monitor for issues

### For Users
1. **Existing Uploads**
   - Continue to work as-is
   - Option to convert to new format

2. **Communication**
   - In-app notifications about new features
   - Tutorial for property-specific mappings
   - Migration wizard for power users

## Benefits

1. **Flexibility**: Different properties can use different formulas and mappings
2. **Efficiency**: Reuse mappings via templates
3. **Accuracy**: Property-specific calculations (e.g., different commission rates)
4. **Integration**: Leverage webhook mappings for consistency
5. **Scalability**: Better support for users with many diverse properties

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Increased complexity for users | Default to global mode; provide good UX guidance |
| Performance with many properties | Implement pagination and lazy loading |
| Data migration issues | Comprehensive testing; rollback capability |
| Breaking existing integrations | Maintain backward compatibility |

## Success Metrics

1. **Adoption**: % of users choosing per-property mappings
2. **Efficiency**: Time reduction in upload process
3. **Accuracy**: Reduction in manual edits during preview
4. **Reusability**: Template usage statistics
5. **User Satisfaction**: Survey feedback on new flow

## Timeline

- **Week 1**: Infrastructure and Property Identification
- **Week 2**: Field Mapping Redesign and Backend
- **Week 3**: Preview, Processing, and UX Enhancements
- **Week 4**: Testing, Bug Fixes, and Documentation

## Next Steps

1. Review and approve this plan
2. Create detailed tickets for each phase
3. Set up feature flags for gradual rollout
4. Begin Phase 1 implementation

---

## Appendix A: UI Mockup Concepts

### Field Mapping Step - Global Mode
```
┌─────────────────────────────────────────────┐
│ Field Mapping Configuration                  │
├─────────────────────────────────────────────┤
│ Mapping Mode: [●] Global  [ ] Per-Property  │
├─────────────────────────────────────────────┤
│                                             │
│ [Standard Field Mapping Form]               │
│                                             │
└─────────────────────────────────────────────┘
```

### Field Mapping Step - Per-Property Mode
```
┌─────────────────────────────────────────────┐
│ Field Mapping Configuration                  │
├─────────────────────────────────────────────┤
│ Mapping Mode: [ ] Global  [●] Per-Property  │
├─────────────────────────────────────────────┤
│ [Property 1] [Property 2] [Property 3] ...  │
├─────────────────────────────────────────────┤
│                                             │
│ [Field Mapping Form for Selected Property]  │
│                                             │
│ [Copy to Other Properties] [Save Template]  │
└─────────────────────────────────────────────┘
```

## Appendix B: Code Examples

### Example: Property-Specific Formula
```typescript
// Property A: 15% commission
nightlyRate: "[Total Payout] * 0.85"

// Property B: 18% commission + $50 fee
nightlyRate: "[Total Payout] * 0.82 - 50"

// Property C: Complex calculation
nightlyRate: "([Total] - [Cleaning Fee]) * 0.8 + [Extra Guest Fee] * 0.5"
```

### Example: Template Structure
```json
{
  "templateName": "Airbnb Mountain Properties",
  "platform": "airbnb",
  "fieldMappings": [
    {
      "bookingField": "nightlyRate",
      "csvColumn": null,
      "useFormula": true,
      "formula": "[Accommodation Revenue] / [Number of Nights]"
    },
    {
      "bookingField": "cleaningFee",
      "csvColumn": "Cleaning Fee",
      "useFormula": false
    }
  ]
}
```