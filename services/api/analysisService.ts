// ============================================================
// TraceLearn.ai — Analysis Service
// ============================================================

import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type {
  AnalyzeResponse,
  ApiResponse,
  BackendAnalysis,
  BackendExecutionAttempt,
  BackendSession,
  ErrorExplanation,
  Language,
  Session,
  ValidationResult,
} from '@/types'

// ─── Detect Framework ────────────────────────────────────────
//
// Called automatically when user uploads a code file.
// No user action needed — fires on file onChange.
// Returns detection result so FileUploadZone can update its UI
// and WorkspaceRightPanel can conditionally show the log file zone.

export interface DetectResult {
  /** "LIVE_EXECUTION" | "LOG_ANALYSIS" */
  mode: 'LIVE_EXECUTION' | 'LOG_ANALYSIS'
  /** "springboot" | "fastapi" | null */
  detectedFramework: string | null
  /** 0.0–1.0 confidence score */
  confidence: number
  /** Human-readable reason for debugging / UI tooltip */
  reason: string
}

export async function detectFramework(codeFile: File): Promise<DetectResult> {
  const formData = new FormData()
  formData.append('code', codeFile, codeFile.name)

  const response = await apiClient.post<ApiResponse<DetectResult>>(
    API_ENDPOINTS.DETECT,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return response.data.data
}

// ─── Analyze Code ────────────────────────────────────────────

export async function analyzeCode(
  code: string,
  language: Language,
  logFile?: File | null,
  projectFiles?: File[],
  frameworkType?: string | null,
): Promise<AnalyzeResponse> {
  const formData = new FormData()
  formData.append('code', new Blob([code], { type: 'text/plain' }), 'main.py')
  formData.append('language', language)
  if (logFile) {
    formData.append('logs', logFile, logFile.name)
  }
  if (frameworkType) {
    formData.append('frameworkType', frameworkType)
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
  const response = await apiClient.get<ApiResponse<BackendAnalysis>>(
    API_ENDPOINTS.SESSION_ANALYSIS(sessionId),
  )
  return mapAnalysisToErrorExplanation(sessionId, response.data.data)
}

// ─── Get Validation Result ───────────────────────────────────

export async function getValidationResult(
  sessionId: string,
): Promise<ValidationResult> {
  const [sessionRes, attemptsRes] = await Promise.all([
    apiClient.get<ApiResponse<BackendSession>>(API_ENDPOINTS.SESSION(sessionId)),
    apiClient.get<ApiResponse<BackendExecutionAttempt[]>>(
      API_ENDPOINTS.SESSION_ATTEMPTS(sessionId),
    ),
  ])

  return mapSessionToValidationResult(sessionRes.data.data, attemptsRes.data.data)
}

// ─── Retry Execution ─────────────────────────────────────────

export async function retryExecution(sessionId: string): Promise<Session> {
  const response = await apiClient.post<ApiResponse<Session>>(
    API_ENDPOINTS.RETRY(sessionId),
  )
  return response.data.data
}

// ─── Mapping helpers (unchanged) ────────────────────────────

function mapAnalysisToErrorExplanation(
  sessionId: string,
  analysis: BackendAnalysis,
): ErrorExplanation {
  const stackTraceLines: string[] = analysis.stackTrace
    ? analysis.stackTrace.split('\n').filter((l) => l.trim().length > 0)
    : []

  const conceptBehindError = {
    concept: analysis.conceptBehindError ?? 'Unknown Concept',
    description: analysis.explanation ?? '',
    icon: '🛡️',
  }

  const learningResources = (analysis.learningResources ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    type: (r.type as 'documentation' | 'article' | 'video' | 'tutorial') ?? 'article',
    source: extractHostname(r.url),
  }))

  const similarErrorsHistory = (analysis.similarErrors ?? []).map((e, i) => ({
    sessionId: `similar-${i}`,
    errorType: e.errorType,
    date: 'Previous session',
    resolved: true,
  }))

  return {
    sessionId,
    errorType: analysis.errorType ?? 'UnknownError',
    errorMessage: analysis.explanation ?? '',
    file: analysis.errorFile ?? 'unknown',
    lineNumber: analysis.errorLine ?? 0,
    stackTrace: stackTraceLines,
    whyItHappened: analysis.whyItHappened ?? '',
    conceptBehindError,
    stepByStepReasoning: analysis.stepByStepReasoning ?? [],
    learningResources,
    similarErrorsHistory,
  }
}

function mapSessionToValidationResult(
  session: BackendSession,
  attempts: BackendExecutionAttempt[],
): ValidationResult {
  const analysis = session.aiAnalysis

  const latestAttempt = attempts.length > 0
    ? attempts.reduce((best, a) => a.attemptNumber > best.attemptNumber ? a : best)
    : null

  let validationStatus: 'success' | 'failed' | 'pending' = 'pending'
  if (latestAttempt) {
    if (latestAttempt.status === 'SUCCESS') validationStatus = 'success'
    else if (latestAttempt.status === 'FAILED' || latestAttempt.status === 'ERROR') validationStatus = 'failed'
  }

  return {
    sessionId: session.sessionId,
    originalCode: session.originalCode ?? '',
    fixedCode: analysis?.fixedCode ?? '',
    diffLines: [],
    whatChanged: analysis?.fixAnalysis?.whatChanged ?? '',
    whyItWorks: analysis?.fixAnalysis?.whyItWorks ?? '',
    reinforcedConcept: analysis?.fixAnalysis?.reinforcedConcept ?? '',
    validationStatus,
    retryCount: session.retryCount ?? 0,
    maxRetries: 2,
    executionOutput: {
      stdout: latestAttempt?.stdout ?? '',
      stderr: latestAttempt?.stderr ?? '',
      exitCode: latestAttempt?.exitCode ?? 0,
      executionTime: latestAttempt?.executionTimeMs ?? 0,
    },
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}