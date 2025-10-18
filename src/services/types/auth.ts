export interface SessionValidationResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    username: string;
    fullName: string;
    email: string;
    school: string;
    role: string;
    isVerified: boolean;
    isVerifiedSchool: boolean;
    createdAt: string;
    lastModifiedAt: string;
    activeTerm: string;
  };
}
