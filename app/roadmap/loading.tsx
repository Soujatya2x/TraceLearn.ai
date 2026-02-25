/**
 * app/roadmap/loading.tsx — Learning Roadmap page skeleton
 *
 * Next.js App Router instant loading state for /roadmap.
 * Delegates to RoadmapSkeletonLoader which mirrors:
 *   • Page header with icon + refresh button
 *   • 4-up summary stats row
 *   • Knowledge Gap Analysis card (mastery bars + radar chart placeholder)
 *   • Recommended Topics 3-column grid
 *   • Next Steps 3-column grid
 *   • Footer note
 */

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