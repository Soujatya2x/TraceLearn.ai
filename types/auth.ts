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
  refreshToken: string
  /** Unix timestamp (ms) */
  expiresAt: number
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

export interface OAuthCallbackRequest {
  /** The `code` query param returned by the OAuth provider */
  code: string
  /** The `state` param for CSRF validation */
  state: string
  /** Only OAuth providers — email has no callback flow */
  provider: 'google' | 'github'
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface RefreshTokenRequest {
  refreshToken: string
}

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

// ─── OAuth provider URLs returned by backend ──────────────────

export interface OAuthUrlResponse {
  url: string
  state: string
}