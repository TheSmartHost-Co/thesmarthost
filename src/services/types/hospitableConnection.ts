export interface HospitableConnection {
  id: string;
  userId: string;
  hospitableAccountId: string;
  hasPersonalAccessToken: boolean;
  tokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport: boolean;
  status: string;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HospitableConnectionResponse {
  status: 'success' | 'failed';
  data?: HospitableConnection;
  message?: string;
}

export interface HospitableConnectionsResponse {
  status: 'success' | 'failed';
  data?: HospitableConnection[];
  message?: string;
}

export interface CreateHospitableConnectionPayload {
  userId: string;
  hospitableAccountId?: string;
  personalAccessToken: string;
  tokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
}

export interface UpdateHospitableConnectionPayload {
  hospitableAccountId?: string;
  personalAccessToken?: string;
  tokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
  lastSyncAt?: string | null;
}

export interface TestCredentialsPayload {
  personalAccessToken: string;
}

export interface TestCredentialsResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    accountId?: string;
    accountName?: string;
    valid: boolean;
  };
}

// Hospitable Reservation types (from Hospitable API/webhook)
export interface HospitableReservation {
  id: string;
  propertyId: string;
  propertyName?: string;
  externalPropertyId?: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  numberOfGuests: number;
  status: string;
  channel: string;
  currency: string;
  // Financial fields
  totalPrice: number;
  payout: number;
  cleaningFee?: number | null;
  channelFee?: number | null;
  taxes?: number | null;
  // Metadata
  confirmationCode?: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface FetchReservationsPayload {
  startDate: string;
  endDate: string;
}

export interface FetchReservationsResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    reservations: HospitableReservation[];
    count: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}
