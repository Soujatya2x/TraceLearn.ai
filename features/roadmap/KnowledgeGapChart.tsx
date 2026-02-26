'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { ConceptMastery } from '@/types'

interface KnowledgeGapChartProps {
  data: ConceptMastery[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const pct = entry.value as number
  const color =
    pct >= 80
      ? 'text-emerald-500'
      : pct >= 50
        ? 'text-primary'
        : pct >= 25
          ? 'text-amber-500'
          : 'text-destructive'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs"
    >
      <p className="font-semibold text-foreground">{entry.payload.category}</p>
      <p className="text-muted-foreground mt-0.5">
        Mastery:{' '}
        <span className={`font-bold ${color}`}>{pct}%</span>
      </p>
    </motion.div>
  )
}

function ActiveDot(props: any) {
  const { cx, cy, fill } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={fill} stroke="white" strokeWidth={1.5} />
    </g>
  )
}

export function KnowledgeGapChart({ data }: KnowledgeGapChartProps) {
  const [revealed, setRevealed] = useState(false)

  const chartData = data.map((item) => ({
    category: item.category,
    mastery: item.masteryPercentage,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => setRevealed(true)}
      className="w-full h-[260px]"
      aria-label="Knowledge gap radar chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
          <PolarGrid
            stroke="oklch(0.91 0.008 264)"
            strokeDasharray="4 3"
            strokeOpacity={0.7}
          />
          <PolarAngleAxis
            dataKey="category"
            tick={{
              fontSize: 11,
              fill: 'oklch(0.52 0.015 264)',
              fontFamily: 'var(--font-inter)',
            }}
          />
          <Radar
            name="Mastery"
            dataKey="mastery"
            stroke="oklch(0.511 0.237 264.052)"
            fill="oklch(0.511 0.237 264.052)"
            fillOpacity={revealed ? 0.18 : 0}
            strokeWidth={2}
            dot={false}
            activeDot={<ActiveDot />}
            isAnimationActive={true}
            animationBegin={300}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
            wrapperStyle={{ outline: 'none' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}