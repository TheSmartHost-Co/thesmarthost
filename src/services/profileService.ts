import apiClient from './apiClient';
import { ProfileResponse, ProfilesResponse } from './types/profile';

export function getUserProfile(userId: string): Promise<ProfileResponse> {
  return apiClient(`/profile/${userId}`, {
    method: 'GET',
  });
}

export function getProfilesByRole(role: string): Promise<ProfilesResponse> {
  return apiClient(`/profile/role/${role}`, {
    method: 'GET',
  });
}

export function updateUserProfile(userId: string, profileData: { fullName: string; role: string }): Promise<ProfileResponse> {
  return apiClient(`/profile/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export function deleteUserProfile(userId: string): Promise<{ status: string; message: string }> {
  return apiClient(`/profile/${userId}`, {
    method: 'DELETE',
  });
}