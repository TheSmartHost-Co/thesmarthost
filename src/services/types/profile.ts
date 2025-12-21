export interface UserProfile {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT';
  phoneNumber?: string | null;
  companyName?: string | null;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT';
  phoneNumber?: string | null;
  companyName?: string | null;
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