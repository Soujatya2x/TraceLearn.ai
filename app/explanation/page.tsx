'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { RefreshCw, Zap, AlertTriangle, Brain, BookMarked, FileQuestion } from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { ErrorTopSection } from '@/features/explanation/ErrorTopSection'
import { AIExplanationSection } from '@/features/explanation/AIExplanationSection'
import { LearningResourcesSection } from '@/features/explanation/LearningResourcesSection'
import { SkeletonCard, SkeletonText } from '@/components/ui/SkeletonCard'
import { useErrorExplanation } from '@/hooks/useAnalysis'
import { useAppStore } from '@/store/useAppStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { staggerContainer } from '@/animations/variants'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'error',     label: 'Error',     icon: AlertTriangle },
  { id: 'analysis',  label: 'Analysis',  icon: Brain         },
  { id: 'resources', label: 'Resources', icon: BookMarked    },
] as const

function SectionNav({ activeSection }: { activeSection: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
      className="flex items-center gap-1 mb-8"
      role="navigation"
      aria-label="Page sections"
    >
      {SECTIONS.map((s, i) => {
        const Icon   = s.icon
        const active = activeSection === s.id
        const passed = SECTIONS.findIndex((x) => x.id === activeSection) > i
        return (
          <div key={s.id} className="flex items-center gap-1">
            <a
              href={`#${s.id}`}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                active  ? 'bg-primary/10 text-primary'
                : passed ? 'text-muted-foreground/60 hover:text-muted-foreground'
                :          'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3 h-3" aria-hidden="true" />
              {s.label}
            </a>
            {i < SECTIONS.length - 1 && (
              <span className="w-6 h-px bg-border flex-shrink-0" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </motion.div>
  )
}

function ScrollProgress({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ container: containerRef as React.RefObject<HTMLElement> })
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-0.5 bg-primary origin-left z-50 pointer-events-none"
      style={{ scaleX }}
    />
  )
}

function SectionDivider() {
  return (
    <motion.div
      className="relative flex items-center gap-3 py-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 h-px bg-border" />
      <Zap className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 h-px bg-border" />
    </motion.div>
  )
}

// Shown when there's no active session — user hasn't analyzed anything yet
function NoSessionState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 gap-4 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <FileQuestion className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">No analysis yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Go to the workspace, paste your code and click <strong>Analyze &amp; Learn</strong> to see an explanation here.
        </p>
      </div>
    </motion.div>
  )
}

// Shown when the session exists but the AI hasn't returned data yet (or it failed)
function NoDataState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 gap-4 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Analysis not available</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          The AI agent hasn't returned data for this session yet. Try refreshing in a moment.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </motion.div>
  )
}

export default function ExplanationPage() {
  const { currentSessionId } = useAppStore()
  const scrollRef             = useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const explanationQuery = useErrorExplanation(currentSessionId)

  // Reset analysisStatus when the user leaves so workspace button goes back to idle
  useEffect(() => {
    return () => {
      useAppStore.getState().setAnalysisStatus('idle')
    }
  }, [])

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await explanationQuery.refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  const hasSession = !!currentSessionId
  const isLoading  = hasSession && (explanationQuery.isLoading || explanationQuery.isFetching || isRefreshing)
  const hasData    = !!explanationQuery.data

  return (
    <AppShell activeNav="explanation">
      <ScrollProgress containerRef={scrollRef} />

      <div ref={scrollRef} className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Page header ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Error Explanation
            </h1>

            {hasSession && (
              <motion.button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                whileHover={isLoading ? undefined : { scale: 1.05 }}
                whileTap={isLoading ? undefined : { scale: 0.95 }}
                title="Refresh analysis"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'border border-border/60 bg-muted/40 text-muted-foreground',
                  'hover:bg-muted hover:text-foreground hover:border-border transition-all',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
              >
                <motion.span
                  animate={isLoading ? { rotate: 360 } : {}}
                  transition={isLoading ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
                >
                  <RefreshCw className="w-3 h-3" />
                </motion.span>
                {isLoading ? 'Loading...' : 'Refresh'}
              </motion.button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis of what went wrong and how to fix it
          </p>
        </motion.div>

        {/* ── Content ───────────────────────────────────────── */}
        {!hasSession ? (
          <NoSessionState />
        ) : isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <div className="space-y-2"><SkeletonText lines={4} /></div>
            <SkeletonCard />
          </motion.div>
        ) : !hasData ? (
          <NoDataState onRetry={handleRefresh} />
        ) : (
          <>
            <SectionNav activeSection="error" />
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-8"
            >
              <section id="error" aria-label="Error details">
                <ErrorBoundary label="error details">
                  <ErrorTopSection explanation={explanationQuery.data} />
                </ErrorBoundary>
              </section>

              <SectionDivider />

              <section id="analysis" aria-label="AI analysis">
                <ErrorBoundary label="AI analysis">
                  <AIExplanationSection explanation={explanationQuery.data} />
                </ErrorBoundary>
              </section>

              <SectionDivider />

              <section id="resources" aria-label="Learning resources">
                <ErrorBoundary label="learning resources">
                  <LearningResourcesSection explanation={explanationQuery.data} />
                </ErrorBoundary>
              </section>
            </motion.div>
          </>
        )}
      </div>
    </AppShell>
  )
}