'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { cardSlideUp } from '@/animations/variants'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  color?: 'primary' | 'success' | 'warning' | 'destructive'
  delay?: number
}

const COLOR_MAP: Record<string, { icon: string; bg: string; glow: string }> = {
  primary:     { icon: 'text-primary',     bg: 'bg-primary/10',     glow: 'rgba(99,102,241,0.12)'  },
  success:     { icon: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'rgba(16,185,129,0.12)'  },
  warning:     { icon: 'text-amber-500',   bg: 'bg-amber-500/10',   glow: 'rgba(245,158,11,0.12)'  },
  destructive: { icon: 'text-rose-500',    bg: 'bg-rose-500/10',    glow: 'rgba(244,63,94,0.12)'   },
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  delay = 0,
}: StatsCardProps) {
  const [hovered, setHovered] = useState(false)
  const c = COLOR_MAP[color] ?? COLOR_MAP.primary

  return (
    <motion.div
      variants={cardSlideUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative bg-card border border-border rounded-xl p-4 overflow-hidden cursor-default"
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ background: `radial-gradient(ellipse at 80% 0%, ${c.glow}, transparent 65%)` }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
            {value}
          </p>
          {trend && (
            <p className="text-[11px] text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <motion.div
          className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', c.bg)}
          animate={hovered ? { scale: 1.1, rotate: -6 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        >
          <Icon className={cn('w-4 h-4', c.icon)} aria-hidden="true" />
        </motion.div>
      </div>
    </motion.div>
  )
}