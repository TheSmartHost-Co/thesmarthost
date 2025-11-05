# Database Schema Reference

> **Complete PostgreSQL schema for HostMetrics platform**

**Source:** Backend repository schema documentation

---

## Relationship Overview

```
auth.users (Supabase Auth)
    ↓
profiles (1:1 with auth.users)
    ↓
    ├─→ clients (1:many) parent_id
    │       ↓
    │       ├─→ client_properties (many:many junction with properties)
    │       ├─→ client_notes (1:many)
    │       ├─→ client_agreements (1:many)
    │       ├─→ client_pms_credentials (1:many)
    │       └─→ reports (1:many)
    │
    ├─→ client_status_codes (1:many) user_id
    └─→ client_notes (1:many) author_id

properties
    ↓
    ├─→ client_properties (many:many junction with clients) ⭐ CRITICAL
    ├─→ bookings (1:many)
    ├─→ csv_uploads (1:many)
    ├─→ calculation_rules (1:many)
    └─→ reports (1:many)

csv_uploads
    ↓
    └─→ bookings (1:many)
```

---

## Core Tables

### `profiles`
User accounts linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (references auth.users.id) |
| `full_name` | text | User's full name |
| `role` | enum | ADMIN, PROPERTY-MANAGER, CLIENT |
| `created_at` | timestamptz | Account creation timestamp |

### `clients`
Property owners managed by users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `parent_id` | uuid | References profiles.id (property manager) |
| `name` | text | Client's full name |
| `email` | text | Contact email |
| `phone` | text | Contact phone |
| `company_name` | text | Business name (optional) |
| `billing_address` | text | Billing address |
| `pms` | text | Property management system name |
| `status_id` | uuid | References client_status_codes.id |
| `agreement_file_path` | text | Contract file location |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last modification |

### `properties`
Rental properties in the system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | varchar | Property name |
| `address` | text | Full address |
| `province` | varchar | Province/state |
| `postal_code` | text | Postal/ZIP code |
| `description` | text | Property description |
| `property_type` | enum | STR (Short-Term), LTR (Long-Term) |
| `hostaway_listing_id` | varchar | PMS listing identifier |
| `commission_rate` | double precision | Default commission (0-100) |
| `is_active` | boolean | Active status (soft delete) |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamp | Last modification |

**Important:** Properties do NOT have a direct `client_id` column. Use `client_properties` junction table.

### `client_properties` ⭐ JUNCTION TABLE
Links properties to their owners (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | References clients.id |
| `property_id` | uuid | References properties.id |
| `is_primary` | boolean | Primary owner flag (exactly one per property) |
| `commission_rate_override` | double precision | Per-owner override (nullable) |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last modification |

**Business Rules:**
- Every property MUST have ≥1 entry in this table
- Exactly one entry per property must have `is_primary = true`
- Commission hierarchy: override > property default rate

---

## Financial Tables

### `bookings`
Individual reservation records from CSV uploads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `property_id` | uuid | References properties.id |
| `csv_upload_id` | uuid | References csv_uploads.id |
| `reservation_code` | text | Booking confirmation code |
| `guest_name` | text | Guest name |
| `check_in_date` | timestamptz | Check-in date |
| `num_nights` | bigint | Number of nights |
| `platform` | enum | Airbnb, VRBO, Booking.com, etc. |
| `nightly_rate` | double precision | Rate per night |
| `extra_guest_fees` | double precision | Additional guest fees |
| `cleaning_fee` | double precision | Cleaning fee |
| `lodging_tax` | double precision | Lodging tax |
| `bed_linen_fee` | double precision | Linen fee |
| `gst` | double precision | GST tax |
| `qst` | double precision | QST tax |
| `sales_tax` | double precision | Sales tax |
| `channel_fee` | double precision | Platform commission |
| `stripe_fee` | double precision | Payment processing fee |
| `total_payout` | double precision | Total payout amount |
| `mgmt_fee` | double precision | Management fee |
| `net_earnings` | double precision | Net earnings |
| `created_at` | timestamptz | Record creation |

### `csv_uploads`
CSV file upload history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `property_id` | uuid | References properties.id |
| `file_name` | varchar | Original filename |
| `file_path` | text | Storage location |
| `upload_date` | timestamp | Upload timestamp |
| `reporting_period` | varchar | Period covered (e.g., "2025-11") |
| `row_count` | bigint | Number of rows processed |
| `status` | enum | pending, processing, completed, failed |
| `error_message` | text | Error details (if failed) |
| `created_at` | timestamptz | Record creation |

### `reports`
Generated PDF reports for clients.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | References clients.id |
| `property_id` | uuid | References properties.id |
| `reporting_period` | text | Period covered |
| `pdf_file_path` | text | PDF storage location |
| `status` | enum | pending, generating, completed, failed |
| `generated_at` | timestamptz | Generation timestamp |
| `created_at` | timestamptz | Record creation |

---

## CRM Tables

### `client_status_codes`
Custom status labels per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References profiles.id |
| `code` | text | Status code (e.g., "ACTIVE") |
| `label` | text | Display label |
| `color_hex` | text | Color for UI (#RRGGBB) |
| `is_default` | boolean | Default status flag |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last modification |

### `client_notes`
Notes about clients.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | References clients.id |
| `author_id` | uuid | References profiles.id |
| `note_title` | text | Note title |
| `note` | text | Note content |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last modification |

### `client_agreements`
Contract/agreement files.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | References clients.id |
| `file_path` | text | File storage location |
| `version` | text | Agreement version |
| `uploaded_by` | uuid | References profiles.id |
| `created_at` | timestamptz | Record creation |

### `client_pms_credentials`
Encrypted PMS login credentials.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `client_id` | uuid | References clients.id |
| `pms` | text | PMS platform name |
| `username` | text | PMS username |
| `password` | text | Encrypted password |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last modification |

---

## Business Logic Tables

### `calculation_rules`
Custom calculation formulas per property/client.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `property_id` | uuid | References properties.id |
| `client_id` | uuid | References clients.id |
| `platform` | enum | Airbnb, VRBO, etc. |
| `calculation_field` | text | Field to calculate |
| `formula` | text | Calculation formula |
| `priority` | bigint | Rule priority |
| `is_active` | boolean | Active status |
| `notes` | text | Rule notes |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last modification |

---

## Key Relationships Explained

### Properties ↔ Clients (Many-to-Many) ⭐ MOST IMPORTANT

**Why Many-to-Many:**
- Co-ownership scenarios (e.g., husband + wife)
- Multiple properties per client
- Flexible ownership structures

**Query Example:**
```sql
-- Get properties with all owners
SELECT
  p.id,
  p.name,
  json_agg(
    json_build_object(
      'clientId', c.id,
      'clientName', c.name,
      'isPrimary', cp.is_primary,
      'commissionRateOverride', cp.commission_rate_override
    )
  ) as owners
FROM properties p
INNER JOIN client_properties cp ON p.id = cp.property_id
INNER JOIN clients c ON cp.client_id = c.id
GROUP BY p.id;
```

**Always use INNER JOIN** - properties must have owners.

---

**Last Updated:** November 4, 2025
