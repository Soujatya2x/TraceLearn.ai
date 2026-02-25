'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Code2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  FolderOpen,
  Map,
  Sun,
  Moon,
  User,
  Bell,
  Menu,
  X,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { StatusBadge } from '@/components/ui/StatusBadge'

// ─── Nav item definitions ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'workspace',   label: 'Editor',      href: '/',            icon: Code2 },
  { id: 'explanation', label: 'Explanation',  href: '/explanation', icon: AlertCircle },
  { id: 'validation',  label: 'Validation',   href: '/validation',  icon: CheckCircle2 },
  { id: 'chat',        label: 'AI Chat',      href: '/chat',        icon: MessageSquare },
  { id: 'artifacts',   label: 'Artifacts',    href: '/artifacts',   icon: FolderOpen },
  { id: 'roadmap',     label: 'Roadmap',      href: '/roadmap',     icon: Map },
]

// ─── Ripple component ─────────────────────────────────────────────────────────

function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className="absolute rounded-full bg-primary-foreground/25 pointer-events-none"
      style={{ left: x, top: y, translateX: '-50%', translateY: '-50%' }}
      initial={{ width: 0, height: 0, opacity: 0.7 }}
      animate={{ width: 56, height: 56, opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    />
  )
}

// ─── Single desktop nav item ──────────────────────────────────────────────────

function NavItem({
  item,
  isActive,
  onNavigate,
}: {
  item: typeof NAV_ITEMS[number]
  isActive: boolean
  onNavigate: () => void
}) {
  const Icon = item.icon
  const prefersReducedMotion = useReducedMotion()
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const rippleId = useRef(0)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleId.current
    setRipples((r) => [...r, { id, x, y }])
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 500)
    onNavigate()
  }

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      onClick={handleClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
        'whitespace-nowrap select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        'overflow-hidden',
        isActive ? 'text-primary-foreground' : 'text-muted-foreground',
      )}
    >
      {/* ── Shared animated active pill ── */}
      {isActive && (
        <motion.span
          layoutId="activeNavPill"
          className="absolute inset-0 bg-primary rounded-md shadow-sm"
          transition={{
            type: 'spring',
            stiffness: prefersReducedMotion ? 1000 : 360,
            damping: prefersReducedMotion ? 100 : 28,
            mass: 0.9,
          }}
        />
      )}

      {/* ── Hover highlight (inactive only) ── */}
      {!isActive && (
        <motion.span
          className="absolute inset-0 rounded-md"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1, backgroundColor: 'hsl(var(--background) / 0.7)' }}
          transition={{ duration: 0.12 }}
        />
      )}

      {/* ── Ripple on click ── */}
      {ripples.map((rp) => (
        <Ripple key={rp.id} x={rp.x} y={rp.y} />
      ))}

      {/* ── Icon: bounces up when tab becomes active ── */}
      <motion.span
        className="relative z-10 flex-shrink-0"
        animate={
          isActive && !prefersReducedMotion
            ? { y: [0, -4, 1, 0], scale: [1, 1.25, 0.9, 1] }
            : { y: 0, scale: 1 }
        }
        transition={
          isActive
            ? { duration: 0.38, ease: [0.16, 1, 0.3, 1], times: [0, 0.35, 0.7, 1] }
            : { duration: 0.2 }
        }
      >
        <Icon className="w-3.5 h-3.5" />
      </motion.span>

      {/* ── Label: rises from below when tab becomes active ── */}
      <motion.span
        className="relative z-10"
        animate={
          isActive && !prefersReducedMotion
            ? { y: [5, 0], opacity: [0.5, 1] }
            : { y: 0, opacity: 1 }
        }
        transition={
          isActive
            ? { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
            : { duration: 0.15 }
        }
      >
        {item.label}
      </motion.span>

      {/* ── Active underline glow ── */}
      {isActive && !prefersReducedMotion && (
        <motion.span
          className="absolute bottom-[3px] left-1/2 h-[2px] bg-primary-foreground/35 rounded-full"
          style={{ translateX: '-50%' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '55%', opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.28, ease: 'easeOut' }}
        />
      )}
    </Link>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname()
  const { theme, toggleTheme, analysisStatus } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4 md:px-6 max-w-[1400px] mx-auto">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-2 flex-shrink-0"
          aria-label="TraceLearn.ai home"
        >
          <motion.div
            className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 shadow-sm"
            whileHover={{ scale: 1.1, rotate: -8 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            <img
              src="/apple-icon.png"
              alt="TraceLearn.ai"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </motion.div>
          <motion.span
            className="font-semibold text-sm text-foreground hidden sm:block tracking-tight"
            whileHover={{ x: 1.5 }}
            transition={{ duration: 0.15 }}
          >
            TraceLearn<span className="text-primary">.ai</span>
          </motion.span>
        </Link>

        {/* ── Nav tabs — desktop ───────────────────────────── */}
        <nav
          className="hidden md:flex items-center gap-0.5 bg-muted/60 rounded-lg p-1"
          aria-label="Main navigation"
          role="navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <NavItem
                key={item.id}
                item={item}
                isActive={isActive}
                onNavigate={() => {}}
              />
            )
          })}
        </nav>

        {/* ── Right controls ──────────────────────────────── */}
        <div className="flex items-center gap-1">

          {/* Analysis status badge */}
          <AnimatePresence>
            {analysisStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.75, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.75, x: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                className="mr-1 hidden sm:block"
              >
                <StatusBadge status={analysisStatus} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification bell */}
          <motion.button
            aria-label="Notifications"
            whileHover={{ scale: 1.12, y: -1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4" />
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            whileHover={{ scale: 1.12, rotate: 20 }}
            whileTap={{ scale: 0.88, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.4 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Sun className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0, scale: 0.4 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Moon className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* User avatar */}
          <motion.button
            aria-label="User profile"
            whileHover={{ scale: 1.12, y: -1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors ml-1"
          >
            <User className="w-4 h-4" />
          </motion.button>

          {/* Mobile menu toggle */}
          <motion.button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <X className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Menu className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* ── Mobile nav drawer ────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden border-t border-border bg-background"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col p-3 gap-1">
              {NAV_ITEMS.map((item, i) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: i * 0.04,
                      duration: 0.26,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <motion.span
                        animate={isActive ? { scale: [1, 1.22, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </motion.span>
                      {item.label}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}