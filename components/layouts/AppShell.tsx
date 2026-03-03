'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'
import { useAuthGuard } from '@/hooks/useAuthGuard'

const NO_FOOTER_PATHS = ['/chat']

interface AppShellProps {
  children: React.ReactNode
  activeNav?: string
}

export function AppShell({ children }: AppShellProps) {
  const pathname   = usePathname()
  const showFooter = !NO_FOOTER_PATHS.includes(pathname)

  // Redirects to /auth/sign-in if not authenticated (when AUTH_ENABLED=true)
  const { isLoading } = useAuthGuard()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}