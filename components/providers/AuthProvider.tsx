'use client'

// ============================================================
// TraceLearn.ai — AuthProvider
// Runs initAuth() once on mount so the auth store is populated
// before any page tries to read the current user.
// ============================================================

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}