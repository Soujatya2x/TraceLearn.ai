package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.*;
import ai.tracelearn.systembrain.dto.*;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.exception.RetryLimitExceededException;
import ai.tracelearn.systembrain.exception.ServiceUnavailableException;
import org.springframework.core.task.TaskRejectedException;
import ai.tracelearn.systembrain.integration.AiAgentClient;
import ai.tracelearn.systembrain.integration.dto.*;
import ai.tracelearn.systembrain.mapper.SessionMapper;
import ai.tracelearn.systembrain.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Core orchestration service — THE SYSTEM BRAIN.
 *
 * Single authority that coordinates the full learning workflow:
 *   1. Receive code + logs from Frontend
 *   2. Detect execution mode (LIVE_EXECUTION vs LOG_ANALYSIS)
 *   3. Create workspace and session
 *   4. Route to correct async pipeline
 *   5. Return immediately — frontend polls GET /session/{id} or listens on WebSocket
 *
 * EXECUTION MODE ROUTING (new):
 *
 *   LIVE_EXECUTION → asyncPipeline.runAnalysisPipeline()
 *     Unchanged from v1. Runs code in Docker sandbox, then AI analyzes output.
 *     Used for: Python scripts, single Java class, Node.js scripts, Go, Rust.
 *
 *   LOG_ANALYSIS → asyncPipeline.runLogAnalysisPipeline()
 *     New in v2. Sandbox skipped. AI reads logs directly with framework-specific prompts.
 *     Used for: Spring Boot, FastAPI (extensible to Django, Express, NestJS, React).
 *
 * Detection order (ExecutionModeDetector):
 *   1. Explicit frameworkType from user → LOG_ANALYSIS (always trusted)
 *   2. Log content contains framework signatures → LOG_ANALYSIS (auto-detect)
 *   3. Filename is a build file (pom.xml etc.) → LOG_ANALYSIS (auto-detect)
 *   4. Default → LIVE_EXECUTION
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrchestrationService {

    private final SessionService sessionService;
    private final ExecutionService executionService;
    private final WorkspaceService workspaceService;
    private final AnalysisService analysisService;
    private final ChatService chatService;
    private final ArtifactService artifactService;
    private final LearningMetricService learningMetricService;
    private final NotificationService notificationService;
    private final AiAgentClient aiAgentClient;
    private final SessionMapper sessionMapper;
    private final SessionRepository sessionRepository;
    private final AppProperties appProperties;
    private final AsyncPipelineExecutor asyncPipeline;
    private final ExecutionModeDetector executionModeDetector;

    // ─── 1. ANALYZE ─────────────────────────────────────────────────────────

    /**
     * Entry point for the analysis workflow.
     *
     * Synchronous work (validates, detects mode, creates workspace + session),
     * then hands off to the correct AsyncPipelineExecutor method and returns.
     * HTTP request completes in milliseconds regardless of AI/sandbox latency.
     */
    public SessionDetailResponse analyzeCode(User user, AnalyzeRequest request) {
        log.info("Starting analysis for user {}: language={}, codeLength={}, frameworkType={}",
                user.getId(), request.getLanguage(),
                request.getCode().length(), request.getFrameworkType());

        if (request.getCode().getBytes().length > appProperties.getExecution().getMaxFileSizeBytes()) {
            throw new BadRequestException("Code exceeds maximum allowed size of "
                    + appProperties.getExecution().getMaxFileSizeBytes() + " bytes");
        }

        // ── Detect execution mode ─────────────────────────────────────────────
        // Run BEFORE workspace/session creation so the result is persisted on the session.
        ExecutionModeDetector.DetectionResult detection = executionModeDetector.detect(
                request.getFrameworkType(),
                request.getFilename(),
                request.getLogs()
        );

        log.info("Execution mode detected: mode={}, framework={}, reason={}",
                detection.mode(), detection.frameworkHint(), detection.reason());

        // ── Create workspace (always — stores code + log file on disk) ────────
        UUID sessionUUID = UUID.randomUUID();
        String workspacePath = workspaceService.createWorkspace(
                sessionUUID, request.getCode(), request.getLogs(), request.getLanguage());

        // ── Create session with detected mode ─────────────────────────────────
        // MEDIUM-4: originalCode and originalLogs are NOT passed — they're already
        // on disk in the workspace. SessionService no longer writes them to the DB.
        Session session = sessionService.createSession(
                user, request.getLanguage(), workspacePath,
                request.getFilename(),
                detection.mode(), detection.frameworkHint()
        );

        // ── Route to correct pipeline ─────────────────────────────────────────
        // MEDIUM-7 FIX: Catch TaskRejectedException if CallerRunsPolicy is
        // unavailable (executor shut down during rolling deployment) or if
        // a future policy change removes CallerRunsPolicy. In that scenario
        // we must mark the session ERROR before throwing — otherwise the session
        // stays in CREATED forever with no visible failure to the user.
        try {
            if (detection.mode() == ExecutionMode.LOG_ANALYSIS) {
                log.info("Routing session {} to LOG_ANALYSIS pipeline [framework={}]",
                        session.getId(), detection.frameworkHint());
                asyncPipeline.runLogAnalysisPipeline(session, request);
            } else {
                log.info("Routing session {} to LIVE_EXECUTION pipeline", session.getId());
                asyncPipeline.runAnalysisPipeline(session, request);
            }
        } catch (TaskRejectedException e) {
            log.error("Thread pool full — could not queue session {}", session.getId(), e);
            sessionService.updateSessionStatus(session.getId(), SessionStatus.ERROR);
            notificationService.notifySessionUpdate(session.getId(), "ERROR",
                    Map.of("reason", "Server is at capacity. Please try again in a few minutes."));
            throw new ServiceUnavailableException("Analysis",
                    "Server is at capacity. Please try again in a few minutes.", e);
        }

        return sessionMapper.toDetailResponse(session);
    }

    // ─── 2. RETRY ───────────────────────────────────────────────────────────

    /**
     * Retry execution with AI-suggested fixed code.
     *
     * NOTE: Retry is only meaningful for LIVE_EXECUTION sessions.
     * LOG_ANALYSIS sessions do not run code, so there is nothing to retry.
     * Calling retry on a LOG_ANALYSIS session returns 400.
     */
    public SessionDetailResponse retryExecution(UUID sessionId, User user) {
        Session session = sessionService.getSessionEntity(sessionId);

        if (!session.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You do not own this session");
        }

        // LOG_ANALYSIS sessions have no executable code — retry doesn't apply
        if (session.getExecutionMode() == ExecutionMode.LOG_ANALYSIS) {
            throw new BadRequestException(
                    "Retry is not available for framework log analysis sessions. "
                    + "Apply the suggested fix in your project and re-upload if the error persists.");
        }

        int maxRetries = appProperties.getExecution().getMaxRetryCount();
        if (session.getRetryCount() >= maxRetries) {
            throw new RetryLimitExceededException(maxRetries);
        }

        AiAnalysis analysis = analysisService.getAnalysisEntity(sessionId)
                .orElseThrow(() -> new BadRequestException("No analysis available for retry"));

        if (analysis.getFixedCode() == null || analysis.getFixedCode().isBlank()) {
            throw new BadRequestException("No fixed code available from AI analysis");
        }

        String fixedCode = analysis.getFixedCode();
        int attemptNumber = executionService.getNextAttemptNumber(sessionId);

        sessionService.incrementRetryCount(sessionId);
        workspaceService.updateWorkspaceCode(sessionId, fixedCode, session.getLanguage(), attemptNumber);
        sessionService.updateSessionStatus(sessionId, SessionStatus.EXECUTING);
        notificationService.notifySessionUpdate(sessionId, "EXECUTING",
                java.util.Map.of("retryAttempt", attemptNumber));

        // MEDIUM-7 FIX: same TaskRejectedException guard as analyzeCode()
        try {
            asyncPipeline.runRetryPipeline(session, fixedCode, attemptNumber, analysis.getFixedCode());
        } catch (TaskRejectedException e) {
            log.error("Thread pool full — could not queue retry for session {}", sessionId, e);
            sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    Map.of("reason", "Server is at capacity. Please try again in a few minutes."));
            throw new ServiceUnavailableException("Analysis",
                    "Server is at capacity. Please try again in a few minutes.", e);
        }

        return sessionMapper.toDetailResponse(sessionService.getSessionEntity(sessionId));
    }

    // ─── 3. CHAT ────────────────────────────────────────────────────────────

    public ChatMessageResponse processChat(UUID sessionId, User user, String userMessage) {
        Session session = sessionService.getSessionEntity(sessionId);

        if (!session.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You do not own this session");
        }

        chatService.saveUserMessage(session, userMessage);

        List<ChatMessage> history = chatService.getRawChatHistory(sessionId);
        String analysisSummary = analysisService.getAnalysisEntity(sessionId)
                .map(a -> String.join("\n",
                        a.getExplanation() != null ? a.getExplanation() : "",
                        a.getLearningSummary() != null ? a.getLearningSummary() : ""))
                .orElse("");

        // MEDIUM-4: originalLogs no longer on session entity — read from workspace
        String errorContext = workspaceService.readLogFile(session.getWorkspacePath());

        AiChatRequest chatReq = AiChatRequest.builder()
                .sessionId(sessionId.toString())
                .userMessage(userMessage)
                .errorContext(errorContext)
                .analysisSummary(analysisSummary)
                .chatHistory(history.stream()
                        .map(m -> AiChatRequest.ChatHistoryEntry.builder()
                                .role(m.getRole().name().toLowerCase())
                                .message(m.getMessage())
                                .build())
                        .collect(Collectors.toList()))
                .build();

        AiChatResponse aiResponse = aiAgentClient.chat(chatReq);
        ChatMessage assistantMsg = chatService.saveAssistantMessage(
                session, aiResponse.getReply(), aiResponse.getSuggestedFollowUps());

        return ChatMessageResponse.builder()
                .id(assistantMsg.getId())
                .role(ChatRole.ASSISTANT)
                .message(aiResponse.getReply())
                .timestamp(assistantMsg.getTimestamp())
                .build();
    }

    // ─── 4. ROADMAP ─────────────────────────────────────────────────────────

    public RoadmapResponse generateRoadmap(User user) {
        List<LearningMetric> metrics = learningMetricService.getUserMetrics(user.getId());

        List<AiRoadmapRequest.MetricEntry> metricEntries = metrics.stream()
                .map(m -> AiRoadmapRequest.MetricEntry.builder()
                        .conceptName(m.getConceptName())
                        .masteryScore(m.getMasteryScore())
                        .encounterCount(m.getEncounterCount())
                        .build())
                .collect(Collectors.toList());

        AiRoadmapRequest request = AiRoadmapRequest.builder()
                .userId(user.getId().toString())
                .currentMetrics(metricEntries)
                .build();

        AiRoadmapResponse aiResponse = aiAgentClient.generateRoadmap(request);

        long totalSessions = sessionRepository.countByUserId(user.getId());

        List<RoadmapResponse.ConceptMastery> conceptMastery = metrics.stream()
                .map(m -> RoadmapResponse.ConceptMastery.builder()
                        .category(normalizeConceptName(m.getConceptName()))
                        .masteryPercentage((int) Math.round(m.getMasteryScore() * 100))
                        .errorFrequency(m.getEncounterCount())
                        .lastSeen(m.getLastEncountered())
                        .build())
                .collect(Collectors.toList());

        List<RoadmapResponse.ConceptMastery> knowledgeGaps = conceptMastery.stream()
                .filter(c -> c.getMasteryPercentage() < 50)
                .sorted(java.util.Comparator.comparingInt(RoadmapResponse.ConceptMastery::getMasteryPercentage))
                .collect(Collectors.toList());

        List<RoadmapResponse.RecommendedTopic> recommendedTopics = aiResponse.getRecommendedTopics() != null
                ? aiResponse.getRecommendedTopics().stream()
                .map((t) -> {
                    List<RoadmapResponse.TopicResource> resources = t.getResources() != null
                            ? t.getResources().stream()
                                .map(r -> RoadmapResponse.TopicResource.builder()
                                        .title(r.getTitle())
                                        .url(r.getUrl())
                                        .type("documentation")
                                        .source(extractHostname(r.getUrl()))
                                        .build())
                                .collect(Collectors.toList())
                            : List.of();
                    return RoadmapResponse.RecommendedTopic.builder()
                            .id("topic-" + System.nanoTime())
                            .title(t.getTopicName())
                            .description(t.getDescription())
                            .estimatedMinutes(parseEstimatedMinutes(t.getEstimatedTime()))
                            .priority(t.getPriority() != null ? t.getPriority().toLowerCase() : "medium")
                            .category(normalizeConceptName(t.getTopicName()))
                            .resourceLinks(resources)
                            .build();
                })
                .collect(Collectors.toList())
                : List.of();

        List<RoadmapResponse.NextStep> nextSteps = knowledgeGaps.stream()
                .limit(3)
                .map((gap) -> RoadmapResponse.NextStep.builder()
                        .id("step-" + System.nanoTime())
                        .action("Improve your " + gap.getCategory() + " skills")
                        .description("With " + gap.getErrorFrequency() + " recorded errors and "
                                + gap.getMasteryPercentage() + "% mastery, "
                                + gap.getCategory() + " is a high-impact area to focus on next.")
                        .resourceLinks(List.of())
                        .practiceExercises(List.of(
                                "Review the concept fundamentals and definitions",
                                "Write a small program that specifically exercises this concept",
                                "Find an existing bug in your recent code related to this concept and fix it"
                        ))
                        .build())
                .collect(Collectors.toList());

        return RoadmapResponse.builder()
                .userId(user.getId())
                .conceptMastery(conceptMastery)
                .knowledgeGaps(knowledgeGaps)
                .recommendedTopics(recommendedTopics)
                .nextSteps(nextSteps)
                .analysisBasedOn(totalSessions)
                .generatedAt(java.time.Instant.now())
                .build();
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private int parseEstimatedMinutes(String estimatedTime) {
        if (estimatedTime == null || estimatedTime.isBlank()) return 30;
        try {
            String lower = estimatedTime.toLowerCase().trim();
            if (lower.contains("hour")) {
                int hours = Integer.parseInt(lower.replaceAll("[^0-9]", "").trim());
                return hours * 60;
            }
            String digits = lower.replaceAll("[^0-9]", "").trim();
            return digits.isEmpty() ? 30 : Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return 30;
        }
    }

    private String normalizeConceptName(String name) {
        if (name == null) return "Variables";
        return switch (name.toLowerCase().replace("-", " ").replace("_", " ").trim()) {
            case "error handling", "exception handling", "exceptions" -> "Error Handling";
            case "async", "asyncio", "async await", "asynchronous"    -> "Async";
            case "oop", "object oriented", "classes", "inheritance"   -> "OOP";
            case "data structures", "lists", "dicts", "dictionaries"  -> "Data Structures";
            case "algorithms", "sorting", "searching"                 -> "Algorithms";
            case "functions", "closures", "decorators"               -> "Functions";
            case "control flow", "loops", "conditionals"             -> "Control Flow";
            case "variables", "scope", "types"                        -> "Variables";
            case "dependency injection", "beans", "spring context"    -> "Dependency Injection";
            case "rest api", "http", "controllers"                    -> "REST API";
            case "database", "jpa", "orm", "hibernate"               -> "Database";
            case "async io", "event loop", "coroutines"               -> "Async I/O";
            default -> name;
        };
    }

    private String extractHostname(String url) {
        if (url == null) return "";
        try {
            return new java.net.URI(url).getHost().replace("www.", "");
        } catch (Exception e) {
            return url;
        }
    }
}