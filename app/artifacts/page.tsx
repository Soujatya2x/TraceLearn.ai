'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layouts/AppShell'
import { ArtifactCard } from '@/features/artifacts/ArtifactCard'
import { ArtifactsFilterBar } from '@/features/artifacts/ArtifactsFilterBar'
import { ArtifactsEmptyState } from '@/features/artifacts/ArtifactsEmptyState'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useArtifacts } from '@/hooks/useArtifacts'
import { useAppStore } from '@/store/useAppStore'
import { staggerContainer, cardSlideUp } from '@/animations/variants'
import { BarChart3, BookOpen, TrendingUp, Flame, FolderOpen, FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ArtifactType } from '@/types'
import type { LucideIcon } from 'lucide-react'

// ─── Animated count-up ────────────────────────────────────────────────────────

function CountUp({ to, suffix = '', delay = 0 }: { to: number; suffix?: string; delay?: number }) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    const timeout = setTimeout(() => {
      started.current = true
      const steps = 24; const step = to / steps; let current = 0
      const iv = setInterval(() => {
        current += step
        if (current >= to) { setValue(to); clearInterval(iv) } else setValue(Math.round(current))
      }, 28)
      return () => clearInterval(iv)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [to, delay])
  return <>{value}{suffix}</>
}

// ─── Metric card ──────────────────────────────────────────────────────────────

const STAT_COLORS: Record<string, { icon: string; bg: string; glow: string }> = {
  primary:     { icon: 'text-primary',     bg: 'bg-primary/10',     glow: 'rgba(99,102,241,0.12)'  },
  warning:     { icon: 'text-amber-500',   bg: 'bg-amber-500/10',   glow: 'rgba(245,158,11,0.12)'  },
  success:     { icon: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'rgba(16,185,129,0.12)'  },
  destructive: { icon: 'text-rose-500',    bg: 'bg-rose-500/10',    glow: 'rgba(244,63,94,0.12)'   },
}

function MetricCard({
  label, rawValue, suffix, icon: Icon, color = 'primary', delay = 0, trend,
}: {
  label: string; rawValue: number; suffix?: string
  icon: LucideIcon; color?: string; delay?: number; trend?: string
}) {
  const [hovered, setHovered] = useState(false)
  const c = STAT_COLORS[color] ?? STAT_COLORS.primary
  return (
    <motion.div
      variants={cardSlideUp} initial="initial" animate="animate" transition={{ delay }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      className="relative bg-card border border-border rounded-xl p-4 overflow-hidden cursor-default"
    >
      <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.2 }}
        style={{ background: `radial-gradient(ellipse at 80% 0%, ${c.glow}, transparent 65%)` }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
            <CountUp to={rawValue} suffix={suffix} delay={delay} />
          </p>
          {trend && <p className="text-[11px] text-muted-foreground mt-1">{trend}</p>}
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

// ─── No session state ─────────────────────────────────────────────────────────

function NoSessionState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-4 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <FileQuestion className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">No artifacts yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Complete an analysis session. The AI agent generates PDFs, slides, and summaries automatically.
        </p>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArtifactsPage() {
  const { currentSessionId } = useAppStore()

  const artifactsQuery = useArtifacts(currentSessionId)
  const data           = artifactsQuery.data

  const [activeFilter, setActiveFilter] = useState<ArtifactType | 'all'>('all')
  const [searchQuery, setSearchQuery]   = useState('')
  const [filterStuck, setFilterStuck]   = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const filteredArtifacts = useMemo(() => {
    if (!data) return []
    return data.artifacts.filter((artifact) => {
      const matchesType   = activeFilter === 'all' || artifact.type === activeFilter
      const query         = searchQuery.toLowerCase()
      const matchesSearch = !query
        || artifact.title.toLowerCase().includes(query)
        || artifact.description.toLowerCase().includes(query)
      return matchesType && matchesSearch
    })
  }, [data, activeFilter, searchQuery])

  useEffect(() => {
    const el = filterRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setFilterStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: '-57px 0px 0px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isFiltering = activeFilter !== 'all' || searchQuery.length > 0

  return (
    <AppShell activeNav="artifacts">
      <div className="px-6 py-8 max-w-6xl mx-auto">

        {/* ── Page header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-8"
        >
          <motion.div
            className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0.7, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
          >
            <FolderOpen className="w-5 h-5 text-primary" aria-hidden="true" />
          </motion.div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Artifacts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generated learning materials from your analysis sessions
            </p>
          </div>
        </motion.div>

        {/* ── No session ──────────────────────────────────────── */}
        {!currentSessionId ? (
          <NoSessionState />
        ) : artifactsQuery.isLoading ? (
          <>
            {/* Metric skeletons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : !data ? (
          <NoSessionState />
        ) : (
          <>
            {/* ── Metrics row ───────────────────────────────────── */}
            <motion.div
              variants={staggerContainer} initial="initial" animate="animate"
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
            >
              <MetricCard label="Errors Analyzed"  rawValue={data.learningMetrics.totalErrorsAnalyzed} icon={BarChart3}  color="primary"     delay={0}    trend="Total sessions"   />
              <MetricCard label="Concepts Covered" rawValue={data.learningMetrics.conceptsCovered}      icon={BookOpen}   color="warning"     delay={0.05} trend="Unique concepts"  />
              <MetricCard label="Fix Success Rate" rawValue={data.learningMetrics.fixSuccessRate}        icon={TrendingUp} color="success"     delay={0.1}  trend="Validated fixes"  suffix="%" />
              <MetricCard label="Learning Streak"  rawValue={data.learningMetrics.learningStreakDays}    icon={Flame}      color="destructive" delay={0.15} trend="Consecutive days" suffix="d" />
            </motion.div>

            {/* ── Filter bar ──────────────────────────────────── */}
            <div ref={filterRef}
              className="sticky top-14 z-10 mb-5 -mx-6 px-6 py-3 transition-all duration-200"
              style={{
                background: filterStuck ? 'hsl(var(--background) / 0.92)' : 'transparent',
                backdropFilter: filterStuck ? 'blur(12px)' : 'none',
                boxShadow: filterStuck ? '0 1px 0 hsl(var(--border))' : 'none',
              }}
            >
              <ArtifactsFilterBar
                activeFilter={activeFilter} onFilterChange={setActiveFilter}
                searchQuery={searchQuery} onSearchChange={setSearchQuery}
                totalCount={filteredArtifacts.length}
              />
            </div>

            {/* ── Grid ──────────────────────────────────────────── */}
            {filteredArtifacts.length === 0 ? (
              <ArtifactsEmptyState isSearching={isFiltering} />
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`${activeFilter}-${searchQuery}`}
                  variants={staggerContainer} initial="initial" animate="animate"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredArtifacts.map((artifact, i) => (
                    <ArtifactCard key={artifact.id} artifact={artifact} delay={i * 0.05} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}

      </div>
    </AppShell>
  )
}