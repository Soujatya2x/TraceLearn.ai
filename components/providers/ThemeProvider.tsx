'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/**
 * ThemeProvider — keeps the `dark` class on <html> in sync with the Zustand
 * store after the initial blocking script has already set the correct class.
 * The `transition-colors` on <body> (set in layout.tsx) ensures any
 * subsequent toggle is smooth with no flash.
 */
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
