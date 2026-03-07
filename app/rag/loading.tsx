import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function RagLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <SkeletonCard className="h-16 rounded-2xl" />
      <SkeletonCard className="h-12 rounded-full" />
      <SkeletonCard className="h-64 rounded-2xl" />
      <SkeletonCard className="h-48 rounded-2xl" />
    </div>
  )
}