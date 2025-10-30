export interface Client {
  id: string;
  parentId: string;
  name: string;
  email?: string;
  phone?: string;
  commissionRate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  avgCommissionRate: number;
}

export interface CreateClientPayload {
  parentId: string;
  name: string;
  email?: string;
  phone?: string;
  commissionRate: string;
}

export interface UpdateClientPayload {
  name: string;
  email?: string;
  phone?: string;
  commissionRate: string;
  isActive?: boolean;
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