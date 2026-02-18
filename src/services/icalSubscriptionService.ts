import apiClient from './apiClient'
import type {
  CreateICalSubscriptionPayload,
  UpdateICalSubscriptionPayload,
  ICalSubscriptionsResponse,
  ICalSubscriptionResponse,
  DeleteICalSubscriptionResponse,
  SyncResponse,
} from './types/icalSubscription'

export function getICalSubscriptions(propertyId: string): Promise<ICalSubscriptionsResponse> {
  return apiClient<ICalSubscriptionsResponse>(`/ical-subscriptions/${propertyId}`)
}

export function createICalSubscription(data: CreateICalSubscriptionPayload): Promise<ICalSubscriptionResponse> {
  return apiClient<ICalSubscriptionResponse, CreateICalSubscriptionPayload>('/ical-subscriptions', {
    method: 'POST',
    body: data,
  })
}

export function updateICalSubscription(id: string, data: UpdateICalSubscriptionPayload): Promise<ICalSubscriptionResponse> {
  return apiClient<ICalSubscriptionResponse, UpdateICalSubscriptionPayload>(`/ical-subscriptions/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export function deleteICalSubscription(id: string): Promise<DeleteICalSubscriptionResponse> {
  return apiClient<DeleteICalSubscriptionResponse>(`/ical-subscriptions/${id}`, {
    method: 'DELETE',
  })
}

export function syncICalSubscription(id: string): Promise<SyncResponse> {
  return apiClient<SyncResponse>(`/ical-subscriptions/${id}/sync`, {
    method: 'POST',
  })
}
