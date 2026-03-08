import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type { ApiResponse, ArtifactsResponse, Artifact } from '@/types'

export async function getArtifacts(sessionId: string): Promise<ArtifactsResponse> {
  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.ARTIFACTS(sessionId),
  )

  const raw = response.data.data

  /**
   * CASE 1
   * Backend already returns the correct frontend shape
   */
  if (raw?.artifacts && Array.isArray(raw.artifacts)) {
    return raw as ArtifactsResponse
  }

  /**
   * CASE 2
   * Backend returns flat structure from AI agent:
   * { pdfUrl, pptUrl, summaryUrl }
   */
  const artifacts: Artifact[] = []

  if (raw?.pdfUrl) {
    artifacts.push({
      id: `${sessionId}-pdf`,
      sessionId,
      type: 'pdf',
      title: 'Error Explanation Report',
      description: 'Detailed PDF report with analysis and fix',
      s3Url: raw.pdfUrl,
      generatedAt: new Date().toISOString(),
    })
  }

  if (raw?.pptUrl) {
    artifacts.push({
      id: `${sessionId}-ppt`,
      sessionId,
      type: 'ppt',
      title: 'Learning Presentation',
      description: 'Slide deck explaining the concepts behind the error',
      s3Url: raw.pptUrl,
      generatedAt: new Date().toISOString(),
    })
  }

  if (raw?.summaryUrl) {
    artifacts.push({
      id: `${sessionId}-summary`,
      sessionId,
      type: 'summary',
      title: 'Session Summary',
      description: 'Digest of what was learned during debugging',
      s3Url: raw.summaryUrl,
      generatedAt: new Date().toISOString(),
    })
  }

  /**
   * Return final normalized structure expected by frontend
   */
  return {
    sessionId,
    artifacts,
    learningMetrics: raw?.learningMetrics ?? {
      totalErrorsAnalyzed: 1,
      conceptsCovered: 1,
      fixSuccessRate: 100,
      learningStreakDays: 1,
    },
  }
}