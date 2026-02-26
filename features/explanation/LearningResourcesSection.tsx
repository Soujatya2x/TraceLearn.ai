'use client'

import { motion } from 'framer-motion'
import { ExternalLink, BookMarked, Clock, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react'
import { staggerItem, staggerContainer } from '@/animations/variants'
import { cn } from '@/lib/utils'
import type { ErrorExplanation } from '@/types'

interface LearningResourcesSectionProps {
  explanation: ErrorExplanation
}


const TYPE_STYLES: Record<string, { pill: string; dot: string }> = {
  documentation: { pill: 'bg-primary/10 text-primary',         dot: 'bg-primary'     },
  article:       { pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500'   },
  video:         { pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',     dot: 'bg-rose-500'    },
  tutorial:      { pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
}


export function LearningResourcesSection({ explanation }: LearningResourcesSectionProps) {
  return (
    <motion.div variants={staggerItem} className="space-y-6">

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookMarked className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Learning Resources</h2>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {explanation.learningResources.map((resource, i) => {
            const styles = TYPE_STYLES[resource.type] ?? TYPE_STYLES.article
            return (
              <motion.a
                key={i}
                variants={staggerItem}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="group flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-colors"
                aria-label={`${resource.title} — ${resource.source}`}
              >
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', styles.dot)} aria-hidden="true" />

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {resource.title}
                    </p>
                    <ExternalLink
                      className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{resource.source}</span>
                    <span className={cn('px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide', styles.pill)}>
                      {resource.type}
                    </span>
                  </div>
                </div>
              </motion.a>
            )
          })}
        </motion.div>
      </div>

      {explanation.similarErrorsHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Similar Errors You&apos;ve Faced
            </h2>
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {explanation.similarErrorsHistory.length} found
            </span>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-2"
          >
            {explanation.similarErrorsHistory.map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                {/* Resolved / open icon */}
                {item.resolved
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" aria-label="Resolved" />
                  : <AlertCircle  className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"   aria-label="Open"     />
                }

                <span className="text-sm font-mono text-foreground flex-1 truncate">
                  {item.errorType}
                </span>

                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {item.date}
                </div>

                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                    item.resolved
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  )}
                >
                  {item.resolved ? 'Resolved' : 'Open'}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}