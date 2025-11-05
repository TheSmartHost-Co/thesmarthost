export interface ClientAgreement {
  id: string;
  clientId: string;
  filePath: string;
  version: string;
  uploadedBy: string;
  createdAt: string;
  agreementTitle: string;
  isDefault: boolean;
  uploadedByName?: string;
}

export interface ClientAgreementCount {
  clientId: string;
  totalAgreements: number;
  hasDefault: boolean;
}

export interface CreateClientAgreementPayload {
  clientId: string;
  agreementTitle: string;
  version?: string;
  uploadedBy: string;
  isDefault?: boolean;
  file: File;
}

export interface UpdateClientAgreementPayload {
  agreementTitle: string;
  version?: string;
  isDefault?: boolean;
}

export interface ClientAgreementDownload {
  downloadUrl: string;
  agreementTitle: string;
  version: string;
  fileExtension: string;
}

export interface ClientAgreementResponse {
  status: string;
  data: ClientAgreement;
  message?: string;
}

export interface ClientAgreementsResponse {
  status: string;
  data: ClientAgreement[];
}

export interface ClientAgreementCountResponse {
  status: string;
  data: ClientAgreementCount;
}

export interface ClientAgreementDownloadResponse {
  status: string;
  data: ClientAgreementDownload;
}

export interface DeleteClientAgreementResponse {
  status: string;
  message: string;
}

export interface SetDefaultAgreementResponse {
  status: string;
  message: string;
}