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
  BrainCircuit,
  Target,
  TrendingUp,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import type { LearningRoadmap } from '@/types'

// ─── Rich mock data ───────────────────────────────────────────────────────────

const MOCK_ROADMAP: LearningRoadmap = {
  userId: 'user-demo',
  analysisBasedOn: 12,
  generatedAt: new Date().toISOString(),
  conceptMastery: [
    { category: 'Error Handling', masteryPercentage: 38, errorFrequency: 7, lastSeen: new Date().toISOString() },
    { category: 'Functions', masteryPercentage: 62, errorFrequency: 4, lastSeen: new Date().toISOString() },
    { category: 'Control Flow', masteryPercentage: 74, errorFrequency: 2, lastSeen: new Date().toISOString() },
    { category: 'OOP', masteryPercentage: 45, errorFrequency: 5, lastSeen: new Date().toISOString() },
    { category: 'Data Structures', masteryPercentage: 55, errorFrequency: 3, lastSeen: new Date().toISOString() },
    { category: 'Variables', masteryPercentage: 82, errorFrequency: 1, lastSeen: new Date().toISOString() },
    { category: 'Algorithms', masteryPercentage: 30, errorFrequency: 6, lastSeen: new Date().toISOString() },
    { category: 'Async', masteryPercentage: 22, errorFrequency: 8, lastSeen: new Date().toISOString() },
  ],
  knowledgeGaps: [
    { category: 'Async', masteryPercentage: 22, errorFrequency: 8, lastSeen: new Date().toISOString() },
    { category: 'Algorithms', masteryPercentage: 30, errorFrequency: 6, lastSeen: new Date().toISOString() },
    { category: 'Error Handling', masteryPercentage: 38, errorFrequency: 7, lastSeen: new Date().toISOString() },
    { category: 'OOP', masteryPercentage: 45, errorFrequency: 5, lastSeen: new Date().toISOString() },
  ],
  recommendedTopics: [
    {
      id: 'rt-1',
      title: 'Understanding try/except in Python',
      description: 'Learn how to catch specific exception types, use finally blocks, and raise custom exceptions to write resilient code.',
      estimatedMinutes: 25,
      priority: 'high',
      category: 'Error Handling',
      resourceLinks: [
        { title: 'Python Exceptions Docs', url: 'https://docs.python.org/3/tutorial/errors.html', type: 'documentation', source: 'python.org' },
        { title: 'Real Python — Exception Handling', url: 'https://realpython.com/python-exceptions/', type: 'article', source: 'realpython.com' },
      ],
    },
    {
      id: 'rt-2',
      title: 'Async/Await & Event Loop Fundamentals',
      description: 'Understand cooperative multitasking, async def, await expressions, and how the event loop manages coroutines.',
      estimatedMinutes: 40,
      priority: 'high',
      category: 'Async',
      resourceLinks: [
        { title: 'asyncio Documentation', url: 'https://docs.python.org/3/library/asyncio.html', type: 'documentation', source: 'python.org' },
        { title: 'AsyncIO Complete Tutorial', url: 'https://realpython.com/async-io-python/', type: 'tutorial', source: 'realpython.com' },
      ],
    },
    {
      id: 'rt-3',
      title: 'Big-O Notation & Algorithm Analysis',
      description: 'Master time and space complexity analysis to write efficient code and ace technical interviews.',
      estimatedMinutes: 30,
      priority: 'high',
      category: 'Algorithms',
      resourceLinks: [
        { title: 'Big-O Cheat Sheet', url: 'https://www.bigocheatsheet.com/', type: 'article', source: 'bigocheatsheet.com' },
      ],
    },
    {
      id: 'rt-4',
      title: 'Python Class Design & Inheritance',
      description: 'Go beyond basic classes to explore inheritance, polymorphism, abstract base classes, and dunder methods.',
      estimatedMinutes: 35,
      priority: 'medium',
      category: 'OOP',
      resourceLinks: [
        { title: 'OOP in Python', url: 'https://realpython.com/python3-object-oriented-programming/', type: 'tutorial', source: 'realpython.com' },
      ],
    },
    {
      id: 'rt-5',
      title: 'List Comprehensions & Generator Expressions',
      description: 'Write more idiomatic Python using list/dict/set comprehensions and memory-efficient generators.',
      estimatedMinutes: 20,
      priority: 'medium',
      category: 'Data Structures',
      resourceLinks: [
        { title: 'Comprehensions Guide', url: 'https://realpython.com/list-comprehension-python/', type: 'article', source: 'realpython.com' },
      ],
    },
    {
      id: 'rt-6',
      title: 'Recursion & Memoization Patterns',
      description: 'Understand the call stack, base/recursive cases, and how to optimize recursive algorithms with caching.',
      estimatedMinutes: 30,
      priority: 'low',
      category: 'Algorithms',
      resourceLinks: [],
    },
  ],
  nextSteps: [
    {
      id: 'ns-1',
      action: 'Fix your Async patterns first',
      description: 'With 8 async-related errors, this is your highest-impact area. Work through the asyncio fundamentals before moving to other topics.',
      resourceLinks: [
        { title: 'asyncio Quickstart', url: 'https://docs.python.org/3/library/asyncio-task.html', type: 'documentation', source: 'python.org' },
      ],
      practiceExercises: [
        'Write an async function that fetches 3 URLs concurrently using asyncio.gather()',
        'Convert a synchronous file reader into an async one using aiofiles',
        'Build a simple async producer-consumer queue',
      ],
    },
    {
      id: 'ns-2',
      action: 'Add error guards to your existing code',
      description: 'Review your recent sessions and add proper try/except blocks around every operation that can raise an exception.',
      resourceLinks: [
        { title: 'LBYL vs EAFP', url: 'https://realpython.com/python-lbyl-vs-eafp/', type: 'article', source: 'realpython.com' },
      ],
      practiceExercises: [
        'Identify 3 functions in your recent code that lack error handling and add guards',
        'Create a custom exception class hierarchy for a small project',
      ],
    },
    {
      id: 'ns-3',
      action: 'Solve 5 easy algorithm problems on LeetCode',
      description: 'Reinforce your algorithm knowledge by solving two-sum, valid parentheses, and similar foundational problems.',
      resourceLinks: [
        { title: 'LeetCode Easy Problems', url: 'https://leetcode.com/problemset/?difficulty=EASY', type: 'tutorial', source: 'leetcode.com' },
        { title: 'NeetCode Roadmap', url: 'https://neetcode.io/roadmap', type: 'tutorial', source: 'neetcode.io' },
      ],
      practiceExercises: [
        'Two Sum (LeetCode #1)',
        'Valid Parentheses (LeetCode #20)',
        'Reverse Linked List (LeetCode #206)',
        'Maximum Subarray (LeetCode #53)',
        'Climbing Stairs (LeetCode #70)',
      ],
    },
  ],
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color = 'text-primary',
  iconBg = 'bg-primary/10',
  id,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  color?: string
  iconBg?: string
  id?: string
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
  const { currentSessionId } = useAppStore()
  // In production, userId would come from auth; using session as proxy
  const { data: roadmapData, isLoading, refetch, isFetching } = useRoadmap(currentSessionId)

  const roadmap = roadmapData ?? MOCK_ROADMAP

  const avgMastery = Math.round(
    roadmap.conceptMastery.reduce((acc, c) => acc + c.masteryPercentage, 0) /
      roadmap.conceptMastery.length,
  )
  const topStrength = [...roadmap.conceptMastery].sort(
    (a, b) => b.masteryPercentage - a.masteryPercentage,
  )[0]
  const biggestGap = roadmap.knowledgeGaps[0]

  if (isLoading) {
    return (
      <AppShell activeNav="roadmap">
        <div className="px-6 py-8 max-w-6xl mx-auto">
          <RoadmapSkeletonLoader />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell activeNav="roadmap">
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-10">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <RoadmapHeader
          roadmap={roadmap}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />

        {/* ── Summary Stats ─────────────────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatsCard
            label="Avg. Mastery"
            value={`${avgMastery}%`}
            icon={BrainCircuit}
            color="primary"
            delay={0}
            trend="Across all concepts"
          />
          <StatsCard
            label="Concepts Tracked"
            value={roadmap.conceptMastery.length}
            icon={BookOpen}
            color="warning"
            delay={0.05}
            trend="In your profile"
          />
          <StatsCard
            label="Top Strength"
            value={topStrength?.category ?? '—'}
            icon={CheckCircle2}
            color="success"
            delay={0.1}
            trend={`${topStrength?.masteryPercentage ?? 0}% mastery`}
          />
          <StatsCard
            label="Priority Gap"
            value={biggestGap?.category ?? '—'}
            icon={AlertTriangle}
            color="destructive"
            delay={0.15}
            trend={`${biggestGap?.masteryPercentage ?? 0}% mastery`}
          />
        </motion.div>

        {/* ── Section 1: Knowledge Gap Analysis ────────────────────────── */}
        <section aria-labelledby="gap-analysis-heading">
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader
              icon={Target}
              title="Knowledge Gap Analysis"
              subtitle="Concept mastery levels based on your error patterns"
              id="gap-analysis-heading"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Progress bars */}
              <div className="space-y-5">
                {roadmap.conceptMastery.map((concept, i) => (
                  <ConceptMasteryBar
                    key={concept.category}
                    concept={concept}
                    index={i}
                    isGap={roadmap.knowledgeGaps.some((g) => g.category === concept.category)}
                  />
                ))}
              </div>

              {/* chart */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Skill Radar
                </p>
                <KnowledgeGapChart data={roadmap.conceptMastery} />
                <p className="text-[11px] text-muted-foreground text-center">
                  Outer edge = 100% mastery. Gaps appear as indentations.
                </p>
              </div>
            </div>

            {/* Knowledge gaps highlight strip */}
            {roadmap.knowledgeGaps.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Priority Knowledge Gaps
                </p>
                <div className="flex flex-wrap gap-2">
                  {roadmap.knowledgeGaps.map((gap) => (
                    <span
                      key={gap.category}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20"
                    >
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

        {/* ── Section 2: Recommended Topics ────────────────────────────── */}
        <section aria-labelledby="recommended-heading">
          <SectionHeader
            icon={Lightbulb}
            title="Recommended Topics"
            subtitle={`${roadmap.recommendedTopics.length} personalized topics based on your error history`}
            color="text-warning-foreground"
            iconBg="bg-warning/10"
          />

          {/* Priority filter row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(['high', 'medium', 'low'] as const).map((p) => {
              const count = roadmap.recommendedTopics.filter((t) => t.priority === p).length
              const styles = {
                high: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
                medium: 'bg-warning/10 border-warning/20 hover:bg-warning/20 text-green-700',
                low: 'bg-success/10 text-success-foreground border-success/20 hover:bg-success/20',
              }
              return (
                <span
                  key={p}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default select-none transition-colors ${styles[p]}`}
                >
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

        {/* ── Section 3: Next Steps ─────────────────────────────────────── */}
        <section aria-labelledby="next-steps-heading">
          <SectionHeader
            icon={TrendingUp}
            title="Next Steps"
            subtitle="Actionable recommendations to advance your learning"
            color="text-success-foreground"
            iconBg="bg-success/10"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roadmap.nextSteps.map((step, i) => (
              <NextStepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </section>

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <div className="text-center py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Roadmap generated from{' '}
            <span className="font-medium text-foreground">{roadmap.analysisBasedOn}</span>{' '}
            analyzed sessions. Complete more sessions to improve personalization accuracy.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
