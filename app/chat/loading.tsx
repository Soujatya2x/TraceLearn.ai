/**
 * app/chat/loading.tsx — AI Chat page skeleton
 *
 * Mirrors: header strip → alternating AI/user messages → code block bubble →
 * typing indicator dots → suggested prompts row → input bar → context sidebar.
 */

import { AppShell } from '@/components/layouts/AppShell'
import { Skeleton } from '@/components/ui/SkeletonCard'

// ─── Right sidebar ────────────────────────────────────────────────────────────

function ChatContextSidebarSkeleton() {
  return (
    <div
      className="w-64 flex-shrink-0 border-l border-border bg-card/30 p-4 hidden lg:block space-y-4"
      aria-hidden="true"
    >
      <Skeleton className="h-2.5 w-28 rounded" />
      {/* Error type card */}
      <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
        <Skeleton className="h-2 w-16" />
        <Skeleton className="h-4 w-36" />
      </div>
      {/* Context card */}
      <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      {/* Session ID card */}
      <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
        <Skeleton className="h-2 w-16" />
        <Skeleton className="h-3 w-full" />
      </div>
      {/* Message count */}
      <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
        <Skeleton className="h-2 w-20" />
        <Skeleton className="h-5 w-8" />
      </div>
    </div>
  )
}

// ─── AI message bubble ────────────────────────────────────────────────────────

function AIMessageSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex gap-3" aria-hidden="true">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
      <div className="space-y-1.5 max-w-[72%]">
        <div className="rounded-2xl rounded-bl-sm bg-card border border-border p-4 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-3 rounded"
              style={{ width: `${[52, 68, 44, 72, 36][i % 5]}%` }}
            />
          ))}
        </div>
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

// ─── User message bubble ──────────────────────────────────────────────────────

function UserMessageSkeleton() {
  return (
    <div className="flex gap-3 flex-row-reverse" aria-hidden="true">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
      <div className="space-y-1.5 max-w-[72%] items-end">
        <div className="rounded-2xl rounded-br-sm bg-primary/10 border border-primary/20 p-4 space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

// ─── AI message with inline code block ───────────────────────────────────────

function AICodeMessageSkeleton() {
  return (
    <div className="flex gap-3" aria-hidden="true">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
      <div className="space-y-1.5 max-w-[72%]">
        <div className="rounded-2xl rounded-bl-sm bg-card border border-border p-4 space-y-2">
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-44" />
          {/* Code block */}
          <div className="rounded-lg bg-muted/60 border border-border/60 p-3 space-y-1.5 my-1">
            {[80, 65, 55, 70, 48].map((w, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Skeleton className="h-2 w-3 rounded flex-shrink-0 opacity-40" />
                <Skeleton className="h-2 rounded" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicatorSkeleton() {
  return (
    <div className="flex gap-3" aria-hidden="true">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
      <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="w-2 h-2 rounded-full" />
        ))}
      </div>
    </div>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function ChatLoading() {
  return (
    <AppShell activeNav="chat">
      <div
        className="flex h-full"
        aria-busy="true"
        aria-label="Loading AI chat"
      >
        {/* Main chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Session context header */}
          <div className="px-6 py-3 border-b border-border bg-card/50 flex items-center gap-3 flex-shrink-0">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-56" />
            </div>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-hidden px-6 py-6 space-y-5">
            <AIMessageSkeleton lines={3} />
            <UserMessageSkeleton />
            <AICodeMessageSkeleton />
            <UserMessageSkeleton />
            <AIMessageSkeleton lines={2} />
            <TypingIndicatorSkeleton />
          </div>

          {/* Suggested prompts strip */}
          <div className="px-6 pb-3 flex gap-2 flex-wrap flex-shrink-0" aria-hidden="true">
            {[88, 120, 104, 136, 96].map((w, i) => (
              <Skeleton key={i} className="h-7 rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>

          {/* Input bar */}
          <div className="px-6 pb-6 pt-2 flex-shrink-0">
            <div className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3">
              <Skeleton className="flex-1 h-5 rounded" />
              <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
            </div>
            <div className="mt-1.5 flex justify-center" aria-hidden="true">
              <Skeleton className="h-2.5 w-72" />
            </div>
          </div>
        </div>

        {/* Right context sidebar */}
        <ChatContextSidebarSkeleton />
      </div>
    </AppShell>
  )
}