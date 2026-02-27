package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.*;
import ai.tracelearn.systembrain.dto.*;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.exception.RetryLimitExceededException;
import ai.tracelearn.systembrain.integration.AiAgentClient;
import ai.tracelearn.systembrain.integration.dto.*;
import ai.tracelearn.systembrain.mapper.SessionMapper;
import ai.tracelearn.systembrain.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Core orchestration service — THE SYSTEM BRAIN.
 *
 * Single authority that coordinates the full learning workflow:
 *   1. Receive code + logs from Frontend
 *   2. Create workspace and session
 *   3. Delegate long-running work to AsyncPipelineExecutor (off HTTP thread)
 *   4. Return immediately — frontend polls GET /session/{id} or listens on WebSocket
 *
 * IMPORTANT: All sandbox and AI calls run via AsyncPipelineExecutor.
 * @Async methods are kept in a SEPARATE bean to prevent Spring's self-call
 * proxy bypass, which would silently make @Async run synchronously.
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
    private final AsyncPipelineExecutor asyncPipeline; // ← owns all @Async methods

    // ─── 1. ANALYZE ─────────────────────────────────────────────────────────

    /**
     * Entry point for the analysis workflow.
     *
     * Synchronous work (validates, creates workspace + session), then
     * hands off to AsyncPipelineExecutor and returns the session immediately.
     * The HTTP request completes in milliseconds regardless of AI/sandbox latency.
     */
    public SessionDetailResponse analyzeCode(User user, AnalyzeRequest request) {
        log.info("Starting analysis for user {}: language={}, codeLength={}",
                user.getId(), request.getLanguage(), request.getCode().length());

        if (request.getCode().getBytes().length > appProperties.getExecution().getMaxFileSizeBytes()) {
            throw new BadRequestException("Code exceeds maximum allowed size of "
                    + appProperties.getExecution().getMaxFileSizeBytes() + " bytes");
        }

        UUID sessionUUID = UUID.randomUUID();
        String workspacePath = workspaceService.createWorkspace(
                sessionUUID, request.getCode(), request.getLogs(), request.getLanguage());

        Session session = sessionService.createSession(
                user, request.getLanguage(), workspacePath,
                request.getCode(), request.getLogs(), request.getFilename());

        // Delegate to AsyncPipelineExecutor — proxy is invoked correctly, @Async works
        asyncPipeline.runAnalysisPipeline(session, request);

        return sessionMapper.toDetailResponse(session);
    }

    // ─── 2. RETRY ───────────────────────────────────────────────────────────

    /**
     * Retry execution with AI-suggested fixed code.
     *
     * Pattern mirrors analyzeCode():
     *   - All validation runs synchronously on the HTTP thread
     *     (ownership, retry limit, fixed code present) — errors thrown here
     *     produce correct HTTP 400/409 responses
     *   - State prep runs synchronously (increment counter, update workspace)
     *     so status is visible in DB before async starts
     *   - Sandbox + AI calls handed off to AsyncPipelineExecutor immediately
     *   - Returns current session state — frontend polls for progress
     */
    public SessionDetailResponse retryExecution(UUID sessionId, User user) {
        Session session = sessionService.getSessionEntity(sessionId);

        // ── Validate (sync — throws HTTP errors correctly) ──
        if (!session.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You do not own this session");
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

        // ── Prepare state (sync — committed to DB before async starts) ──
        sessionService.incrementRetryCount(sessionId);
        workspaceService.updateWorkspaceCode(sessionId, fixedCode, session.getLanguage(), attemptNumber);
        sessionService.updateSessionStatus(sessionId, SessionStatus.EXECUTING);
        notificationService.notifySessionUpdate(sessionId, "EXECUTING",
                java.util.Map.of("retryAttempt", attemptNumber));

        // ── Hand off to async pipeline — HTTP thread freed immediately ──
        asyncPipeline.runRetryPipeline(session, fixedCode, attemptNumber, analysis.getFixedCode());

        return sessionMapper.toDetailResponse(sessionService.getSessionEntity(sessionId));
    }

    // ─── 3. CHAT ────────────────────────────────────────────────────────────

    /**
     * Process a chat message within a session context.
     * Chats are isolated per session — context is always scoped to one error session.
     */
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

        AiChatRequest chatReq = AiChatRequest.builder()
                .sessionId(sessionId.toString())
                .userMessage(userMessage)
                .errorContext(session.getOriginalLogs())
                .analysisSummary(analysisSummary)
                .chatHistory(history.stream()
                        .map(m -> AiChatRequest.ChatHistoryEntry.builder()
                                .role(m.getRole().name().toLowerCase())
                                .message(m.getMessage())
                                .build())
                        .collect(Collectors.toList()))
                .build();

        AiChatResponse aiResponse = aiAgentClient.chat(chatReq);
        ChatMessage assistantMsg = chatService.saveAssistantMessage(session, aiResponse.getReply());

        return ChatMessageResponse.builder()
                .id(assistantMsg.getId())
                .role(ChatRole.ASSISTANT)
                .message(aiResponse.getReply())
                .timestamp(assistantMsg.getTimestamp())
                .build();
    }

    // ─── 4. ROADMAP ─────────────────────────────────────────────────────────

    /**
     * Generate a personalized learning roadmap based on accumulated session metrics.
     */
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
        long completedSessions = sessionRepository.countByUserIdAndStatus(user.getId(), SessionStatus.COMPLETED);

        List<RoadmapResponse.ConceptMetric> conceptMetrics = metrics.stream()
                .map(m -> RoadmapResponse.ConceptMetric.builder()
                        .conceptName(m.getConceptName())
                        .masteryScore(m.getMasteryScore())
                        .encounterCount(m.getEncounterCount())
                        .build())
                .collect(Collectors.toList());

        List<RoadmapResponse.RecommendedTopic> recommendedTopics = aiResponse.getRecommendedTopics() != null
                ? aiResponse.getRecommendedTopics().stream()
                .map(t -> RoadmapResponse.RecommendedTopic.builder()
                        .topicName(t.getTopicName())
                        .description(t.getDescription())
                        .priority(t.getPriority())
                        .estimatedTime(t.getEstimatedTime())
                        .build())
                .collect(Collectors.toList())
                : List.of();

        return RoadmapResponse.builder()
                .userId(user.getId())
                .totalSessionsAnalyzed(totalSessions)
                .completedSessions(completedSessions)
                .knowledgeGapAnalysis(conceptMetrics)
                .recommendedTopics(recommendedTopics)
                .learningPriorities(aiResponse.getLearningPriorities())
                .build();
    }
}