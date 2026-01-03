export interface HostawayConnection {
  id: string;
  userId: string;
  hostawayAccountId: string;
  hasAccessToken: boolean;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport: boolean;
  status: string;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HostawayConnectionResponse {
  status: 'success' | 'failed';
  data?: HostawayConnection;
  message?: string;
}

export interface HostawayConnectionsResponse {
  status: 'success' | 'failed';
  data?: HostawayConnection[];
  message?: string;
}

export interface CreateHostawayConnectionPayload {
  userId: string;
  hostawayAccountId: string;
  apiKey: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
}

export interface UpdateHostawayConnectionPayload {
  hostawayAccountId?: string;
  apiKey?: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
  lastSyncAt?: string | null;
}

export interface TestCredentialsPayload {
  hostawayAccountId: string;
  apiKey: string;
}

export interface TestCredentialsResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    tokenType: string;
    expiresIn: number;
    hasToken: boolean;
  };
}

export interface GetAccessTokenPayload {
  hostawayAccountId: string;
  apiKey: string;
}

export interface GetAccessTokenResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: string;
  };
}

// Hostaway financeField item (from webhook/API response)
export interface HostawayFinanceField {
  name: string;
  total: number;
  amount?: number;
  isIncludedInTotalPrice?: boolean;
}

// Hostaway Reservation types (from Hostaway API)
export interface HostawayReservation {
  id: number;
  channelId: number;
  channelName: string;
  listingMapId: number;
  reservationId: string;
  hostawayReservationId: string;
  confirmationCode: string | null;
  guestName: string;
  guestFirstName: string;
  guestLastName: string | null;
  guestEmail: string | null;
  phone: string | null;
  numberOfGuests: number;
  adults: number;
  children: number;
  infants: number;
  pets: number | null;
  arrivalDate: string;
  departureDate: string;
  checkInTime: number;
  checkOutTime: number;
  nights: number;
  status: string;
  paymentStatus: string;
  currency: string;
  // Financial fields (direct from API)
  totalPrice: number;
  cleaningFee: number | null;
  taxAmount: number | null;
  channelCommissionAmount: number | null;
  // Airbnb-specific financial fields
  airbnbExpectedPayoutAmount: number | null;
  airbnbListingBasePrice: number | null;
  airbnbListingCleaningFee: number | null;
  airbnbListingHostFee: number | null;
  airbnbTransientOccupancyTaxPaidAmount: number | null;
  airbnbTotalPaidAmount: number | null;
  // Listing info
  listingName: string;
  externalListingName?: string;
  externalPropertyId?: string;
  assignedListingId?: number;
  assignedListingName?: string;
  listingId?: number;
  // Metadata
  source: string | null;
  insertedOn: string;
  updatedOn: string;
  // Financial data array (may be empty, used by webhooks)
  financeField?: HostawayFinanceField[];
}

export interface FetchReservationsPayload {
  arrivalStartDate: string;
  arrivalEndDate: string;
}

export interface FetchReservationsResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    reservations: HostawayReservation[];
    count: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}