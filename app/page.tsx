'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AppShell } from '@/components/layouts/AppShell'
import { CodeEditor } from '@/features/workspace/CodeEditor'
import { WorkspaceRightPanel } from '@/features/workspace/WorkspaceRightPanel'
import { AnalyzeButton } from '@/features/workspace/AnalyzeButton'
import { useAppStore } from '@/store/useAppStore'
import { useSession, useAnalyzeCode } from '@/hooks/useAnalysis'

export default function WorkspacePage() {
  const router = useRouter()
  const { currentSessionId, analysisStatus, currentSession, code, language, logFile, projectFiles } = useAppStore()

  // Poll session and auto-navigate when analysis is done
  const { data: _session } = useSession(currentSessionId)
  const analyzeCode = useAnalyzeCode()

  useEffect(() => {
    if (analysisStatus === 'completed' && currentSessionId) {
      router.push('/explanation')
    }
  }, [analysisStatus, currentSessionId, router])

  const errorLine = currentSession?.structuredError?.line

  const handleAnalyze = () => {
    if (!code.trim()) return
    analyzeCode.mutate({ code, language, logFile, projectFiles })
  }

  return (
    <AppShell activeNav="workspace">
      {/* Main two-column layout: 60% editor / 40% context.
          Height is explicitly calc(100vh - 56px) so both panels always fill
          the visible viewport below the navbar regardless of footer height.
          overflow-hidden prevents any double-scrollbar on the outer page. */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Left panel: Code Workspace (60%) ────────────── */}
        <div className="w-3/5 flex flex-col min-w-0 min-h-0 border-r border-border">
          {/* Panel header row — fixed height, never shrinks */}
          <div className="flex items-start justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">
                Code Workspace
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Paste your code, upload logs, and let AI explain your errors
              </p>
            </div>

            {/* Analyze button — right-aligned inside the left panel */}
            <div className="flex-shrink-0 ml-4">
              <AnalyzeButton
                status={analysisStatus}
                onClick={handleAnalyze}
                disabled={!code.trim()}
              />
            </div>
          </div>

          {/* Editor container: flex-1 + min-h-0 so Monaco gets a real px height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor errorLine={errorLine} />
          </div>
        </div>

        {/* ── Right panel: Session & Context (40%) ─────────── */}
        <div className="w-2/5 flex flex-col flex-shrink-0 min-h-0 bg-card/40">
          <div className="px-4 py-3.5 border-b border-border flex-shrink-0">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Session &amp; Context
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4">
            <WorkspaceRightPanel />
          </div>
        </div>

      </div>
    </AppShell>
  )
}
