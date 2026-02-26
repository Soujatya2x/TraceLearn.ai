'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Presentation, BarChart2,
  Download, Eye, Share2, Check,
  Calendar, HardDrive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardSlideUp } from '@/animations/variants'
import type { Artifact } from '@/types'


const TYPE_CONFIG = {
  pdf: {
    icon: FileText,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    label: 'PDF',
    borderHover: 'hover:border-rose-500/30',
    glow: 'rgba(244,63,94,0.08)',
  },
  ppt: {
    icon: Presentation,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    label: 'PPT',
    borderHover: 'hover:border-amber-500/30',
    glow: 'rgba(245,158,11,0.08)',
  },
  summary: {
    icon: BarChart2,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    label: 'Summary',
    borderHover: 'hover:border-emerald-500/30',
    glow: 'rgba(16,185,129,0.08)',
  },
} as const

// ─── Download progress bar ────────────────────────────────────────────────────

function DownloadBar({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden bg-primary/10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="h-full bg-primary rounded-full"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={onDone}
      />
    </motion.div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface ArtifactCardProps {
  artifact: Artifact
  delay?: number
}

export function ArtifactCard({ artifact, delay = 0 }: ArtifactCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded]   = useState(false)
  const [hovered, setHovered]         = useState(false)

  const config = TYPE_CONFIG[artifact.type]
  const Icon   = config.icon

  const handleDownload = async () => {
    if (downloading || downloaded) return
    setDownloading(true)
  }

  const handleDownloadDone = () => {
    window.open(artifact.s3Url, '_blank')
    setDownloading(false)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  const formattedDate = new Date(artifact.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const sizeLabel = artifact.size
    ? artifact.size >= 1024 * 1024
      ? `${(artifact.size / 1024 / 1024).toFixed(1)} MB`
      : `${(artifact.size / 1024).toFixed(0)} KB`
    : null

  return (
    <motion.div
      variants={cardSlideUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        'relative bg-card border border-border rounded-xl p-5 flex flex-col gap-4',
        'transition-all duration-200',
        config.borderHover,
        hovered && 'shadow-lg -translate-y-0.5',
      )}
    >
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${config.glow} 0%, transparent 65%)` }}
      />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative flex items-start gap-3.5">

        <motion.div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            config.iconBg,
          )}
          animate={hovered ? { scale: 1.08, rotate: -4 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Icon className={cn('w-5 h-5', config.iconColor)} aria-hidden="true" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide', config.badge)}>
            {config.label}
          </span>

          <p className="text-sm font-semibold text-foreground mt-1 leading-snug line-clamp-2">
            {artifact.title}
          </p>

          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {artifact.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
              <Calendar className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
              {formattedDate}
            </span>
            {sizeLabel && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <HardDrive className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
                {sizeLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="relative flex items-center gap-1.5 pt-3 border-t border-border">

        <motion.a
          href={artifact.s3Url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Preview ${artifact.title}`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </motion.a>

        <motion.button
          type="button"
          onClick={handleDownload}
          disabled={downloading || downloaded}
          aria-label={`Download ${artifact.title}`}
          whileHover={!downloading && !downloaded ? { scale: 1.03 } : undefined}
          whileTap={!downloading && !downloaded ? { scale: 0.96 } : undefined}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            downloaded
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60',
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {downloaded ? (
              <motion.span
                key="check"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Saved
              </motion.span>
            ) : (
              <motion.span
                key="dl"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <motion.span
                  animate={downloading ? { y: [0, 2, 0] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Download className="w-3.5 h-3.5" />
                </motion.span>
                {downloading ? 'Saving…' : 'Download'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          aria-label={`Share ${artifact.title}`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </motion.button>
      </div>

      <AnimatePresence>
        {downloading && <DownloadBar onDone={handleDownloadDone} />}
      </AnimatePresence>
    </motion.div>
  )
}