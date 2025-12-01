

by the way , another thing, when one goes from preview and presses back to feild
  mapping, it doesnt save the field mappings, it once again makes the user map them
  again, give me an idea of how we can fix that/ go about it?

● Great observation! The field mappings aren't being persisted when navigating back
  from Preview to Field Mapping. Here's how we can fix this:

  Root Cause

  The validationState.fieldMappings aren't being preserved in the wizard state when
  users navigate between steps.

  Solution Options

  Option 1: Store Field Mappings in Wizard State (Recommended)

  Update the wizard reducer to persist field mappings:

  // In UploadWizard.tsx - add to wizard state
  interface WizardState {
    // ... existing fields
    fieldMappings?: any[] // Add this
  }

  // In wizard reducer - SET_VALIDATION_STATE action
  case WizardActionType.SET_VALIDATION_STATE:
    return {
      ...state,
      validationState: action.payload,
      fieldMappings: action.payload.fieldMappings, // Store separately
      canGoNext: action.payload.results?.isValid || false
    }

  // In wizard reducer - add new action for field mappings
  case WizardActionType.SET_FIELD_MAPPINGS:
    return {
      ...state,
      fieldMappings: action.payload,
      validationState: {
        ...state.validationState,
        fieldMappings: action.payload
      }
    }

  Option 2: Pass Field Mappings as Props

  Modify ValidateStep to accept and initialize with existing mappings:

  // ValidateStep.tsx
  interface ValidateStepProps {
    // ... existing props
    initialFieldMappings?: any[] // Add this
  }

  // In ValidateStep useEffect
  useEffect(() => {
    if (initialFieldMappings && initialFieldMappings.length > 0) {
      setFieldMappings(initialFieldMappings)
      // Don't auto-load rules if we have existing mappings
      return
    }
    // ... existing logic
  }, [initialFieldMappings])

  Option 3: Local Storage Backup (Quick Fix)

  // In ValidateStep.tsx - save on change
  useEffect(() => {
    if (fieldMappings.length > 0) {
      localStorage.setItem('wizardFieldMappings', JSON.stringify(fieldMappings))
    }
  }, [fieldMappings])

  // In ValidateStep.tsx - load on mount
  useEffect(() => {
    const saved = localStorage.getItem('wizardFieldMappings')
    if (saved && !fieldMappings.length) {
      setFieldMappings(JSON.parse(saved))
    }
  }, [])

  Recommended Implementation

  I'd recommend Option 1 because it:
  - Keeps all wizard state in one place
  - Allows easy access from any step
  - Maintains data integrity
  - Follows the existing pattern

  Would you like me to implement Option 1? It would involve:

  1. Adding fieldMappings to the main wizard state
  2. Updating the wizard reducer to persist field mappings
  3. Passing the saved mappings back to ValidateStep when navigating back
  4. Adding a new action type SET_FIELD_MAPPINGS for real-time updates

  This way, users can navigate back and forth between Preview and Field Mapping
  without losing their work!

> yea lets do the option 1 then Option 1: Store Field Mappings in Wizard State
  (Recommended)

    Update the wizard reducer to persist field mappings:

    // In UploadWizard.tsx - add to wizard state
    interface WizardState {
      // ... existing fields
      fieldMappings?: any[] // Add this
    }

    // In wizard reducer - SET_VALIDATION_STATE action
    case WizardActionType.SET_VALIDATION_STATE:
      return {
        ...state,
        validationState: action.payload,
        fieldMappings: action.payload.fieldMappings, // Store separately
        canGoNext: action.payload.results?.isValid || false
      }

    // In wizard reducer - add new action for field mappings
    case WizardActionType.SET_FIELD_MAPPINGS:
      return {
        ...state,
        fieldMappings: action.payload,
        validationState: {
          ...state.validationState,
          fieldMappings: action.payload
        }
      }, 

secondly

i just noticed by the way, calculation rules is not available anymore, im not
  seeing it on my validatestep, is it because its property based and we have switched
   our flow? should we change this up now because our flow is csv general based ->
  property bookings etc? create table public.calculation_rules (
    id uuid not null default gen_random_uuid (),
    property_id uuid not null,
    platform public.platform not null,
    booking_field text not null,
    csv_formula text not null,
    priority bigint null,
    is_active boolean not null,
    notes text null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone null default now(),
    user_id uuid null,
    constraint calculation_rules_pkey primary key (id),
    constraint calculation_rules_property_id_fkey foreign KEY (property_id)
  references properties (id) on update CASCADE,
    constraint calculation_rules_user_id_fkey foreign KEY (user_id) references
  profiles (id) on update CASCADE on delete set null
  ) TABLESPACE pg_default; what is this?

● Ah, excellent observation! You're right - the calculation rules feature is not
  working because it's property-based and your flow has changed to be multi-property.


  The Problem:

  Looking at the calculation_rules table schema:
  - property_id is required (NOT NULL)
  - Rules are tied to specific properties
  - In the old flow: User selected property first → Load rules for that property
  - In the new flow: No property selected upfront → No rules loaded

  What are Calculation Rules?

  They're saved field mapping formulas that auto-populate when users upload CSVs for
  the same property. For example:
  - Property "Casa Madera" might always calculate: mgmt_fee = accommodation * 0.15
  - Next upload for Casa Madera → Auto-loads this formula

  Options to Fix This:

  Option 1: User-Level Calculation Rules (Recommended)

  Change rules to be user-based instead of property-based:

  -- Add user-level rules (property_id becomes optional)
  ALTER TABLE calculation_rules
  ALTER COLUMN property_id DROP NOT NULL;

  -- Add index for user-based queries
  CREATE INDEX idx_calculation_rules_user_id ON calculation_rules(user_id);

  Then users can save "global" rules that apply across all their properties.

  Option 2: Template-Based Rules

  Create rule templates by platform:
  - "Airbnb Template" → Common Airbnb calculations
  - "VRBO Template" → Common VRBO calculations

  Option 3: Show Rules After Property Mapping

  Keep current structure but:
  1. After PropertyMappingStep (when properties are known)
  2. Load all rules for all mapped properties
  3. Show them as suggestions in field mapping

  Option 4: Rule Library

  Create a library of common calculations:
  const COMMON_RULES = {
    'Management Fee (15%)': 'accommodation * 0.15',
    'Net Earnings': 'total_payout - mgmt_fee',
    'Nightly Rate': 'accommodation / num_nights',
    // etc.
  }

  Quick Fix for Now:

  Since you're not seeing calculation rules, you can still use the formula input
  directly. Just type formulas like:
  - accommodation + cleaning_fee
  - total_payout * 0.15
  - gross_revenue - channel_fee - mgmt_fee

  Would you like me to implement Option 1 (user-level rules) so calculation rules
  work with your multi-property flow?

  i think the best way to go about calculation rules is having like load rules button which loads the rules into dropdown, for ALL rules, they can automatically load , but airbnb/ the other rules only load when a user goes to that specific section you get me