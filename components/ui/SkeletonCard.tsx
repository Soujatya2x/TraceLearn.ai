import { cn } from '@/lib/utils'

// ─── Core Skeleton primitive ──────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      style={style}
      aria-hidden="true"
    />
  )
}

// ─── Generic card skeleton ────────────────────────────────────────────────────

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-5 space-y-3',
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

// ─── Inline text skeleton ─────────────────────────────────────────────────────

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

// ─── Stats row skeleton (4-up) ────────────────────────────────────────────────

export function SkeletonStatsRow({
  count = 4,
  cols = 4,
}: {
  count?: number
  cols?: 2 | 3 | 4
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-2 md:grid-cols-3',
        cols === 4 && 'grid-cols-2 md:grid-cols-4',
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page header skeleton ─────────────────────────────────────────────────────

export function SkeletonPageHeader({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-start gap-3" aria-hidden="true">
      <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="space-y-2">
        <Skeleton className={cn('h-5', wide ? 'w-56' : 'w-40')} />
        <Skeleton className={cn('h-3', wide ? 'w-72' : 'w-56')} />
      </div>
    </div>
  )
}

// ─── Artifact card skeleton ───────────────────────────────────────────────────

export function SkeletonArtifactCard() {
  return (
    <div
      className="bg-card border border-border rounded-xl p-5 space-y-3 flex flex-col"
      aria-hidden="true"
    >
      {/* Icon + type badge row */}
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      {/* Title */}
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      {/* Description */}
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      {/* Meta row */}
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Chat message skeleton ────────────────────────────────────────────────────

export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
      aria-hidden="true"
    >
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
      <div
        className={cn(
          'space-y-2 max-w-[72%]',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'rounded-2xl p-4 space-y-2',
            isUser
              ? 'bg-primary/10 rounded-br-sm'
              : 'bg-card border border-border rounded-bl-sm',
          )}
        >
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

// ─── Mastery bar row skeleton ─────────────────────────────────────────────────

export function SkeletonMasteryBar() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

// ─── Code panel skeleton ──────────────────────────────────────────────────────

export function SkeletonCodePanel({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col rounded-xl border border-border overflow-hidden"
      aria-hidden="true"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-6 h-6 rounded-md" />
        </div>
      </div>
      {/* Code lines */}
      <div className="bg-muted/30 p-4 space-y-2.5 flex-1">
        {[90, 70, 85, 60, 75, 50, 80, 65, 45, 72].map((w, i) => (
          <div key={i} className="flex gap-3 items-center">
            <Skeleton className="h-2.5 w-4 rounded flex-shrink-0 opacity-40" />
            <Skeleton className={`h-2.5 rounded`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}