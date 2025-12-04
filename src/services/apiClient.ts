// services/apiClient.ts
import { createClient } from '@/utils/supabase/component'

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

interface ApiClientOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: T;
  headers?: HeadersInit;
}

async function apiClient<T, B = unknown>(
    endpoint: string,
    { method = 'GET', body, headers = {} }: ApiClientOptions<B> = {}
): Promise<T> {

    const isFormData = body instanceof FormData;
    
    const config: RequestInit = {
        method,
        headers: isFormData ? {
            ...headers, // Don't set Content-Type for FormData - let browser handle it
        } : {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body) {
        config.body = isFormData ? body as any : JSON.stringify(body);
    }

    console.log('Making request to:', `${baseURL}${endpoint}`) // Debug log
    
    const response = await fetch(`${baseURL}${endpoint}`, config);
    
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || errorMessage
            console.log('API Error:', errorBody)
        } catch {
            console.log('API Error (no JSON):', response.statusText)
        }
        throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
}

export default apiClient;
