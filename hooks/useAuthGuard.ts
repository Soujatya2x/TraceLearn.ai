'use client'

// ============================================================
// TraceLearn.ai — useAuthGuard hook
//
// HOW TO ACTIVATE when your backend is ready:
//   1. Set NEXT_PUBLIC_AUTH_ENABLED=true in .env.local
//   2. Call this hook at the top of any page that requires auth.
//      It will redirect to /auth/sign-in if the user is not
//      authenticated.
//
// Right now AUTH_ENABLED=false so every page is accessible
// without signing in — perfect for development.
// ============================================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

interface UseAuthGuardOptions {
  /** Where to send unauthenticated users. Defaults to /auth/sign-in */
  redirectTo?: string
}

export function useAuthGuard({ redirectTo = '/auth/sign-in' }: UseAuthGuardOptions = {}) {
  const router = useRouter()
  const { status, user } = useAuthStore()

  useEffect(() => {
    if (!AUTH_ENABLED) return
    if (status === 'unauthenticated') {
      router.replace(`${redirectTo}?next=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [status, router, redirectTo])

  return {
    /** True when auth is enforced AND user is confirmed authenticated */
    isAuthenticated: !AUTH_ENABLED || status === 'authenticated',
    isLoading: AUTH_ENABLED && status === 'loading',
    user,
  }
}