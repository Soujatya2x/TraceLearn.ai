'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    // Reconcile in case the persisted value differs from the default store value.
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
