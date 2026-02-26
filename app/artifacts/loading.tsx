'use client'

import { AppShell } from '@/components/layouts/AppShell'
import {
  Skeleton,
  SkeletonPageHeader,
  SkeletonStatsRow,
  SkeletonArtifactCard,
} from '@/components/ui/SkeletonCard'

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3 flex-wrap" aria-hidden="true">
      {/* Type filter pills: All / PDF / PPT / Summary */}
      <div className="flex items-center gap-1.5">
        {[48, 32, 40, 64, 72].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>
      {/* Flex spacer */}
      <div className="flex-1 min-w-0" />
      {/* Search box */}
      <Skeleton className="h-8 w-48 rounded-xl" />
      {/* Total count badge */}
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function ArtifactsLoading() {
  return (
    <AppShell activeNav="artifacts">
      <div
        className="px-6 py-8 max-w-6xl mx-auto space-y-8"
        aria-busy="true"
        aria-label="Loading artifacts"
      >
        {/* Page header — icon + title + subtitle */}
        <SkeletonPageHeader wide />

        {/* 4-up learning metrics row */}
        <SkeletonStatsRow count={4} cols={4} />

        {/* Filter / search bar */}
        <FilterBarSkeleton />

        {/* 3-column artifact cards grid — 6 cards to fill the viewport */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonArtifactCard key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  )
}