// Observe console — API layer for the platform-admin endpoints (403 for anyone else).
// Each call unwraps the { status, data } envelope because pages consume it via
// useObserveQuery, which expects either the data or a thrown error.

import apiClient from './apiClient'
import type {
  ActivityData,
  ErrorGroupData,
  ErrorsData,
  ErrorsRangeData,
  FeaturesData,
  ObserveAccess,
  OverviewData,
  UserDetailData,
  UsersData,
  WindowKey,
} from './types/observe'

interface ObserveResponse<T> {
  status: 'success' | 'failed'
  message?: string
  data: T
}

async function get<T>(path: string): Promise<T> {
  const res = await apiClient<ObserveResponse<T>>(`/observe${path}`)
  if (res.status !== 'success') throw new Error(res.message || 'Request failed')
  return res.data
}

const q = (window: WindowKey) => `?window=${encodeURIComponent(window)}`
const enc = encodeURIComponent

export const getObserveAccess = () => get<ObserveAccess>('/access')
export const getOverview = (w: WindowKey) => get<OverviewData>(`/overview${q(w)}`)
export const getActivity = (w: WindowKey) => get<ActivityData>(`/activity${q(w)}`)
export const getUsers = (w: WindowKey) => get<UsersData>(`/users${q(w)}`)
export const getUser = (id: string, w: WindowKey) => get<UserDetailData>(`/users/${enc(id)}${q(w)}`)
export const getFeatures = (w: WindowKey) => get<FeaturesData>(`/features${q(w)}`)
export const getErrors = (w: WindowKey) => get<ErrorsData>(`/errors${q(w)}`)
export const getErrorsRange = (from: string, to: string) => get<ErrorsRangeData>(`/errors/range?from=${enc(from)}&to=${enc(to)}`)
export const getErrorGroup = (fingerprint: string, w: WindowKey) => get<ErrorGroupData>(`/errors/${enc(fingerprint)}${q(w)}`)
