'use client'

import { AppShell } from '@/components/layouts/AppShell'
import { Skeleton, SkeletonCodePanel } from '@/components/ui/SkeletonCard'

// ─── Validation status bar (bottom strip) ────────────────────────────────────

function ValidationStatusBarSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="w-4 h-4 rounded" />
        </div>
        <div className="space-y-1.5">
          {[70, 55, 80].map((w, i) => (
            <Skeleton key={i} className="h-2.5 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Diff strip between code panels ──────────────────────────────────────────

function DiffStripSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card/60 p-3 space-y-2"
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-24" />
      <div className="space-y-1.5">
        {/* Removed line */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded flex-shrink-0 opacity-60" style={{ background: 'oklch(0.9 0.06 27)' }} />
          <Skeleton className="h-2.5 w-5/6 rounded" style={{ opacity: 0.6 }} />
        </div>
        {/* Added line */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded flex-shrink-0 opacity-60" style={{ background: 'oklch(0.9 0.08 145)' }} />
          <Skeleton className="h-2.5 w-full rounded" style={{ opacity: 0.6 }} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded flex-shrink-0 opacity-60" style={{ background: 'oklch(0.9 0.08 145)' }} />
          <Skeleton className="h-2.5 w-4/5 rounded" style={{ opacity: 0.6 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Fix explanation cards ────────────────────────────────────────────────────

function FixExplanationSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      aria-hidden="true"
    >
      {/* "What Changed" card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="rounded-xl bg-accent/30 border border-border p-3 space-y-1.5 mt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  )
}

// ─── Page header with session info ───────────────────────────────────────────

function ValidationHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function ValidationLoading() {
  return (
    <AppShell activeNav="validation">
      <div
        className="px-6 py-8 max-w-7xl mx-auto space-y-6"
        aria-busy="true"
        aria-label="Loading validation"
      >
        <ValidationHeaderSkeleton />

        {/* ── Two-column code split ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div aria-hidden="true">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <SkeletonCodePanel label="Original Code" />
          </div>

          <div aria-hidden="true">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="flex flex-col rounded-xl border border-border overflow-hidden" aria-hidden="true">
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
              <div className="bg-muted/30 p-4 space-y-2.5 flex-1">
                {[
                  { w: 72, green: false },
                  { w: 85, green: true },
                  { w: 60, green: true },
                  { w: 78, green: false },
                  { w: 55, green: false },
                  { w: 65, green: true },
                  { w: 82, green: false },
                  { w: 50, green: false },
                  { w: 70, green: false },
                  { w: 60, green: true },
                ].map(({ w, green }, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 items-center rounded px-1 -mx-1 ${green ? 'bg-emerald-500/8' : ''}`}
                  >
                    <Skeleton className="h-2.5 w-4 rounded flex-shrink-0 opacity-40" />
                    <Skeleton
                      className="h-2.5 rounded"
                      style={{
                        width: `${w}%`,
                        opacity: green ? 0.5 : 0.3,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DiffStripSkeleton />
        <FixExplanationSkeleton />
        <ValidationStatusBarSkeleton />
      </div>
    </AppShell>
  )
}