# Multi-Property CSV Upload Implementation Specification

## Overview
Enhance the existing CSV upload wizard to support uploading bookings for multiple properties in a single CSV file. This eliminates the need to upload separate CSV files for each property.

## Current vs New Flow

### Current Flow (Single Property)
1. **UploadStep**: User selects property → Upload CSV
2. **ValidateStep**: Map CSV fields to booking fields  
3. **PreviewStep**: Preview bookings for selected property
4. **ProcessStep**: Save bookings to database
5. **CompleteStep**: Show results

### New Flow (Multi-Property)
1. **UploadStep**: Upload CSV (NO property selection required)
2. **ValidateStep**: Map CSV fields to booking fields (including required `listing_name`)
3. **PropertyMappingStep** *(NEW)*: Map unique listing names to properties
4. **PreviewStep**: Preview bookings grouped by property
5. **ProcessStep**: Save bookings for multiple properties  
6. **CompleteStep**: Show multi-property results

## Key Requirements

### Business Logic
- User uploads CSV containing bookings from multiple properties
- System extracts unique listing names from the mapped `listing_name` column
- User maps each listing name to an existing property or creates new properties
- All bookings are processed and saved with correct property associations
- Support for creating new properties on-the-fly during mapping

### Technical Requirements
- Backwards compatible with single-property uploads
- Maintain existing field mapping functionality
- Handle property creation within the wizard flow
- Group booking previews by property
- Bulk save bookings across multiple properties

## Implementation Plan

### Phase 1: Core Structure Updates
1. ✅ **Analyze existing code and plan implementation**
2. **Update wizard types and enums**
   - Add `PROPERTY_MAPPING = 2` to `WizardStep` enum
   - Renumber existing steps: VALIDATE=3, PREVIEW=4, etc.
   - Add property mapping state interfaces
3. **Ensure listing_name is required field**
   - Verify `listing_name` is in required fields list
   - Update field mapping validation logic

### Phase 2: Property Mapping Step
4. **Create PropertyMappingStep component**
   - Extract unique listing names from CSV data
   - Property selection/creation interface
   - Validation that all listings are mapped
5. **Update ValidateStep logic**
   - Extract unique listings after field mapping complete
   - Pass listings data to wizard state
6. **Remove property selection from UploadStep**
   - Remove property dropdown and validation
   - Update navigation logic

### Phase 3: Multi-Property Processing
7. **Update PreviewStep for multi-property**
   - Group bookings by property
   - Show property-specific previews
   - Update booking generation logic
8. **Update ProcessStep for bulk operations**
   - Handle multiple property contexts
   - Bulk booking creation across properties
   - Multi-property completion statistics
9. **Update main UploadWizard component**
   - Handle new step flow and navigation
   - Property mapping state management

### Phase 4: Testing & Polish
10. **End-to-end testing**
    - Single property upload (backwards compatibility)
    - Multi-property upload with sample CSV
    - Property creation workflow
    - Error handling and validation

## Technical Specifications

### Wizard Step Updates
```typescript
export enum WizardStep {
  UPLOAD = 1,
  VALIDATE = 2,
  PROPERTY_MAPPING = 3,  // NEW STEP
  PREVIEW = 4,
  PROCESS = 5,
  COMPLETE = 6,
}
```

### New State Interfaces
```typescript
interface PropertyMapping {
  listingName: string               // "Casa Madera"
  propertyId: string | null         // Selected existing property ID
  isNewProperty?: boolean           // Creating new property flag
  newPropertyData?: {               // New property details
    name: string
    address: string
    propertyType: 'STR' | 'LTR'
    commissionRate: number
  }
  bookingCount?: number            // How many bookings for this listing
}

interface PropertyMappingState {
  uniqueListings: string[]         // Extracted from CSV
  propertyMappings: PropertyMapping[]
  isValid: boolean                 // All mappings complete
}

// Updated WizardState
interface WizardState {
  // ... existing fields
  propertyMappingState?: PropertyMappingState
}
```

### ValidateStep Enhancement
```typescript
// After field mapping is complete
const extractUniqueListings = (csvData: CsvData, listingMapping: FieldMapping): string[] => {
  const listingColumnIndex = csvData.headers.findIndex(h => 
    h.name.toLowerCase() === listingMapping.csvFormula.toLowerCase()
  )
  
  if (listingColumnIndex === -1) return []
  
  const listings = csvData.rows
    .map(row => row[listingColumnIndex])
    .filter(listing => listing && listing.trim())
    .map(listing => listing.trim())
  
  return [...new Set(listings)] // Remove duplicates
}
```

### PropertyMappingStep UI Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    Map Properties to Listings                   │
│                                                                 │
│ We found 3 unique properties in your CSV:                      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ "Casa Madera" (8 bookings)                                 │ │
│ │ Map to: [Select Property ▼] [+ Create New Property]        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ "Chalet Mont-Cascades" (12 bookings)                       │ │
│ │ Map to: [Mont Cascades Chalet ▼] ✓                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ "27 Matterhorn" (6 bookings)                               │ │
│ │ Map to: [Select Property ▼] [+ Create New Property]        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Back to Field Mapping] [Continue - Process 26 Bookings →]     │
└─────────────────────────────────────────────────────────────────┘
```

## Benefits

### User Experience
- **Massive time savings**: Upload 100+ bookings across 20+ properties in one operation
- **Intuitive workflow**: Clear mapping interface with booking counts
- **Flexible**: Handle any number of properties per CSV
- **Property management**: Create new properties on-the-fly

### Technical Benefits  
- **Backwards compatible**: Single-property uploads still work
- **Scalable**: Foundation for future automated property matching
- **Maintainable**: Clean separation of concerns with dedicated mapping step
- **Robust**: Comprehensive validation at each step

## Sample Data Context
Based on the provided CSV example containing 21 unique listing names:
- Chalet Mont-Cascades (8 bookings)
- Casa Madera (6 bookings)  
- 27 Matterhorn (6 bookings)
- Lake Escape (6 bookings)
- Mini Apartment (7 bookings)
- And 16 more unique properties...

This demonstrates the real-world need for multi-property CSV upload functionality.

## Implementation Timeline
- **Phase 1**: 2-3 hours (Types and structure)
- **Phase 2**: 4-5 hours (Property mapping step)  
- **Phase 3**: 3-4 hours (Multi-property processing)
- **Phase 4**: 2-3 hours (Testing and refinement)
- **Total**: ~12-15 hours implementation time

---

**Status**: Ready for implementation
**Next Step**: Begin Phase 1 - Update wizard types and enums


 Update ValidateStep to extract unique listing names after field mapping
     ☐ Update PreviewStep to group and display bookings by property
     ☐ Update ProcessStep to handle multi-property booking creation
     ☐ Update main UploadWizard component to handle new property mapping flow
     ☐ Test complete multi-property upload workflow with sample CSV