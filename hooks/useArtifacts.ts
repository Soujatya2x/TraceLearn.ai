'use client'

import { useQuery } from '@tanstack/react-query'
import { getArtifacts } from '@/services/api/artifactsService'
import { getLearningRoadmap } from '@/services/api/roadmapService'
import { queryKeys } from './useAnalysis'
import { useAuthStore } from '@/store/useAuthStore'

export function useArtifacts(sessionId: string | null) {
  const { status } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.artifacts(sessionId ?? ''),
    queryFn: () => getArtifacts(sessionId!),
    enabled: !!sessionId && status === 'authenticated',

    // Refresh before S3 URLs expire
    staleTime: 1000 * 60 * 30,  // 30 minutes
    gcTime:    1000 * 60 * 60,  // 1 hour
  })
}

export function useRoadmap(userId: string | null) {
  const { status } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.roadmap(userId ?? ''),
    queryFn: () => getLearningRoadmap(userId!),
    enabled: !!userId && status === 'authenticated',
    staleTime: 1000 * 60 * 10,
  })
}