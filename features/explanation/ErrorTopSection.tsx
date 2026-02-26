'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronDown, FileCode, Hash, Copy, Check } from 'lucide-react'
import { staggerItem } from '@/animations/variants'
import { cn } from '@/lib/utils'
import type { ErrorExplanation } from '@/types'

interface ErrorTopSectionProps {
  explanation: ErrorExplanation
}

export function ErrorTopSection({ explanation }: ErrorTopSectionProps) {
  const [stackOpen, setStackOpen] = useState(false)
  const [copied, setCopied]       = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(explanation.stackTrace.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div variants={staggerItem} className="space-y-4">

      <div className="flex items-start gap-4 p-5 bg-destructive/5 border border-destructive/20 rounded-xl">
        <motion.div
          className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5"
          initial={{ scale: 0.7, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-md font-mono">
              {explanation.errorType}
            </span>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileCode className="w-3 h-3" aria-hidden="true" />
              <span>{explanation.file}</span>
              <Hash className="w-3 h-3 ml-1" aria-hidden="true" />
              <span className="font-mono text-foreground/70">
                Line {explanation.lineNumber}
              </span>
            </div>
          </div>

          <p className="mt-2 text-sm text-foreground font-mono leading-relaxed bg-muted/50 px-3 py-2 rounded-lg">
            {explanation.errorMessage}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setStackOpen((o) => !o)}
            className="flex-1 flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
            aria-expanded={stackOpen}
            aria-controls="stack-trace-body"
          >
            <span className="flex items-center gap-2">
              <span>Stack Trace</span>
              <span className="text-xs text-muted-foreground font-normal tabular-nums">
                ({explanation.stackTrace.length} frames)
              </span>
            </span>
            <motion.div
              animate={{ rotate: stackOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </motion.div>
          </button>

          <AnimatePresence>
            {stackOpen && (
              <motion.button
                key="copy"
                type="button"
                onClick={handleCopy}
                aria-label="Copy stack trace"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="flex items-center gap-1 text-emerald-500"
                    >
                      <Check className="w-3 h-3" aria-hidden="true" />
                      Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Copy
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          id="stack-trace-body"
          animate={{ height: stackOpen ? 'auto' : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="border-t border-border px-4 pb-4 pt-3">
            <pre className="text-xs font-mono leading-relaxed overflow-x-auto">
              {explanation.stackTrace.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className={cn(
                    'px-2 py-0.5 rounded transition-colors',
                    line.includes(explanation.file)
                      ? 'text-destructive/80 bg-destructive/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  {line}
                </motion.div>
              ))}
            </pre>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}