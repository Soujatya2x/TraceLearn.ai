'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  FolderOpen,
  Map,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { sidebarItem } from '@/animations/variants'

const NAV_ITEMS = [
  {
    id: 'workspace',
    label: 'Workspace',
    href: '/',
    icon: Code2,
    description: 'Code editor & analysis',
  },
  {
    id: 'explanation',
    label: 'Explanation',
    href: '/explanation',
    icon: AlertCircle,
    description: 'Error breakdown',
  },
  {
    id: 'validation',
    label: 'Validation',
    href: '/validation',
    icon: CheckCircle2,
    description: 'Fix comparison',
  },
  {
    id: 'chat',
    label: 'AI Chat',
    href: '/chat',
    icon: MessageSquare,
    description: 'Session chat',
  },
  {
    id: 'artifacts',
    label: 'Artifacts',
    href: '/artifacts',
    icon: FolderOpen,
    description: 'Generated files',
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    href: '/roadmap',
    icon: Map,
    description: 'Learning journey',
  },
]

interface SidebarProps {
  activeNav: string
}

export function Sidebar({ activeNav }: SidebarProps) {
  const pathname = usePathname()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const sessionId = useAppStore((s) => s.currentSessionId)

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 220 : 64 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden flex-shrink-0"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border h-16 flex-shrink-0">
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="text-sidebar-foreground font-semibold text-sm whitespace-nowrap tracking-tight">
                TraceLearn
                <span className="text-primary">.ai</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-1" role="navigation">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <motion.div
              key={item.id}
              variants={sidebarItem}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={item.href}
                title={!sidebarOpen ? item.label : undefined}
                aria-label={item.label}
                className={cn(
                  'flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-all duration-150 group relative',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
                  />
                )}

                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80',
                  )}
                />

                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Session pill */}
      <AnimatePresence>
        {sessionId && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-2 mb-3 px-3 py-2 bg-brand-muted/20 rounded-lg border border-primary/20"
          >
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider font-medium">
              Active Session
            </p>
            <p className="text-xs text-primary font-mono truncate mt-0.5">
              {sessionId}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground/80 transition-colors"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  )
}
