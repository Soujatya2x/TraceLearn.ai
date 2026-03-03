import { Skeleton } from '@/components/ui/SkeletonCard'
import { PreviewBadgeInline } from '@/components/ui/PreviewBadge'

interface RoadmapSkeletonLoaderProps {
  /** When true, shows the Preview badge beside the title skeleton */
  isPreview?: boolean
}

export function RoadmapSkeletonLoader({ isPreview = false }: RoadmapSkeletonLoaderProps) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading roadmap">
      {/* Header row — badge sits inline beside the title skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-44" />
            <PreviewBadgeInline visible={isPreview} />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-6 w-10" />
              </div>
              <Skeleton className="w-9 h-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>

      {/* Topics skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}