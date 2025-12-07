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

    const fullUrl = `${baseURL}${endpoint}`;
    console.log('test change');
    
    // Comprehensive API logging like Postman
    console.group(`🚀 API Request: ${method} ${endpoint}`);
    console.log('📍 URL:', fullUrl);
    console.log('🔧 Method:', method);
    console.log('📝 Headers:', config.headers);
    if (body) {
        console.log('📦 Body:', isFormData ? 'FormData (check network tab)' : body);
    }
    console.groupEnd();
    
    const response = await fetch(fullUrl, config);
    
    // Response logging
    console.group(`📥 API Response: ${response.status} ${response.statusText}`);
    console.log('📍 URL:', fullUrl);
    console.log('✅ Status:', `${response.status} ${response.statusText}`);
    console.log('📝 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseClone = response.clone(); // Clone to avoid consuming body twice
    
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
            const errorBody = await responseClone.json();
            errorMessage = errorBody.message || errorMessage
            console.log('❌ Error Body:', errorBody)
        } catch {
            console.log('❌ Error (no JSON):', response.statusText)
        }
        console.groupEnd();
        throw new Error(errorMessage);
    }

    // Log successful response body
    try {
        const responseBody = await responseClone.json();
        console.log('📦 Response Body:', responseBody);
        console.groupEnd();
        return responseBody as T;
    } catch (error) {
        console.log('❌ Failed to parse response JSON:', error);
        console.groupEnd();
        throw new Error('Invalid JSON response');
    }
}

export default apiClient;
