// ============================================================
// TraceLearn.ai — Auth Service
// ============================================================

import apiClient from './client'
import { AUTH_ENDPOINTS } from './auth.endpoints'
import type {
  AuthProvider,
  AuthResponse,
  RefreshTokenResponse,
  SignInEmailRequest,
  SignUpEmailRequest,
  User,
} from '@/types/auth'
import type { ApiResponse } from '@/types'

// ─── Token storage — access token in localStorage ────────────
//
// We use localStorage (not sessionStorage) so the token survives
// tab close and reopen. Since the backend refresh cookie is cross-domain
// (hopto.org → vercel.app) and blocked by browsers, localStorage is the
// only way to keep the user logged in across tabs/sessions.
//
// Security note: localStorage is XSS-readable, same as sessionStorage.
// The risk is the same — but the UX improvement (no re-login on every tab
// open) is critical for a production app.

let _accessToken: string | null = null
let _expiresAt: number = 0

const LS_TOKEN_KEY   = 'tl_access'
const LS_EXPIRES_KEY = 'tl_expires'

// Restore from localStorage on module load
if (typeof window !== 'undefined') {
  const t = localStorage.getItem(LS_TOKEN_KEY)
  const e = localStorage.getItem(LS_EXPIRES_KEY)
  if (t && e) {
    _accessToken = t
    _expiresAt   = Number(e)
  }
}

export const tokenStorage = {
  setAccess(accessToken: string, expiresAt: number) {
    _accessToken = accessToken
    _expiresAt   = expiresAt
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_TOKEN_KEY,   accessToken)
      localStorage.setItem(LS_EXPIRES_KEY, String(expiresAt))
    }
  },
  getAccess(): string | null {
    // Re-read from localStorage in case another tab updated it
    if (typeof window !== 'undefined' && !_accessToken) {
      const t = localStorage.getItem(LS_TOKEN_KEY)
      const e = localStorage.getItem(LS_EXPIRES_KEY)
      if (t && e) {
        _accessToken = t
        _expiresAt   = Number(e)
      }
    }
    return _accessToken
  },
  getExpires(): number {
    return _expiresAt
  },
  clear() {
    _accessToken = null
    _expiresAt   = 0
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_TOKEN_KEY)
      localStorage.removeItem(LS_EXPIRES_KEY)
    }
    // Refresh token cookie is cleared server-side by POST /auth/signout.
  },
  isExpired(): boolean {
    return !_expiresAt || Date.now() >= _expiresAt - 60_000 // 60s buffer
  },
}

// ─── Email / password ─────────────────────────────────────────

export async function signInWithEmail(payload: SignInEmailRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(
    AUTH_ENDPOINTS.SIGN_IN,
    payload,
    { withCredentials: true },
  )
  const auth = res.data.data
  tokenStorage.setAccess(auth.tokens.accessToken, auth.tokens.expiresAt)
  return auth
}

export async function signUpWithEmail(payload: SignUpEmailRequest): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>(
    AUTH_ENDPOINTS.SIGN_UP,
    payload,
    { withCredentials: true },
  )
  const auth = res.data.data
  tokenStorage.setAccess(auth.tokens.accessToken, auth.tokens.expiresAt)
  return auth
}

// ─── OAuth ────────────────────────────────────────────────────
//
// Spring Security handles the ENTIRE OAuth2 flow internally.
// No API call needed here — see useAuthStore.signInWithOAuth.
//
//   Step 1  — Browser navigates to: {BACKEND}/oauth2/authorization/{provider}
//   Step 2  — Spring redirects user to Google/GitHub consent screen
//   Step 3  — Provider redirects to: {BACKEND}/api/v1/auth/oauth2/callback/{provider}
//   Step 4  — Spring calls CustomOAuth2UserService (upserts user in DB)
//   Step 5  — Spring calls OAuth2AuthenticationSuccessHandler which:
//             • sets httpOnly refresh token cookie on the response
//             • redirects browser to: {FRONTEND}/auth/callback#token=<accessJWT>
//   Step 6  — /auth/callback reads access token, calls getCurrentUser(), stores user

// ─── Token refresh ────────────────────────────────────────────

export async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  // If we already have a valid non-expired token in localStorage, skip refresh.
  // The refresh cookie is cross-domain (hopto.org → vercel.app) and blocked
  // by browsers — calling refresh without a cookie always returns 400.
  if (tokenStorage.getAccess() && !tokenStorage.isExpired()) {
    return { tokens: { accessToken: tokenStorage.getAccess()!, expiresAt: tokenStorage.getExpires() } }
  }

  const res = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    AUTH_ENDPOINTS.REFRESH,
    {},
    { withCredentials: true },
  )
  const { tokens } = res.data.data
  tokenStorage.setAccess(tokens.accessToken, tokens.expiresAt)
  return res.data.data
}

// ─── Current user ─────────────────────────────────────────────

interface UserDto {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export async function getCurrentUser(): Promise<User> {
  const res = await apiClient.get<ApiResponse<UserDto>>(AUTH_ENDPOINTS.ME)
  const dto = res.data.data
  return {
    ...dto,
    provider: (dto.provider === 'local' ? 'email' : dto.provider) as AuthProvider,
  }
}

// ─── Sign out ─────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    await apiClient.post(AUTH_ENDPOINTS.SIGN_OUT, {}, { withCredentials: true })
  } finally {
    tokenStorage.clear()
  }
}