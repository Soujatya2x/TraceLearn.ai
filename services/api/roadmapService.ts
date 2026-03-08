import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type {
  ApiResponse,
  LearningRoadmap,
  ConceptMastery,
  RecommendedTopic,
  Priority
} from '@/types'

export async function getLearningRoadmap(userId: string): Promise<LearningRoadmap> {
  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.ROADMAP(userId),
  )

  const raw = response.data.data

  /**
   * CASE 1
   * Backend already returns correct frontend shape
   */
  if (raw?.conceptMastery && Array.isArray(raw.conceptMastery)) {
    return raw as LearningRoadmap
  }

  /**
   * CASE 2
   * Map AI agent structure → frontend structure
   */

  const conceptMastery: ConceptMastery[] = (raw?.conceptMasteryScores ?? []).map(
    (score: any) => ({
      category: score.conceptName,
      masteryPercentage: Math.round((score.masteryScore ?? 0) * 100),
      errorFrequency: 0,
      lastSeen: new Date().toISOString(),
    })
  )

  const knowledgeGaps: ConceptMastery[] = (raw?.knowledgeGapAnalysis ?? []).map(
    (gap: any) => ({
      category: gap.conceptName,
      masteryPercentage: Math.round((gap.masteryScore ?? 0) * 100),
      errorFrequency: 0,
      lastSeen: new Date().toISOString(),
    })
  )

  const recommendedTopics: RecommendedTopic[] = (raw?.recommendedTopics ?? []).map(
    (topic: any, index: number) => ({
      id: `topic-${index}`,
      title: topic.topicName ?? topic.title ?? 'Topic',
      description: topic.description ?? '',
      estimatedMinutes: parseMinutes(topic.estimatedTime),
      priority: (topic.priority?.toLowerCase?.() ?? 'medium') as Priority,
      category: topic.category ?? 'General',
      resourceLinks: (topic.resources ?? []).map((r: any) => ({
        title: r.title,
        url: r.url,
        type: 'article',
        source: extractHostname(r.url),
      })),
    })
  )

  return {
    userId,
    conceptMastery,
    knowledgeGaps,
    recommendedTopics,
    nextSteps: [],
    analysisBasedOn: raw?.analysisBasedOn ?? conceptMastery.length,
    generatedAt: raw?.generatedAt ?? new Date().toISOString(),
  }
}

/**
 * Convert "2 hours" / "45 minutes" → minutes
 */
function parseMinutes(time?: string): number {
  if (!time) return 30

  const match = time.match(/(\d+)/)
  if (!match) return 30

  const value = parseInt(match[1], 10)

  if (time.toLowerCase().includes('hour')) {
    return value * 60
  }

  return value
}

/**
 * Extract hostname for display
 */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}