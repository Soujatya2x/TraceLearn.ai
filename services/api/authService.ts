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

// ─── Token storage — access token in memory only ─────────────
//
// HIGH-3 FIX: The refresh token is no longer stored in JavaScript at all.
// The backend sets it as an httpOnly cookie on every signin/signup/refresh response.
// The browser sends it automatically on requests to /api/v1/auth/* — invisible to JS.
//
// Access token: module-level variable — survives navigation within the SPA,
//               lost on hard refresh (browser tab close, F5, direct URL).
//               On page load, initAuth() calls refreshAccessToken() which uses
//               the httpOnly cookie to silently re-issue a new access token.
//
// Why not sessionStorage for the access token?
//   sessionStorage is also XSS-readable. Memory is the safest option for access
//   tokens in a browser — the window being open is the only lifetime requirement.

let _accessToken: string | null = null
let _expiresAt: number = 0

const SS_TOKEN_KEY   = 'tl_access'
const SS_EXPIRES_KEY = 'tl_expires'

// Restore from sessionStorage on module load (survives Next.js client-side navigation)
if (typeof window !== 'undefined') {
  const t = sessionStorage.getItem(SS_TOKEN_KEY)
  const e = sessionStorage.getItem(SS_EXPIRES_KEY)
  if (t && e) {
    _accessToken = t
    _expiresAt   = Number(e)
  }
}

export const tokenStorage = {
  setAccess(accessToken: string, expiresAt: number) {
    _accessToken = accessToken
    _expiresAt   = expiresAt
    // Persist to sessionStorage so it survives Next.js page navigation.
    // sessionStorage is tab-scoped — cleared when the tab is closed.
    // This is safe for cross-origin setups where httpOnly cookies can't be used.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SS_TOKEN_KEY,   accessToken)
      sessionStorage.setItem(SS_EXPIRES_KEY, String(expiresAt))
    }
  },
  getAccess(): string | null {
    return _accessToken
  },
  getExpires(): number {
    return _expiresAt
  },
  clear() {
    _accessToken = null
    _expiresAt   = 0
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SS_TOKEN_KEY)
      sessionStorage.removeItem(SS_EXPIRES_KEY)
    }
    // Refresh token cookie is cleared server-side by POST /auth/signout.
  },
  isExpired(): boolean {
    return !_expiresAt || Date.now() >= _expiresAt - 60_000 // 60s buffer
  },
}

// ─── Email / password ─────────────────────────────────────────

export async function signInWithEmail(payload: SignInEmailRequest): Promise<AuthResponse> {
  // withCredentials=true is required so the browser accepts the httpOnly
  // Set-Cookie header for the refresh token on this cross-origin request.
  const res = await apiClient.post<ApiResponse<AuthResponse>>(
    AUTH_ENDPOINTS.SIGN_IN,
    payload,
    { withCredentials: true },
  )
  const auth = res.data.data
  // Backend no longer returns refreshToken in the body — it's in the httpOnly cookie.
  // We only store the access token in memory.
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
//             • redirects browser to: {FRONTEND}/auth/callback?token=<accessJWT>
//             • NOTE: refresh_token is NO LONGER in the query param (it's in the cookie)
//   Step 6  — /auth/callback reads access token only, calls getCurrentUser(), stores user

// ─── Token refresh ────────────────────────────────────────────
//
// No body payload needed — the browser automatically sends the httpOnly
// tl_refresh cookie with this request because the path is /api/v1/auth/*.
// The backend reads the cookie value and returns a new access token.
//
// withCredentials=true tells the browser to include cookies on this
// cross-origin request (frontend on :3000, backend on :8080 in dev).

export async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  const res = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    AUTH_ENDPOINTS.REFRESH,
    {},                        // empty body — token comes from the cookie
    { withCredentials: true }, // required to send the httpOnly cookie cross-origin
  )
  const { tokens } = res.data.data
  // Backend rotates the refresh cookie automatically — we only update access token.
  tokenStorage.setAccess(tokens.accessToken, tokens.expiresAt)
  return res.data.data
}

// ─── Current user ─────────────────────────────────────────────
//
// GET /auth/me returns AuthResponse.UserDto (not the full AuthResponse).
// Shape: { id, email, name, avatarUrl, provider, emailVerified, createdAt, updatedAt }
//
// Provider mapping: backend sends "local" | "google" | "github" (lowercase).
// Frontend AuthProvider type is 'email' | 'google' | 'github'.
// We map "local" → "email" here so the rest of the app never sees "local".

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
    // withCredentials=true so the browser sends the refresh cookie —
    // the backend expires it (MaxAge=0) to prevent future use.
    await apiClient.post(AUTH_ENDPOINTS.SIGN_OUT, {}, { withCredentials: true })
  } finally {
    // Clear the in-memory access token regardless of whether the
    // backend call succeeded. The httpOnly cookie is cleared server-side.
    tokenStorage.clear()
  }
}