'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Settings, User, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

const BREADCRUMB_MAP: Record<string, string> = {
  '/': 'Workspace',
  '/explanation': 'Error Explanation',
  '/validation': 'Validation',
  '/chat': 'AI Chat',
  '/artifacts': 'Artifacts',
  '/roadmap': 'Learning Roadmap',
}

export function TopBar() {
  const pathname = usePathname()
  const sessionId = useAppStore((s) => s.currentSessionId)
  const analysisStatus = useAppStore((s) => s.analysisStatus)

  const currentPage = BREADCRUMB_MAP[pathname] ?? 'TraceLearn.ai'

  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          TraceLearn.ai
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-foreground font-medium">{currentPage}</span>

        {sessionId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-muted-foreground font-mono text-xs">
              {sessionId.slice(0, 12)}...
            </span>
          </>
        )}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Analysis status */}
        <AnimatePresence>
          {analysisStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <StatusBadge status={analysisStatus} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Icon buttons */}
        <button
          aria-label="Notifications"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          aria-label="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <button
          aria-label="User profile"
          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
