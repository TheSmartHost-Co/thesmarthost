export interface ICalSubscription {
  id: string
  userId: string
  propertyId: string
  icalUrl: string
  name: string | null
  platform: ICalPlatform
  lastSyncedAt: string | null
  syncStatus: 'pending' | 'success' | 'partial' | 'error' | 'never'
  errorMessage: string | null
  autoSync: boolean
  createdAt: string
  updatedAt: string | null
}

export type ICalPlatform = 'airbnb' | 'booking' | 'vrbo' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' | 'direct-etransfer' | 'hostaway' | 'guesty'

export interface CreateICalSubscriptionPayload {
  propertyId: string
  icalUrl: string
  name?: string
  platform?: ICalPlatform
}

export interface UpdateICalSubscriptionPayload {
  name?: string | null
  icalUrl?: string
  platform?: ICalPlatform
  autoSync?: boolean
}

export interface SyncEvent {
  reservationCode: string
  guestName: string
  checkIn: string
  checkOut: string
  numNights: number
  platform: string
  bookingId: string | null
  action: 'created' | 'updated' | 'skipped' | 'imported' | 'cancelled'
  reason?: string
  icalMetadata: { reservationUrl?: string; phoneNumberLast4Digits?: string; property?: string } | null
}

export interface SyncResults {
  created: number
  updated: number
  skipped: number
  cancelled: number
  errors: { uid: string; summary: string; error: string }[]
  events: SyncEvent[]
}

export interface SyncResponse {
  status: 'success' | 'failed'
  message: string
  data?: {
    subscription: Pick<ICalSubscription, 'id' | 'lastSyncedAt' | 'syncStatus' | 'errorMessage'>
    syncResults: SyncResults
  }
}

export interface ICalSubscriptionsResponse {
  status: 'success' | 'failed'
  data?: ICalSubscription[]
  message?: string
}

export interface ICalSubscriptionResponse {
  status: 'success' | 'failed'
  data?: ICalSubscription
  message?: string
}

export interface DeleteICalSubscriptionResponse {
  status: 'success' | 'failed'
  message?: string
}
