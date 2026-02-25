/**
 * app/explanation/loading.tsx — Error Explanation page skeleton
 *
 * Mirrors the real explanation page exactly:
 *   1. Page header (title + subtitle)
 *   2. ErrorTopSection  — error type badge, message, file/line meta, stack trace
 *   3. Divider
 *   4. AIExplanationSection — "Why This Happened" prose, concept callout, step-by-step
 *   5. Divider
 *   6. LearningResourcesSection — 3-up resource cards + similar errors history
 */

import { AppShell } from '@/components/layouts/AppShell'
import { Skeleton } from '@/components/ui/SkeletonCard'

// ─── 1. Error top section ─────────────────────────────────────────────────────

function ErrorBannerSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4" aria-hidden="true">
      {/* Error type badge + file indicator row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div className="space-y-1.5">
            {/* Error type name e.g. "ZeroDivisionError" */}
            <Skeleton className="h-4 w-40" />
            {/* Short message e.g. "division by zero" */}
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        {/* Resolved / unresolved badge */}
        <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
      </div>

      {/* File + line meta pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-36 rounded-full" />
      </div>

      {/* Stack trace accordion (expanded state) */}
      <div className="rounded-xl bg-muted/40 border border-border overflow-hidden">
        {/* Accordion header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="w-4 h-4 rounded" />
        </div>
        {/* Trace lines — monospace */}
        <div className="p-4 space-y-2">
          {[90, 75, 85, 70, 80, 60].map((w, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-2.5 w-4 rounded flex-shrink-0 opacity-40" />
              <Skeleton className="h-2.5 rounded" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 2. AI Explanation section ────────────────────────────────────────────────

function ExplanationSectionSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5" aria-hidden="true">
      {/* Section heading */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* "Why This Happened" prose — 4 lines */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* Concept callout box */}
      <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-md flex-shrink-0" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Step-by-step reasoning */}
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-36" />
        {[78, 90, 85, 70, 82].map((w, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <Skeleton className="h-3 flex-1" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 3. Learning resources section ───────────────────────────────────────────

function LearningResourcesSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Section heading */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* 3-up resource cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-md flex-shrink-0" />
              {/* Type badge e.g. "documentation" */}
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex items-center gap-2 pt-0.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* "Similar errors you've faced" section */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-48" />
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function ExplanationLoading() {
  return (
    <AppShell activeNav="explanation">
      <div
        className="max-w-3xl mx-auto px-6 py-8 space-y-8"
        aria-busy="true"
        aria-label="Loading error explanation"
      >
        {/* Page header */}
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>

        <ErrorBannerSkeleton />
        <div className="border-t border-border" />
        <ExplanationSectionSkeleton />
        <div className="border-t border-border" />
        <LearningResourcesSkeleton />
      </div>
    </AppShell>
  )
}