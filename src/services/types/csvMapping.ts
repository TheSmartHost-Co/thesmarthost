// CSV Mapping Types for Booking Upload System

export interface CsvHeader {
  index: number
  name: string
  sampleValue?: string
}

export interface CsvData {
  headers: CsvHeader[]
  rows: string[][]
  totalRows: number
}

export type Platform = 'ALL' | 'airbnbOfficial' | 'vrbo' | 'direct' | 'hostaway'

export interface BookingField {
  field: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date'
}

export interface FieldMapping {
  bookingField: string
  csvFormula: string // Either "[Column Name]" or formula like "[Accommodation]/[Nights]"
  platform: Platform
  isOverride?: boolean // True if this overrides the ALL platform setting
}

// Required booking fields that must be mapped
export const REQUIRED_BOOKING_FIELDS: BookingField[] = [
  { field: 'reservation_code', label: 'Reservation Code', required: true, type: 'string' },
  { field: 'guest_name', label: 'Guest Name', required: true, type: 'string' },
  { field: 'check_in_date', label: 'Check-in Date', required: true, type: 'date' },
  { field: 'num_nights', label: 'Number of Nights', required: true, type: 'number' },
  { field: 'platform', label: 'Channel/Platform', required: true, type: 'string' },
  { field: 'listing_name', label: 'Listing Name', required: true, type: 'string' }
]

// Optional booking fields that can be mapped
export const OPTIONAL_BOOKING_FIELDS: BookingField[] = [
  { field: 'total_price', label: 'Total Price', required: false, type: 'number' },
  { field: 'accommodation_fee', label: 'Accommodation Fee', required: false, type: 'number' },
  { field: 'cleaning_fee', label: 'Cleaning Fee', required: false, type: 'number' },
  { field: 'airbnb_sales_tax', label: 'Airbnb Sales Tax', required: false, type: 'number' },
  { field: 'lodging_tax', label: 'Lodging Tax', required: false, type: 'number' },
  { field: 'non_airbnb_sales_tax', label: 'Non-Airbnb Sales Tax', required: false, type: 'number' },
  { field: 'other_guest_fees', label: 'Other Guest Fees', required: false, type: 'number' },
  { field: 'channel_fee', label: 'Channel Fee', required: false, type: 'number' },
  { field: 'payment_fees', label: 'Payment Fees', required: false, type: 'number' },
  { field: 'total_payout', label: 'Total Payout', required: false, type: 'number' },
  { field: 'net_earnings', label: 'Net Earnings', required: false, type: 'number' }
]

export const ALL_BOOKING_FIELDS = [...REQUIRED_BOOKING_FIELDS, ...OPTIONAL_BOOKING_FIELDS]

// Predefined platform options
export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'ALL', label: 'All Platforms' },
  { value: 'airbnbOfficial', label: 'Airbnb' },
  { value: 'vrbo', label: 'VRBO' },
  { value: 'direct', label: 'Direct Booking' },
  { value: 'hostaway', label: 'Hostaway' }
]



/*  temp future reference

export interface CalculationRule {
       31 -    id: string
       32 -    propertyId: string
       33 -    platform: Platform
       34 -    bookingField: string
       35 -    csvFormula: string
       36 -    createdAt: string
       37 -    updatedAt: string
       38 -  }

 // Required booking fields that must be mapped
       31    export const REQUIRED_BOOKING_FIELDS: BookingField[] = [
       32      { field: 'reservation_code', label: 'Reservation Code', required: true, type: 'string' },
     ...
       52      { field: 'total_price', label: 'Total Price', required: false, type: 'number' },
       53      { field: 'accommodation_fee', label: 'Accommodation Fee', required: false, type: 'number' },
       54      { field: 'cleaning_fee', label: 'Cleaning Fee', required: false, type: 'number' },
       55 -    { field: 'nightly_rate', label: 'Nightly Rate', required: false, type: 'formula' },
       55      { field: 'airbnb_sales_tax', label: 'Airbnb Sales Tax', required: false, type: 'number' },
       56      { field: 'lodging_tax', label: 'Lodging Tax', required: false, type: 'number' },
       57      { field: 'non_airbnb_sales_tax', label: 'Non-Airbnb Sales Tax', required: false, type: 'number' },
       58      { field: 'other_guest_fees', label: 'Other Guest Fees', required: false, type: 'number' },
       59 -    { field: 'channel_fee', label: 'Channel Fee', required: false, type: 'formula' },
       59 +    { field: 'channel_fee', label: 'Channel Fee', required: false, type: 'number' },
       60      { field: 'payment_fees', label: 'Payment Fees', required: false, type: 'number' },
       61 -    { field: 'gst', label: 'GST', required: false, type: 'formula' },
       62 -    { field: 'qst', label: 'QST', required: false, type: 'formula' },
       63 -    { field: 'stripe_fee', label: 'Stripe Fee', required: false, type: 'formula' },
       61      { field: 'total_payout', label: 'Total Payout', required: false, type: 'number' },
       62 -    { field: 'net_earnings', label: 'Net Earnings', required: false, type: 'formula' }
       62 +    { field: 'net_earnings', label: 'Net Earnings', required: false, type: 'number' }
       63    ]

        // API Response Types
       81 -  export interface CalculationRulesResponse {
       82 -    status: 'success' | 'failed'
       83 -    message?: string
       84 -    data: CalculationRule[]
       85 -  }
       86 -
       87 -  export interface SaveMappingPayload {
       88 -    propertyId: string
       89 -    platform: Platform
       90 -    mappings: FieldMapping[]
       91 -  }
       92 -
       93 -  export interface SaveMappingResponse {
       94 -    status: 'success' | 'failed'
       95 -    message?: string
       96 -    data: CalculationRule[]
       97 -  }

*/