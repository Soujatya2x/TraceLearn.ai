'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  ChevronRight,
  Activity,
  Sparkles,
  CheckCircle2,
  Hash,
  Copy,
  Check,
  Clock,
  AlertCircle,
  TrendingUp,
  Code2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { FileUploadZone } from './FileUploadZone'
import { cn } from '@/lib/utils'
import type { Language } from '@/types'

// ─── Language definitions with colour accents ─────────────────────────────────

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
  icon: Icon,
  value,
  suffix = '',
  label,
  iconBg,
  iconColor,
  delay = 0,
  isNumeric = false,
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
      {/* Hover glow */}
      <motion.span
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.07), transparent 70%)' }}
      />

      {/* Icon */}
      <motion.div
        className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}
        animate={hovered ? { scale: 1.12, rotate: -6 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Icon className={cn('w-3.5 h-3.5', iconColor)} aria-hidden="true" />
      </motion.div>

      {/* Value */}
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

      {/* Label */}
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </motion.div>
  )
}

// ─── Custom language selector ─────────────────────────────────────────────────

function LanguageSelector({
  value,
  onChange,
}: {
  value: Language
  onChange: (v: Language) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.value === value) ?? LANGUAGES[0]

  // Close on outside click
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

      {/* Trigger */}
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
          <span className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold', current.bg, current.color)}>
            <Code2 className="w-3 h-3" />
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

      {/* Dropdown */}
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
            {LANGUAGES.map((lang, i) => (
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
                <span className={cn('w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0', lang.bg)}>
                  <Code2 className={cn('w-3 h-3', lang.color)} />
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
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── History entry row ────────────────────────────────────────────────────────

function HistoryRow({
  error,
  date,
  resolved,
  index,
}: {
  error: string
  date: string
  resolved: boolean
  index: number
}) {
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
      {/* Status dot — pulses if unresolved */}
      <span className="relative flex-shrink-0">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full block',
            resolved ? 'bg-emerald-500' : 'bg-amber-500',
          )}
        />
        {!resolved && (
          <motion.span
            className="absolute inset-0 rounded-full bg-amber-500"
            animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </span>

      {/* Error name */}
      <span
        className={cn(
          'font-mono flex-1 truncate transition-colors',
          hovered ? 'text-foreground' : 'text-foreground/80',
        )}
      >
        {error}
      </span>

      {/* Badge */}
      <span
        className={cn(
          'flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
          resolved
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        )}
      >
        {resolved ? 'fixed' : 'open'}
      </span>

      {/* Date */}
      <span className="text-muted-foreground flex-shrink-0 text-[10px]">{date}</span>
    </motion.div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function WorkspaceRightPanel() {
  const [historyOpen, setHistoryOpen]       = useState(false)
  const [lastProjectFile, setLastProjectFile] = useState<File | null>(null)
  const [copied, setCopied]                 = useState(false)

  const {
    currentSessionId,
    language,
    setLanguage,
    logFile,
    setLogFile,
    projectFiles,
    setProjectFiles,
  } = useAppStore()

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

      {/* ── Session ID card ──────────────────────────────────── */}
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
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Session ID
            </span>
          </div>

          {/* Copy button */}
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
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Copy className="w-3 h-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ID value with highlight on copy */}
        <motion.p
          className={cn(
            'text-xs font-mono break-all leading-relaxed pl-0.5 transition-colors duration-300',
            copied ? 'text-emerald-500' : 'text-foreground',
          )}
        >
          {currentSessionId ?? (
            <span className="text-muted-foreground italic">No active session</span>
          )}
        </motion.p>

        {/* Subtle "copied" toast */}
        <AnimatePresence>
          {copied && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-[10px] text-emerald-500 mt-1 pl-0.5"
            >
              Copied to clipboard
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Session Stats ─────────────────────────────────────── */}
      <div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5"
        >
          Session Stats
        </motion.p>
        <div className="grid grid-cols-3 gap-2">
          <SessionStat
            icon={Activity}
            value={12}
            label="Errors"
            iconBg="bg-primary/10"
            iconColor="text-primary"
            delay={0.06}
            isNumeric
          />
          <SessionStat
            icon={Sparkles}
            value={8}
            label="Concepts"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            delay={0.1}
            isNumeric
          />
          <SessionStat
            icon={TrendingUp}
            value={92}
            suffix="%"
            label="Success"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            delay={0.14}
            isNumeric
          />
        </div>
      </div>

      {/* ── Language selector ─────────────────────────────────── */}
      <LanguageSelector
        value={language}
        onChange={(v) => setLanguage(v)}
      />

      {/* ── Log file upload ───────────────────────────────────── */}
      <FileUploadZone
        label="Log File"
        accept=".txt,.log"
        onFile={setLogFile}
        currentFile={logFile}
        hint=".txt or .log — used as RAG context"
      />

      {/* ── Project files upload ──────────────────────────────── */}
      <FileUploadZone
        label="Project Files"
        accept="*"
        onFile={handleProjectFile}
        currentFile={lastProjectFile}
        hint="Optional extra context files"
      />

      {/* Files count badge */}
      <AnimatePresence>
        {projectFiles.length > 1 && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-muted-foreground -mt-2.5 flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {projectFiles.length} files attached
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Learning History collapsible ──────────────────────── */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Toggle button */}
        <motion.button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
          transition={{ duration: 0.15 }}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-foreground"
          aria-expanded={historyOpen as boolean}
          aria-controls="learning-history"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-4 h-4 rounded-md bg-primary/10 flex items-center justify-center"
              animate={historyOpen ? { backgroundColor: 'hsl(var(--primary) / 0.2)' } : {}}
            >
              <Clock className="w-2.5 h-2.5 text-primary" />
            </motion.div>
            <span>Learning History</span>
            {/* Count badge */}
            <motion.span
              className="px-1.5 py-0.5 rounded-full bg-muted text-[9px] font-semibold text-muted-foreground"
              animate={historyOpen ? { backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' } : {}}
              transition={{ duration: 0.2 }}
            >
              {historyItems.length}
            </motion.span>
          </div>

          <motion.div
            animate={{ rotate: historyOpen ? 90 : 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        </motion.button>

        {/* Expandable content */}
        <AnimatePresence>
          {historyOpen && (
            <motion.div
              id="learning-history"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 border-t border-border pt-1.5 space-y-0.5">
                {historyItems.map((item, i) => (
                  <HistoryRow key={i} {...item} index={i} />
                ))}

                {/* "View all" link row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center pt-1 pb-0.5"
                >
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
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