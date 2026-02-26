'use client'

import { motion } from 'framer-motion'
import { Map, RefreshCw, CalendarDays } from 'lucide-react'
import type { LearningRoadmap } from '@/types'

const textReveal = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
}

interface RoadmapHeaderProps {
  roadmap: LearningRoadmap
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function RoadmapHeader({ roadmap, onRefresh, isRefreshing }: RoadmapHeaderProps) {
  const generatedDate = new Date(roadmap.generatedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/10"
        >
          <Map className="w-5 h-5 text-primary" aria-hidden="true" />
        </motion.div>

        <div>
          <motion.h1
            variants={textReveal}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl font-semibold text-foreground"
          >
            Learning Roadmap
          </motion.h1>

          <motion.p
            variants={textReveal}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm text-muted-foreground mt-0.5"
          >
            AI-generated skill analysis based on{' '}
            <span className="font-medium text-foreground">
              {roadmap.analysisBasedOn} session{roadmap.analysisBasedOn !== 1 ? 's' : ''}
            </span>
          </motion.p>

          <motion.div
            variants={textReveal}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground"
          >
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Last updated {generatedDate}</span>
          </motion.div>
        </div>
      </div>

      {onRefresh && (
        <motion.button
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Refresh roadmap"
        >
          <motion.span
            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isRefreshing
                ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
                : { duration: 0 }
            }
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </motion.span>
          Refresh
        </motion.button>
      )}
    </motion.div>
  )
}