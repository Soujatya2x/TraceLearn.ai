'use client'

import { motion } from 'framer-motion'
import { FolderOpen, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { fadeIn } from '@/animations/variants'

interface ArtifactsEmptyStateProps {
  isSearching?: boolean
}

export function ArtifactsEmptyState({ isSearching = false }: ArtifactsEmptyStateProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-20 text-center"
      role="status"
      aria-label={isSearching ? 'No search results' : 'No artifacts yet'}
    >
      {/* Icon container — floats gently when not searching */}
      <div className="relative mb-5">
        {/* Soft glow ring behind icon */}
        {!isSearching && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <motion.div
          className="relative w-14 h-14 rounded-2xl bg-muted flex items-center justify-center"
          animate={
            isSearching
              ? {}
              : { y: [0, -5, 0] }
          }
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isSearching ? (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Search className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
            >
              <FolderOpen className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Heading */}
      <motion.h3
        className="text-base font-semibold text-foreground"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {isSearching ? 'No matching artifacts' : 'No artifacts yet'}
      </motion.h3>

      {/* Body */}
      <motion.p
        className="text-sm text-muted-foreground mt-1.5 max-w-xs text-balance"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.3 }}
      >
        {isSearching
          ? 'Try a different search term or clear the filter.'
          : 'Complete an analysis session to generate PDF reports, presentations, and summaries.'}
      </motion.p>

      {/* CTA */}
      {!isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.3 }}
          className="mt-6"
        >
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.03, x: 1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Start analyzing code
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
              >
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.span>
            </motion.span>
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}