import apiClient from './apiClient';
import { ProfileResponse, ProfilesResponse, UpdateProfilePayload } from './types/profile';

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

export function updateUserProfile(userId: string, profileData: UpdateProfilePayload): Promise<ProfileResponse> {
  return apiClient(`/profile/${userId}`, {
    method: 'PUT',
    body: profileData,
  });
}

export function deleteUserProfile(userId: string): Promise<{ status: string; message: string }> {
  return apiClient(`/profile/${userId}`, {
    method: 'DELETE',
  });
}

// Get or create a cleaner profile when they log in via magic link
export function getOrCreateCleanerProfile(authUserId: string, fullName: string): Promise<ProfileResponse> {
  return apiClient<ProfileResponse>('/profile/cleaner', {
    method: 'POST',
    body: { authUserId, fullName },
  });
}

// Get or create a team member profile when they log in via magic link
// Returns profile + pmUserId + permissions from team_members row
export function getOrCreateTeamMemberProfile(authUserId: string, fullName: string): Promise<ProfileResponse> {
  return apiClient<ProfileResponse>('/profile/team-member', {
    method: 'POST',
    body: { authUserId, fullName },
  });
}