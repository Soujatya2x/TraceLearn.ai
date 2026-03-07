'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, Loader2, CheckCircle2, XCircle, Zap, RefreshCcw, ArrowRight, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { getErrorExplanation } from '@/services/api/analysisService'
import { queryKeys } from '@/hooks/useAnalysis'
import type { AnalysisStatus } from '@/types'

interface AnalyzeButtonProps {
  status: AnalysisStatus
  onClick: () => void
  disabled?: boolean
}

const STATUS_CONFIG = {
  idle: {
    label: 'Analyze & Learn',
    icon: Sparkles,
    bg: 'from-primary via-primary to-primary/90',
    glow: 'rgba(99,102,241,0.45)',
    spin: false,
  },
  processing: {
    label: 'Processing...',
    icon: Loader2,
    bg: 'from-primary/70 via-primary/80 to-primary/70',
    glow: 'rgba(99,102,241,0.2)',
    spin: true,
  },
  analyzing: {
    label: 'Analyzing code...',
    icon: Zap,
    bg: 'from-violet-600 via-primary to-indigo-600',
    glow: 'rgba(124,58,237,0.35)',
    spin: true,
  },
  validating: {
    label: 'Validating fix...',
    icon: RefreshCcw,
    bg: 'from-indigo-500 via-primary to-violet-500',
    glow: 'rgba(99,102,241,0.3)',
    spin: true,
  },
  completed: {
    label: 'Analysis Complete',
    icon: CheckCircle2,
    bg: 'from-emerald-500 via-emerald-500 to-emerald-600',
    glow: 'rgba(16,185,129,0.4)',
    spin: false,
  },
  failed: {
    label: 'Retry Analysis',
    icon: XCircle,
    bg: 'from-red-500 via-destructive to-red-600',
    glow: 'rgba(239,68,68,0.35)',
    spin: false,
  },
} as const satisfies Record<AnalysisStatus, {
  label: string
  icon: React.ElementType
  bg: string
  glow: string
  spin: boolean
}>

function BurstDot({ angle, delay }: { angle: number; delay: number }) {
  const rad = (angle * Math.PI) / 180
  return (
    <motion.span
      className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-primary-foreground/60 pointer-events-none"
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: Math.cos(rad) * 32, y: Math.sin(rad) * 32, opacity: 0, scale: 0.3 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
    />
  )
}

function LoadingShimmer() {
  return (
    <motion.span
      className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.span
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.12) 60%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['-100% 0', '250% 0'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.4 }}
      />
    </motion.span>
  )
}

function PulseRing({ color }: { color: string }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{ boxShadow: `0 0 0 0 ${color}` }}
      animate={{ boxShadow: [`0 0 0 0 ${color}`, `0 0 0 10px transparent`] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.6 }}
    />
  )
}

