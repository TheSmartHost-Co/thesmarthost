// services/apiClient.ts
import { createClient } from '@/utils/supabase/component'
import { SessionError } from '@/services/sessionError'
import { ValidationError } from '@/services/validationError'
import { getSessionStore } from '@/store/useSessionStore'

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

// Singleton Supabase client - avoids creating new instances on every API call
// This prevents race conditions and ensures consistent session state
let supabaseInstance: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

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

    // Get access token from Supabase session using singleton client
    const supabase = getSupabaseClient()
    let session = null

    // Try to get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError)
      // Set store state to trigger modal immediately
      getSessionStore().setSessionError('Authentication error - please sign in again')
      sessionEvents.emit('session-invalid')
      throw new SessionError('Authentication error')
    }

    session = sessionData.session

    // If session is null but no error, try refreshing once
    // This handles cases where session storage is in a transient state
    if (!session) {
      console.log('🔄 Session null, attempting refresh...')
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.error('Session refresh failed:', refreshError)
        // Set store state to trigger modal immediately
        getSessionStore().setSessionError('Session expired - please sign in again')
        sessionEvents.emit('session-expired')
        throw new SessionError('Session expired - please log in again')
      }

      session = refreshData.session

      if (session) {
        console.log('✅ Session recovered via refresh')
      } else {
        console.log('❌ No session after refresh attempt')
        // Set store state to trigger modal immediately
        getSessionStore().setSessionError('No active session - please sign in')
        sessionEvents.emit('session-expired')
        throw new SessionError('No active session - please log in')
      }
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
        let errorArray: string[] | undefined
        try {
            const errorBody = await responseClone.json();
            errorMessage = errorBody.message || errorMessage
            if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
                errorArray = errorBody.errors
            }
            console.log('❌ Error Body:', errorBody)
        } catch {
            console.log('❌ Error (no JSON):', response.statusText)
        }

        // Handle auth errors with SessionError and trigger modal
        if (response.status === 401 || response.status === 403) {
            console.log('🔒 Authentication error detected, triggering session modal')
            // Set store state to trigger modal immediately
            getSessionStore().setSessionError(errorMessage || 'Authentication required - please sign in again')
            sessionEvents.emit('session-expired')
            console.groupEnd();
            throw new SessionError(errorMessage);
        }

        console.groupEnd();

        // Throw ValidationError when backend returns an errors array
        if (errorArray) {
            throw new ValidationError(errorMessage, errorArray);
        }

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
