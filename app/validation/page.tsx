'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Download,
  CheckCircle2,
  RotateCcw,
  Play,
  Loader2,
  ChevronDown,
  XCircle,
  Shield,
  Lightbulb,
  MessageSquare,
} from 'lucide-react'
import { AppShell } from '@/components/layouts/AppShell'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useValidationResult, useRetryExecution } from '@/hooks/useAnalysis'
import { useAppStore } from '@/store/useAppStore'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { cn } from '@/lib/utils'
import type { ValidationResult } from '@/types'


const MOCK_VALIDATION: ValidationResult = {
  sessionId: 'demo-session-001',
  originalCode: `def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    # This will cause an error
    result = calculate_average([])
    print(f"Average: {result}")`,
  fixedCode: `def calculate_average(numbers):
    # Validate input to prevent division by zero
    if len(numbers) == 0:
        return 0  # or raise ValueError("List is empty")

    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

    # Now handles empty list gracefully
    result = calculate_average([])
    print(f"Average: {result}")`,
  diffLines: [
    { lineNumber: 1, type: 'unchanged', content: 'def calculate_average(numbers):' },
    { lineNumber: 2, type: 'added',     content: '    # Validate input to prevent division by zero', comment: 'Added input validation' },
    { lineNumber: 3, type: 'added',     content: '    if len(numbers) == 0:', comment: 'Check if list is empty before calculation' },
    { lineNumber: 4, type: 'added',     content: '        return 0  # or raise ValueError("List is empty")' },
    { lineNumber: 5, type: 'unchanged', content: '    total = 0' },
    { lineNumber: 6, type: 'unchanged', content: '    for num in numbers:' },
    { lineNumber: 7, type: 'unchanged', content: '        total += num' },
    { lineNumber: 8, type: 'unchanged', content: '    return total / len(numbers)' },
  ],
  whatChanged:
    'Added a validation check at the beginning of the function to test if the input list is empty. If `len(numbers) == 0`, the function now returns 0 instead of attempting division.',
  whyItWorks:
    "By checking the list length before performing division, we prevent the ZeroDivisionError entirely. This is called **defensive programming** — validating inputs before processing them.",
  reinforcedConcept:
    'Input Validation: Always validate function inputs, especially when performing operations that could fail with edge cases (like empty collections, null values, or zero denominators).',
  validationStatus: 'success',
  retryCount: 0,
  maxRetries: 2,
  executionOutput: {
    stdout: 'Average: 0\n',
    stderr: '',
    exitCode: 0,
    executionTime: 38,
  },
}

const CHANGE_SUMMARY = [
  { id: 1, label: 'Added input validation', detail: 'Lines 2-3: Check if list is empty before calculation', color: 'bg-success/15 text-success-foreground border-success/30' },
  { id: 2, label: 'Added inline comment', detail: 'Line 1: Explains the validation purpose', color: 'bg-primary/10 text-primary border-primary/25' },
]

// ─── Sub-components ────────────────────────────────────────────────────────

