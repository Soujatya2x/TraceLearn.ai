/**
 * app/loading.tsx — Editor / Workspace page skeleton
 *
 * Next.js App Router renders this instantly on navigation, before any
 * client-side JS runs. It mirrors the real workspace layout precisely:
 *   • Full-height two-column split: 60% left editor / 40% right context
 *   • Left: panel header + language toolbar + Monaco-style line gutter + code lines
 *   • Right: session ID chip + 3-up stats row + log upload zone + project
 *     files zone + language selector + recent errors list
 *
 * Shimmer animation defined in globals.css as .skeleton-shimmer
 * (dark-mode variant included via .dark .skeleton-shimmer).
 */

import { AppShell } from '@/components/layouts/AppShell'
import { Skeleton } from '@/components/ui/SkeletonCard'

// ─── Left panel: Monaco-style editor ─────────────────────────────────────────

function EditorPanelSkeleton() {
  // Varying code-line widths to look realistic
  const lineWidths = [
    55, 72, 60, 85, 40, 68, 50, 78, 62, 45,
    70, 55, 80, 35, 65, 75, 48, 60, 70, 52,
  ]

  return (
    <div className="w-3/5 flex flex-col min-w-0 border-r border-border" aria-hidden="true">
      {/* Panel header — mirrors "Code Workspace" + AnalyzeButton */}
      <div className="flex items-start justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64" />
        </div>
        {/* Analyze & Learn button skeleton */}
        <Skeleton className="h-9 w-36 rounded-xl flex-shrink-0" />
      </div>

      {/* Language selector / toolbar row */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>

      {/* Monaco editor body — dark background, gutter + code lines */}
      <div
        className="flex-1 p-4 overflow-hidden"
        style={{ background: 'oklch(0.11 0.01 264)' }}
      >
        <div className="flex gap-4 h-full">
          {/* Line number gutter */}
          <div className="flex flex-col gap-[11px] pt-0.5 flex-shrink-0">
            {lineWidths.map((_, i) => (
              <Skeleton
                key={i}
                className="h-2.5 w-5 rounded"
                style={{ opacity: 0.15 }}
              />
            ))}
          </div>
          {/* Code content area */}
          <div className="flex-1 flex flex-col gap-[11px] pt-0.5">
            {lineWidths.map((w, i) => (
              <Skeleton
                key={i}
                className="h-2.5 rounded"
                style={{ width: `${w}%`, opacity: 0.25 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Right panel: Session & Context ──────────────────────────────────────────

function RightPanelSkeleton() {
  return (
    <div className="w-2/5 flex flex-col bg-card/40" aria-hidden="true">
      {/* Panel label */}
      <div className="px-4 py-3.5 border-b border-border flex-shrink-0">
        <Skeleton className="h-2.5 w-28 rounded" />
      </div>

      <div className="p-4 space-y-5 overflow-hidden">
        {/* Session ID chip */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-5 w-14 rounded-full ml-auto flex-shrink-0" />
        </div>

        {/* Quick stats — 3 cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: 'w-8',  label: 'w-14' },
            { val: 'w-6',  label: 'w-16' },
            { val: 'w-10', label: 'w-12' },
          ].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-3 space-y-2"
            >
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          ))}
        </div>

        {/* Upload log file */}
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20 rounded" />
          <div className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28 rounded-lg mt-1" />
          </div>
        </div>

        {/* Upload project files */}
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-28 rounded" />
          <div className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28 rounded-lg mt-1" />
          </div>
        </div>

        {/* Language selector */}
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24 rounded" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>

        {/* Recent errors list */}
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-28 rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card"
            >
              <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-2.5 w-32" />
                <Skeleton className="h-2 w-20" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function EditorLoading() {
  return (
    <AppShell activeNav="workspace">
      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ height: 'calc(100vh - 56px)' }}
        aria-busy="true"
        aria-label="Loading editor workspace"
      >
        <EditorPanelSkeleton />
        <RightPanelSkeleton />
      </div>
    </AppShell>
  )
}