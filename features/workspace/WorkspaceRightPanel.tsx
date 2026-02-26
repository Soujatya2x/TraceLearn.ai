'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Activity, Sparkles, CheckCircle2,
  Hash, Copy, Check, Clock, AlertCircle, TrendingUp, Code2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { FileUploadZone } from './FileUploadZone'
import { cn } from '@/lib/utils'
import type { Language } from '@/types'

// ─── Language SVG icons ───────────────────────────────────────────────────────

function PythonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 255" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="py-a" x1="12.959%" x2="79.639%" y1="12.039%" y2="78.201%">
          <stop offset="0%" stopColor="#387EB8"/>
          <stop offset="100%" stopColor="#366994"/>
        </linearGradient>
        <linearGradient id="py-b" x1="19.128%" x2="90.742%" y1="20.579%" y2="88.429%">
          <stop offset="0%" stopColor="#FFE052"/>
          <stop offset="100%" stopColor="#FFC331"/>
        </linearGradient>
      </defs>
      <path fill="url(#py-a)" d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"/>
      <path fill="url(#py-b)" d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"/>
    </svg>
  )
}

function JavaScriptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <path fill="#F7DF1E" d="M0 0h256v256H0V0z"/>
      <path d="M67.312 213.932l19.59-11.856c3.78 6.701 7.218 12.371 15.465 12.371 7.905 0 12.89-3.092 12.89-15.12v-81.798h24.057v82.138c0 24.917-14.606 36.259-35.916 36.259-19.245 0-30.416-9.967-36.087-21.994M152.381 211.354l19.588-11.341c5.157 8.421 11.859 14.607 23.715 14.607 9.969 0 16.325-4.984 16.325-11.858 0-8.248-6.53-11.17-17.528-15.98l-6.013-2.58c-17.357-7.387-28.87-16.667-28.87-36.257 0-18.044 13.747-31.792 35.228-31.792 15.294 0 26.292 5.328 34.196 19.247L210.29 147.43c-4.125-7.389-8.591-10.31-15.465-10.31-7.046 0-11.514 4.468-11.514 10.31 0 7.217 4.468 10.14 14.778 14.608l6.014 2.577c20.45 8.765 31.963 17.7 31.963 37.804 0 21.654-17.012 33.51-39.867 33.51-22.339 0-36.774-10.654-43.819-24.574"/>
    </svg>
  )
}

function TypeScriptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <path fill="#3178C6" d="M0 0h256v256H0V0z"/>
      <path fill="#fff" d="M150.518 200.475v27.62c4.492 2.302 9.805 4.028 15.938 5.179 6.133 1.151 12.597 1.726 19.393 1.726 6.622 0 12.914-.633 18.874-1.899 5.96-1.266 11.187-3.352 15.678-6.257 4.492-2.906 8.048-6.704 10.669-11.394 2.62-4.689 3.93-10.486 3.93-17.391 0-5.006-.749-9.394-2.246-13.163a30.748 30.748 0 0 0-6.479-10.055c-2.821-2.935-6.205-5.567-10.149-7.898-3.945-2.33-8.394-4.531-13.347-6.602-3.628-1.497-6.881-2.949-9.761-4.359-2.879-1.41-5.327-2.848-7.342-4.316-2.016-1.467-3.571-3.021-4.665-4.661-1.094-1.64-1.641-3.495-1.641-5.567 0-1.899.489-3.61 1.468-5.135s2.362-2.834 4.147-3.927c1.785-1.094 3.973-1.942 6.565-2.547 2.591-.604 5.471-.906 8.638-.906 2.304 0 4.737.173 7.299.518 2.563.345 5.14.877 7.733 1.597a53.669 53.669 0 0 1 7.558 2.949 41.7 41.7 0 0 1 6.781 4.273v-25.807c-4.204-1.611-8.797-2.763-13.778-3.453-4.981-.691-10.567-1.036-16.757-1.036-6.536 0-12.786.663-18.747 1.988-5.96 1.323-11.214 3.452-15.764 6.385-4.548 2.935-8.162 6.762-10.841 11.481-2.678 4.718-4.017 10.429-4.017 17.135 0 8.483 2.449 15.717 7.347 21.704 4.899 5.986 12.088 11.08 21.567 15.28 3.801 1.612 7.317 3.181 10.552 4.705 3.234 1.524 6.021 3.107 8.364 4.747 2.342 1.639 4.178 3.422 5.506 5.35 1.33 1.926 1.994 4.17 1.994 6.73 0 1.784-.43 3.437-1.293 4.961-.862 1.524-2.19 2.848-3.988 3.97-1.797 1.122-4.03 2.001-6.694 2.634-2.664.633-5.8.95-9.407.95-6.045 0-12.032-1.065-17.962-3.194-5.929-2.13-11.426-5.308-16.49-9.534zm-46.35-68.733H140V109H41v22.742h36.Again V241h27z"/>
    </svg>
  )
}

function JavaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 346" xmlns="http://www.w3.org/2000/svg">
      <path fill="#5382A1" d="M82.554 267.473s-13.198 7.675 9.393 10.272c27.369 3.122 41.356 2.675 71.517-3.034 0 0 7.93 4.972 19.003 9.279-67.611 28.977-153.019-1.679-99.913-16.517M74.292 230.217s-14.803 10.958 7.803 13.296c29.236 3.017 52.324 3.266 92.276-4.43 0 0 5.526 5.602 14.215 8.666-81.747 23.904-172.798 1.885-114.294-17.532"/>
      <path fill="#E76F00" d="M143.942 165.515c16.66 19.18-4.377 36.44-4.377 36.44s42.301-21.837 22.874-49.183c-18.144-25.5-32.059-38.172 43.268-81.858 0 0-118.238 29.528-61.765 94.6"/>
      <path fill="#5382A1" d="M233.364 295.442s9.767 8.047-10.757 14.273c-39.026 11.823-162.432 15.393-196.714.471-12.323-5.36 10.787-12.8 18.056-14.362 7.581-1.644 11.914-1.337 11.914-1.337-13.705-9.655-88.583 18.957-38.034 27.15 137.853 22.356 251.292-10.066 215.535-26.195M88.9 190.48s-62.771 14.91-22.228 20.323c17.118 2.292 51.243 1.774 83.03-.89 25.978-2.19 52.063-6.85 52.063-6.85s-9.16 3.923-15.775 8.448c-63.687 16.765-186.647 8.966-151.216-8.183 29.942-14.652 54.126-12.848 54.126-12.848M201.506 253.422c64.8-33.672 34.839-66.03 13.927-61.67-5.126 1.066-7.411 1.99-7.411 1.99s1.903-2.98 5.537-4.27c41.37-14.545 73.187 42.897-13.355 65.647 0 .001.998-.89 1.302-1.697M162.184.147s35.886 35.9-34.037 91.101c-56.071 44.282-12.786 69.53-.023 98.389-32.73-29.53-56.75-55.526-40.635-79.72C111.586 74.092 176.553 57.55 162.184.147"/>
      <path fill="#5382A1" d="M95.654 344.286c62.2 3.982 157.743-2.209 160.048-31.625 0 0-4.348 11.158-51.382 20.018-53.088 10.006-118.585 8.84-157.365 2.425.001 0 7.95 6.58 48.699 9.182"/>
    </svg>
  )
}

function GoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="30 10 196 220" xmlns="http://www.w3.org/2000/svg">
      <path fill="#69d7e2" d="M224.722 61.759c35.561-12.551 7.77-61.26-23.21-39.745c-20.32-17.432-48.31-20.62-77.696-20.62C95.03 3.687 67.636 8.966 48.511 25.7C17.63 5.777-10.858 53.59 25.4 65.644c-10.16 39.445 1.394 79.688-.2 119.831c-1.494 36.06-10.957 84.37 9.065 116.744c17.034 27.692 53.69 37.554 83.873 38.65c38.549 1.394 85.266-8.069 103.993-45.423c17.93-35.561 12.95-79.888 10.659-118.238c-2.291-38.749 1.992-78.095-8.069-115.45"/>
      <g transform="translate(48.476 21.976)">
        <ellipse cx="18.03" cy="32.872" rx="9.662" ry="10.459"/>
        <ellipse cx="22.412" cy="35.262" fill="#fff" rx="2.291" ry="2.689"/>
      </g>
      <g transform="translate(129.618 18.098)">
        <ellipse cx="17.631" cy="34.167" rx="9.463" ry="10.459"/>
        <ellipse cx="22.014" cy="36.557" fill="#fff" rx="2.191" ry="2.689"/>
      </g>
      <path fill="#f6d2a2" d="M112.784 83.002c-7.869.697-14.244 9.961-10.16 17.332c5.379 9.762 17.432-.896 24.903.1c8.666.2 15.738 9.164 22.611 1.594c7.67-8.368-3.287-16.536-11.953-20.122z"/>
    </svg>
  )
}

