import apiClient from './apiClient';
import { useImpersonationStore } from '@/store/useImpersonationStore';
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

/**
 * Refuse profile writes while impersonating.
 *
 * The app never swaps identity when a PM impersonates someone — it only adds an
 * X-Impersonate-As header — so `useUserStore.profile` stays the PM's. Every
 * caller of updateUserProfile passes `profile.id`, which during impersonation
 * means the request is addressed to the IMPERSONATOR's row while the header
 * says otherwise.
 *
 * The server rejects that, but this stops the request being built at all, and
 * covers the shared children (LanguageSelector, LanguagePromptBanner) that no
 * settings page would otherwise think to disable.
 *
 * Read non-reactively via getState(), the same way apiClient reads this store.
 */
function impersonationBlocked(): ProfileResponse | null {
  if (!useImpersonationStore.getState().isImpersonating) return null
  return {
    status: 'failed',
    message: 'Profile cannot be changed while viewing as another user',
  }
}

export function updateUserProfile(userId: string, profileData: UpdateProfilePayload): Promise<ProfileResponse> {
  const blocked = impersonationBlocked()
  if (blocked) return Promise.resolve(blocked)

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

// Get or create a contractor profile when they log in via magic link
export function getOrCreateContractorProfile(authUserId: string, fullName: string): Promise<ProfileResponse> {
  return apiClient<ProfileResponse>('/profile/contractor', {
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

// Get or create a client (property owner) profile when they log in via magic link
// Returns profile + pmUserId from clients row
export function getOrCreateClientProfile(authUserId: string, fullName: string): Promise<ProfileResponse> {
  return apiClient<ProfileResponse>('/profile/client', {
    method: 'POST',
    body: { authUserId, fullName },
  });
}