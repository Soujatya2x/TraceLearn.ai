from pydantic import BaseModel, ConfigDict
from typing import Optional

# --- /ai/analyze ---
class PreviousAttempt(BaseModel):
    attemptNumber: int
    code: str
    stderr: str
    exitCode: int
    aiFix: str

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")   # FIXED: was extra="forbid" — caused 422 on any new field
    sessionId: str
    language: Optional[str] = None
    code: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exitCode: Optional[int] = None
    originalCode: Optional[str] = None
    originalLogs: Optional[str] = None
    attemptNumber: Optional[int] = None
    previousAttempts: Optional[list[PreviousAttempt]] = []
    # Fields added for framework log analysis
    executionMode: Optional[str] = None        # "LOG_ANALYSIS" or None
    frameworkType: Optional[str] = None        # "springboot", "fastapi", etc.
    logContent: Optional[str] = None

    
class FixAnalysis(BaseModel):
    whatChanged: str
    whyItWorks: str
    reinforcedConcept: str

class LearningResource(BaseModel):
    title: str
    url: str
    type: str

class SimilarError(BaseModel):
    errorType: str
    description: str
    example: str
    
class ErrorDetail(BaseModel):
    errorType: str
    errorFile: str
    errorLine: int
    context: str
    
class AnalyzeResponse(BaseModel):
    explanation: str
    stackTrace: str
    whyItHappened: str
    conceptBehindError: str
    stepByStepReasoning: list[str]
    fixedCode: str
    fixAnalysis: FixAnalysis
    learningResources: list[LearningResource]
    similarErrors: list[SimilarError]
    conceptBreakdown: str
    learningSummary: str
    confidenceScore: float
    retryRecommendation: bool
    errorDetail: ErrorDetail

# --- /ai/chat ---

class ChatMessage(BaseModel):
    role: str
    message: str

class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    errorContext: str
    analysisSummary: str
    chatHistory: list[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
    suggestedFollowUps: list[str]

# --- /ai/artifacts ---

class ArtifactsFixAnalysis(BaseModel):
    whatChanged: str
    whyItWorks: str
    reinforcedConcept: str

class ArtifactsLearningResource(BaseModel):
    title: str
    url: str
    type: str

class ArtifactsRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    sessionId: str
    code: Optional[str] = ""
    explanation: Optional[str] = ""
    fixedCode: Optional[str] = ""
    learningSummary: Optional[str] = ""
    whyItHappened: Optional[str] = ""
    conceptBehindError: Optional[str] = ""
    stepByStepReasoning: Optional[list[str]] = []
    fixAnalysis: Optional[ArtifactsFixAnalysis] = None
    learningResources: Optional[list[ArtifactsLearningResource]] = []

class ArtifactsResponse(BaseModel):
    pdfUrl: str
    pptUrl: str
    summaryUrl: str

# --- /ai/roadmap ---

class ConceptMetric(BaseModel):
    conceptName: str
    masteryScore: float
    encounterCount: int

class RoadmapRequest(BaseModel):
    userId: str
    currentMetrics: list[ConceptMetric]


class KnowledgeGap(BaseModel):
    conceptName: str
    masteryScore: float
    gapLevel: str
    description: str

class TopicResource(BaseModel):
    title: str
    url: str

class RecommendedTopic(BaseModel):
    topicName: str
    description: str
    priority: str
    estimatedTime: str
    resources: list[TopicResource]
    
class ConceptMasteryScore(BaseModel):
    conceptName: str
    masteryScore: float

class RoadmapResponse(BaseModel):
    knowledgeGapAnalysis: list[KnowledgeGap]
    recommendedTopics: list[RecommendedTopic]
    learningPriorities: str
    conceptMasteryScores: list[ConceptMasteryScore]