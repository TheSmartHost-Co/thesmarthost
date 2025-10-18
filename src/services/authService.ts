import apiClient from './apiClient';
import { SessionValidationResponse } from './types/auth';

export function validateSession(): Promise<SessionValidationResponse> {
  return apiClient('/auth/me', {
    method: 'GET',
  });
}