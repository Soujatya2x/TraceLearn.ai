// ============================================================
// TraceLearn.ai — Auth Zustand Store
// Handles user state, loading, and auth actions.
// Token persistence is handled by tokenStorage in authService.
// ============================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  signInWithEmail,
  signUpWithEmail,
  getOAuthUrl,
  getCurrentUser,
  signOut as signOutService,
  refreshAccessToken,
  tokenStorage,
} from '@/services/api/authService'
import type {
  AuthStatus,
  SignInEmailRequest,
  SignUpEmailRequest,
  User,
} from '@/types/auth'

// ─── State shape ─────────────────────────────────────────────

interface AuthState {
  user: User | null
  status: AuthStatus
  error: string | null

  // Actions
  initAuth: () => Promise<void>
  signInEmail: (payload: SignInEmailRequest) => Promise<void>
  signUpEmail: (payload: SignUpEmailRequest) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  setUser: (user: User | null) => void
}

// ─── Store ───────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user:   null,
      status: 'idle',
      error:  null,

      /**
       * Called once on app mount (in AuthProvider).
       * If a valid access token exists, fetches the current user.
       * If the token is expired but a refresh token exists, silently refreshes first.
       */
      initAuth: async () => {
        set({ status: 'loading' })

        const hasAccess  = Boolean(tokenStorage.getAccess())
        const hasRefresh = Boolean(tokenStorage.getRefresh())

        if (!hasAccess && !hasRefresh) {
          set({ status: 'unauthenticated', user: null })
          return
        }

        try {
          // Refresh if expired
          if (tokenStorage.isExpired() && hasRefresh) {
            await refreshAccessToken()
          }
          const user = await getCurrentUser()
          set({ user, status: 'authenticated' })
        } catch {
          tokenStorage.clear()
          set({ user: null, status: 'unauthenticated' })
        }
      },

      signInEmail: async (payload) => {
        set({ status: 'loading', error: null })
        try {
          const { user } = await signInWithEmail(payload)
          set({ user, status: 'authenticated', error: null })
        } catch (err: unknown) {
          const message = extractErrorMessage(err, 'Invalid email or password.')
          set({ status: 'unauthenticated', error: message })
          throw err
        }
      },

      signUpEmail: async (payload) => {
        set({ status: 'loading', error: null })
        try {
          const { user } = await signUpWithEmail(payload)
          set({ user, status: 'authenticated', error: null })
        } catch (err: unknown) {
          const message = extractErrorMessage(err, 'Could not create account. Try again.')
          set({ status: 'unauthenticated', error: message })
          throw err
        }
      },

      /**
       * Redirects to the OAuth provider URL obtained from the backend.
       * After OAuth, the provider redirects to /auth/callback which
       * calls handleOAuthCallback and then redirects to /.
       */
      signInWithOAuth: async (provider) => {
        set({ status: 'loading', error: null })
        try {
          const { url } = await getOAuthUrl(provider)
          window.location.href = url
          // status stays 'loading' while the redirect happens
        } catch (err: unknown) {
          const message = extractErrorMessage(err, `Could not connect to ${provider}.`)
          set({ status: 'unauthenticated', error: message })
          throw err
        }
      },

      signOut: async () => {
        set({ status: 'loading' })
        try {
          await signOutService()
        } finally {
          set({ user: null, status: 'unauthenticated', error: null })
        }
      },

      clearError: () => set({ error: null }),
      setUser:    (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
    }),
    { name: 'TraceLearnAuthStore' },
  ),
)

// ─── Helpers ─────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response
    return resp?.data?.message ?? fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}