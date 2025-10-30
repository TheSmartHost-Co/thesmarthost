export interface UserProfile {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT';
  createdAt: string;
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