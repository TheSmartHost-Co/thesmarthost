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