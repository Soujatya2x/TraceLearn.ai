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
  content: string
}

// ─── Artifacts ───────────────────────────────────────────────

export type ArtifactType = 'pdf' | 'ppt' | 'summary'

export interface Artifact {
  id: string
  sessionId: string
  type: ArtifactType
  title: string
  description: string
  s3Url: string
  generatedAt: string
  size?: number
}

export interface ArtifactsResponse {
  sessionId: string
  artifacts: Artifact[]
  learningMetrics: LearningMetrics
}

// ─── Roadmap ─────────────────────────────────────────────────

export type ConceptCategory =
  | 'Variables'
  | 'Control Flow'
  | 'Functions'
  | 'OOP'
  | 'Error Handling'
  | 'Data Structures'
  | 'Algorithms'
  | 'Async'

export type Priority = 'high' | 'medium' | 'low'

export interface ConceptMastery {
  category: ConceptCategory
  masteryPercentage: number
  errorFrequency: number
  lastSeen: string
}

export interface RecommendedTopic {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  priority: Priority
  category: ConceptCategory
  resourceLinks: LearningResource[]
}

export interface NextStep {
  id: string
  action: string
  description: string
  resourceLinks: LearningResource[]
  practiceExercises: string[]
}

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
