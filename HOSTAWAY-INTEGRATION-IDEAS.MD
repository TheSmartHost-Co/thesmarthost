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