// ============================================================
// TraceLearn.ai — Auth Endpoint Definitions
// ============================================================

export const AUTH_ENDPOINTS = {
  // Email / password
  SIGN_IN:  '/auth/sign-in',
  SIGN_UP:  '/auth/sign-up',
  SIGN_OUT: '/auth/sign-out',

  // Token lifecycle
  REFRESH: '/auth/refresh',
  ME:      '/auth/me',

  // OAuth — backend returns the provider redirect URL
  OAUTH_URL:      (provider: 'google' | 'github') => `/auth/${provider}/url`,
  OAUTH_CALLBACK: (provider: 'google' | 'github') => `/auth/${provider}/callback`,
} as const