function CodePanel({
  title,
  subtitle,
  code,
  accentColor,
  highlightLines = [],
}: {
  title: string
  subtitle: string
  code: string
  accentColor: 'destructive' | 'success'
  highlightLines?: number[]
}) {
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.py`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card min-w-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.div key="check" initial={{ scale: 0.7 }} animate={{ scale: 1 }} exit={{ scale: 0.7 }}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-foreground" />
                </motion.div>
              ) : (
                <motion.div key="copy" initial={{ scale: 0.7 }} animate={{ scale: 1 }}>
                  <Copy className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={handleDownload}
            aria-label="Download code"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin h-[260px]">
        <pre className="p-0 m-0 text-[12px] font-mono leading-6 min-w-max">
          {lines.map((line, i) => {
            const lineNum = i + 1
            const isHighlighted = highlightLines.includes(lineNum)
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start group px-0',
                  isHighlighted &&
                    accentColor === 'destructive' &&
                    'bg-destructive/10',
                  isHighlighted &&
                    accentColor === 'success' &&
                    'bg-success/10',
                )}
              >
                <div
                  className={cn(
                    'w-0.5 flex-shrink-0 self-stretch',
                    isHighlighted && accentColor === 'destructive' && 'bg-destructive',
                    isHighlighted && accentColor === 'success'    && 'bg-success-foreground',
                    !isHighlighted && 'bg-transparent',
                  )}
                />
                {/* Line number */}
                <span className="select-none text-right text-muted-foreground/40 w-8 px-2 flex-shrink-0 py-0">
                  {lineNum}
                </span>
                {/* Code content */}
                <span
                  className={cn(
                    'flex-1 pr-6',
                    isHighlighted && accentColor === 'destructive' && 'text-destructive',
                    isHighlighted && accentColor === 'success'    && 'text-success-foreground',
                    !isHighlighted && 'text-foreground/90',
                  )}
                >
                  {line || ' '}
                </span>
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}

function ChangeSummaryChip({ label, detail, color }: { label: string; detail: string; color: string }) {
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border', color)}>
      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs mt-0.5 opacity-75">{detail}</p>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ValidationPage() {
  const { currentSessionId } = useAppStore()
  const { data: validation, isLoading } = useValidationResult(currentSessionId)
  const retryMutation = useRetryExecution()
  const [consoleOpen, setConsoleOpen] = useState(false)

  const d = validation ?? MOCK_VALIDATION

  const handleRetry = () => {
    if (currentSessionId) retryMutation.mutate(currentSessionId)
  }

  const statusConfig = {
    success: {
      icon: CheckCircle2,
      label: 'Validation Successful',
      detail: 'Code executed without error',
      bg: 'bg-success/10 border-success/20',
      textColor: 'text-success-foreground',
    },
    failed: {
      icon: XCircle,
      label: 'Validation Failed',
      detail: 'Execution produced an error',
      bg: 'bg-destructive/10 border-destructive/20',
      textColor: 'text-destructive',
    },
    pending: {
      icon: Loader2,
      label: 'Running Validation...',
      detail: 'Please wait',
      bg: 'bg-primary/10 border-primary/20',
      textColor: 'text-primary',
    },
  }
  const sc = statusConfig[d.validationStatus]
  const StatusIcon = sc.icon

  return (
    <AppShell activeNav="validation">
      <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto">

        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-5"
          >
            {/* ── Page Header ──────────────────────────────────────── */}
            <motion.div variants={staggerItem} className="flex flex-wrap items-start justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  Fix Validation &amp; Results
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Compare original code with the AI-suggested fix
                </p>
              </motion.div>

              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <AnimatePresence>
                  {d.validationStatus === 'success' && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Fix Validated
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Attempt {d.retryCount + 1} of {d.maxRetries + 1}
                </span>
              </motion.div>
            </motion.div>

            {/* ── Side-by-side Code Panels ─────────────────────────── */}
            <motion.div variants={staggerItem}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <CodePanel
                  title="Original Code"
                  subtitle="With error on line 1"
                  code={d.originalCode}
                  accentColor="destructive"
                  highlightLines={[5]}
                />
                <CodePanel
                  title="Fixed Code"
                  subtitle="With input validation added"
                  code={d.fixedCode}
                  accentColor="success"
                  highlightLines={[2, 3, 4]}
                />
              </div>
            </motion.div>

            {/* ── Changes Summary ───────────────────────────────────── */}
            <motion.div variants={staggerItem}>
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Changes Summary</h2>
                <div className="flex flex-col gap-2">
                  {CHANGE_SUMMARY.map((c) => (
                    <ChangeSummaryChip key={c.id} {...c} />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Fix Explanation ───────────────────────────────────── */}
            <motion.div variants={staggerItem}>
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Fix Explanation</h2>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    <p className="text-xs font-semibold text-foreground">What Changed</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                    {d.whatChanged}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
                    <p className="text-xs font-semibold text-foreground">Why This Works</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                    {d.whyItWorks}
                  </p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-primary mb-0.5">Reinforced Concept</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{d.reinforcedConcept}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <div className={cn('rounded-xl border px-5 py-3.5', sc.bg)}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Status */}
                  <div className="flex items-center gap-2.5">
                    <div className={cn('flex items-center gap-1.5 text-sm font-semibold', sc.textColor)}>
                      <StatusIcon
                        className={cn(
                          'w-4 h-4',
                          d.validationStatus === 'pending' && 'animate-spin',
                        )}
                      />
                      {sc.label}
                    </div>
                    <span className="text-xs text-muted-foreground">{sc.detail}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConsoleOpen((o) => !o)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-expanded={consoleOpen}
                    >
                      Execution Output
                      <motion.div
                        animate={{ rotate: consoleOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.div>
                    </button>

                    <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Attempt {d.retryCount + 1}/{d.maxRetries + 1}
                      </span>
                      <motion.button
                        onClick={handleRetry}
                        disabled={retryMutation.isPending || d.retryCount >= d.maxRetries}
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
                          'bg-primary text-primary-foreground hover:bg-primary/90',
                          'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                        )}
                      >
                        {retryMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        Run Again
                      </motion.button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {consoleOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border/40 bg-editor-bg rounded-lg p-3 font-mono text-[11px] space-y-1">
                        <p className="text-muted-foreground">
                          Exit code:{' '}
                          <span className={d.executionOutput.exitCode === 0 ? 'text-success-foreground' : 'text-destructive'}>
                            {d.executionOutput.exitCode}
                          </span>
                          {' '}· Time: {d.executionOutput.executionTime}ms
                        </p>
                        {d.executionOutput.stdout && (
                          <pre className="text-editor-foreground/80 whitespace-pre-wrap">
                            {d.executionOutput.stdout}
                          </pre>
                        )}
                        {d.executionOutput.stderr && (
                          <pre className="text-destructive/80 whitespace-pre-wrap">
                            {d.executionOutput.stderr}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </AppShell>
  )
}