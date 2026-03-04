// ============================================================
// TraceLearn.ai — Auth Type Definitions
// ============================================================

// ─── User ────────────────────────────────────────────────────

export type AuthProvider = 'google' | 'github' | 'email'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: AuthProvider
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

// ─── Auth State ───────────────────────────────────────────────

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthTokens {
  accessToken: string
  /**
   * Refresh token is intentionally absent from this type.
   *
   * HIGH-3 FIX: The refresh token is stored in an httpOnly cookie set by the
   * backend — it never appears in API response bodies or JavaScript variables.
   * Removing it from this type prevents any future code from accidentally
   * reading or storing it.
   */
  expiresAt: number
  tokenType?: string
}

// ─── Request / Response shapes ────────────────────────────────

export interface SignInEmailRequest {
  email: string
  password: string
}

export interface SignUpEmailRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

/**
 * RefreshTokenRequest removed.
 *
 * HIGH-3 FIX: The /refresh endpoint no longer accepts a token in the request
 * body. It reads the refresh token from the httpOnly cookie automatically.
 * The frontend sends an empty POST body — the browser handles the cookie.
 */

export interface RefreshTokenResponse {
  tokens: AuthTokens
}

// ─── Form validation ──────────────────────────────────────────

export interface SignInFormValues {
  email: string
  password: string
}

export interface SignUpFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}