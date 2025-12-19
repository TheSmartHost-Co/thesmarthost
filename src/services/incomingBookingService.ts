import apiClient from './apiClient';
import { 
  IncomingBookingResponse, 
  IncomingBookingsResponse, 
  CreateIncomingBookingPayload, 
  UpdateIncomingBookingMappingPayload,
  UpdateIncomingBookingStatusPayload,
  UpdateIncomingBookingFinancialsPayload,
  DeleteIncomingBookingPayload,
  FieldMappingsResponse,
  PendingBookingsCountResponse
} from './types/incomingBooking';

export function getAllIncomingBookings(userId: string): Promise<IncomingBookingsResponse> {
  return apiClient<IncomingBookingsResponse>(`/incoming-bookings/${userId}`);
}

export function getIncomingBookingById(bookingId: string): Promise<IncomingBookingResponse> {
  return apiClient<IncomingBookingResponse>(`/incoming-bookings/booking/${bookingId}`);
}

export function getIncomingBookingsByStatus(userId: string, status: string): Promise<IncomingBookingsResponse> {
  return apiClient<IncomingBookingsResponse>(`/incoming-bookings/${userId}/status?status=${status}`);
}

export function getPendingBookingsCount(userId: string): Promise<PendingBookingsCountResponse> {
  return apiClient<PendingBookingsCountResponse>(`/incoming-bookings/${userId}/pending-count`);
}

export function getExistingFieldMappings(externalListingId: string, userId: string): Promise<FieldMappingsResponse> {
  return apiClient<FieldMappingsResponse>(`/incoming-bookings/field-mappings/${externalListingId}/${userId}`);
}

export function createIncomingBooking(bookingData: CreateIncomingBookingPayload): Promise<IncomingBookingResponse> {
  return apiClient<IncomingBookingResponse>('/incoming-bookings', {
    method: 'POST',
    body: bookingData,
  });
}

export function updateIncomingBookingMapping(
  bookingId: string, 
  mappingData: UpdateIncomingBookingMappingPayload
): Promise<IncomingBookingResponse> {
  return apiClient<IncomingBookingResponse>(`/incoming-bookings/${bookingId}/mapping`, {
    method: 'PUT',
    body: mappingData,
  });
}

export function updateIncomingBookingStatus(
  bookingId: string, 
  statusData: UpdateIncomingBookingStatusPayload
): Promise<IncomingBookingResponse> {
  return apiClient<IncomingBookingResponse>(`/incoming-bookings/${bookingId}/status`, {
    method: 'PUT',
    body: statusData,
  });
}

export function deleteIncomingBooking(
  bookingId: string, 
  deleteData: DeleteIncomingBookingPayload
): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/incoming-bookings/${bookingId}`, {
    method: 'DELETE',
    body: deleteData,
  });
}

export function updateIncomingBookingFinancials(
  bookingId: string,
  data: UpdateIncomingBookingFinancialsPayload
): Promise<IncomingBookingResponse> {
  return apiClient<IncomingBookingResponse, UpdateIncomingBookingFinancialsPayload>(
    `/incoming-bookings/${bookingId}/financials`,
    {
      method: 'PUT',
      body: data,
    }
  );
}