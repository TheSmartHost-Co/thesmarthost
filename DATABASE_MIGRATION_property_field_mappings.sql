-- Migration: Create property_field_mappings table
-- Purpose: Store CSV field mapping templates for properties to enable auto-loading during uploads
-- Based on: property_webhook_mappings pattern

CREATE TABLE public.property_field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  user_id UUID NOT NULL,
  mapping_name VARCHAR(255) NOT NULL, -- e.g., "Hostaway Template", "Airbnb Export", "Custom Mapping"
  field_mappings JSONB NOT NULL, -- Array of FieldMapping objects for CSV uploads
  platform public.platform NOT NULL DEFAULT 'ALL', -- 'ALL', 'airbnb', 'booking', etc.
  is_default BOOLEAN NOT NULL DEFAULT false, -- Whether this is the default template for this property
  is_active BOOLEAN NOT NULL DEFAULT true, -- Whether template is active/enabled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Primary key
  CONSTRAINT property_field_mappings_pkey PRIMARY KEY (id),
  
  -- Foreign key constraints
  CONSTRAINT property_field_mappings_property_id_fkey FOREIGN KEY (property_id) 
    REFERENCES properties(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT property_field_mappings_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    
  -- Unique constraint: only one default template per property per platform
  CONSTRAINT property_field_mappings_unique_default UNIQUE (property_id, platform, is_default) 
    DEFERRABLE INITIALLY DEFERRED,
    
  -- Check constraint: ensure mapping_name is not empty
  CONSTRAINT property_field_mappings_mapping_name_check CHECK (LENGTH(TRIM(mapping_name)) > 0)
  
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX idx_property_field_mappings_property_id ON public.property_field_mappings(property_id);
CREATE INDEX idx_property_field_mappings_user_id ON public.property_field_mappings(user_id);
CREATE INDEX idx_property_field_mappings_platform ON public.property_field_mappings(platform);
CREATE INDEX idx_property_field_mappings_is_default ON public.property_field_mappings(property_id, is_default) WHERE is_default = true;
CREATE INDEX idx_property_field_mappings_is_active ON public.property_field_mappings(is_active) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE public.property_field_mappings IS 'Stores CSV field mapping templates for properties to enable auto-loading during uploads';
COMMENT ON COLUMN public.property_field_mappings.mapping_name IS 'Human-readable name for the template (e.g., "Hostaway Export", "Airbnb Template")';
COMMENT ON COLUMN public.property_field_mappings.field_mappings IS 'JSONB array of FieldMapping objects with bookingField->csvFormula mappings';
COMMENT ON COLUMN public.property_field_mappings.platform IS 'Platform this template is optimized for (ALL for universal templates)';
COMMENT ON COLUMN public.property_field_mappings.is_default IS 'Whether this template auto-loads when user selects this property';
COMMENT ON COLUMN public.property_field_mappings.is_active IS 'Whether template is available for selection';

-- Example field_mappings JSONB structure:
-- [
--   {
--     "bookingField": "guest_name",
--     "csvFormula": "Guest Name",
--     "platform": "ALL",
--     "isOverride": false
--   },
--   {
--     "bookingField": "total_payout",
--     "csvFormula": "[Total Price] * 0.85",
--     "platform": "airbnb",
--     "isOverride": true
--   }
-- ]

-- Sample data insertion (optional, for testing)
-- INSERT INTO public.property_field_mappings (
--   property_id, 
--   user_id, 
--   mapping_name, 
--   field_mappings, 
--   platform, 
--   is_default
-- ) VALUES (
--   'example-property-uuid',
--   'example-user-uuid',
--   'Hostaway Standard Template',
--   '[
--     {"bookingField": "guest_name", "csvFormula": "Guest Name", "platform": "ALL"},
--     {"bookingField": "check_in_date", "csvFormula": "Check In", "platform": "ALL"},
--     {"bookingField": "total_payout", "csvFormula": "Total Amount", "platform": "ALL"}
--   ]',
--   'hostaway',
--   true
-- );