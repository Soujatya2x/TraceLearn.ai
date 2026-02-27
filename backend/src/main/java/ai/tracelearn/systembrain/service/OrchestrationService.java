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
        ChatMessage assistantMsg = chatService.saveAssistantMessage(session, aiResponse.getReply(), aiResponse.getSuggestedFollowUps());

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
     *
     * Maps all data into the RoadmapResponse shape the frontend expects:
     *   conceptMastery[]    — ALL LearningMetric rows converted to 0–100 percentage
     *   knowledgeGaps[]     — subset where masteryScore < 0.5
     *   recommendedTopics[] — AI Agent response, field names mapped to frontend contract
     *   nextSteps[]         — one actionable step per top-3 knowledge gap
     *   analysisBasedOn     — total session count
     *   generatedAt         — now()
     */
    public RoadmapResponse generateRoadmap(User user) {
        List<LearningMetric> metrics = learningMetricService.getUserMetrics(user.getId());

        // ── Send current metrics to AI Agent ──
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

        // ── Build conceptMastery: all concepts as 0–100 percentage ──
        List<RoadmapResponse.ConceptMastery> conceptMastery = metrics.stream()
                .map(m -> RoadmapResponse.ConceptMastery.builder()
                        .category(normalizeConceptName(m.getConceptName()))
                        .masteryPercentage((int) Math.round(m.getMasteryScore() * 100))
                        .errorFrequency(m.getEncounterCount())
                        .lastSeen(m.getLastEncountered())
                        .build())
                .collect(Collectors.toList());

        // ── knowledgeGaps: concepts below 50% mastery ──
        List<RoadmapResponse.ConceptMastery> knowledgeGaps = conceptMastery.stream()
                .filter(c -> c.getMasteryPercentage() < 50)
                .sorted(java.util.Comparator.comparingInt(RoadmapResponse.ConceptMastery::getMasteryPercentage))
                .collect(Collectors.toList());

        // ── recommendedTopics: map AI Agent response to full frontend shape ──
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

        // ── nextSteps: one actionable step per top knowledge gap (max 3) ──
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

    // ── Private helpers for roadmap building ──────────────────────────────────

    /**
     * Parse an estimated time string like "25 minutes", "1 hour", "30m" → integer minutes.
     * Falls back to 30 if parsing fails.
     */
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

    /**
     * Normalize a concept name to a known ConceptCategory value used in the frontend.
     * Maps common AI Agent concept names like "error-handling" → "Error Handling".
     */
    private String normalizeConceptName(String name) {
        if (name == null) return "Variables";
        return switch (name.toLowerCase().replace("-", " ").replace("_", " ").trim()) {
            case "error handling", "exception handling", "exceptions" -> "Error Handling";
            case "async", "asyncio", "async await", "asynchronous" -> "Async";
            case "oop", "object oriented", "classes", "inheritance" -> "OOP";
            case "data structures", "lists", "dicts", "dictionaries" -> "Data Structures";
            case "algorithms", "sorting", "searching" -> "Algorithms";
            case "functions", "closures", "decorators" -> "Functions";
            case "control flow", "loops", "conditionals" -> "Control Flow";
            case "variables", "scope", "types" -> "Variables";
            default -> name; // pass through if already normalized
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