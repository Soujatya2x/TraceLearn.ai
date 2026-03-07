from pydantic import BaseModel, ConfigDict
from typing import Optional

# --- /ai/analyze ---
class PreviousAttempt(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    attemptNumber: int
    code: str
    stderr: str
    exitCode: int
    aiFix: str

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
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
    # ← new fields added by Java dev
    executionMode: Optional[str] = None        # "LOG_ANALYSIS" or None
    frameworkType: Optional[str] = None        # "springboot", "fastapi", etc.
    logContent: Optional[str] = None 

"""class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sessionId: str
    language: str
    code: str
    stdout: str
    stderr: str
    exitCode: int
    originalCode: str
    originalLogs: str
    attemptNumber: int
    previousAttempts: list[PreviousAttempt]"""

    
class FixAnalysis(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    whatChanged: str
    whyItWorks: str
    reinforcedConcept: str

class LearningResource(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    title: str
    url: str
    type: str

class SimilarError(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    errorType: str
    description: str
    example: str
    
class ErrorDetail(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    errorType: str
    errorFile: str
    errorLine: int
    context: str
    
class AnalyzeResponse(BaseModel):
    #model_config = ConfigDict(extra="forbid")
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
    #model_config = ConfigDict(extra="forbid")
    role: str
    message: str

class ChatRequest(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    sessionId: str
    userMessage: str
    errorContext: str
    analysisSummary: str
    chatHistory: list[ChatMessage]

class ChatResponse(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    reply: str
    suggestedFollowUps: list[str]

# --- /ai/artifacts ---

class ArtifactsFixAnalysis(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    whatChanged: str
    whyItWorks: str
    reinforcedConcept: str

class ArtifactsLearningResource(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    title: str
    url: str
    type: str

class ArtifactsRequest(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    sessionId: str
    code: str
    explanation: str
    fixedCode: str
    learningSummary: str
    whyItHappened: str
    conceptBehindError: str
    stepByStepReasoning: list[str]
    fixAnalysis: ArtifactsFixAnalysis
    learningResources: list[ArtifactsLearningResource]

class ArtifactsResponse(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    pdfUrl: str
    pptUrl: str
    summaryUrl: str

# --- /ai/roadmap ---

class ConceptMetric(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    conceptName: str
    masteryScore: float
    encounterCount: int

class RoadmapRequest(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    userId: str
    currentMetrics: list[ConceptMetric]


class KnowledgeGap(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    conceptName: str
    masteryScore: float
    gapLevel: str
    description: str

class TopicResource(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    title: str
    url: str

class RecommendedTopic(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    topicName: str
    description: str
    priority: str
    estimatedTime: str
    resources: list[TopicResource]
    
class ConceptMasteryScore(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    conceptName: str
    masteryScore: float

class RoadmapResponse(BaseModel):
    #model_config = ConfigDict(extra="forbid")
    knowledgeGapAnalysis: list[KnowledgeGap]
    recommendedTopics: list[RecommendedTopic]
    learningPriorities: str
    conceptMasteryScores: list[ConceptMasteryScore]  # ← changed from dict to list