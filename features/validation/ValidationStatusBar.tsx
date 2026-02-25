'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Play, CheckCircle2, XCircle,
  RotateCcw, Loader2, Terminal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValidationResult } from '@/types'

interface ValidationStatusBarProps {
  validation: ValidationResult
  onRetry: () => void
  isRetrying: boolean
}

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    label: 'Validation Passed',
    detail: 'Code executed without errors',
    bg: 'bg-emerald-500/8 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    icon: XCircle,
    label: 'Validation Failed',
    detail: 'Execution produced an error',
    bg: 'bg-destructive/8 border-destructive/20',
    text: 'text-destructive',
  },
  pending: {
    icon: Loader2,
    label: 'Running…',
    detail: 'Please wait',
    bg: 'bg-primary/8 border-primary/20',
    text: 'text-primary',
  },
} as const

export function ValidationStatusBar({ validation, onRetry, isRetrying }: ValidationStatusBarProps) {
  const [consoleOpen, setConsoleOpen] = useState(false)
  const config    = STATUS_CONFIG[validation.validationStatus]
  const Icon      = config.icon
  const isPending = validation.validationStatus === 'pending'
  const maxed     = validation.retryCount >= validation.maxRetries

  return (
    <div className={cn('rounded-xl border overflow-hidden', config.bg)}>

      {/* ── Main row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">

        {/* Status */}
        <div className="flex items-center gap-3">
          <motion.div
            className={cn('flex items-center gap-1.5 text-sm font-semibold', config.text)}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Icon className={cn('w-4 h-4', isPending && 'animate-spin')} aria-hidden="true" />
            {config.label}
          </motion.div>
          <span className="text-xs text-muted-foreground hidden sm:block">{config.detail}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Console toggle */}
          <motion.button
            type="button"
            onClick={() => setConsoleOpen((o) => !o)}
            aria-expanded={consoleOpen}
            aria-controls="console-body"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            Output
            <motion.span animate={{ rotate: consoleOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </motion.span>
          </motion.button>

          {/* Retry counter + button */}
          <div className="flex items-center gap-2 pl-2 border-l border-border/40">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              {validation.retryCount + 1}/{validation.maxRetries + 1}
            </span>
            <motion.button
              type="button"
              onClick={onRetry}
              disabled={isRetrying || maxed}
              whileHover={!isRetrying && !maxed ? { scale: 1.03, y: -1 } : undefined}
              whileTap={!isRetrying && !maxed ? { scale: 0.96 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label="Run validation again"
            >
              {isRetrying
                ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                : <Play    className="w-3 h-3 fill-current"  aria-hidden="true" />
              }
              Run Again
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Execution console ─────────────────────────────── */}
      <AnimatePresence>
        {consoleOpen && (
          <motion.div
            id="console-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 bg-[#1e1e1e] px-4 py-3 font-mono text-[11px] space-y-2">
              {/* Meta row */}
              <div className="flex items-center gap-3 text-zinc-400">
                <span>
                  Exit code:{' '}
                  <span className={validation.executionOutput.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {validation.executionOutput.exitCode}
                  </span>
                </span>
                <span className="text-zinc-600">·</span>
                <span>{validation.executionOutput.executionTime}ms</span>
              </div>

              {/* stdout */}
              {validation.executionOutput.stdout && (
                <div>
                  <span className="text-emerald-500/60 text-[10px] uppercase tracking-wide">stdout</span>
                  <pre className="mt-1 text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {validation.executionOutput.stdout}
                  </pre>
                </div>
              )}

              {/* stderr */}
              {validation.executionOutput.stderr && (
                <div>
                  <span className="text-rose-500/60 text-[10px] uppercase tracking-wide">stderr</span>
                  <pre className="mt-1 text-rose-400/80 whitespace-pre-wrap leading-relaxed">
                    {validation.executionOutput.stderr}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}