import apiClient from './apiClient';
import {
  ClientAgreementResponse,
  ClientAgreementsResponse,
  ClientAgreementCountResponse,
  ClientAgreementDownloadResponse,
  DeleteClientAgreementResponse,
  SetDefaultAgreementResponse,
  CreateClientAgreementPayload,
  UpdateClientAgreementPayload
} from './types/clientAgreement';

export function getAgreementsByClientId(clientId: string): Promise<ClientAgreementsResponse> {
  return apiClient<ClientAgreementsResponse>(`/client-agreements/client/${clientId}`);
}

export function getAgreementCount(clientId: string): Promise<ClientAgreementCountResponse> {
  return apiClient<ClientAgreementCountResponse>(`/client-agreements/client/${clientId}/count`);
}

export function getAgreementById(id: string): Promise<ClientAgreementResponse> {
  return apiClient<ClientAgreementResponse>(`/client-agreements/${id}`);
}

export function createAgreement(agreementData: CreateClientAgreementPayload): Promise<ClientAgreementResponse> {
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', agreementData.file);
  formData.append('clientId', agreementData.clientId);
  formData.append('agreementTitle', agreementData.agreementTitle);
  formData.append('uploadedBy', agreementData.uploadedBy);
  
  if (agreementData.version) {
    formData.append('version', agreementData.version);
  }
  
  if (agreementData.isDefault !== undefined) {
    formData.append('isDefault', agreementData.isDefault.toString());
  }

  // Use fetch directly for FormData (apiClient might not handle it correctly)
  return fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/client-agreements`, {
    method: 'POST',
    body: formData,
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
}

export function updateAgreement(id: string, updateData: UpdateClientAgreementPayload): Promise<ClientAgreementResponse> {
  return apiClient<ClientAgreementResponse>(`/client-agreements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  });
}

export function deleteAgreement(id: string): Promise<DeleteClientAgreementResponse> {
  return apiClient<DeleteClientAgreementResponse>(`/client-agreements/${id}`, {
    method: 'DELETE',
  });
}

export function setDefaultAgreement(id: string): Promise<SetDefaultAgreementResponse> {
  return apiClient<SetDefaultAgreementResponse>(`/client-agreements/${id}/set-default`, {
    method: 'POST',
  });
}

export function getAgreementDownloadUrl(id: string): Promise<ClientAgreementDownloadResponse> {
  return apiClient<ClientAgreementDownloadResponse>(`/client-agreements/${id}/download`);
}

// Helper function to download agreement file
export async function downloadAgreement(id: string, filename?: string): Promise<void> {
  try {
    const response = await getAgreementDownloadUrl(id);
    if (response.status === 'success') {
      // Fetch the file and trigger browser download
      const fileResponse = await fetch(response.data.downloadUrl);
      const blob = await fileResponse.blob();
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${response.data.agreementTitle}_v${response.data.version}${response.data.fileExtension}`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

// Helper function to get document URL for preview
export async function getDocumentPreviewUrl(id: string): Promise<string> {
  try {
    const response = await getAgreementDownloadUrl(id);
    if (response.status === 'success') {
      return response.data.downloadUrl;
    }
    throw new Error('Failed to get preview URL');
  } catch (error) {
    console.error('Preview URL failed:', error);
    throw error;
  }
}