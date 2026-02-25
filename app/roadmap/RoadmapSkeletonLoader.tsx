/**
 * RoadmapSkeletonLoader.tsx
 *
 * Full-fidelity skeleton with shimmer wave animation.
 * Mirrors every section of the real roadmap page.
 */

import React from 'react'
import { cn } from '@/lib/utils'

// ─── Shimmer skeleton primitive ───────────────────────────────────────────────

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded bg-muted',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-[shimmer_1.6s_infinite]',
        className,
      )}
      style={style}
    />
  )
}

// Add the keyframe to globals if not already present. We inline it here via
// a style tag that is injected once so it works without editing global CSS.
function ShimmerStyle() {
  return (
    <style>{`
      @keyframes shimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  )
}

// ─── Section skeletons ────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="space-y-2 pt-0.5">
          <Shimmer className="h-5 w-44" />
          <Shimmer className="h-3 w-64" />
          <Shimmer className="h-3 w-40" />
        </div>
      </div>
      <Shimmer className="h-9 w-24 rounded-lg flex-shrink-0 mt-0.5" />
    </div>
  )
}

function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-4"
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Shimmer className="h-2.5 w-20" />
              <Shimmer className="h-6 w-10" />
              <Shimmer className="h-2.5 w-24" />
            </div>
            <Shimmer className="w-9 h-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function GapAnalysisSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6" aria-hidden="true">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Shimmer className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="space-y-2">
          <Shimmer className="h-4 w-48" />
          <Shimmer className="h-3 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Progress bars */}
        <div className="space-y-5">
          {[38, 62, 74, 45, 55, 82, 30, 22].map((pct, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-3 w-10" />
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <Shimmer className="h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Radar placeholder */}
        <div className="flex flex-col gap-3">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-[220px] w-full rounded-xl" />
          <Shimmer className="h-2.5 w-48 mx-auto" />
        </div>
      </div>

      {/* Gap pills */}
      <div className="pt-5 border-t border-border space-y-3">
        <Shimmer className="h-2.5 w-36" />
        <div className="flex flex-wrap gap-2">
          {[72, 64, 88, 56].map((w, i) => (
            <Shimmer key={i} className="h-6 rounded-full" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function RecommendedTopicsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Shimmer className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="space-y-2">
          <Shimmer className="h-4 w-44" />
          <Shimmer className="h-3 w-56" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <Shimmer className="h-6 w-20 rounded-full" />
        <Shimmer className="h-6 w-24 rounded-full" />
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Priority accent bar */}
            <Shimmer className="h-0.5 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Shimmer className="w-9 h-9 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="h-2.5 w-16 rounded-full" />
                  <Shimmer className="h-3.5 w-full" />
                  <Shimmer className="h-3.5 w-4/5" />
                </div>
              </div>
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-5/6" />
              <div className="flex items-center justify-between pt-1">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-6 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NextStepsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Shimmer className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="space-y-2">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-3 w-52" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Shimmer className="w-7 h-7 rounded-full flex-shrink-0" />
              <Shimmer className="h-3.5 w-40" />
            </div>
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-5/6" />
            <Shimmer className="h-3 w-4/5" />
            <div className="pt-1 space-y-2">
              <Shimmer className="h-2.5 w-28" />
              {[80, 70, 60].map((w, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Shimmer className="w-3 h-3 rounded-full flex-shrink-0" />
                  <Shimmer className="h-2.5 flex-1" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <Shimmer className="h-6 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FooterSkeleton() {
  return (
    <div className="flex justify-center pt-4 border-t border-border" aria-hidden="true">
      <Shimmer className="h-3 w-80" />
    </div>
  )
}

// ─── Composed loader ──────────────────────────────────────────────────────────

export function RoadmapSkeletonLoader() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading learning roadmap"
    >
      <ShimmerStyle />
      <HeaderSkeleton />
      <StatsRowSkeleton />
      <GapAnalysisSkeleton />
      <RecommendedTopicsSkeleton />
      <NextStepsSkeleton />
      <FooterSkeleton />
    </div>
  )
}