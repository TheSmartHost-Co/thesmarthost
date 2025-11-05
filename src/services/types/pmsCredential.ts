export interface PMSCredential {
  id: string;
  clientId: string;
  pms: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePMSCredentialPayload {
  clientId: string;
  pms: string;
  username: string;
  password?: string;
}

export interface UpdatePMSCredentialPayload {
  pms: string;
  username: string;
  password?: string;
}

export interface PMSCredentialResponse {
  status: string;
  data: PMSCredential;
  message?: string;
}

export interface PMSCredentialsResponse {
  status: string;
  data: PMSCredential[];
}

export interface PMSCredentialsCheckResponse {
  status: string;
  data: {
    clientId: string;
    hasCredentials: boolean;
    credentialsCount: number;
  };
}