'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  analyzeCode,
  getErrorExplanation,
  getSession,
  getValidationResult,
  retryExecution,
} from '@/services/api/analysisService'
import { useAppStore } from '@/store/useAppStore'
import type { Language } from '@/types'

export const queryKeys = {
  session:     (id: string)     => ['session',     id] as const,
  explanation: (id: string)     => ['explanation', id] as const,
  validation:  (id: string)     => ['validation',  id] as const,
  chat:        (id: string)     => ['chat',        id] as const,
  artifacts:   (id: string)     => ['artifacts',   id] as const,
  roadmap:     (userId: string) => ['roadmap', userId] as const,
}

function normalizeStatus(status: string): 'idle' | 'processing' | 'analyzing' | 'validating' | 'completed' | 'failed' {
  switch (status) {
    case 'CREATED':
    case 'EXECUTING':  return 'processing'
    case 'ANALYZING':  return 'analyzing'
    case 'ANALYZED':
    case 'COMPLETED':  return 'completed'
    case 'ERROR':      return 'failed'
    default:           return status as any ?? 'idle'
  }
}

const TERMINAL_STATUSES = ['ANALYZED', 'COMPLETED', 'ERROR', 'completed', 'failed']

// ─── Analyze Code ────────────────────────────────────────────

export function useAnalyzeCode() {
  const { setCurrentSessionId, setAnalysisStatus } = useAppStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      code, language, logFile, projectFiles, frameworkType,
    }: {
      code: string
      language: Language
      logFile?: File | null
      projectFiles?: File[]
      frameworkType?: string | null
    }) => analyzeCode(code, language, logFile, projectFiles, frameworkType),

    onMutate: () => {
      setAnalysisStatus('processing')
    },

    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId)
      setAnalysisStatus(normalizeStatus(data.status))
      queryClient.invalidateQueries({ queryKey: ['session', data.sessionId] })
    },

    onError: () => {
      setAnalysisStatus('failed')
    },
  })
}

// ─── Get Session (with polling + status sync) ─────────────────

export function useSession(sessionId: string | null) {
  const { setAnalysisStatus, setCurrentSession, sessionViewed, analysisStatus } = useAppStore()

  const query = useQuery({
    queryKey: queryKeys.session(sessionId ?? ''),
    queryFn: () => getSession(sessionId!),
    // Disable polling when user has already viewed results and no new analysis
    // is in-flight — avoids hammering the backend on the old sessionId.
    enabled: !!sessionId && !(sessionViewed && analysisStatus === 'idle'),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      if (TERMINAL_STATUSES.includes(status)) return false
      // Stop polling after 5 minutes regardless of status (handles hung ANALYZING)
      const fetchedAt = query.state.dataUpdatedAt
      if (fetchedAt && Date.now() - fetchedAt > 5 * 60 * 1000) return false
      return 3000
    },
  })

  useEffect(() => {
    const rawStatus = (query.data as any)?.status
    if (!rawStatus) return
    const normalized = normalizeStatus(rawStatus)

    // If the user already viewed results for this session, don't flip the
    // button back to "View Results" — they're on the workspace to analyze new code.
    if (sessionViewed && normalized === 'completed') return

    setAnalysisStatus(normalized)
    if (query.data) setCurrentSession(query.data as any)
  }, [(query.data as any)?.status, sessionViewed])

  return query
}

// ─── Error Explanation ───────────────────────────────────────

export function useErrorExplanation(sessionId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.explanation(sessionId ?? ''),
    queryFn: () => getErrorExplanation(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
    gcTime: 0,                  // don't garbage collect between navigations
    refetchOnMount: 'always',   // always refetch when component mounts
  })

  return {
    ...query,
    isWaitingForData: !!sessionId && query.isPending,
  }
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
    onMutate: () => { setAnalysisStatus('processing') },
    onSuccess: (data) => {
      setAnalysisStatus(normalizeStatus((data as any).status))
      queryClient.invalidateQueries({ queryKey: queryKeys.session((data as any).sessionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.validation((data as any).sessionId) })
    },
    onError: () => { setAnalysisStatus('failed') },
  })
}