
import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type { ApiResponse, ArtifactsResponse } from '@/types'

export async function getArtifacts(sessionId: string): Promise<ArtifactsResponse> {
  const response = await apiClient.get<ApiResponse<ArtifactsResponse>>(
    API_ENDPOINTS.ARTIFACTS(sessionId),
  )
  return response.data.data
}
