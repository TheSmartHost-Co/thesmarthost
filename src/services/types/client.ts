export interface ClientStatusInfo {
  code: string;
  label: string;
  colorHex: string;
  isDefault: boolean;
}

export interface Client {
  id: string;
  parentId: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  billingAddress?: string;
  pms?: string;
  agreementFilePath?: string;
  status: string;
  statusId?: string;
  pmsCredentials: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  statusInfo?: ClientStatusInfo | null;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
}

export interface CreateClientPayload {
  parentId: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  billingAddress?: string;
  pms?: string;
  agreementFilePath?: string;
  statusId?: string;
}

export interface UpdateClientPayload {
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  billingAddress?: string;
  pms?: string;
  agreementFilePath?: string;
  status?: string;
  statusId?: string;
}

export interface ClientResponse {
  status: string;
  data: Client;
  message?: string;
}

export interface ClientsResponse {
  status: string;
  data: Client[];
}

export interface ClientStatsResponse {
  status: string;
  data: ClientStats;
}