export function AnalyzeButton({ status, onClick, disabled }: AnalyzeButtonProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const prefersReduced = useReducedMotion()
  const [bursts, setBursts] = useState<number[]>([])
  const [navigating, setNavigating] = useState(false)  // ← prefetch in progress
  const burstId = useRef(0)

  const normalizedStatus = ((): AnalysisStatus => {
    switch (status as string) {
      case 'CREATED':
      case 'EXECUTING': return 'processing'
      case 'ANALYZING':
      case 'ANALYZED': return 'analyzing'
      case 'COMPLETED': return 'completed'
      case 'ERROR': return 'failed'
      default: return (status as AnalysisStatus) ?? 'idle'
    }
  })()

  const config = STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG.idle
  const Icon = config.icon
  const isLoading = ['processing', 'analyzing', 'validating'].includes(normalizedStatus)
  const isDisabled = disabled || isLoading

  const handleClick = () => {
    if (isDisabled) return
    if (!prefersReduced) {
      const id = ++burstId.current
      setBursts((b) => [...b, id])
      setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 700)
    }
    onClick()
  }

  // ── "View Results" — prefetch data THEN navigate ──────────────────────────
  if (normalizedStatus === 'completed') {
    const handleViewResults = async () => {
      if (navigating) return
      const sessionId = useAppStore.getState().currentSessionId
      if (!sessionId) return

      setNavigating(true)
      try {
        await queryClient.fetchQuery({
          queryKey: queryKeys.explanation(sessionId),
          queryFn: () => getErrorExplanation(sessionId),
          staleTime: 0,
        })
      } catch {
        // navigate anyway, skeleton will show then retry
      } finally {
        useAppStore.getState().setSessionViewed(true)
        router.push('/explanation')
      }
    }

    return (
      <div className="relative flex flex-col items-end gap-1.5">
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-1 text-[11px] font-medium text-emerald-500"
        >
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Analysis complete
        </motion.span>

        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.08 }}
          whileHover={prefersReduced || navigating ? undefined : { scale: 1.03, y: -1 }}
          whileTap={prefersReduced || navigating ? undefined : { scale: 0.97 }}
          onClick={handleViewResults}
          disabled={navigating}
          className={cn(
            'relative flex items-center gap-2 py-2.5 px-5 rounded-xl',
            'font-semibold text-sm text-white overflow-hidden',
            navigating ? 'cursor-wait opacity-90' : 'cursor-pointer',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
          )}
          aria-label="View analysis results"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-600 rounded-xl" />
          <motion.span
            className="absolute inset-0 -z-10 rounded-xl blur-md bg-emerald-500/40"
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="relative z-10 flex items-center gap-2">
            <span>{navigating ? 'Loading...' : 'View Results'}</span>
            <motion.span
              animate={navigating
                ? { rotate: 360 }
                : prefersReduced ? {} : { x: [0, 3, 0] }
              }
              transition={navigating
                ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              {navigating
                ? <Loader className="w-4 h-4" aria-hidden="true" />
                : <ArrowRight className="w-4 h-4" aria-hidden="true" />
              }
            </motion.span>
          </span>
        </motion.button>
      </div>
    )
  }

  // ── All other states ──────────────────────────────────────────────────────
  const burstAngles = [0, 40, 80, 120, 160, 200, 240, 280, 320]

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={config.label}
        aria-busy={isLoading}
        whileTap={isDisabled || prefersReduced ? undefined : { scale: 0.96 }}
        whileHover={isDisabled || prefersReduced ? undefined : { scale: 1.015, y: -1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(
          'relative w-full flex items-center justify-center gap-2',
          'py-2.5 px-5 rounded-xl font-semibold text-sm',
          'text-primary-foreground overflow-hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'transition-opacity duration-200',
          isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <motion.span
          className={cn('absolute inset-0 bg-gradient-to-r', config.bg)}
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          aria-hidden="true"
        />

        {normalizedStatus === 'analyzing' && !prefersReduced && (
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['-100% 0', '200% 0'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          />
        )}

        <AnimatePresence>
          {isLoading && !prefersReduced && <LoadingShimmer />}
        </AnimatePresence>

        <AnimatePresence>
          {normalizedStatus === 'idle' && !prefersReduced && !disabled && (
            <PulseRing color={STATUS_CONFIG.idle.glow} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bursts.map((id) =>
            burstAngles.map((angle, i) => (
              <BurstDot key={`${id}-${angle}`} angle={angle} delay={i * 0.02} />
            )),
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex items-center gap-2"
          >
            <motion.span
              animate={
                config.spin && !prefersReduced
                  ? { rotate: 360 }
                  : status === 'idle' && !prefersReduced
                    ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }
                    : {}
              }
              transition={
                config.spin
                  ? { duration: 1, repeat: Infinity, ease: 'linear' }
                  : { duration: 0.6, ease: 'easeInOut' }
              }
            >
              <Icon className="w-4 h-4" />
            </motion.span>
            <span>{config.label}</span>
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {!isDisabled && !prefersReduced && (
        <motion.div
          className="absolute inset-0 -z-10 rounded-xl blur-md"
          key={status}
          animate={{ backgroundColor: config.glow, opacity: [0.4, 0.7, 0.4] }}
          transition={{
            backgroundColor: { duration: 0.4 },
            opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      )}
    </div>
  )
}