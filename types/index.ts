// ============================================================
// TraceLearn.ai — Global Type Definitions
// ============================================================

// ─── Analysis & Session ─────────────────────────────────────

export type Language = 'python' | 'javascript' | 'java' | 'typescript' | 'go'

export type AnalysisStatus =
  | 'idle'
  | 'processing'
  | 'analyzing'
  | 'validating'
  | 'completed'
  | 'failed'

export interface AnalyzeRequest {
  code: string
  logs?: string
  language: Language
  projectFiles?: File[]
}

export interface AnalyzeResponse {
  sessionId: string
  status: AnalysisStatus
  message: string
}

// ─── Session ────────────────────────────────────────────────

export interface ExecutionOutput {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
}

export interface StructuredError {
  errorType: string
  message: string
  file: string
  line: number
  context: string
  stackTrace: string[]
}

export interface AttemptResult {
  attemptNumber: number
  fixedCode: string
  executionOutput: ExecutionOutput
  success: boolean
  feedback: string
  timestamp: string
}

export interface Session {
  sessionId: string
  userId: string
  status: AnalysisStatus
  language: Language
  originalCode: string
  originalLogs?: string
  structuredError?: StructuredError
  retryCount: number
  maxRetries: number
  attempts: AttemptResult[]
  currentFixedCode?: string
  createdAt: string
  updatedAt: string
}

// ─── Error Explanation ───────────────────────────────────────

export interface ConceptExplanation {
  concept: string
  description: string
  icon: string
}

export interface LearningResource {
  title: string
  url: string
  type: 'documentation' | 'article' | 'video' | 'tutorial'
  source: string
}

export interface SimilarError {
  sessionId: string
  errorType: string
  date: string
  resolved: boolean
}

export interface ErrorExplanation {
  sessionId: string
  errorType: string
  errorMessage: string
  file: string
  lineNumber: number
  stackTrace: string[]
  whyItHappened: string
  conceptBehindError: ConceptExplanation
  stepByStepReasoning: string[]
  learningResources: LearningResource[]
  similarErrorsHistory: SimilarError[]
}

// ─── Validation ──────────────────────────────────────────────

export interface DiffLine {
  lineNumber: number
  type: 'added' | 'removed' | 'unchanged'
  content: string
  comment?: string
}

export interface ValidationResult {
  sessionId: string
  originalCode: string
  fixedCode: string
  diffLines: DiffLine[]
  whatChanged: string
  whyItWorks: string
  reinforcedConcept: string
  validationStatus: 'success' | 'failed' | 'pending'
  retryCount: number
  maxRetries: number
  executionOutput: ExecutionOutput
}

// ─── Chat ────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  timestamp: string
  codeBlocks?: string[]
}

export interface ChatSession {
  sessionId: string
  errorType: string
  errorContext: string
  messages: ChatMessage[]
  suggestedPrompts: string[]
  createdAt: string
}

export interface SendMessageRequest {
  sessionId: string
  message: string   // matches ChatMessageRequest.message in backend — NOT "content"
}

// ─── Artifacts ───────────────────────────────────────────────

export type ArtifactType = 'pdf' | 'ppt' | 'summary'

/**
 * One artifact card — matches ArtifactResponse.ArtifactEntry in backend.
 * Field names are deliberately aligned: s3Url (not pdfUrl/pptUrl), generatedAt (not createdAt).
 */
export interface Artifact {
  id: string
  sessionId: string
  type: ArtifactType       // "pdf" | "ppt" | "summary"
  title: string
  description: string
  s3Url: string            // presigned S3 URL — do not cache, re-fetch when needed
  generatedAt: string      // ISO-8601 timestamp
  size?: number            // bytes, optional
}

/**
 * Full response from GET /api/v1/artifacts/{sessionId}.
 * Matches ArtifactResponse in backend.
 */
export interface ArtifactsResponse {
  sessionId: string
  artifacts: Artifact[]          // one entry per generated file type
  learningMetrics: LearningMetrics
}

// ─── Roadmap ─────────────────────────────────────────────────

