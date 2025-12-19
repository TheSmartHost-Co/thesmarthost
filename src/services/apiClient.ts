// services/apiClient.ts
import { createClient } from '@/utils/supabase/component'
import { useUserStore } from '@/store/useUserStore'

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

// Event emitter for session events
type SessionEventType = 'session-expired' | 'session-invalid'
const sessionEventListeners: Record<SessionEventType, (() => void)[]> = {
  'session-expired': [],
  'session-invalid': []
}

export const sessionEvents = {
  on: (event: SessionEventType, callback: () => void) => {
    sessionEventListeners[event].push(callback)
  },
  off: (event: SessionEventType, callback: () => void) => {
    const index = sessionEventListeners[event].indexOf(callback)
    if (index > -1) sessionEventListeners[event].splice(index, 1)
  },
  emit: (event: SessionEventType) => {
    sessionEventListeners[event].forEach(callback => callback())
  }
}

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
    
    // Get access token from Supabase session instead of Zustand store
    const supabase = createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      sessionEvents.emit('session-invalid')
      throw new Error('Authentication error')
    }
    
    const authHeaders = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
    
    const config: RequestInit = {
        method,
        headers: isFormData ? {
            ...authHeaders,
            ...headers,
        } as HeadersInit : {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
        } as HeadersInit,
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
        
        // Emit session events for auth errors
        if (response.status === 401 || response.status === 403) {
            console.log('🔒 Authentication error detected, emitting session-expired event')
            sessionEvents.emit('session-expired')
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
