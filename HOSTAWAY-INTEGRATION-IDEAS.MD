First Booking from a Property:

  // Hostaway booking for external_listing_id = "ABC123"
  {
    "listingId": "ABC123",
    "reservationId": "12345",
    "guestName": "John Smith",
    "totalPrice": 250.00
  }

  User maps fields and we store:
  // field_mappings in incoming_bookings table
  {
    "reservationId": "reservation_code",
    "guestName": "guest_name",
    "totalPrice": "total_payout",
    "listingId": "listing_name"
  }

  Second Booking from SAME Property:

  // Another Hostaway booking for external_listing_id = "ABC123"
  {
    "listingId": "ABC123",
    "reservationId": "67890",
    "guestName": "Jane Doe",
    "totalPrice": 300.00
  }

  System logic:
  1. Check: "Do we have previous bookings with external_listing_id = 'ABC123'?"
  2. Found: Previous booking has field_mappings
  3. Auto-apply: Use the same field mappings
  4. Result: User just needs to click "Approve" - no re-mapping needed!

  Backend Logic:

  -- Look for existing field mappings for this listing
  SELECT field_mappings, property_id, client_id
  FROM incoming_bookings
  WHERE external_listing_id = 'ABC123'
    AND field_mappings IS NOT NULL
    AND status = 'imported'
  ORDER BY created_at DESC
  LIMIT 1;

  So yes - same external listing = reuse field mappings = much faster workflow!

  API secret key generated successfully

When you generate a new key, you need to store it safely. It will only be visible once in the dashboard.

95124
e70f173f0b76d8c45ca08c856a30dad0799960fd267d0cd5336dce9a088703c7
Copy and paste this token in the partner system to activate the connection with this partner


