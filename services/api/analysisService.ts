import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'
import type {
  AnalyzeResponse,
  ApiResponse,
  BackendAnalysis,
  BackendExecutionAttempt,
  BackendSession,
  DiffLine,
  ErrorExplanation,
  Language,
  Session,
  ValidationResult,
} from '@/types'

/* ────────────────────────────────────────────────────────── */
/* Detect Framework                                           */
/* ────────────────────────────────────────────────────────── */

export interface DetectResult {
  mode: 'LIVE_EXECUTION' | 'LOG_ANALYSIS'
  detectedFramework: string | null
  confidence: number
  reason: string
}

export async function detectFramework(codeFile: File): Promise<DetectResult> {
  const formData = new FormData()
  formData.append('code', codeFile, codeFile.name)

  // FIX: Do NOT set Content-Type manually. Axios must set it automatically
  // so the multipart boundary token is included (e.g. boundary=----XYZ).
  // Manually setting 'multipart/form-data' strips the boundary and the
  // backend throws 400 "Required part 'code' is not present".
  const response = await apiClient.post<ApiResponse<DetectResult>>(
    API_ENDPOINTS.DETECT,
    formData,
  )

  return response.data.data
}

/* ────────────────────────────────────────────────────────── */
/* Analyze Code                                               */
/* ────────────────────────────────────────────────────────── */

function resolveFilename(language: Language): string {
  switch (language) {
    case 'python':     return 'main.py'
    case 'java':       return 'Main.java'
    case 'javascript': return 'index.js'
    case 'typescript': return 'index.ts'
    case 'go':         return 'main.go'
    default:           return 'main.txt'
  }
}

/**
 * FIX: Map frontend Language values to the set the backend accepts.
 *
 * Backend ALLOWED_LANGUAGES: python | java | javascript | node | go | rust
 * Frontend Language type:    python | java | javascript | typescript | go
 *
 * 'typescript' is NOT in the backend whitelist → instant 400.
 * TypeScript files are valid JS at parse time, so we send 'javascript'
 * and keep the .ts filename so the AI agent knows the actual language.
 */
function toBackendLanguage(language: Language): string {
  if (language === 'typescript') return 'javascript'
  return language
}

export async function analyzeCode(
  code: string,
  language: Language,
  logFile?: File | null,
  projectFiles?: File[],
  frameworkType?: string | null,
): Promise<AnalyzeResponse> {

  const formData = new FormData()

  const codeFile = projectFiles?.[0]

  if (codeFile) {
    formData.append('code', codeFile, codeFile.name)
  } else {
    formData.append(
      'code',
      new Blob([code], { type: 'text/plain' }),
      resolveFilename(language),
    )
  }

  // FIX: send the mapped language value (typescript → javascript)
  formData.append('language', toBackendLanguage(language))

  if (logFile) formData.append('logs', logFile, logFile.name)
  if (frameworkType) formData.append('frameworkType', frameworkType)

  if (projectFiles && projectFiles.length > 1) {
    projectFiles.slice(1).forEach((f) =>
      formData.append('projectFiles', f, f.name),
    )
  }

  // FIX: Do NOT set Content-Type manually. Let Axios set it with the correct
  // multipart boundary. Manual 'multipart/form-data' header causes Spring Boot
  // to reject the request with 400 because the boundary parameter is missing.
  const response = await apiClient.post<ApiResponse<AnalyzeResponse>>(
    API_ENDPOINTS.ANALYZE,
    formData,
  )

  return response.data.data
}

/* ────────────────────────────────────────────────────────── */
/* Session                                                    */
/* ────────────────────────────────────────────────────────── */

export async function getSession(sessionId: string): Promise<Session> {
  const response = await apiClient.get<ApiResponse<Session>>(
    API_ENDPOINTS.SESSION(sessionId),
  )

  return response.data.data
}

/* ────────────────────────────────────────────────────────── */
/* Error Explanation                                          */
/* ────────────────────────────────────────────────────────── */

export async function getErrorExplanation(
  sessionId: string,
): Promise<ErrorExplanation> {

  const response = await apiClient.get<ApiResponse<BackendAnalysis>>(
    API_ENDPOINTS.SESSION_ANALYSIS(sessionId),
  )

  return mapAnalysisToErrorExplanation(sessionId, response.data.data)
}

/* ────────────────────────────────────────────────────────── */
/* Validation Result                                          */
/* ────────────────────────────────────────────────────────── */

export async function getValidationResult(
  sessionId: string,
): Promise<ValidationResult> {

  const [sessionRes, attemptsRes] = await Promise.all([
    apiClient.get<ApiResponse<BackendSession>>(API_ENDPOINTS.SESSION(sessionId)),
    apiClient.get<ApiResponse<BackendExecutionAttempt[]>>(
      API_ENDPOINTS.SESSION_ATTEMPTS(sessionId),
    ),
  ])

  return mapSessionToValidationResult(
    sessionRes.data.data,
    attemptsRes.data.data,
  )
}

/* ────────────────────────────────────────────────────────── */
/* Retry Execution                                            */
/* ────────────────────────────────────────────────────────── */

export async function retryExecution(sessionId: string): Promise<Session> {
  const response = await apiClient.post<ApiResponse<Session>>(
    API_ENDPOINTS.RETRY(sessionId),
  )

  return response.data.data
}

/* ────────────────────────────────────────────────────────── */
/* Mapping Helpers                                            */
/* ────────────────────────────────────────────────────────── */

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

  const latestAttempt =
    attempts.length > 0
      ? attempts.reduce((best, a) =>
          a.attemptNumber > best.attemptNumber ? a : best,
        )
      : null

  let validationStatus: 'success' | 'failed' | 'pending' = 'pending'

  if (latestAttempt) {
    if (latestAttempt.status === 'SUCCESS') validationStatus = 'success'
    else if (
      latestAttempt.status === 'FAILED' ||
      latestAttempt.status === 'ERROR'
    ) validationStatus = 'failed'
  }

  const diffLines: DiffLine[] = []

  if (analysis?.fixedCode && session.originalCode) {

    const originalLines = session.originalCode.split('\n')
    const fixedLines = analysis.fixedCode.split('\n')
    const max = Math.max(originalLines.length, fixedLines.length)

    for (let i = 0; i < max; i++) {
      const orig  = originalLines[i]
      const fixed = fixedLines[i]

      if (orig === undefined) {
        diffLines.push({ lineNumber: i + 1, type: 'added',     content: fixed ?? '' })
      } else if (fixed === undefined) {
        diffLines.push({ lineNumber: i + 1, type: 'removed',   content: orig ?? '' })
      } else if (orig !== fixed) {
        diffLines.push({ lineNumber: i + 1, type: 'added',     content: fixed })
      } else {
        diffLines.push({ lineNumber: i + 1, type: 'unchanged', content: orig })
      }
    }
  }

  return {
    sessionId: session.sessionId,
    originalCode: session.originalCode ?? '',
    fixedCode: analysis?.fixedCode ?? '',
    diffLines,
    whatChanged:       analysis?.fixAnalysis?.whatChanged       ?? '',
    whyItWorks:        analysis?.fixAnalysis?.whyItWorks        ?? '',
    reinforcedConcept: analysis?.fixAnalysis?.reinforcedConcept ?? '',
    validationStatus,
    retryCount: session.retryCount ?? 0,
    maxRetries: 2,
    executionOutput: {
      stdout:        latestAttempt?.stdout          ?? '',
      stderr:        latestAttempt?.stderr          ?? '',
      exitCode:      latestAttempt?.exitCode        ?? 0,
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