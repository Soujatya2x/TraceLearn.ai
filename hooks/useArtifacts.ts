// ============================================================
// TraceLearn.ai — Artifacts Hook
// ============================================================

'use client'

import { useQuery } from '@tanstack/react-query'
import { getArtifacts } from '@/services/api/artifactsService'
import { getLearningRoadmap } from '@/services/api/roadmapService'
import { queryKeys } from './useAnalysis'

export function useArtifacts(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.artifacts(sessionId ?? ''),
    queryFn: () => getArtifacts(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useRoadmap(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.roadmap(userId ?? ''),
    queryFn: () => getLearningRoadmap(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })
}
