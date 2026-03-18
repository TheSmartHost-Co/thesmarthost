import type { Permissions } from '@/constants/permissionTemplates'

export interface UserProfile {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT' | 'CLEANER' | 'TEAM_MEMBER';
  phoneNumber?: string | null;
  companyName?: string | null;
  smsNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  additionalNotificationEmails?: string[];
  additionalNotificationPhones?: string[];
  autoImport?: boolean | null;
  createdAt: string;
  // Team member fields (returned by getOrCreateTeamMemberProfile)
  pmUserId?: string | null;
  permissions?: Permissions | null;
}

export interface UpdateProfilePayload {
  fullName: string;
  role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT' | 'CLEANER' | 'TEAM_MEMBER';
  phoneNumber?: string | null;
  companyName?: string | null;
  smsNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  additionalNotificationEmails?: string[];
  additionalNotificationPhones?: string[];
  autoImport?: boolean;
}

export interface ProfileResponse {
  status: 'success' | 'failed';
  data?: UserProfile;
  message?: string;
}

export interface ProfilesResponse {
  status: 'success' | 'failed';
  data?: UserProfile[];
  message?: string;
}