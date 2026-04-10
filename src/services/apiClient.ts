// services/apiClient.ts
import { createClient } from '@/utils/supabase/component'
import { SessionError } from '@/services/sessionError'
import { ValidationError } from '@/services/validationError'
import { BackendError } from '@/services/backendError'
import { getSessionStore } from '@/store/useSessionStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'

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

/**
 * Get Authorization headers from the current Supabase session.
 * Use this for raw fetch calls that can't go through apiClient (e.g. blob downloads).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

  const impersonationHeader = useImpersonationStore.getState().getImpersonationHeader()
  if (impersonationHeader) {
    headers['X-Impersonate-As'] = impersonationHeader
  }

  return headers
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

    // Include impersonation header when actively impersonating on a portal route
    const impersonationHeader = useImpersonationStore.getState().getImpersonationHeader()
    const impersonateHeaders: Record<string, string> = impersonationHeader
      ? { 'X-Impersonate-As': impersonationHeader }
      : {}

    const config: RequestInit = {
        method,
        headers: isFormData ? {
            ...authHeaders,
            ...impersonateHeaders,
            ...headers,
        } as HeadersInit : {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...impersonateHeaders,
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

    let response = await fetch(fullUrl, config);

    // Silent retry on 401: token may have expired between session check and server validation
    // Skip for FormData (file uploads can't be re-read) and 403 (permissions, not expiry)
    if (response.status === 401 && !isFormData) {
        console.log('🔄 401 received, attempting silent token refresh and retry...')
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

        if (!refreshError && refreshData.session?.access_token) {
            const retryConfig: RequestInit = {
                ...config,
                headers: {
                    ...(config.headers as Record<string, string>),
                    'Authorization': `Bearer ${refreshData.session.access_token}`,
                    ...impersonateHeaders,
                },
            }
            const retryResponse = await fetch(fullUrl, retryConfig)
            response = retryResponse // Use retry response regardless of status
            if (retryResponse.ok) {
                console.log('✅ Silent retry succeeded')
            } else {
                console.log('❌ Silent retry also failed with status', retryResponse.status)
            }
        } else {
            console.log('❌ Token refresh failed, proceeding with original 401')
        }
    }

    // Response logging
    console.group(`📥 API Response: ${response.status} ${response.statusText}`);
    console.log('📍 URL:', fullUrl);
    console.log('✅ Status:', `${response.status} ${response.statusText}`);
    console.log('📝 Headers:', Object.fromEntries(response.headers.entries()));

    const responseClone = response.clone(); // Clone to avoid consuming body twice

    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        let errorArray: string[] | undefined
        let errorBody: Record<string, unknown> | null = null
        try {
            errorBody = await responseClone.json();
            if (errorBody && typeof errorBody === 'object') {
                const msg = (errorBody as { message?: unknown }).message
                if (typeof msg === 'string') errorMessage = msg
                const errs = (errorBody as { errors?: unknown }).errors
                if (Array.isArray(errs) && errs.length > 0) {
                    errorArray = errs as string[]
                }
            }
            console.log('❌ Error Body:', errorBody)
        } catch {
            console.log('❌ Error (no JSON):', response.statusText)
        }

        // Handle auth errors
        if (response.status === 401) {
            console.log('🔒 Authentication error detected, triggering session modal')
            getSessionStore().setSessionError(errorMessage || 'Authentication required - please sign in again')
            sessionEvents.emit('session-expired')
            console.groupEnd();
            throw new SessionError(errorMessage);
        }

        // Handle permission errors (403) - don't trigger session expired modal
        if (response.status === 403) {
            console.log('🚫 Permission denied (403)')
            console.groupEnd();
            throw new BackendError(
                errorMessage || 'You don\'t have permission to perform this action',
                response.status,
                errorBody,
            );
        }

        console.groupEnd();

        // Throw ValidationError when backend returns an errors array
        if (errorArray) {
            throw new ValidationError(errorMessage, errorArray);
        }

        throw new BackendError(errorMessage, response.status, errorBody);
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
