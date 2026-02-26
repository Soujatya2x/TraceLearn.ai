'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { ConceptMastery } from '@/types'

function getMasteryColor(pct: number): string {
  if (pct >= 80) return 'bg-success'
  if (pct >= 50) return 'bg-primary'
  if (pct >= 25) return 'bg-warning'
  return 'bg-destructive'
}

function getMasteryLabel(pct: number): string {
  if (pct >= 80) return 'Strong'
  if (pct >= 50) return 'Developing'
  if (pct >= 25) return 'Weak'
  return 'Gap'
}

function getMasteryLabelColor(pct: number): string {
  if (pct >= 80) return 'text-success-foreground bg-success/10 border-success/20'
  if (pct >= 50) return 'text-primary bg-primary/10 border-primary/20'
  if (pct >= 25) return 'text-warning-foreground bg-warning/10 border-warning/20'
  return 'text-destructive bg-destructive/10 border-destructive/20'
}

function AnimatedCounter({ value, delay }: { value: number; delay: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayValue = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.9,
      delay,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [count, value, delay])

  useEffect(() => {
    return rounded.on('change', (v) => {
      if (displayValue.current) displayValue.current.textContent = `${v}%`
    })
  }, [rounded])

  return (
    <span
      ref={displayValue}
      className="text-sm font-semibold text-foreground tabular-nums w-10 text-right"
    >
      0%
    </span>
  )
}

interface ConceptMasteryBarProps {
  concept: ConceptMastery
  index: number
  isGap?: boolean
}

export function ConceptMasteryBar({ concept, index, isGap = false }: ConceptMasteryBarProps) {
  const barColor = isGap ? 'bg-destructive' : getMasteryColor(concept.masteryPercentage)
  const labelStyle = isGap
    ? 'text-destructive bg-destructive/10 border-destructive/20'
    : getMasteryLabelColor(concept.masteryPercentage)
  const label = isGap ? 'Gap' : getMasteryLabel(concept.masteryPercentage)

  const enterDelay = index * 0.055

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: enterDelay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 2 }}
      className="flex flex-col gap-2 group cursor-default"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate transition-colors group-hover:text-foreground/90">
            {concept.category}
          </span>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: enterDelay + 0.15 }}
            className={cn(
              'hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border',
              labelStyle,
            )}
          >
            {label}
          </motion.span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {concept.errorFrequency > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: enterDelay + 0.2 }}
              className="text-[11px] text-muted-foreground"
            >
              {concept.errorFrequency} error{concept.errorFrequency !== 1 ? 's' : ''}
            </motion.span>
          )}
          <AnimatedCounter value={concept.masteryPercentage} delay={enterDelay + 0.2} />
        </div>
      </div>

      {/* Progress track */}
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={concept.masteryPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${concept.category} mastery: ${concept.masteryPercentage}%`}
      >
        {/* Background track glow on hover */}
        <motion.div
          className={cn('h-full rounded-full relative', barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${concept.masteryPercentage}%` }}
          transition={{
            duration: 0.85,
            delay: enterDelay + 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
        </motion.div>
      </div>
    </motion.div>
  )
}