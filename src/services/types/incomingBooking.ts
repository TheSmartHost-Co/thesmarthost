// Base incoming booking interface
export interface IncomingBooking {
  id: string;
  userId: string;
  platform: string | null;
  pmsConnectionId: string | null;
  externalReservationId: string | null;
  externalListingId: string | null;
  rawWebhookData: Record<string, any> | null;
  bookingData: Record<string, any> | null;
  status: string | null;
  propertyId: string | null;
  clientId: string | null;
  fieldMappings: Record<string, string> | null;
  guestName: string | null;
  guestEmail: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  totalAmount: string | null;
  bookingStatus: string | null;
  webhookReceivedAt: string | null;
  reviewedAt: string | null;
  importedAt: string | null;
  importedBookingId: string | null;
  createdAt: string;
  updatedAt: string | null;
  
  // Financial fields from webhook data
  listingName: string | null;
  numNights: number | null;
  nightlyRate: number | null;
  extraGuestFees: number | null;
  cleaningFee: number | null;
  lodgingTax: number | null;
  bedLinenFee: number | null;
  gst: number | null;
  qst: number | null;
  channelFee: number | null;
  stripeFee: number | null;
  totalPayout: number | null;
  mgmtFee: number | null;
  netEarnings: number | null;
  salesTax: number | null;
  
  // Joined data from queries
  propertyName?: string | null;
  propertyAddress?: string | null;
  clientName?: string | null;
  hostawayAccountId?: string | null;
}

// API Response interfaces
export interface IncomingBookingResponse {
  status: 'success' | 'failed';
  message?: string;
  data: IncomingBooking;
}

export interface IncomingBookingsResponse {
  status: 'success' | 'failed';
  message?: string;
  data: IncomingBooking[];
}

// Payloads for creating/updating incoming bookings
export interface CreateIncomingBookingPayload {
  userId: string;
  platform?: string;
  pmsConnectionId: string;
  externalReservationId: string;
  externalListingId?: string;
  rawWebhookData?: Record<string, any>;
  bookingData: Record<string, any>;
  guestName?: string;
  guestEmail?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount?: string;
  bookingStatus?: string;
}

export interface UpdateIncomingBookingMappingPayload {
  propertyId: string;
  clientId?: string;  // Optional - will auto-select primary client if not provided
  fieldMappings: Record<string, string>;
}

export interface UpdateIncomingBookingStatusPayload {
  status: 'pending' | 'approved' | 'rejected' | 'imported' | 'error';
  importedBookingId?: string;
}

export interface DeleteIncomingBookingPayload {
  userId: string;
}

// Field mappings helper interface
export interface FieldMappingsResponse {
  status: 'success' | 'failed';
  message?: string;
  data: {
    fieldMappings: Record<string, string>;
    propertyId: string;
    clientId: string;
  } | null;
}

// Pending count response
export interface PendingBookingsCountResponse {
  status: 'success' | 'failed';
  message?: string;
  data: {
    count: number;
  };
}

// Field change tracking
export interface FieldChange {
  fieldName: string;
  originalValue: string;
  editedValue: string;
  changeReason?: string;
}

// Update financial data payload
export interface UpdateIncomingBookingFinancialsPayload {
  userId: string;
  financialData: {
    guestName?: string;
    guestEmail?: string;
    checkInDate?: string;
    checkOutDate?: string;
    numNights?: number;
    nightlyRate?: number | null;
    cleaningFee?: number | null;
    lodgingTax?: number | null;
    salesTax?: number | null;
    totalPayout?: number | null;
    extraGuestFees?: number | null;
    bedLinenFee?: number | null;
    gst?: number | null;
    qst?: number | null;
    channelFee?: number | null;
    stripeFee?: number | null;
    mgmtFee?: number | null;
    netEarnings?: number | null;
  };
  fieldChanges?: FieldChange[];
}