Awesome! I'm ready to work on the field mappings for incoming bookings. This will be the final piece to make the
  webhook integration fully customizable.

  🎯 Field Mappings - What We'll Build:

  Current State:

  - Basic field mapping UI exists (collapsible section)
  - Only shows 2 example fields (guestName, totalAmount)
  - Mappings are saved but not actually used during import

  What We Need:

  1. Comprehensive Field List - All financial and booking fields that can be mapped
  2. Dynamic Mapping UI - Show webhook data structure and let users map fields
  3. Apply Mappings - Actually use the mappings when creating bookings
  4. Save Mappings per Listing - Reuse mappings for future bookings from same property
  5. Preview Mapped Values - Show what values will be imported

  🔧 Key Features to Implement:

  1. Smart Field Detection
    - Analyze incoming webhook data structure
    - Auto-suggest likely field mappings
    - Handle nested data (like financeField array)
  2. Mapping Templates
    - Save mapping configurations per PMS platform
    - Auto-apply saved mappings to new bookings
  3. Value Transformation
    - Handle different data formats (dates, currencies)
    - Extract values from nested structures

  Ready to start implementing the field mappings system! Should we begin with enhancing the UI to show all available
  fields, or would you prefer to start with the backend logic to apply the mappings?






  FIELD MAPPINGS

  i want you to take a look at our existing incoming bookings schema, bookings shcema and more. i
  basically am working on a pms solution in which a user can connect their hostaway account and
  recieve incoming bookings ,or even upload bookings. and map the fields of those
  reservations/bookings to my sites standard booking fields. so far, ive done it in upload bookings
   wizard, take a look how we do it here C:\Users\husse\OneDrive\Desktop\Github\thesmarthost\src\co
  mponents\csv-mapping\FieldMappingForm.tsx C:\Users\husse\OneDrive\Desktop\Github\thesmarthost\src
  \app\(user)\property-manager\upload-bookings\page.tsx
  C:\Users\husse\OneDrive\Desktop\Github\thesmarthost\src\components\upload-wizard\UploadWizard.tsx
   C:\Users\husse\OneDrive\Desktop\Github\thesmarthost\src\components\upload-wizard\steps\PreviewSt
  ep.tsx C:\Users\husse\OneDrive\Desktop\Github\thesmarthost\src\components\upload-wizard\steps\Val
  idateStep.tsx and now im introducing a new "incoming bookings" feature that takes in a booking
  from hostaway via a following format seen in
  C:\Users\husse\OneDrive\Desktop\Github\thesmarthost-backend\webhookresponsehostaway.md and we
  want to then let the user map them in the reviewbookingsmodal this Modal C:\Users\husse\OneDrive\
  Desktop\Github\thesmarthost\src\components\incoming-bookings\ReviewIncomingBookingsModal.tsx we
  have some temporary placeholders there for now. take a look at how we currently take in incoming
  bookings for your reference too
  C:\Users\husse\OneDrive\Desktop\Github\thesmarthost-backend\routes\incoming-bookings.routes.js
  C:\Users\husse\OneDrive\Desktop\Github\thesmarthost-backend\queries\incoming-bookings.queries.js
  C:\Users\husse\OneDrive\Desktop\Github\thesmarthost-backend\controllers\incoming-bookings.control
  ler.js
  C:\Users\husse\OneDrive\Desktop\Github\thesmarthost-backend\controllers\webhooks.controller.js
  and here is the schemas create table public.incoming_bookings (
    id uuid not null default gen_random_uuid (),
    user_id uuid null,
    platform public.platform null,
    pms_connection_id uuid null,
    external_reservation_id text null,
    external_listing_id text null,
    raw_webhook_data jsonb null,
    booking_data jsonb null,
    status text null,
    property_id uuid null,
    client_id uuid null,
    field_mappings jsonb null,
    guest_name text null,
    guest_email text null,
    check_in_date date null,
    check_out_date date null,
    total_amount text null,
    booking_status text null,
    webhook_received_at timestamp with time zone null,
    reviewed_at timestamp with time zone null,
    imported_at timestamp with time zone null,
    imported_booking_id uuid null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone null,
    listing_name text null,
    num_nights bigint null,
    nightly_rate double precision null,
    extra_guest_fees double precision null,
    cleaning_fee double precision null,
    lodging_tax double precision null,
    bed_linen_fee double precision null,
    gst double precision null,
    qst double precision null,
    channel_fee double precision null,
    stripe_fee double precision null,
    total_payout double precision null,
    mgmt_fee double precision null,
    net_earnings double precision null,
    sales_tax double precision null,
    constraint incoming_bookings_pkey primary key (id),
    constraint incoming_bookings_client_id_fkey foreign KEY (client_id) references clients (id) on
  update CASCADE on delete CASCADE,
    constraint incoming_bookings_pms_connection_id_fkey foreign KEY (pms_connection_id) references
  hostaway_connections (id) on update CASCADE on delete CASCADE,
    constraint incoming_bookings_property_id_fkey foreign KEY (property_id) references properties
  (id) on update CASCADE on delete CASCADE,
    constraint incoming_bookings_user_id_fkey foreign KEY (user_id) references profiles (id) on
  update CASCADE on delete CASCADE
  ) TABLESPACE pg_default; create table public.hostaway_connections (
    id uuid not null default gen_random_uuid (),
    user_id uuid null,
    hostaway_account_id text null,
    api_key text null,
    access_token text null,
    access_token_expires_at timestamp with time zone null,
    webhook_id text null,
    webhook_url text null,
    auto_import boolean null default false,
    status text null,
    last_sync_at timestamp with time zone null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone null default now(),
    constraint hostaway_connections_pkey primary key (id),
    constraint hostaway_connections_user_id_fkey foreign KEY (user_id) references profiles (id) on
  update CASCADE on delete CASCADE
  ) TABLESPACE pg_default; create table public.incoming_bookings (
    id uuid not null default gen_random_uuid (),
    user_id uuid null,
    platform public.platform null,
    pms_connection_id uuid null,
    external_reservation_id text null,
    external_listing_id text null,
    raw_webhook_data jsonb null,
    booking_data jsonb null,
    status text null,
    property_id uuid null,
    client_id uuid null,
    field_mappings jsonb null,
    guest_name text null,
    guest_email text null,
    check_in_date date null,
    check_out_date date null,
    total_amount text null,
    booking_status text null,
    webhook_received_at timestamp with time zone null,
    reviewed_at timestamp with time zone null,
    imported_at timestamp with time zone null,
    imported_booking_id uuid null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone null,
    listing_name text null,
    num_nights bigint null,
    nightly_rate double precision null,
    extra_guest_fees double precision null,
    cleaning_fee double precision null,
    lodging_tax double precision null,
    bed_linen_fee double precision null,
    gst double precision null,
    qst double precision null,
    channel_fee double precision null,
    stripe_fee double precision null,
    total_payout double precision null,
    mgmt_fee double precision null,
    net_earnings double precision null,
    sales_tax double precision null,
    constraint incoming_bookings_pkey primary key (id),
    constraint incoming_bookings_client_id_fkey foreign KEY (client_id) references clients (id) on
  update CASCADE on delete CASCADE,
    constraint incoming_bookings_pms_connection_id_fkey foreign KEY (pms_connection_id) references
  hostaway_connections (id) on update CASCADE on delete CASCADE,
    constraint incoming_bookings_property_id_fkey foreign KEY (property_id) references properties
  (id) on update CASCADE on delete CASCADE,
    constraint incoming_bookings_user_id_fkey foreign KEY (user_id) references profiles (id) on
  update CASCADE on delete CASCADE
  ) TABLESPACE pg_default; create table public.bookings (
    id uuid not null default gen_random_uuid (),
    property_id uuid null,
    csv_upload_id uuid null,
    reservation_code text not null,
    guest_name text not null,
    check_in_date date not null,
    num_nights bigint not null,
    platform public.platform not null,
    nightly_rate double precision null,
    extra_guest_fees double precision null,
    cleaning_fee double precision null,
    lodging_tax double precision null,
    bed_linen_fee double precision null,
    gst double precision null,
    qst double precision null,
    channel_fee double precision null,
    stripe_fee double precision null,
    total_payout double precision null,
    mgmt_fee double precision null,
    net_earnings double precision null,
    sales_tax double precision null,
    created_at timestamp with time zone null default now(),
    listing_name text null,
    check_out_date date null,
    user_id uuid null,
    constraint bookings_pkey primary key (id),
    constraint bookings_csv_upload_id_fkey foreign KEY (csv_upload_id) references csv_uploads (id)
  on update CASCADE,
    constraint bookings_property_id_fkey foreign KEY (property_id) references properties (id) on
  update CASCADE,
    constraint bookings_user_id_fkey foreign KEY (user_id) references profiles (id) on update
  CASCADE on delete set null
  ) TABLESPACE pg_default; create table public.properties (
    id uuid not null default gen_random_uuid (),
    listing_name character varying not null,
    address text not null,
    province character varying not null,
    property_type public.property_type not null,
    listing_id character varying not null,
    is_active boolean not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp without time zone null,
    commission_rate double precision not null,
    postal_code text not null,
    description text null,
    external_name text null default '1'::text,
    internal_name text null default '1'::text,
    constraint properties_pkey primary key (id)
  ) TABLESPACE pg_default;