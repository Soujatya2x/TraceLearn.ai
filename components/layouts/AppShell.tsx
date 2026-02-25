'use client'

import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

interface AppShellProps {
  children: React.ReactNode
  activeNav?: string
}

export function AppShell({ children }: AppShellProps) {
  return (
    /*
     * Outer wrapper scrolls the full page.
     * The Navbar is sticky/fixed at the top (h-14 = 56px).
     * The inner content area uses calc(100vh - 56px) so it fills exactly the
     * remaining viewport — Monaco and the context panel get a resolved px
     * height, not a percentage that collapses when the Footer is in the flow.
     * The Footer sits below in normal flow, revealed by scrolling.
     */
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main
        className="flex flex-col"
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        {children}
      </main>

      <Footer />
    </div>
  )
}