// ConceptCategory values match the normalizeConceptName() mapping in OrchestrationService
export type ConceptCategory =
  | 'Variables'
  | 'Control Flow'
  | 'Functions'
  | 'OOP'
  | 'Error Handling'
  | 'Data Structures'
  | 'Algorithms'
  | 'Async'
  | string  // pass-through for AI Agent concepts not in the known list

export type Priority = 'high' | 'medium' | 'low'

/**
 * One concept bar — matches RoadmapResponse.ConceptMastery in backend.
 * lastSeen is an ISO-8601 string (Instant serialized by Jackson).
 */
export interface ConceptMastery {
  category: ConceptCategory
  masteryPercentage: number    // 0–100
  errorFrequency: number       // total encounter count
  lastSeen: string             // ISO-8601
}

/**
 * One resource link inside a topic or next step.
 * Matches RoadmapResponse.TopicResource in backend.
 * Note: source field is populated from URL hostname server-side.
 */
export interface RoadmapResource {
  title: string
  url: string
  type: string    // "documentation" | "article" | "video" | "tutorial"
  source: string  // e.g. "python.org"
}

/**
 * One topic card — matches RoadmapResponse.RecommendedTopic in backend.
 */
export interface RecommendedTopic {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  priority: Priority
  category: ConceptCategory
  resourceLinks: RoadmapResource[]
}

/**
 * One next-step card — matches RoadmapResponse.NextStep in backend.
 */
export interface NextStep {
  id: string
  action: string
  description: string
  resourceLinks: RoadmapResource[]
  practiceExercises: string[]
}

/**
 * Full roadmap response — matches RoadmapResponse in backend.
 * userId is a UUID string (Jackson serializes UUID as string by default).
 * generatedAt is an ISO-8601 string.
 */
export interface LearningRoadmap {
  userId: string
  conceptMastery: ConceptMastery[]
  knowledgeGaps: ConceptMastery[]
  recommendedTopics: RecommendedTopic[]
  nextSteps: NextStep[]
  analysisBasedOn: number
  generatedAt: string
}

// ─── Learning Metrics ────────────────────────────────────────

export interface LearningMetrics {
  totalErrorsAnalyzed: number
  conceptsCovered: number
  fixSuccessRate: number
  learningStreakDays: number
}

// ─── API Response Wrappers ───────────────────────────────────

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}

// ─── UI State ────────────────────────────────────────────────

export interface UploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
}

export interface PollingState {
  isPolling: boolean
  interval: number
  maxAttempts: number
  currentAttempt: number
}

// ─── Backend API Types (actual shapes returned by backend) ───
//
// These mirror the Java DTOs exactly. The frontend-facing types above
// (ErrorExplanation, ValidationResult, etc.) are richer UI models —
// use the mapping functions in analysisService.ts to convert between them.

export interface BackendAnalysis {
  id: string
  // Core explanation
  explanation?: string
  stackTrace?: string                  // raw multiline string
  whyItHappened?: string
  conceptBehindError?: string          // plain string, not an object
  stepByStepReasoning?: string[]
  // Fix
  fixedCode?: string
  fixAnalysis?: {
    whatChanged: string
    whyItWorks: string
    reinforcedConcept: string
  }
  // Learning
  conceptBreakdown?: string
  learningSummary?: string
  learningResources?: BackendLearningResource[]
  similarErrors?: BackendSimilarError[]
  confidenceScore?: number
  retryRecommendation?: boolean
  // Error location
  errorType?: string
  errorFile?: string
  errorLine?: number
  createdAt?: string
}

export interface BackendLearningResource {
  title: string
  url: string
  type: string   // "documentation" | "article" | "video" | "tutorial"
}

export interface BackendSimilarError {
  errorType: string
  description: string
  example: string
}

export interface BackendExecutionAttempt {
  id: string
  attemptNumber: number
  stdout?: string
  stderr?: string
  exitCode?: number
  executionTimeMs?: number
  status: 'SUCCESS' | 'FAILED' | 'ERROR' | 'RUNNING' | 'PENDING'
  createdAt?: string
}

export interface BackendSession {
  sessionId: string
  language: string
  status: string
  retryCount: number
  originalCode?: string
  originalLogs?: string
  createdAt?: string
  updatedAt?: string
  executionAttempts?: BackendExecutionAttempt[]
  aiAnalysis?: BackendAnalysis
}