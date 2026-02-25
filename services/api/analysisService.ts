// ============================================================
// TraceLearn.ai — Analysis Service
// ============================================================

import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type {
  AnalyzeResponse,
  ApiResponse,
  ErrorExplanation,
  Language,
  Session,
  ValidationResult,
} from '@/types'

// ─── Analyze Code ────────────────────────────────────────────

export async function analyzeCode(
  code: string,
  language: Language,
  logFile?: File | null,
  projectFiles?: File[],
): Promise<AnalyzeResponse> {
  const formData = new FormData()
  formData.append('code', new Blob([code], { type: 'text/plain' }), 'main.py')
  formData.append('language', language)
  if (logFile) {
    formData.append('logs', logFile, logFile.name)
  }
  if (projectFiles?.length) {
    projectFiles.forEach((f) => formData.append('projectFiles', f, f.name))
  }

  const response = await apiClient.post<ApiResponse<AnalyzeResponse>>(
    API_ENDPOINTS.ANALYZE,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return response.data.data
}

// ─── Get Session State ───────────────────────────────────────

export async function getSession(sessionId: string): Promise<Session> {
  const response = await apiClient.get<ApiResponse<Session>>(
    API_ENDPOINTS.SESSION(sessionId),
  )
  return response.data.data
}

// ─── Get Error Explanation ───────────────────────────────────

export async function getErrorExplanation(
  sessionId: string,
): Promise<ErrorExplanation> {
  const response = await apiClient.get<ApiResponse<ErrorExplanation>>(
    `${API_ENDPOINTS.SESSION(sessionId)}/explanation`,
  )
  return response.data.data
}

// ─── Get Validation Result ───────────────────────────────────

export async function getValidationResult(
  sessionId: string,
): Promise<ValidationResult> {
  const response = await apiClient.get<ApiResponse<ValidationResult>>(
    `${API_ENDPOINTS.SESSION(sessionId)}/validation`,
  )
  return response.data.data
}

// ─── Retry Execution ─────────────────────────────────────────

export async function retryExecution(sessionId: string): Promise<Session> {
  const response = await apiClient.post<ApiResponse<Session>>(
    API_ENDPOINTS.RETRY(sessionId),
  )
  return response.data.data
}
