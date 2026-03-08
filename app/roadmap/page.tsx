'use client'

import { motion } from 'framer-motion'
import { AppShell } from '@/components/layouts/AppShell'
import { StatsCard } from '@/components/ui/StatsCard'
import { RoadmapHeader } from '@/features/roadmap/RoadmapHeader'
import { ConceptMasteryBar } from '@/features/roadmap/ConceptMasteryBar'
import { KnowledgeGapChart } from '@/features/roadmap/KnowledgeGapChart'
import { RecommendedTopicCard } from '@/features/roadmap/RecommendedTopicCard'
import { NextStepCard } from '@/features/roadmap/NextStepCard'
import { RoadmapSkeletonLoader } from '@/features/roadmap/RoadmapSkeletonLoader'
import { useRoadmap } from '@/hooks/useArtifacts'
import { useAppStore } from '@/store/useAppStore'
import { staggerContainer } from '@/animations/variants'
import {
  BrainCircuit, Target, TrendingUp, BookOpen,
  Lightbulb, AlertTriangle, CheckCircle2, FileQuestion,
} from 'lucide-react'

// ─── No data state ────────────────────────────────────────────────────────────

function NoDataState() {
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
        <p className="text-base font-semibold text-foreground">No roadmap yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Complete a few analysis sessions and the AI will generate your personalized learning roadmap here.
        </p>
      </div>
    </motion.div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, color = 'text-primary', iconBg = 'bg-primary/10', id,
}: {
  icon: React.ElementType; title: string; subtitle?: string
  color?: string; iconBg?: string; id?: string
}) {
  return (
    <div id={id} className="flex items-start gap-3 mb-5">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { userId } = useAppStore()

  const roadmapQuery = useRoadmap(userId)
  const roadmap      = roadmapQuery.data

  if (!userId || roadmapQuery.isLoading) {
    return (
      <AppShell activeNav="roadmap">
        <div className="px-6 py-8 max-w-6xl mx-auto">
          <RoadmapSkeletonLoader />
        </div>
      </AppShell>
    )
  }

  if (!roadmap) {
    return (
      <AppShell activeNav="roadmap">
        <div className="px-6 py-8 max-w-6xl mx-auto">
          <NoDataState />
        </div>
      </AppShell>
    )
  }

  const avgMastery = Math.round(
    roadmap.conceptMastery.reduce((acc, c) => acc + c.masteryPercentage, 0) /
    roadmap.conceptMastery.length,
  )
  const topStrength = [...roadmap.conceptMastery].sort((a, b) => b.masteryPercentage - a.masteryPercentage)[0]
  const biggestGap  = roadmap.knowledgeGaps[0]

  return (
    <AppShell activeNav="roadmap">
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-10">

        {/* ── Page Header ─────────────────────────────────────── */}
        <RoadmapHeader
          roadmap={roadmap}
          onRefresh={() => roadmapQuery.refetch()}
          isRefreshing={roadmapQuery.isFetching}
        />

        {/* ── Summary Stats ────────────────────────────────────── */}
        <motion.div
          variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatsCard label="Avg. Mastery"      value={`${avgMastery}%`}                    icon={BrainCircuit}  color="primary"     delay={0}    trend="Across all concepts" />
          <StatsCard label="Concepts Tracked"  value={roadmap.conceptMastery.length}        icon={BookOpen}      color="warning"     delay={0.05} trend="In your profile" />
          <StatsCard label="Top Strength"      value={topStrength?.category ?? '—'}         icon={CheckCircle2}  color="success"     delay={0.1}  trend={`${topStrength?.masteryPercentage ?? 0}% mastery`} />
          <StatsCard label="Priority Gap"      value={biggestGap?.category ?? '—'}          icon={AlertTriangle} color="destructive" delay={0.15} trend={`${biggestGap?.masteryPercentage ?? 0}% mastery`} />
        </motion.div>

        {/* ── Knowledge Gap Analysis ───────────────────────────── */}
        <section aria-labelledby="gap-analysis-heading">
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader
              icon={Target} title="Knowledge Gap Analysis"
              subtitle="Concept mastery levels based on your error patterns"
              id="gap-analysis-heading"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-5">
                {roadmap.conceptMastery.map((concept, i) => (
                  <ConceptMasteryBar
                    key={concept.category} concept={concept} index={i}
                    isGap={roadmap.knowledgeGaps.some((g) => g.category === concept.category)}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skill Radar</p>
                <KnowledgeGapChart data={roadmap.conceptMastery} />
                <p className="text-[11px] text-muted-foreground text-center">
                  Outer edge = 100% mastery. Gaps appear as indentations.
                </p>
              </div>
            </div>
            {roadmap.knowledgeGaps.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Priority Knowledge Gaps</p>
                <div className="flex flex-wrap gap-2">
                  {roadmap.knowledgeGaps.map((gap) => (
                    <span key={gap.category}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" aria-hidden="true" />
                      {gap.category}
                      <span className="text-destructive/70 font-normal">·</span>
                      <span className="text-destructive/80">{gap.masteryPercentage}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Recommended Topics ───────────────────────────────── */}
        {roadmap.recommendedTopics.length > 0 && (
          <section aria-labelledby="recommended-heading">
            <SectionHeader
              icon={Lightbulb} title="Recommended Topics"
              subtitle={`${roadmap.recommendedTopics.length} personalized topics based on your error history`}
              color="text-warning-foreground" iconBg="bg-warning/10"
            />
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {(['high', 'medium', 'low'] as const).map((p) => {
                const count  = roadmap.recommendedTopics.filter((t) => t.priority === p).length
                if (count === 0) return null
                const styles = {
                  high:   'bg-destructive/10 text-destructive border-destructive/20',
                  medium: 'bg-warning/10 border-warning/20 text-green-700',
                  low:    'bg-success/10 text-success-foreground border-success/20',
                }
                return (
                  <span key={p}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border select-none ${styles[p]}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)} ({count})
                  </span>
                )
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roadmap.recommendedTopics.map((topic, i) => (
                <RecommendedTopicCard key={topic.id} topic={topic} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Next Steps ───────────────────────────────────────── */}
        {roadmap.nextSteps.length > 0 && (
          <section aria-labelledby="next-steps-heading">
            <SectionHeader
              icon={TrendingUp} title="Next Steps"
              subtitle="Actionable recommendations to advance your learning"
              color="text-success-foreground" iconBg="bg-success/10"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roadmap.nextSteps.map((step, i) => (
                <NextStepCard key={step.id} step={step} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="text-center py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Roadmap generated from{' '}
            <span className="font-medium text-foreground">{roadmap.analysisBasedOn}</span>{' '}
            analyzed sessions.
          </p>
        </div>

      </div>
    </AppShell>
  )
}