const LANG_ICONS: Record<Language, React.ComponentType<{ className?: string }>> = {
  python:     PythonIcon,
  javascript: JavaScriptIcon,
  typescript: TypeScriptIcon,
  java:       JavaIcon,
  go:         GoIcon,
}

// ─── Language list ────────────────────────────────────────────────────────────

const LANGUAGES: { value: Language; label: string; color: string; bg: string }[] = [
  { value: 'python',     label: 'Python',     color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  { value: 'javascript', label: 'JavaScript', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'typescript', label: 'TypeScript', color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  { value: 'java',       label: 'Java',       color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'go',         label: 'Go',         color: 'text-cyan-500',   bg: 'bg-cyan-500/10'   },
]

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0
      const step = Math.ceil(value / 20)
      const interval = setInterval(() => {
        start += step
        if (start >= value) { setDisplay(value); clearInterval(interval) }
        else setDisplay(start)
      }, 30)
      return () => clearInterval(interval)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [value, delay])
  return <>{display}</>
}

// ─── Session stat card ────────────────────────────────────────────────────────

function SessionStat({
  icon: Icon, value, suffix = '', label, iconBg, iconColor, delay = 0, isNumeric = false,
}: {
  icon: React.ElementType
  value: number | string
  suffix?: string
  label: string
  iconBg: string
  iconColor: string
  delay?: number
  isNumeric?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative bg-card border border-border rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden cursor-default"
    >
      <motion.span
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.07), transparent 70%)' }}
      />
      <motion.div
        className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}
        animate={hovered ? { scale: 1.12, rotate: -6 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Icon className={cn('w-3.5 h-3.5', iconColor)} aria-hidden="true" />
      </motion.div>
      <motion.p
        className="text-lg font-bold text-foreground leading-none tabular-nums"
        animate={hovered ? { scale: 1.05 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {isNumeric && typeof value === 'number'
          ? <><AnimatedNumber value={value} delay={delay} />{suffix}</>
          : <>{value}{suffix}</>
        }
      </motion.p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </motion.div>
  )
}

// ─── Language selector ────────────────────────────────────────────────────────

function LanguageSelector({ value, onChange }: { value: Language; onChange: (v: Language) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.value === value) ?? LANGUAGES[0]
  const CurrentIcon = LANG_ICONS[current.value]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label
        htmlFor="language-trigger"
        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5"
      >
        Language
      </label>

      <motion.button
        id="language-trigger"
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.98 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-2',
          'bg-card border border-border rounded-xl text-xs font-medium',
          'hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        )}
      >
        <div className="flex items-center gap-2">
          {/* Real language icon in coloured badge */}
          <span className={cn('w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0', current.bg)}>
            <CurrentIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-foreground">{current.label}</span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Select language"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 top-full mt-1.5 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden p-1"
          >
            {LANGUAGES.map((lang, i) => {
              const LangIcon = LANG_ICONS[lang.value]
              return (
                <motion.li
                  key={lang.value}
                  role="option"
                  aria-selected={lang.value === value}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                  onClick={() => { onChange(lang.value); setOpen(false) }}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors',
                    lang.value === value
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {/* Real language icon */}
                  <span className={cn('w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0', lang.bg)}>
                    <LangIcon className="w-3.5 h-3.5" />
                  </span>
                  {lang.label}
                  {lang.value === value && (
                    <motion.div
                      layoutId="lang-check"
                      className="ml-auto"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    >
                      <Check className="w-3 h-3 text-primary" />
                    </motion.div>
                  )}
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ error, date, resolved, index }: { error: string; date: string; resolved: boolean; index: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] transition-colors cursor-default',
        hovered ? 'bg-muted/60' : 'bg-transparent',
      )}
    >
      <span className="relative flex-shrink-0">
        <span className={cn('w-1.5 h-1.5 rounded-full block', resolved ? 'bg-emerald-500' : 'bg-amber-500')} />
        {!resolved && (
          <motion.span
            className="absolute inset-0 rounded-full bg-amber-500"
            animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </span>
      <span className={cn('font-mono flex-1 truncate transition-colors', hovered ? 'text-foreground' : 'text-foreground/80')}>
        {error}
      </span>
      <span className={cn(
        'flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
        resolved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      )}>
        {resolved ? 'fixed' : 'open'}
      </span>
      <span className="text-muted-foreground flex-shrink-0 text-[10px]">{date}</span>
    </motion.div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function WorkspaceRightPanel() {
  const [historyOpen, setHistoryOpen]         = useState(false)
  const [lastProjectFile, setLastProjectFile] = useState<File | null>(null)
  const [copied, setCopied]                   = useState(false)

  const { currentSessionId, language, setLanguage, logFile, setLogFile, projectFiles, setProjectFiles } = useAppStore()

  const handleProjectFile = (file: File | null) => {
    setLastProjectFile(file)
    if (file) setProjectFiles([...projectFiles, file])
    else      setProjectFiles(projectFiles.slice(0, -1))
  }

  const handleCopySession = () => {
    if (!currentSessionId) return
    navigator.clipboard.writeText(currentSessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const historyItems = [
    { error: 'ZeroDivisionError', date: 'Today',     resolved: true  },
    { error: 'TypeError',         date: 'Yesterday', resolved: true  },
    { error: 'AttributeError',    date: '2d ago',    resolved: false },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* Session ID */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border bg-muted/40 p-3.5 group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            >
              <Hash className="w-3 h-3 text-primary" aria-hidden="true" />
            </motion.div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Session ID</span>
          </div>
          <AnimatePresence mode="wait">
            {currentSessionId && (
              <motion.button
                type="button"
                onClick={handleCopySession}
                aria-label="Copy session ID"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                      <Check className="w-3 h-3 text-emerald-500" />
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                      <Copy className="w-3 h-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <motion.p className={cn('text-xs font-mono break-all leading-relaxed pl-0.5 transition-colors duration-300', copied ? 'text-emerald-500' : 'text-foreground')}>
          {currentSessionId ?? <span className="text-muted-foreground italic">No active session</span>}
        </motion.p>
        <AnimatePresence>
          {copied && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="text-[10px] text-emerald-500 mt-1 pl-0.5">
              Copied to clipboard
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Session Stats */}
      <div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
          Session Stats
        </motion.p>
        <div className="grid grid-cols-3 gap-2">
          <SessionStat icon={Activity}   value={12}  label="Errors"   iconBg="bg-primary/10"      iconColor="text-primary"     delay={0.06} isNumeric />
          <SessionStat icon={Sparkles}   value={8}   label="Concepts" iconBg="bg-emerald-500/10"  iconColor="text-emerald-500" delay={0.1}  isNumeric />
          <SessionStat icon={TrendingUp} value={92}  suffix="%" label="Success" iconBg="bg-emerald-500/10" iconColor="text-emerald-500" delay={0.14} isNumeric />
        </div>
      </div>

      {/* Language selector */}
      <LanguageSelector value={language} onChange={(v) => setLanguage(v)} />

      {/* File uploads */}
      <FileUploadZone label="Log File"      accept=".txt,.log" onFile={setLogFile}         currentFile={logFile}         hint=".txt or .log — used as RAG context" />
      <FileUploadZone label="Project Files" accept="*"         onFile={handleProjectFile}  currentFile={lastProjectFile} hint="Optional extra context files" />

      <AnimatePresence>
        {projectFiles.length > 1 && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="text-[10px] text-muted-foreground -mt-2.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {projectFiles.length} files attached
          </motion.p>
        )}
      </AnimatePresence>

      {/* Learning History */}
      <div className="border border-border rounded-xl overflow-hidden">
        <motion.button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
          transition={{ duration: 0.15 }}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-foreground"
          aria-expanded={historyOpen}
          aria-controls="learning-history"
        >
          <div className="flex items-center gap-2">
            <motion.div className="w-4 h-4 rounded-md bg-primary/10 flex items-center justify-center" animate={historyOpen ? { backgroundColor: 'hsl(var(--primary) / 0.2)' } : {}}>
              <Clock className="w-2.5 h-2.5 text-primary" />
            </motion.div>
            <span>Learning History</span>
            <motion.span className="px-1.5 py-0.5 rounded-full bg-muted text-[9px] font-semibold text-muted-foreground" animate={historyOpen ? { backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' } : {}} transition={{ duration: 0.2 }}>
              {historyItems.length}
            </motion.span>
          </div>
          <motion.div animate={{ rotate: historyOpen ? 90 : 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {historyOpen && (
            <motion.div id="learning-history" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="px-2 pb-2 border-t border-border pt-1.5 space-y-0.5">
                {historyItems.map((item, i) => <HistoryRow key={i} {...item} index={i} />)}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center pt-1 pb-0.5">
                  <button type="button" className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                    View full history
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}