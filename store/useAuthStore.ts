// ============================================================
// TraceLearn.ai — Auth Zustand Store
// ============================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  signInWithEmail,
  signUpWithEmail,
  getCurrentUser,
  signOut as signOutService,
  refreshAccessToken,
  tokenStorage,
} from '@/services/api/authService'
import { useAppStore } from '@/store/useAppStore'
import type {
  AuthStatus,
  SignInEmailRequest,
  SignUpEmailRequest,
  User,
} from '@/types/auth'

interface AuthState {
  user: User | null
  status: AuthStatus
  error: string | null
  initAuth: () => Promise<void>
  signInEmail: (payload: SignInEmailRequest) => Promise<void>
  signUpEmail: (payload: SignUpEmailRequest) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => void
  signOut: () => Promise<void>
  clearError: () => void
  setUser: (user: User | null) => void
}

function syncUserId(user: User | null) {
  useAppStore.getState().setUserId(user?.id ?? null)
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user:   null,
      status: 'idle',
      error:  null,

      initAuth: async () => {
        set({ status: 'loading' })

        // HIGH-3 FIX: We no longer check localStorage for a refresh token.
        // The refresh token lives in an httpOnly cookie — invisible to JS.
        // Strategy on page load:
        //   1. If we have a valid in-memory access token, fetch the user directly.
        //   2. Otherwise, attempt a silent refresh (browser sends cookie automatically).
        //      If the cookie is missing/expired, the backend returns 401 — we treat
        //      that as unauthenticated, which is the correct behaviour.
        //
        // This means on hard refresh (F5, new tab) the app briefly shows loading
        // while it attempts the silent refresh, then shows the authenticated state.
        // This is the standard behaviour for httpOnly cookie auth (same as GitHub, Notion, etc.)

        const hasAccessInMemory = Boolean(tokenStorage.getAccess())

        try {
          if (hasAccessInMemory && !tokenStorage.isExpired()) {
            // Fast path: access token still valid in memory — skip refresh round-trip
            const user = await getCurrentUser()
            syncUserId(user)
            set({ user, status: 'authenticated' })
          } else {
            // Slow path: no access token in memory (page refresh) or it's expired.
            // Attempt silent refresh — browser sends httpOnly cookie automatically.
            // If the cookie is absent or expired, refreshAccessToken() throws → catch below.
            await refreshAccessToken()
            const user = await getCurrentUser()
            syncUserId(user)
            set({ user, status: 'authenticated' })
          }
        } catch {
          // refreshAccessToken returned 401 (no cookie / expired cookie) OR
          // getCurrentUser failed. Either way: user is not authenticated.
          tokenStorage.clear() // clear in-memory access token if present
          syncUserId(null)
          set({ user: null, status: 'unauthenticated' })
        }
      },

      signInEmail: async (payload) => {
        set({ status: 'loading', error: null })
        try {
          const { user } = await signInWithEmail(payload)
          syncUserId(user)
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
          syncUserId(user)
          set({ user, status: 'authenticated', error: null })
        } catch (err: unknown) {
          const message = extractErrorMessage(err, 'Could not create account. Try again.')
          set({ status: 'unauthenticated', error: message })
          throw err
        }
      },

      signInWithOAuth: (provider) => {
        set({ status: 'loading', error: null })
        const backendBase =
          process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8080'
        window.location.href = `${backendBase}/oauth2/authorization/${provider}`
      },

      signOut: async () => {
        set({ status: 'loading' })
        try {
          await signOutService()
        } finally {
          syncUserId(null)
          set({ user: null, status: 'unauthenticated', error: null })
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => {
        syncUserId(user)
        set({ user, status: user ? 'authenticated' : 'unauthenticated' })
      },
    }),
    { name: 'TraceLearnAuthStore' },
  ),
)

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response
    return resp?.data?.message ?? fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}