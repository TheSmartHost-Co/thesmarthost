-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  csv_upload_id uuid NOT NULL,
  reservation_code text NOT NULL,
  guest_name text NOT NULL,
  check_in_date timestamp with time zone NOT NULL,
  num_nights bigint NOT NULL,
  platform USER-DEFINED NOT NULL,
  nightly_rate double precision NOT NULL,
  extra_guest_fees double precision NOT NULL,
  cleaning_fee double precision NOT NULL,
  lodging_tax double precision NOT NULL,
  bed_linen_fee double precision NOT NULL,
  gst double precision NOT NULL,
  qst double precision NOT NULL,
  channel_fee double precision NOT NULL,
  stripe_fee double precision NOT NULL,
  total_payout double precision,
  mgmt_fee double precision,
  net_earnings double precision,
  sales_tax double precision NOT NULL,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_csv_upload_id_fkey FOREIGN KEY (csv_upload_id) REFERENCES public.csv_uploads(id),
  CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.calculation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  client_id uuid NOT NULL,
  platform USER-DEFINED NOT NULL,
  calculation_field text NOT NULL,
  formula text NOT NULL,
  priority bigint,
  is_active boolean NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calculation_rules_pkey PRIMARY KEY (id),
  CONSTRAINT calculation_rules_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT calculation_rules_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.client_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  file_path text,
  version text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_agreements_pkey PRIMARY KEY (id),
  CONSTRAINT client_agreements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_agreements_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.client_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  author_id uuid,
  note_title text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT client_notes_pkey PRIMARY KEY (id),
  CONSTRAINT client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.client_pms_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  pms text,
  username text,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT client_pms_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT client_pms_credentials_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.client_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  is_primary boolean,
  commission_rate_override double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT client_properties_pkey PRIMARY KEY (id),
  CONSTRAINT client_properties_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.client_status_codes (
  user_id uuid NOT NULL,
  code text NOT NULL,
  label text,
  color_hex text,
  is_default boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT client_status_codes_pkey PRIMARY KEY (id),
  CONSTRAINT client_status_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  name text,
  email text,
  phone text,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_name text,
  billing_address text,
  pms text,
  agreement_file_path text,
  status_id uuid,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id),
  CONSTRAINT clients_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.client_status_codes(id)
);
CREATE TABLE public.csv_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  property_id uuid,
  file_name character varying,
  file_path text,
  upload_date timestamp without time zone,
  reporting_period character varying,
  row_count bigint,
  error_message text,
  status USER-DEFINED,
  CONSTRAINT csv_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT csv_uploads_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address text NOT NULL,
  province character varying NOT NULL,
  property_type USER-DEFINED NOT NULL,
  hostaway_listing_id character varying NOT NULL,
  is_active boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  commission_rate double precision NOT NULL,
  postal_code text,
  description text,
  CONSTRAINT properties_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  client_id uuid NOT NULL,
  property_id uuid NOT NULL,
  reporting_period text NOT NULL,
  pdf_file_path text NOT NULL,
  status USER-DEFINED NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reports_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);