export interface ClientStatusCode {
  id: string;
  userId: string;
  code: string;
  label: string;
  colorHex: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStatusCodePayload {
  userId: string;
  code: string;
  label: string;
  colorHex?: string;
  isDefault?: boolean;
}

export interface UpdateStatusCodePayload {
  code: string;
  label: string;
  colorHex?: string;
  isDefault?: boolean;
}

export interface StatusCodeResponse {
  status: string;
  data: ClientStatusCode;
  message?: string;
}

export interface StatusCodesResponse {
  status: string;
  data: ClientStatusCode[];
}