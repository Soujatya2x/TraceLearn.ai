'use client'

import { AppShell } from '@/components/layouts/AppShell'
import { RoadmapSkeletonLoader } from '@/features/roadmap/RoadmapSkeletonLoader'

export default function RoadmapLoading() {
  return (
    <AppShell activeNav="roadmap">
      <div
        className="px-6 py-8 max-w-6xl mx-auto"
        aria-busy="true"
        aria-label="Loading learning roadmap"
      >
        <RoadmapSkeletonLoader />
      </div>
    </AppShell>
  )
}