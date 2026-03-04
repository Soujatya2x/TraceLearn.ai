// ============================================================
// TraceLearn.ai — Auth API Endpoint Constants
// ============================================================
//
// OAuth2 flow:
//   1. Browser navigates to: ${BACKEND}/oauth2/authorization/{provider}
//      (Spring Security's built-in authorization entry point)
//   2. Spring redirects user to Google/GitHub
//   3. Provider redirects to backend's registered redirect URI
//      ({baseUrl}/api/v1/auth/oauth2/callback/{registrationId})
//   4. Spring exchanges code for tokens, calls CustomOAuth2UserService,
//      then calls OAuth2AuthenticationSuccessHandler
//   5. Handler redirects browser to: ${FRONTEND}/auth/callback?token=...&refresh_token=...
//   6. /auth/callback page reads tokens from query params, stores them,
//      calls GET /auth/me, then redirects to the app
//
// No custom OAuth endpoint is needed on the backend — Spring handles it all.

export const AUTH_ENDPOINTS = {
  // Email / password
  SIGN_IN:  '/auth/signin',
  SIGN_UP:  '/auth/signup',
  SIGN_OUT: '/auth/signout',

  // Token lifecycle
  REFRESH: '/auth/refresh',
  ME:      '/auth/me',
  // OAUTH_URL:      (provider: 'google' | 'github') => `/auth/${provider}/url`,
  // OAUTH_CALLBACK: (provider: 'google' | 'github') => `/auth/${provider}/callback`,
} as const