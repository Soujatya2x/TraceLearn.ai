
import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type { ApiResponse, LearningRoadmap } from '@/types'

export async function getLearningRoadmap(userId: string): Promise<LearningRoadmap> {
  const response = await apiClient.get<ApiResponse<LearningRoadmap>>(
    API_ENDPOINTS.ROADMAP(userId),
  )
  return response.data.data
}
