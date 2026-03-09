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
    model_config = ConfigDict(extra="ignore")

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

    executionMode: Optional[str] = None
    frameworkType: Optional[str] = None
    logContent: Optional[str] = None


class FixAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")

    whatChanged: Optional[str] = ""
    whyItWorks: Optional[str] = ""
    reinforcedConcept: Optional[str] = ""


class LearningResource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = ""
    url: Optional[str] = ""
    type: Optional[str] = "article"


class SimilarError(BaseModel):
    model_config = ConfigDict(extra="ignore")

    errorType: Optional[str] = ""
    description: Optional[str] = ""
    example: Optional[str] = ""


class ErrorDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")

    errorType: Optional[str] = ""
    errorFile: Optional[str] = ""
    errorLine: Optional[int] = 0
    context: Optional[str] = ""


class ConceptScore(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # Uses conceptName/masteryScore to match what the LLM returns
    conceptName: str = ""
    masteryScore: float = 0.0


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    explanation: str = ""
    stackTrace: str = ""
    whyItHappened: str = ""
    conceptBehindError: str = ""
    stepByStepReasoning: list[str] = []

    fixedCode: str = ""

    fixAnalysis: Optional[FixAnalysis] = None
    learningResources: list[LearningResource] = []
    similarErrors: list[SimilarError] = []

    conceptBreakdown: str = ""
    learningSummary: str = ""

    confidenceScore: float = 0.0
    retryRecommendation: bool = False

    errorDetail: Optional[ErrorDetail] = None

    # Drives roadmap Knowledge Gap + Skill Radar via LearningMetricService
    conceptScores: list[ConceptScore] = []


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
    model_config = ConfigDict(extra="ignore")

    whatChanged: Optional[str] = ""
    whyItWorks: Optional[str] = ""
    reinforcedConcept: Optional[str] = ""


class ArtifactsLearningResource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = ""
    url: Optional[str] = ""
    type: Optional[str] = "article"


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
    model_config = ConfigDict(extra="ignore")   # ← add this
    userId: Optional[str] = None
    language: Optional[str] = None              # ← add
    code: Optional[str] = None                  # ← add
    stdout: Optional[str] = None                # ← add
    exitCode: Optional[int] = None              # ← add
    attemptNumber: Optional[int] = None         # ← add
    previousAttempts: Optional[list[PreviousAttempt]] = []  # ← add
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
