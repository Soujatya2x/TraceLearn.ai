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
//
// Calls GET /session/{id}/analysis (the real backend endpoint).
// Maps BackendAnalysis → ErrorExplanation (the shape the Explanation page needs).

export async function getErrorExplanation(
  sessionId: string,
): Promise<ErrorExplanation> {
  const response = await apiClient.get<ApiResponse<BackendAnalysis>>(
    API_ENDPOINTS.SESSION_ANALYSIS(sessionId),
  )
  return mapAnalysisToErrorExplanation(sessionId, response.data.data)
}

// ─── Get Validation Result ───────────────────────────────────
//
// Calls GET /session/{id} for the session + GET /session/{id}/attempts for execution data.
// Maps BackendSession + BackendExecutionAttempt[] → ValidationResult (what the Validation page needs).

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

// ─── Mapping: BackendAnalysis → ErrorExplanation ─────────────
//
// The backend stores analysis data in AiAnalysisResponse — a flat DTO with
// JSON-deserialized fields. The Explanation page uses ErrorExplanation which
// has a richer shape (conceptBehindError as object, similarErrorsHistory, etc.).
// This function bridges the two without touching the backend.

function mapAnalysisToErrorExplanation(
  sessionId: string,
  analysis: BackendAnalysis,
): ErrorExplanation {
  // stackTrace from backend is a raw string — split into lines for the UI
  const stackTraceLines: string[] = analysis.stackTrace
    ? analysis.stackTrace.split('\n').filter((l) => l.trim().length > 0)
    : []

  // conceptBehindError from backend is a plain string — wrap into ConceptExplanation
  const conceptBehindError = {
    concept: analysis.conceptBehindError ?? 'Unknown Concept',
    description: analysis.explanation ?? '',
    icon: '🛡️',  // default icon — backend doesn't provide one
  }

  // learningResources from backend are already typed objects {title, url, type}
  // Add a source field derived from the URL hostname
  const learningResources = (analysis.learningResources ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    type: (r.type as 'documentation' | 'article' | 'video' | 'tutorial') ?? 'article',
    source: extractHostname(r.url),
  }))

  // similarErrors from backend: {errorType, description, example}
  // Map to the SimilarError shape the history list needs
  const similarErrorsHistory = (analysis.similarErrors ?? []).map((e, i) => ({
    sessionId: `similar-${i}`,
    errorType: e.errorType,
    date: 'Previous session',
    resolved: true,  // backend doesn't track resolved status per similar error
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

// ─── Mapping: BackendSession + BackendExecutionAttempt[] → ValidationResult ──
//
// The Validation page shows original vs fixed code, the fix explanation, and
// execution output. All of this comes from SessionDetailResponse.aiAnalysis
// and the latest execution attempt.

function mapSessionToValidationResult(
  session: BackendSession,
  attempts: BackendExecutionAttempt[],
): ValidationResult {
  const analysis = session.aiAnalysis

  // Latest attempt = highest attemptNumber
  const latestAttempt = attempts.length > 0
    ? attempts.reduce((best, a) => a.attemptNumber > best.attemptNumber ? a : best)
    : null

  // Determine validation status from the latest attempt's execution status
  let validationStatus: 'success' | 'failed' | 'pending' = 'pending'
  if (latestAttempt) {
    if (latestAttempt.status === 'SUCCESS') validationStatus = 'success'
    else if (latestAttempt.status === 'FAILED' || latestAttempt.status === 'ERROR') validationStatus = 'failed'
  }

  return {
    sessionId: session.sessionId,
    originalCode: session.originalCode ?? '',
    fixedCode: analysis?.fixedCode ?? '',
    diffLines: [],  // diff computation is a UI concern — computed in the component
    whatChanged: analysis?.fixAnalysis?.whatChanged ?? '',
    whyItWorks: analysis?.fixAnalysis?.whyItWorks ?? '',
    reinforcedConcept: analysis?.fixAnalysis?.reinforcedConcept ?? '',
    validationStatus,
    retryCount: session.retryCount ?? 0,
    maxRetries: 2,  // matches backend AppProperties default
    executionOutput: {
      stdout: latestAttempt?.stdout ?? '',
      stderr: latestAttempt?.stderr ?? '',
      exitCode: latestAttempt?.exitCode ?? 0,
      executionTime: latestAttempt?.executionTimeMs ?? 0,
    },
  }
}

// ─── Private helpers ──────────────────────────────────────────

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}