package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.*;
import ai.tracelearn.systembrain.dto.AnalyzeRequest;
import ai.tracelearn.systembrain.integration.dto.*;
import ai.tracelearn.systembrain.mapper.SessionMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

/**
 * Dedicated async pipeline executor — runs on the "taskExecutor" thread pool.
 *
 * THREAD POOL ARCHITECTURE:
 *
 *   taskExecutor     (core=5,  max=20) — this bean — orchestration pipelines
 *   sandboxExecutor  (core=3,  max=10) — SandboxGateway  — Docker exec calls
 *   analysisExecutor (core=5,  max=20) — AnalysisGateway — LLM inference calls
 *
 * Sandbox and AI calls are dispatched to their dedicated pools via
 * SandboxGateway and AnalysisGateway respectively. Both return
 * CompletableFuture so this class can .get() and handle exceptions.
 *
 * WHY THREE POOLS:
 *   Sandbox calls block for 10–30s waiting for Docker containers.
 *   LLM calls block for 5–30s waiting for AI inference.
 *   Without isolation, 10 concurrent sandbox calls could starve the AI pool
 *   and vice versa — degrading the whole system under load.
 *
 * SELF-CALL PROXY BYPASS:
 *   All @Async methods live in separate beans (this class, SandboxGateway,
 *   AnalysisGateway). OrchestrationService calls this bean externally,
 *   and this bean calls the gateways externally — Spring AOP proxy always
 *   intercepts correctly.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncPipelineExecutor {

    private final SessionService sessionService;
    private final ExecutionService executionService;
    private final ChatService chatService;
    private final AnalysisService analysisService;
    private final ArtifactService artifactService;
    private final LearningMetricService learningMetricService;
    private final NotificationService notificationService;
    private final SessionMapper sessionMapper;
    private final SandboxGateway sandboxGateway;       // sandboxExecutor pool
    private final AnalysisGateway analysisGateway;     // analysisExecutor pool
    private final ObjectMapper objectMapper;

    // ─── 1. Initial Analysis Pipeline ───────────────────────────────────────

    @Async("taskExecutor")
    public void runAnalysisPipeline(Session session, AnalyzeRequest request) {
        UUID sessionId = session.getId();

        try {
            // ── Step 1: Execute code in Sandbox (sandboxExecutor pool) ──
            sessionService.updateSessionStatus(sessionId, SessionStatus.EXECUTING);
            notificationService.notifySessionUpdate(sessionId, "EXECUTING", null);

            int attemptNumber = executionService.getNextAttemptNumber(sessionId);
            ExecutionAttempt attempt = executionService.createAttempt(session, attemptNumber, request.getCode());
            executionService.markAttemptRunning(attempt.getId());

            try {
                SandboxExecuteResponse execResult = sandboxGateway.executeCode(
                        session.getId().toString(),
                        session.getWorkspacePath(),
                        request.getLanguage()).get();

                attempt = executionService.recordResult(attempt.getId(), execResult);
                notificationService.notifyExecutionComplete(sessionId, attemptNumber,
                        attempt.getStatus().name());

            } catch (ExecutionException e) {
                executionService.markAttemptError(attempt.getId(), unwrap(e).getMessage());
                log.error("Sandbox execution failed for session {}", sessionId, e);
            }

            // ── Infrastructure failure guard ──
            // ERROR = sandbox itself crashed (network, container, timeout) — no
            // stdout/stderr for AI to reason about. FAILED = user code exited non-zero —
            // AI gets real output to analyze. Only abort on ERROR.
            if (attempt.getStatus() == ExecutionStatus.ERROR) {
                log.warn("Sandbox infrastructure error for session {} — aborting AI analysis", sessionId);
                sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
                notificationService.notifySessionUpdate(sessionId, "ERROR",
                        java.util.Map.of("reason",
                                "Sandbox execution failed — no output available for analysis"));
                return;
            }

            // ── Step 2: Analyze via AI Agent (analysisExecutor pool) ──
            sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZING);
            notificationService.notifySessionUpdate(sessionId, "ANALYZING", null);

            try {
                AiAnalyzeRequest analyzeReq = buildAnalyzeRequest(session, attempt, request);
                AiAnalyzeResponse aiResponse = analysisGateway.analyzeCode(analyzeReq).get();

                AiAnalysis analysis = analysisService.saveAnalysis(session, aiResponse);

                // ── Update learning metrics ──────────────────────────────────
                // Prefer per-concept scores from the Learning Analyst Agent (conceptScores).
                // Fall back to uniform confidenceScore applied across all concepts
                // only when conceptScores is absent — less accurate but always progresses.
                if (aiResponse.getConceptScores() != null && !aiResponse.getConceptScores().isEmpty()) {
                    learningMetricService.updateMetricsFromScores(
                            session.getUser(),
                            aiResponse.getConceptScores());
                } else if (aiResponse.getConcepts() != null && !aiResponse.getConcepts().isEmpty()) {
                    learningMetricService.updateMetrics(
                            session.getUser(),
                            aiResponse.getConcepts(),
                            aiResponse.getConfidenceScore() != null ? aiResponse.getConfidenceScore() : 0.5);
                }

                sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZED);
                notificationService.notifyAnalysisComplete(sessionId,
                        sessionMapper.toAnalysisResponse(analysis));

                // ── Step 3: Trigger artifact generation ──
                triggerArtifactGeneration(session);

            } catch (ExecutionException e) {
                log.error("AI analysis failed for session {}", sessionId, e);
                sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
                notificationService.notifySessionUpdate(sessionId, "ERROR",
                        java.util.Map.of("reason", "AI analysis failed: " + unwrap(e).getMessage()));
            }

        } catch (Exception e) {
            log.error("Analysis pipeline failed for session {}", sessionId, e);
            sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", "Pipeline error: " + e.getMessage()));
        }
    }

    // ─── 2. Retry Pipeline ───────────────────────────────────────────────────

    @Async("taskExecutor")
    public void runRetryPipeline(Session session, String fixedCode,
            int attemptNumber, String previousAiFix) {
        UUID sessionId = session.getId();
        ExecutionAttempt attempt = executionService.createAttempt(session, attemptNumber, fixedCode);

        try {
            // ── Step 1: Execute AI-fixed code in Sandbox (sandboxExecutor pool) ──
            executionService.markAttemptRunning(attempt.getId());

            try {
                SandboxExecuteResponse execResult = sandboxGateway.executeCode(
                        session.getId().toString(),
                        session.getWorkspacePath(),
                        session.getLanguage()).get();

                attempt = executionService.recordResult(attempt.getId(), execResult);
                notificationService.notifyExecutionComplete(sessionId, attemptNumber,
                        attempt.getStatus().name());

            } catch (ExecutionException e) {
                executionService.markAttemptError(attempt.getId(), unwrap(e).getMessage());
                log.error("Sandbox execution failed during retry for session {}", sessionId, e);
            }

            // ── Infrastructure failure guard ──
            if (attempt.getStatus() == ExecutionStatus.ERROR) {
                log.warn("Sandbox infrastructure error during retry for session {} attempt {}",
                        sessionId, attemptNumber);
                sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
                notificationService.notifySessionUpdate(sessionId, "ERROR",
                        java.util.Map.of("reason",
                                "Sandbox execution failed during retry — no output available"));
                return;
            }

            // ── Step 2: Success — mark complete and generate artifacts ──
            if (attempt.getStatus() == ExecutionStatus.SUCCESS) {
                sessionService.updateSessionStatus(sessionId, SessionStatus.COMPLETED);
                notificationService.notifySessionUpdate(sessionId, "COMPLETED", null);
                triggerArtifactGeneration(session);
                return;
            }

            // ── Step 3: Still failing — re-analyze (analysisExecutor pool) ──
            sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZING);
            notificationService.notifySessionUpdate(sessionId, "ANALYZING", null);

            int lastAttemptNumber = attemptNumber - 1;
            List<AiAnalyzeRequest.PreviousAttempt> previousAttempts =
                    executionService.getAttemptsBySession(sessionId).stream()
                            .map(a -> AiAnalyzeRequest.PreviousAttempt.builder()
                                    .attemptNumber(a.getAttemptNumber())
                                    .code(a.getCodeExecuted())
                                    .stderr(a.getStderr())
                                    .exitCode(a.getExitCode() != null ? a.getExitCode() : -1)
                                    .aiFix(a.getAttemptNumber() == lastAttemptNumber ? previousAiFix : null)
                                    .build())
                            .collect(Collectors.toList());

            AiAnalyzeRequest analyzeReq = AiAnalyzeRequest.builder()
                    .sessionId(sessionId.toString())
                    .code(fixedCode)
                    .language(session.getLanguage())
                    .stderr(attempt.getStderr())
                    .stdout(attempt.getStdout())
                    .exitCode(attempt.getExitCode())
                    .originalCode(session.getOriginalCode())
                    .originalLogs(session.getOriginalLogs())
                    .attemptNumber(attemptNumber)
                    .previousAttempts(previousAttempts)
                    .build();

            AiAnalyzeResponse aiResponse = analysisGateway.analyzeCode(analyzeReq).get();
            AiAnalysis updatedAnalysis = analysisService.saveAnalysis(session, aiResponse);

            sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZED);
            notificationService.notifyAnalysisComplete(sessionId,
                    sessionMapper.toAnalysisResponse(updatedAnalysis));

        } catch (Exception e) {
            log.error("Retry pipeline failed for session {} attempt {}", sessionId, attemptNumber, e);
            executionService.markAttemptError(attempt.getId(), e.getMessage());
            sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", e.getMessage()));
        }
    }

    // ─── 3. Chat Pipeline ────────────────────────────────────────────────────

    @Async("taskExecutor")
    public void runChatPipeline(Session session, String userMessage) {
        UUID sessionId = session.getId();
        try {
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

            // AI chat inference on analysisExecutor pool
            AiChatResponse aiResponse = analysisGateway.chat(chatReq).get();
            ChatMessage assistantMsg = chatService.saveAssistantMessage(session, aiResponse.getReply());
            notificationService.notifyChatReply(sessionId, assistantMsg);

        } catch (Exception e) {
            log.error("Chat pipeline failed for session {}", sessionId, e);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", "Chat failed: " + e.getMessage()));
        }
    }

    // ─── 4. Artifact Generation ──────────────────────────────────────────────

    @Async("taskExecutor")
    public void triggerArtifactGeneration(Session session) {
        UUID sessionId = session.getId();
        try {
            AiAnalysis analysis = analysisService.getAnalysisEntity(sessionId).orElse(null);
            if (analysis == null) {
                log.warn("No analysis found for artifact generation, session {}", sessionId);
                return;
            }

            artifactService.createPending(session);
            notificationService.notifyArtifactStatus(sessionId, ArtifactStatus.GENERATING.name());

            AiArtifactsRequest request = AiArtifactsRequest.builder()
                    .sessionId(sessionId.toString())
                    .code(session.getOriginalCode())
                    .explanation(analysis.getExplanation())
                    .fixedCode(analysis.getFixedCode())
                    .learningSummary(analysis.getLearningSummary())
                    .whyItHappened(analysis.getWhyItHappened())
                    .conceptBehindError(analysis.getConceptBehindError())
                    .stepByStepReasoning(deserializeList(analysis.getStepByStepReasoning(), sessionId))
                    .fixAnalysis(deserializeFixAnalysis(analysis.getFixAnalysis(), sessionId))
                    .learningResources(deserializeLearningResources(analysis.getLearningResources(), sessionId))
                    .build();

            // Artifact generation on analysisExecutor pool
            AiArtifactsResponse response = analysisGateway.generateArtifacts(request).get();
            artifactService.saveArtifacts(session, response);

            notificationService.notifyArtifactStatus(sessionId, ArtifactStatus.COMPLETED.name());
            log.info("Artifacts generated successfully for session {}", sessionId);

        } catch (Exception e) {
            log.error("Artifact generation failed for session {}", sessionId, e);
            artifactService.markFailed(sessionId, e.getMessage());
            notificationService.notifyArtifactStatus(sessionId, ArtifactStatus.FAILED.name());
        }
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private AiAnalyzeRequest buildAnalyzeRequest(Session session, ExecutionAttempt attempt,
            AnalyzeRequest original) {
        return AiAnalyzeRequest.builder()
                .sessionId(session.getId().toString())
                .code(original.getCode())
                .language(original.getLanguage())
                .stderr(attempt != null ? attempt.getStderr() : null)
                .stdout(attempt != null ? attempt.getStdout() : null)
                .exitCode(attempt != null ? attempt.getExitCode() : null)
                .originalCode(original.getCode())
                .originalLogs(original.getLogs())
                .attemptNumber(attempt != null ? attempt.getAttemptNumber() : 1)
                .build();
    }

    /** Unwrap ExecutionException to get the real cause for logging/messaging. */
    private Throwable unwrap(ExecutionException e) {
        return e.getCause() != null ? e.getCause() : e;
    }

    private List<String> deserializeList(String json, UUID sessionId) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize list for session {}: {}", sessionId, e.getMessage());
            return null;
        }
    }

    private AiArtifactsRequest.FixAnalysis deserializeFixAnalysis(String json, UUID sessionId) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, AiArtifactsRequest.FixAnalysis.class);
        } catch (Exception e) {
            log.warn("Failed to deserialize fixAnalysis for session {}: {}", sessionId, e.getMessage());
            return null;
        }
    }

    private List<AiArtifactsRequest.LearningResource> deserializeLearningResources(
            String json, UUID sessionId) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json,
                    new TypeReference<List<AiArtifactsRequest.LearningResource>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize learningResources for session {}: {}", sessionId, e.getMessage());
            return null;
        }
    }
}