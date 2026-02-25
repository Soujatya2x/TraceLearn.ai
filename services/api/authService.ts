// ============================================================
// TraceLearn.ai — Auth Service
// All backend calls go through the shared Axios client so the
// auth token interceptor (services/api/client.ts) handles
// Authorization headers automatically.
// ============================================================

import apiClient from './client'
import { AUTH_ENDPOINTS } from './auth.endpoints'
import type {
  AuthResponse,
  OAuthCallbackRequest,
  OAuthUrlResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignInEmailRequest,
  SignUpEmailRequest,
  User,
} from '@/types/auth'
import type { ApiResponse } from '@/types'

// ─── Token helpers (localStorage keys) ───────────────────────
// These match the key already referenced in client.ts so the
// Axios interceptor picks up the access token automatically.

const KEYS = {
  ACCESS:  'tl_auth_token',
  REFRESH: 'tl_refresh_token',
  EXPIRES: 'tl_token_expires',
} as const

export const tokenStorage = {
  set(accessToken: string, refreshToken: string, expiresAt: number) {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEYS.ACCESS,  accessToken)
    localStorage.setItem(KEYS.REFRESH, refreshToken)
    localStorage.setItem(KEYS.EXPIRES, String(expiresAt))
  },
  getAccess():  string | null { return typeof window !== 'undefined' ? localStorage.getItem(KEYS.ACCESS)  : null },
  getRefresh(): string | null { return typeof window !== 'undefined' ? localStorage.getItem(KEYS.REFRESH) : null },
  getExpires(): number { return Number(typeof window !== 'undefined' ? localStorage.getItem(KEYS.EXPIRES) : 0) },
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(KEYS.ACCESS)
    localStorage.removeItem(KEYS.REFRESH)
    localStorage.removeItem(KEYS.EXPIRES)
  },
  isExpired(): boolean {
    const exp = tokenStorage.getExpires()
    return !exp || Date.now() >= exp - 60_000 // 60s buffer
  },
}

// ─── Email / password ─────────────────────────────────────────

export async function signInWithEmail(payload: SignInEmailRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.SIGN_IN, payload)
  const auth = res.data.data
  tokenStorage.set(auth.tokens.accessToken, auth.tokens.refreshToken, auth.tokens.expiresAt)
  return auth
}

export async function signUpWithEmail(payload: SignUpEmailRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.SIGN_UP, payload)
  const auth = res.data.data
  tokenStorage.set(auth.tokens.accessToken, auth.tokens.refreshToken, auth.tokens.expiresAt)
  return auth
}

// ─── OAuth ────────────────────────────────────────────────────

/**
 * Step 1 — ask the backend for the provider redirect URL.
 * Frontend then does `window.location.href = url` to start the OAuth flow.
 */
export async function getOAuthUrl(
  provider: 'google' | 'github',
): Promise<OAuthUrlResponse> {
  const res = await apiClient.get<ApiResponse<OAuthUrlResponse>>(
    AUTH_ENDPOINTS.OAUTH_URL(provider),
  )
  return res.data.data
}

/**
 * Step 2 — called from /auth/callback after the provider redirects back.
 * Exchanges `code` + `state` for tokens.
 */
export async function handleOAuthCallback(
  payload: OAuthCallbackRequest,
): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(
    AUTH_ENDPOINTS.OAUTH_CALLBACK(payload.provider),
    { code: payload.code, state: payload.state },
  )
  const auth = res.data.data
  tokenStorage.set(auth.tokens.accessToken, auth.tokens.refreshToken, auth.tokens.expiresAt)
  return auth
}

// ─── Token refresh ────────────────────────────────────────────

export async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) throw new Error('No refresh token available')

  const payload: RefreshTokenRequest = { refreshToken }
  const res = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    AUTH_ENDPOINTS.REFRESH,
    payload,
  )
  const { tokens } = res.data.data
  tokenStorage.set(tokens.accessToken, tokens.refreshToken, tokens.expiresAt)
  return res.data.data
}

// ─── Current user ─────────────────────────────────────────────

export async function getCurrentUser(): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>(AUTH_ENDPOINTS.ME)
  return res.data.data
}

// ─── Sign out ─────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    await apiClient.post(AUTH_ENDPOINTS.SIGN_OUT)
  } finally {
    // Always clear local state even if the request fails
    tokenStorage.clear()
  }
}