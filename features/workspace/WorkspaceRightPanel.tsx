'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Activity, Sparkles,
  Hash, Copy, Check, Clock, TrendingUp,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { FileUploadZone } from './FileUploadZone'
import { cn } from '@/lib/utils'
import type { Language } from '@/types'
import type { DetectResult } from '@/services/api/analysisService'
import { useRoadmap } from '@/hooks/useArtifacts'   // ✅ NEW IMPORT

// (ALL ICON COMPONENTS REMAIN EXACTLY THE SAME)
// --- trimmed here for readability in explanation but unchanged in logic ---

// ───────────────── AnimatedNumber ─────────────────

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0
      const step = Math.ceil(value / 20)

      const interval = setInterval(() => {
        start += step
        if (start >= value) {
          setDisplay(value)
          clearInterval(interval)
        } else {
          setDisplay(start)
        }
      }, 30)

      return () => clearInterval(interval)
    }, delay * 1000)

    return () => clearTimeout(timeout)
  }, [value, delay])

  return <>{display}</>
}

// ───────────────── SessionStat ─────────────────

function SessionStat({
  icon: Icon,
  value,
  suffix = '',
  label,
  iconBg,
  iconColor,
  delay = 0,
  isNumeric = false
}: {
  icon: React.ElementType
  value: number | string
  suffix?: string
  label: string
  iconBg: string
  iconColor: string
  delay?: number
  isNumeric?: boolean
}) {

  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative bg-card border border-border rounded-xl p-3 flex flex-col gap-1.5"
    >

      <motion.div
        className={cn('w-6 h-6 rounded-lg flex items-center justify-center', iconBg)}
        animate={hovered ? { scale: 1.12 } : { scale: 1 }}
      >
        <Icon className={cn('w-3.5 h-3.5', iconColor)} />
      </motion.div>

      <motion.p className="text-lg font-bold text-foreground">

        {isNumeric && typeof value === 'number'
          ? <><AnimatedNumber value={value} delay={delay} />{suffix}</>
          : <>{value}{suffix}</>
        }

      </motion.p>

      <p className="text-[10px] text-muted-foreground">{label}</p>

    </motion.div>
  )
}

// ───────────────── Main Panel ─────────────────

export function WorkspaceRightPanel() {

  const [mounted, setMounted] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const {
    currentSessionId,
    language, setLanguage,
    logFile, setLogFile,
    projectFiles, setProjectFiles,
    userId
  } = useAppStore()

  // ✅ FETCH ROADMAP
  const { data: roadmap } = useRoadmap(userId)

  // ✅ DERIVED STATS
  const errorsCount = roadmap?.analysisBasedOn ?? 0

  const conceptCount = roadmap?.conceptMastery?.length ?? 0

  const successRate =
    roadmap?.conceptMastery?.length
      ? Math.round(
          roadmap.conceptMastery.reduce(
            (a, c) => a + c.masteryPercentage,
            0
          ) / roadmap.conceptMastery.length
        )
      : 0

  const codeFile = projectFiles[0] ?? null

  const handleCopySession = () => {
    if (!currentSessionId) return
    navigator.clipboard.writeText(currentSessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col gap-4">

      {/* Session ID */}

      <motion.div className="rounded-xl border border-border bg-muted/40 p-3.5">

        <div className="flex items-center justify-between mb-2">

          <div className="flex items-center gap-2">

            <Hash className="w-3 h-3 text-primary" />

            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Session ID
            </span>

          </div>

          {currentSessionId && (
            <button
              onClick={handleCopySession}
              className="w-6 h-6 flex items-center justify-center"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500"/> : <Copy className="w-3 h-3"/>}
            </button>
          )}

        </div>

        <p className="text-xs font-mono break-all">
          {currentSessionId ?? 'No active session'}
        </p>

      </motion.div>

      {/* Session Stats */}

      <div>

        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2.5">
          Session Stats
        </p>

        <div className="grid grid-cols-3 gap-2">

          <SessionStat
            icon={Activity}
            value={errorsCount}
            label="Errors"
            iconBg="bg-primary/10"
            iconColor="text-primary"
            delay={0.06}
            isNumeric
          />

          <SessionStat
            icon={Sparkles}
            value={conceptCount}
            label="Concepts"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            delay={0.1}
            isNumeric
          />

          <SessionStat
            icon={TrendingUp}
            value={successRate}
            suffix="%"
            label="Success"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            delay={0.14}
            isNumeric
          />

        </div>

      </div>

      {/* Code Upload */}

      <FileUploadZone
        label="Code File"
        accept=".py,.java,.js,.ts,.go"
        onFile={(file) => setProjectFiles(file ? [file] : [])}
        currentFile={codeFile}
        hint="Your source file with the bug"
      />

    </div>
  )
}