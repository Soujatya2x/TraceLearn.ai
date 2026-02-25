'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { diffSweep } from '@/animations/variants'
import type { DiffLine } from '@/types'

interface CodeDiffViewerProps {
  diffLines: DiffLine[]
  addedCount?: number
  removedCount?: number
}

export function CodeDiffViewer({ diffLines, addedCount, removedCount }: CodeDiffViewerProps) {
  const [copied, setCopied]           = useState(false)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)

  // Derive counts if not passed in
  const added   = addedCount   ?? diffLines.filter((l) => l.type === 'added').length
  const removed = removedCount ?? diffLines.filter((l) => l.type === 'removed').length

  const handleCopy = async () => {
    const text = diffLines.map((l) => {
      const prefix = l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  '
      return prefix + l.content
    }).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">

      {/* ── Diff header ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Diff</span>
          <div className="flex items-center gap-1.5">
            {added > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Plus className="w-3 h-3" aria-hidden="true" />
                {added}
              </span>
            )}
            {removed > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <Minus className="w-3 h-3" aria-hidden="true" />
                {removed}
              </span>
            )}
          </div>
        </div>

        {/* Copy diff button */}
        <motion.button
          type="button"
          onClick={handleCopy}
          aria-label="Copy diff"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              </motion.div>
            ) : (
              <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Diff table ───────────────────────────────────── */}
      <div className="overflow-x-auto scrollbar-thin bg-editor-bg">
        <table className="w-full text-xs font-mono" aria-label="Code diff">
          <thead className="sr-only">
            <tr>
              <th>Old line</th>
              <th>New line</th>
              <th>Type</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {diffLines.map((line, i) => {
              const isChanged  = line.type !== 'unchanged'
              const isHovered  = hoveredLine === i
              return (
                <motion.tr
                  key={i}
                  custom={i}
                  variants={isChanged ? diffSweep : undefined}
                  initial={isChanged ? 'initial' : undefined}
                  animate={isChanged ? 'animate' : undefined}
                  onHoverStart={() => setHoveredLine(i)}
                  onHoverEnd={() => setHoveredLine(null)}
                  className={cn(
                    'transition-colors',
                    line.type === 'added'   && 'bg-emerald-500/10',
                    line.type === 'removed' && 'bg-rose-500/10',
                    isHovered && line.type === 'unchanged' && 'bg-white/[0.02]',
                  )}
                >
                  {/* Old line number */}
                  <td className="w-10 px-2 py-0.5 text-muted-foreground/40 text-right select-none border-r border-border/30 tabular-nums">
                    {(line.type === 'removed' || line.type === 'unchanged') ? line.lineNumber : ''}
                  </td>

                  {/* New line number */}
                  <td className="w-10 px-2 py-0.5 text-muted-foreground/40 text-right select-none border-r border-border/30 tabular-nums">
                    {(line.type === 'added' || line.type === 'unchanged') ? line.lineNumber : ''}
                  </td>

                  {/* Type gutter */}
                  <td className="w-6 text-center select-none border-r border-border/20 py-0.5">
                    {line.type === 'added'   && <Plus  className="w-3 h-3 text-emerald-500 mx-auto" aria-label="Added"   />}
                    {line.type === 'removed' && <Minus className="w-3 h-3 text-rose-500   mx-auto" aria-label="Removed" />}
                  </td>

                  {/* Code content */}
                  <td className="px-3 py-0.5 whitespace-pre">
                    <span
                      className={cn(
                        'leading-5',
                        line.type === 'added'     && 'text-emerald-400',
                        line.type === 'removed'   && 'text-rose-400 line-through opacity-70',
                        line.type === 'unchanged' && 'text-zinc-300',
                      )}
                    >
                      {line.content}
                    </span>
                    {/* Inline comment */}
                    {line.comment && line.type !== 'unchanged' && (
                      <span className="ml-4 text-primary/50 italic text-[10px] not-italic font-sans">
                        ← {line.comment}
                      </span>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}