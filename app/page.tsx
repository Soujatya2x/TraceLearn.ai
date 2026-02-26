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

  const EDITOR_H = 'calc(100vh - 56px - 32px)'

  return (
    <AppShell activeNav="workspace">
     
      <div className="px-4 md:px-6 py-4 w-full">
        <div
          className="flex rounded-xl overflow-hidden items-stretch relative"
          style={{ minHeight: EDITOR_H }}
        >
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-10"
            style={{
              borderTop:   '1px solid hsl(var(--border))',
              borderLeft:  '1px solid hsl(var(--border))',
              borderRight: '1px solid hsl(var(--border))',
              borderBottom: 'none',
              maskImage:   'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
            }}
          />

          <div
            className="w-3/5 flex flex-col min-w-0 flex-shrink-0 relative"
            style={{ height: EDITOR_H }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">
                  Code Workspace
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Paste your code, upload logs, and let AI explain your errors
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <AnalyzeButton
                  status={analysisStatus}
                  onClick={handleAnalyze}
                  disabled={!code.trim()}
                />
              </div>
            </div>

            <div
              className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
              style={{
                background: 'hsl(var(--border))',
                maskImage: 'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 35%, transparent 72%)',
              }}
            />

            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor errorLine={errorLine} />
            </div>
          </div>
          <div className="w-2/5 flex flex-col flex-shrink-0 bg-card/40">
            <div className="px-4 py-3.5 border-b border-border flex-shrink-0">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Session &amp; Context
              </h2>
            </div>
            <div className="p-4">
              <WorkspaceRightPanel />
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}