'use client'

// ============================================================
// TraceLearn.ai — PreviewBadge
//
// A subtle badge shown when a page is rendering mock/demo data
// because the backend feature isn't live yet.
//
// Judges see: "This is how it will look when the AI agent
// returns data for this feature."
// ============================================================

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface PreviewBadgeProps {
  /** Show the badge */
  visible: boolean
  /** Custom label — defaults to "Preview" */
  label?: string
  /** Extra class for positioning */
  className?: string
}

export function PreviewBadge({
  visible,
  label = 'Preview',
  className = '',
}: PreviewBadgeProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
            border border-primary/25 bg-primary/8 backdrop-blur-sm
            text-[10px] font-semibold uppercase tracking-widest text-primary
            select-none pointer-events-none ${className}`}
          title="This section shows demo data. Live data will appear here once the AI agent feature is complete."
          aria-label="Preview mode — showing demo data"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          >
            <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
          </motion.div>
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Inline variant — sits inside a page header row ──────────

export function PreviewBadgeInline({ visible }: { visible: boolean }) {
  return <PreviewBadge visible={visible} className="ml-2 relative top-px" />
}