export interface HostawayConnection {
  id: string;
  userId: string;
  hostawayAccountId: string;
  hasAccessToken: boolean;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport: boolean;
  status: string;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HostawayConnectionResponse {
  status: 'success' | 'failed';
  data?: HostawayConnection;
  message?: string;
}

export interface HostawayConnectionsResponse {
  status: 'success' | 'failed';
  data?: HostawayConnection[];
  message?: string;
}

export interface CreateHostawayConnectionPayload {
  userId: string;
  hostawayAccountId: string;
  apiKey: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
}

export interface UpdateHostawayConnectionPayload {
  hostawayAccountId?: string;
  apiKey?: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
  lastSyncAt?: string | null;
}

export interface TestCredentialsPayload {
  hostawayAccountId: string;
  apiKey: string;
}

export interface TestCredentialsResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    tokenType: string;
    expiresIn: number;
    hasToken: boolean;
  };
}

export interface GetAccessTokenPayload {
  hostawayAccountId: string;
  apiKey: string;
}

export interface GetAccessTokenResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: string;
  };
}