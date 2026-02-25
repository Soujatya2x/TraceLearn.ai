// ============================================================
// TraceLearn.ai — Analysis Hooks (TanStack Query)
// ============================================================

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  analyzeCode,
  getErrorExplanation,
  getSession,
  getValidationResult,
  retryExecution,
} from '@/services/api/analysisService'
import { useAppStore } from '@/store/useAppStore'
import type { Language } from '@/types'

// ─── Query Keys ──────────────────────────────────────────────

export const queryKeys = {
  session: (id: string) => ['session', id] as const,
  explanation: (id: string) => ['explanation', id] as const,
  validation: (id: string) => ['validation', id] as const,
  chat: (id: string) => ['chat', id] as const,
  artifacts: (id: string) => ['artifacts', id] as const,
  roadmap: (userId: string) => ['roadmap', userId] as const,
}

// ─── Analyze Code ────────────────────────────────────────────

export function useAnalyzeCode() {
  const { setCurrentSessionId, setAnalysisStatus } = useAppStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      code,
      language,
      logFile,
      projectFiles,
    }: {
      code: string
      language: Language
      logFile?: File | null
      projectFiles?: File[]
    }) => analyzeCode(code, language, logFile, projectFiles),

    onMutate: () => {
      setAnalysisStatus('processing')
    },

    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId)
      setAnalysisStatus(data.status)
      queryClient.invalidateQueries({ queryKey: ['session', data.sessionId] })
    },

    onError: () => {
      setAnalysisStatus('failed')
    },
  })
}

// ─── Get Session ─────────────────────────────────────────────

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.session(sessionId ?? ''),
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 3000
    },
  })
}

// ─── Error Explanation ───────────────────────────────────────

export function useErrorExplanation(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.explanation(sessionId ?? ''),
    queryFn: () => getErrorExplanation(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 10,
  })
}

// ─── Validation Result ───────────────────────────────────────

export function useValidationResult(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.validation(sessionId ?? ''),
    queryFn: () => getValidationResult(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Retry Execution ─────────────────────────────────────────

export function useRetryExecution() {
  const queryClient = useQueryClient()
  const { setAnalysisStatus } = useAppStore()

  return useMutation({
    mutationFn: (sessionId: string) => retryExecution(sessionId),

    onMutate: () => {
      setAnalysisStatus('processing')
    },

    onSuccess: (data) => {
      setAnalysisStatus(data.status)
      queryClient.invalidateQueries({ queryKey: queryKeys.session(data.sessionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.validation(data.sessionId) })
    },

    onError: () => {
      setAnalysisStatus('failed')
    },
  })
}
