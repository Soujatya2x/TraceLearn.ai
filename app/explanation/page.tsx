'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { RefreshCw, Zap, AlertTriangle, Brain, BookMarked } from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { ErrorTopSection } from '@/features/explanation/ErrorTopSection'
import { AIExplanationSection } from '@/features/explanation/AIExplanationSection'
import { LearningResourcesSection } from '@/features/explanation/LearningResourcesSection'
import { SkeletonCard, SkeletonText } from '@/components/ui/SkeletonCard'
import { PreviewBadgeInline } from '@/components/ui/PreviewBadge'
import { useErrorExplanation } from '@/hooks/useAnalysis'
import { useAppStore } from '@/store/useAppStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { staggerContainer } from '@/animations/variants'
import { cn } from '@/lib/utils'
import type { ErrorExplanation } from '@/types'

const MOCK_EXPLANATION: ErrorExplanation = {
  sessionId: 'demo-session-001',
  errorType: 'ZeroDivisionError',
  errorMessage: 'division by zero',
  file: 'main.py',
  lineNumber: 8,
  stackTrace: [
    'Traceback (most recent call last):',
    '  File "main.py", line 11, in <module>',
    '    result = calculate_average([])',
    '  File "main.py", line 8, in calculate_average',
    '    return total / len(numbers)',
    'ZeroDivisionError: division by zero',
  ],
  whyItHappened:
    'Your function attempts to divide the sum of a list by its length. When an empty list is passed, `len(numbers)` returns 0, causing a division by zero error. Python raises ZeroDivisionError whenever you attempt to divide any number by zero.',
  conceptBehindError: {
    concept: 'Guard Clauses & Input Validation',
    description:
      'Before performing operations on data, always validate your inputs. A guard clause at the start of a function checks preconditions and returns early or raises a meaningful error, preventing downstream failures.',
    icon: '🛡️',
  },
  stepByStepReasoning: [
    'An empty list `[]` is passed to `calculate_average()`.',
    '`sum([])` evaluates to 0 — this is safe.',
    '`len([])` evaluates to 0 — this is the problem.',
    'Python evaluates `0 / 0`, which raises `ZeroDivisionError`.',
    'The fix: add a guard clause that returns `None` or raises a `ValueError` when the list is empty.',
  ],
  learningResources: [
    { title: 'Python Exceptions — Official Docs', url: 'https://docs.python.org/3/tutorial/errors.html', type: 'documentation', source: 'Python Docs' },
    { title: 'Understanding ZeroDivisionError', url: 'https://realpython.com/python-exceptions/', type: 'article', source: 'Real Python' },
    { title: 'Guard Clauses — Clean Code', url: 'https://refactoring.guru/replace-nested-conditional-with-guard-clauses', type: 'tutorial', source: 'Refactoring.guru' },
  ],
  similarErrorsHistory: [
    { sessionId: 'prev-001', errorType: 'ZeroDivisionError', date: '3 days ago', resolved: true },
    { sessionId: 'prev-002', errorType: 'TypeError', date: 'Last week', resolved: true },
  ],
}

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

export default function ExplanationPage() {
  const { currentSessionId } = useAppStore()
  const scrollRef             = useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const explanationQuery = useErrorExplanation(currentSessionId)

  // Reset status when user leaves this page
  useEffect(() => {
    return () => {
      useAppStore.getState().setAnalysisStatus('idle')
    }
  }, [])

  // Auto-refetch on mount — use a small delay to ensure component is fully mounted.
  // Don't check isLoading/data here: on a disabled query both are false/undefined,
  // so a plain guard would pass but refetch() would be a no-op. The timer ensures
  // the query is enabled (sessionId is set) before refetch fires.
  useEffect(() => {
    if (!currentSessionId) return
    const timer = setTimeout(() => {
      explanationQuery.refetch()
    }, 100)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await explanationQuery.refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  const hasSession  = !!currentSessionId
  const isLoading   = hasSession && (explanationQuery.isLoading || explanationQuery.isFetching || isRefreshing)
  const isPreview   = !hasSession || (!isLoading && !explanationQuery.data)
  const displayData = explanationQuery.data ?? MOCK_EXPLANATION

  return (
    <AppShell activeNav="explanation">
      <ScrollProgress containerRef={scrollRef} />

      <div ref={scrollRef} className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Page header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                Error Explanation
              </h1>
              <PreviewBadgeInline visible={isPreview} />
            </div>

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
                  transition={isLoading
                    ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                    : {}}
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

        {!isLoading && <SectionNav activeSection="error" />}

        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <div className="space-y-2"><SkeletonText lines={4} /></div>
            <SkeletonCard />
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            <section id="error" aria-label="Error details">
              <ErrorBoundary label="error details">
                <ErrorTopSection explanation={displayData} />
              </ErrorBoundary>
            </section>

            <SectionDivider />

            <section id="analysis" aria-label="AI analysis">
              <ErrorBoundary label="AI analysis">
                <AIExplanationSection explanation={displayData} />
              </ErrorBoundary>
            </section>

            <SectionDivider />

            <section id="resources" aria-label="Learning resources">
              <ErrorBoundary label="learning resources">
                <LearningResourcesSection explanation={displayData} />
              </ErrorBoundary>
            </section>
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}