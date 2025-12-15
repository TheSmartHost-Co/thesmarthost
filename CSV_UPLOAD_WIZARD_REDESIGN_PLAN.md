Update(CLAUDE.md)
  ⎿  Updated CLAUDE.md with 116 additions and 2 removals
       438    - useUserStore with localStorage persistence
       439    - useNotificationStore for toasts
       440
       441 -  ### ⏳ Upcoming Features
       441 +  **CSV Upload Wizard (Multi-Property):**
       442 +  - ✅ Property identification step (map CSV listings to properties)
       443 +  - ✅ Field mapping step (global and per-property modes)
       444 +  - ✅ Preview step with property-specific field mappings
       445 +  - ✅ Process step for multi-property imports
       446 +  - ✅ Fixed duplicate column display issue
       447 +  - ✅ Property creation inline during identification
       448
       449 -  **Next Sprint:**
       449 +  ### 🚧 PRIORITY: Property Field Mapping System
       450 +
       451 +  **CRITICAL NEXT TASKS** - These must be implemented to complete the CSV upload
     workfl
           + ow:
       452 +
       453 +  #### 1. Database Schema Updates
       454 +  **File:** Backend database migration
       455 +  **Table:** `property_field_mappings`
       456 +  ```sql
       457 +  CREATE TABLE property_field_mappings (
       458 +    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       459 +    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
       460 +    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
       461 +    mapping_name VARCHAR(255) NOT NULL, -- e.g., "Hostaway Template", "Airbnb
     Template"
       462 +    field_mappings JSONB NOT NULL, -- Array of FieldMapping objects
       463 +    platform VARCHAR(50), -- 'ALL', 'airbnb', 'booking', etc.
       464 +    is_default BOOLEAN DEFAULT false, -- Whether this is the default template for this
           + property
       465 +    created_at TIMESTAMPTZ DEFAULT NOW(),
       466 +    updated_at TIMESTAMPTZ DEFAULT NOW(),
       467 +    UNIQUE(property_id, mapping_name, platform)
       468 +  );
       469 +  ```
       470 +
       471 +  #### 2. Backend API Routes
       472 +  **Files:** Backend routes and controllers
       473 +  ```typescript
       474 +  // GET /api/property-field-mappings/:propertyId - Get all templates for a property
       475 +  // POST /api/property-field-mappings - Save a new template
       476 +  // PUT /api/property-field-mappings/:id - Update a template
       477 +  // DELETE /api/property-field-mappings/:id - Delete a template
       478 +  // POST /api/property-field-mappings/:id/set-default - Set as default template
       479 +  ```
       480 +
       481 +  #### 3. Frontend Service Integration
       482 +  **File:** `src/services/propertyFieldMappingService.ts`
       483 +  ```typescript
       484 +  export interface PropertyFieldMappingTemplate {
       485 +    id: string
       486 +    propertyId: string
       487 +    userId: string
       488 +    mappingName: string
       489 +    fieldMappings: FieldMapping[]
       490 +    platform: Platform
       491 +    isDefault: boolean
       492 +    createdAt: string
       493 +    updatedAt: string
       494 +  }
       495 +
       496 +  // API functions:
       497 +  // getPropertyFieldMappings(propertyId: string)
       498 +  // savePropertyFieldMapping(template: CreatePropertyFieldMappingPayload)
       499 +  // updatePropertyFieldMapping(id: string, updates:
     UpdatePropertyFieldMappingPayload)
       500 +  // deletePropertyFieldMapping(id: string)
       501 +  // setDefaultTemplate(id: string)
       502 +  ```
       503 +
       504 +  #### 4. Auto-Loading System in Field Mapping Step
       505 +  **File:** `src/components/upload-wizard/steps/FieldMappingStep.tsx`
       506 +
       507 +  **Requirements:**
       508 +  - When user switches to per-property mode and selects a property tab, auto-load
     saved
           +  templates for that property
       509 +  - Show a dropdown/selector for available templates: "Hostaway Template", "Airbnb
     Temp
           + late", "Custom", etc.
       510 +  - If property has a default template, auto-load it immediately
       511 +  - Add "Save as Template" button to save current mappings as a reusable template
       512 +  - Template selector should show: Template name, platform, created date
       513 +  - Templates should be property-specific (each property has its own set of templates)
       514 +
       515 +  #### 5. Template Management Modal
       516 +  **File:** `src/components/property-field-mapping/PropertyFieldMappingModal.tsx`
       517 +
       518 +  **Features:**
       519 +  - Accessible from Property Management page and Field Mapping Step
       520 +  - List all saved templates for a property
       521 +  - Create/Edit/Delete templates
       522 +  - Set default template
       523 +  - Preview template mappings
       524 +  - Import template from another property (copy functionality)
       525 +  - Template validation (ensure all required fields are mapped)
       526 +
       527 +  #### 6. Integration Points
       528 +
       529 +  **Property Management Integration:**
       530 +  - Add "Field Mapping Templates" button/tab in property details
       531 +  - Show template count in property list: "3 templates configured"
       532 +  - Quick access to manage templates per property
       533 +
       534 +  **Field Mapping Step Integration:**
       535 +  - Template dropdown in per-property mode
       536 +  - Auto-load default template when switching properties
       537 +  - "Save Current Mappings" button
       538 +  - Template indicator: "Using: Hostaway Template (default)"
       539 +  - Ability to modify loaded template and save as new or update existing
       540 +
       541 +  #### 7. User Experience Flow
       542 +  ```
       543 +  1. User uploads CSV and identifies properties
       544 +  2. User switches to per-property mode in Field Mapping Step
       545 +  3. For each property tab:
       546 +     a. If property has default template → Auto-load it
       547 +     b. If no default → Show template selector dropdown
       548 +     c. User can select existing template or create new mappings
       549 +     d. User can save current mappings as new template
       550 +     e. User can modify loaded template and update it
       551 +  4. Templates persist for future CSV uploads
       552 +  5. Property managers can pre-configure templates for common platforms
       553 +  ```
       554 +
       555 +  ### ⏳ Other Upcoming Features
       556 +
       557 +  **Later Sprints:**
       558    - Bookings management
       559    - Reports dashboard
       560    - Analytics charts

     Tip: Use # to memorize shortcut to quickly add to CLAUDE.md

● Perfect! I've clearly documented the complete property field mapping system requirements in the
  CLAUDE.md file. Here's a summary of what needs to be implemented:

  ✅ Documented for Next Claude Agent:

  Critical Implementation Tasks:

  1. Database Schema - property_field_mappings table with JSONB field mappings storage
  2. Backend API - Full CRUD routes for template management
  3. Frontend Service - propertyFieldMappingService.ts with TypeScript interfaces
  4. Auto-Loading System - Integration into FieldMappingStep for template selection
  5. Template Management Modal - Complete UI for managing templates per property
  6. Property Page Integration - Template management access from property details

  Key Features Specified:

  - ✅ Property-specific field mapping templates
  - ✅ Auto-loading of default templates
  - ✅ Template dropdown selection in per-property mode
  - ✅ Save/Update/Delete template functionality
  - ✅ Default template setting per property
  - ✅ Template copying between properties
  - ✅ Complete user experience flow documented

  Current State:

  - ✅ CSV upload wizard is fully functional
  - ✅ Multi-property support working
  - ✅ Property identification and field mapping steps complete
  - ✅ Preview and process steps working correctly
  - ✅ Property creation inline during upload process

  The documentation is comprehensive and includes database schemas, API specifications, file
  locations, TypeScript interfaces, user flows, and integration requirements. Any future Claude
  agent will have everything needed to implement the property field mapping template system!