'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Code2, AlertCircle, CheckCircle2, MessageSquare,
  FolderOpen, Map, Sun, Moon, User, Bell, Menu, X, Loader2,
} from 'lucide-react'
import { useState, useRef, useCallback, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { StatusBadge } from '@/components/ui/StatusBadge'


const NAV_ITEMS = [
  { id: 'workspace',   label: 'Editor',      href: '/',            icon: Code2         },
  { id: 'explanation', label: 'Explanation',  href: '/explanation', icon: AlertCircle   },
  { id: 'validation',  label: 'Validation',   href: '/validation',  icon: CheckCircle2  },
  { id: 'chat',        label: 'AI Chat',      href: '/chat',        icon: MessageSquare },
  { id: 'artifacts',   label: 'Artifacts',    href: '/artifacts',   icon: FolderOpen    },
  { id: 'roadmap',     label: 'Roadmap',      href: '/roadmap',     icon: Map           },
] as const


function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className="absolute rounded-full bg-primary-foreground/20 pointer-events-none"
      style={{ left: x, top: y, translateX: '-50%', translateY: '-50%' }}
      initial={{ width: 0, height: 0, opacity: 0.6 }}
      animate={{ width: 60, height: 60, opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    />
  )
}


function NavItem({
  item, isActive, isNavigatingTo, onHover, onClick,
}: {
  item: typeof NAV_ITEMS[number]
  isActive: boolean
  isNavigatingTo: boolean
  onHover: (href: string) => void
  onClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  const Icon = item.icon
  const prefersReducedMotion = useReducedMotion()
  const [hovered, setHovered]   = useState(false)
  const [ripples, setRipples]   = useState<{ id: number; x: number; y: number }[]>([])
  const rippleId = useRef(0)

  const handleMouseEnter = () => { setHovered(true); onHover(item.href) }
  const handleMouseLeave = () => setHovered(false)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id   = ++rippleId.current
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 500)
    onClick(e, item.href)
  }

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => onHover(item.href)}
      onClick={handleClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
        'whitespace-nowrap select-none overflow-hidden',
        'outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        'transition-colors duration-100',
        isActive
          ? 'text-primary-foreground'
          : hovered
          ? 'text-yellow-700 hover:text-yellow-700'
          : 'text-muted-foreground',
      )}
    >
      {isActive && (
        <motion.span
          layoutId="activeNavPill"
          className="absolute inset-0 bg-primary rounded-md shadow-sm"
          transition={{
            type: 'spring',
            stiffness: prefersReducedMotion ? 1000 : 380,
            damping:   prefersReducedMotion ? 100  : 30,
            mass: 0.85,
          }}
        />
      )}

      {/* ── Hover fill ── */}
      {!isActive && (
        <motion.span
          className="absolute inset-0 rounded-md"
          initial={false}
          animate={hovered
            ? { opacity: 1, backgroundColor: 'hsl(var(--primary) / 0.12)' }
            : { opacity: 0, backgroundColor: 'hsl(var(--primary) / 0.12)' }
          }
          transition={{ duration: 0.13, ease: 'easeOut' }}
        />
      )}

      {/* ── Navigation loading overlay ── */}
      <AnimatePresence>
        {isNavigatingTo && !isActive && (
          <motion.span
            className="absolute inset-0 rounded-md bg-primary/12 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Loader2 className="w-3 h-3 text-primary animate-spin" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>

      {/* ── Ripples ── */}
      {ripples.map((rp) => <Ripple key={rp.id} x={rp.x} y={rp.y} />)}

      {/* ── Icon ── */}
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

      {/* ── Label ── */}
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
  const router   = useRouter()
  const { theme, toggleTheme, analysisStatus } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  // ── Navigation state ─────────────────────────────────────
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  // ── Prefetch on hover — deduplicated ──────────────────────
  // router.prefetch() downloads the JS bundle for that route
  // in the background so clicking feels instant.
  const prefetched = useRef(new Set<string>())
  const handleHover = useCallback((href: string) => {
    if (prefetched.current.has(href)) return
    prefetched.current.add(href)
    router.prefetch(href)
  }, [router])

  // ── Programmatic navigation with transition ───────────────
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href === pathname) return   // already on this page
      e.preventDefault()
      setNavigatingTo(href)
      startTransition(() => {
        router.push(href)
      })
    },
    [pathname, router],
  )

  // Clear navigating indicator once the new page is active
  if (navigatingTo && pathname === navigatingTo) {
    setNavigatingTo(null)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">

      {/* ── Top progress bar — shown while navigating ─────── */}
      <AnimatePresence>
        {(isPending || navigatingTo) && (
          <motion.div
            key="nav-bar"
            className="absolute top-0 left-0 right-0 h-[2px] bg-primary origin-left z-50 pointer-events-none"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.82 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{
              scaleX: { duration: 1.4, ease: 'easeOut' },
              opacity: { duration: 0.25, delay: 0.05 },
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between h-14 px-4 md:px-6 max-w-[1400px] mx-auto">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="TraceLearn.ai home">
          <motion.div
            className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 shadow-sm"
            whileHover={{ scale: 1.1, rotate: -8 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            <img src="/apple-icon.png" alt="TraceLearn.ai" className="w-full h-full object-cover" draggable={false} />
          </motion.div>
          <motion.span
            className="font-semibold text-sm text-foreground hidden sm:block tracking-tight"
            whileHover={{ x: 1.5 }}
            transition={{ duration: 0.15 }}
          >
            TraceLearn<span className="text-primary">.ai</span>
          </motion.span>
        </Link>

        {/* ── Desktop nav ──────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-0.5 bg-muted/60 rounded-lg p-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <NavItem
                key={item.id}
                item={item}
                isActive={isActive}
                isNavigatingTo={navigatingTo === item.href}
                onHover={handleHover}
                onClick={handleNavClick}
              />
            )
          })}
        </nav>

        {/* ── Right controls ──────────────────────────────── */}
        <div className="flex items-center gap-1">
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

          <motion.button type="button" aria-label="Notifications"
            whileHover={{ scale: 1.12, y: -1 }} whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4" />
          </motion.button>

          <motion.button type="button" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            whileHover={{ scale: 1.12, rotate: 20 }} whileTap={{ scale: 0.88, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.div key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.4 }} animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.4 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                ><Sun className="w-4 h-4" /></motion.div>
              ) : (
                <motion.div key="moon"
                  initial={{ rotate: 90, opacity: 0, scale: 0.4 }} animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.4 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                ><Moon className="w-4 h-4" /></motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button type="button" aria-label="User profile"
            whileHover={{ scale: 1.12, y: -1 }} whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors ml-1"
          >
            <User className="w-4 h-4" />
          </motion.button>

          <motion.button type="button" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.div key="close"
                  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}
                ><X className="w-4 h-4" /></motion.div>
              ) : (
                <motion.div key="menu"
                  initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}
                ><Menu className="w-4 h-4" /></motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* ── Mobile nav drawer ────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav key="mobile-nav"
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
                const isNavigatingTo = navigatingTo === item.href
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={item.href}
                      onMouseEnter={() => handleHover(item.href)}
                      onClick={(e) => { setMobileOpen(false); handleNavClick(e, item.href) }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {isNavigatingTo && !isActive
                        ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-primary" />
                        : (
                          <motion.span
                            animate={isActive ? { scale: [1, 1.22, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                          </motion.span>
                        )
                      }
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