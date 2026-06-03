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
  preferredLanguage?: 'en' | 'fr' | 'es' | null;
  // mig 036 multi-currency: the user's home currency (the currency their books
  // are kept in). USD purchases get converted to this at apply-time. Defaults
  // to 'CAD' for all existing users.
  homeCurrency?: 'CAD' | 'USD' | null;
  country?: string | null;
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
  preferredLanguage?: 'en' | 'fr' | 'es';
  homeCurrency?: 'CAD' | 'USD';
  country?: string | null;
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