export interface GuestyConnection {
  id: string;
  userId: string;
  guestyClientId: string;
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

export interface GuestyConnectionResponse {
  status: 'success' | 'failed';
  data?: GuestyConnection;
  message?: string;
}

export interface GuestyConnectionsResponse {
  status: 'success' | 'failed';
  data?: GuestyConnection[];
  message?: string;
}

export interface CreateGuestyConnectionPayload {
  userId: string;
  guestyClientId: string;
  guestyClientSecret: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
}

export interface UpdateGuestyConnectionPayload {
  guestyClientId?: string;
  guestyClientSecret?: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  webhookId?: string | null;
  webhookUrl?: string | null;
  autoImport?: boolean;
  status?: string;
  lastSyncAt?: string | null;
}

export interface TestGuestyCredentialsPayload {
  guestyClientId: string;
  guestyClientSecret: string;
}

export interface TestGuestyCredentialsResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    tokenType: string;
    expiresIn: number;
    hasToken: boolean;
  };
}

export interface GetGuestyAccessTokenPayload {
  guestyClientId: string;
  guestyClientSecret: string;
}

export interface GetGuestyAccessTokenResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: string;
  };
}
