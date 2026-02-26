'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

const NO_FOOTER_PATHS = ['/chat']

interface AppShellProps {
  children: React.ReactNode
  activeNav?: string
}

export function AppShell({ children }: AppShellProps) {
  const pathname   = usePathname()
  const showFooter = !NO_FOOTER_PATHS.includes(pathname)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main
        className="flex flex-col"
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  )
}