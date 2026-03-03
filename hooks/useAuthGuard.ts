'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

interface UseAuthGuardOptions {
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
    isAuthenticated: !AUTH_ENABLED || status === 'authenticated',
    isLoading: AUTH_ENABLED && status === 'loading',
    user,
  }
}