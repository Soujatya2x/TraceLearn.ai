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
 * taskExecutor (core=5, max=20) — this bean — orchestration pipelines
 * sandboxExecutor (core=3, max=10) — SandboxGateway — Docker exec calls
 * analysisExecutor (core=5, max=20) — AnalysisGateway — LLM inference calls
 *
 * TWO EXECUTION MODES:
 *
 * LIVE_EXECUTION:
 * runAnalysisPipeline() — unchanged from v1.
 * code → Sandbox → stdout/stderr → AI Agent → analysis + artifacts
 *
 * LOG_ANALYSIS:
 * runLogAnalysisPipeline() — NEW.
 * Sandbox is SKIPPED entirely.
 * code + log file → AI Agent directly with framework-aware prompts.
 * Used for Spring Boot, FastAPI, and other framework-based projects.
 *
 * SELF-CALL PROXY BYPASS:
 * All @Async methods live in separate beans. OrchestrationService calls
 * this bean externally — Spring AOP proxy always intercepts correctly.
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
    private final SandboxGateway sandboxGateway; // sandboxExecutor pool
    private final AnalysisGateway analysisGateway; // analysisExecutor pool
    private final ObjectMapper objectMapper;
    private final WorkspaceService workspaceService; // MEDIUM-4: read code/logs from disk

    // ─── 1. Initial Analysis Pipeline (LIVE_EXECUTION) ───────────────────────

    /**
     * Original pipeline — unchanged from v1.
     * Runs for standalone scripts and simple programs.
     * Route: code → Sandbox → AI Agent → analysis → artifacts
     */
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
            // ERROR = sandbox itself crashed — no stdout/stderr for AI to reason about.
            // FAILED = user code exited non-zero — AI gets real output to analyze.
            // Only abort on ERROR.
            if (attempt.getStatus() == ExecutionStatus.ERROR) {
                log.warn("Sandbox infrastructure error for session {} — aborting AI analysis", sessionId);
                sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
                notificationService.notifySessionUpdate(sessionId, "ERROR",
                        java.util.Map.of("reason",
                                "Sandbox execution failed — no output available for analysis"));
                return;
            }

            // ── Step 2: Analyze via AI Agent (analysisExecutor pool) ──
            runAiAnalysis(session, request, attempt, 1);

        } catch (Exception e) {
            log.error("Analysis pipeline failed for session {}", sessionId, e);
            sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", "Pipeline error: " + e.getMessage()));
        }
    }

    // ─── 2. Log Analysis Pipeline (LOG_ANALYSIS) — NEW ───────────────────────

    /**
     * Framework-aware pipeline. Sandbox is skipped entirely.
     * The developer's log file is sent directly to the AI Agent.
     * AI uses framework-specific prompts (Spring Boot / FastAPI / etc.)
     *
     * Route: code + logs → AI Agent → framework-aware analysis → artifacts
     * No Docker execution. No ExecutionAttempt row created.
     */
    @Async("taskExecutor")
    public void runLogAnalysisPipeline(Session session, AnalyzeRequest request) {
        UUID sessionId = session.getId();

        try {
            log.info("Starting LOG_ANALYSIS pipeline for session {} [framework={}]",
                    sessionId, session.getFrameworkHint());

            // ── Jump straight to AI analysis (no sandbox step) ──
            sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZING);
            notificationService.notifySessionUpdate(sessionId, "ANALYZING",
                    java.util.Map.of(
                            "mode", "LOG_ANALYSIS",
                            "framework", session.getFrameworkHint() != null ? session.getFrameworkHint() : "unknown"));

            AiAnalyzeRequest analyzeReq = buildLogAnalysisRequest(session, request);

            try {
                AiAnalyzeResponse aiResponse = analysisGateway.analyzeCodeReactive(analyzeReq).get();

                AiAnalysis analysis = analysisService.saveAnalysis(session, aiResponse);

                // ── Update learning metrics (same as LIVE_EXECUTION path) ──
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

                // ── Trigger artifact generation (same as LIVE_EXECUTION path) ──
                triggerArtifactGeneration(session);

            } catch (ExecutionException e) {
                log.error("AI analysis failed for session {} (LOG_ANALYSIS)", sessionId, e);
                sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
                notificationService.notifySessionUpdate(sessionId, "ERROR",
                        java.util.Map.of("reason", "AI analysis failed: " + unwrap(e).getMessage()));
            }

        } catch (Exception e) {
            log.error("Log analysis pipeline failed for session {}", sessionId, e);
            sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", "Pipeline error: " + e.getMessage()));
        }
    }

    // ─── 3. Retry Pipeline ───────────────────────────────────────────────────

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
            List<AiAnalyzeRequest.PreviousAttempt> previousAttempts = executionService.getAttemptsBySession(sessionId)
                    .stream()
                    .map(a -> AiAnalyzeRequest.PreviousAttempt.builder()
                            .attemptNumber(a.getAttemptNumber())
                            .code(a.getCodeExecuted())
                            .stderr(a.getStderr())
                            .exitCode(a.getExitCode() != null ? a.getExitCode() : -1)
                            .aiFix(a.getAttemptNumber() == lastAttemptNumber ? previousAiFix : null)
                            .build())
                    .collect(Collectors.toList());

            // MEDIUM-4: read original code/logs from workspace instead of session entity
            String originalCode = workspaceService.readCodeFile(session.getWorkspacePath(), session.getLanguage());
            String originalLogs = workspaceService.readLogFile(session.getWorkspacePath());

            AiAnalyzeRequest analyzeReq = AiAnalyzeRequest.builder()
                    .sessionId(sessionId.toString())
                    .code(fixedCode)
                    .language(session.getLanguage())
                    .stderr(attempt.getStderr())
                    .stdout(attempt.getStdout())
                    .exitCode(attempt.getExitCode())
                    .originalCode(originalCode != null ? originalCode : "")
                    .originalLogs(originalLogs != null ? originalLogs : "")
                    .attemptNumber(attemptNumber)
                    .previousAttempts(previousAttempts)
                    .executionMode(ExecutionMode.LIVE_EXECUTION.name())
                    .build();

            AiAnalyzeResponse aiResponse = analysisGateway.analyzeCodeReactive(analyzeReq).get();
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

    // ─── 4. Chat Pipeline ────────────────────────────────────────────────────

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

            // MEDIUM-4: read original logs from workspace instead of session entity
            String pipelineLogContent = workspaceService.readLogFile(session.getWorkspacePath());

            AiChatRequest chatReq = AiChatRequest.builder()
                    .sessionId(sessionId.toString())
                    .userMessage(userMessage)
                    .errorContext(pipelineLogContent)
                    .analysisSummary(analysisSummary)
                    .chatHistory(history.stream()
                            .map(m -> AiChatRequest.ChatHistoryEntry.builder()
                                    .role(m.getRole().name().toLowerCase())
                                    .message(m.getMessage())
                                    .build())
                            .collect(Collectors.toList()))
                    .build();

            AiChatResponse aiResponse = analysisGateway.chatReactive(chatReq).get();
            ChatMessage assistantMsg = chatService.saveAssistantMessage(
                    session, aiResponse.getReply(), aiResponse.getSuggestedFollowUps());
            notificationService.notifyChatReply(sessionId, assistantMsg);

        } catch (Exception e) {
            log.error("Chat pipeline failed for session {}", sessionId, e);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", "Chat failed: " + e.getMessage()));
        }
    }

    // ─── 5. Artifact Generation ──────────────────────────────────────────────

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

            // MEDIUM-4: read original code from workspace instead of session entity
            String artifactCode = workspaceService.readCodeFile(session.getWorkspacePath(), session.getLanguage());

            AiArtifactsRequest request = AiArtifactsRequest.builder()
                    .sessionId(sessionId.toString())
                    .code(artifactCode)
                    .explanation(analysis.getExplanation())
                    .fixedCode(analysis.getFixedCode())
                    .learningSummary(analysis.getLearningSummary())
                    .whyItHappened(analysis.getWhyItHappened())
                    .conceptBehindError(analysis.getConceptBehindError())
                    .stepByStepReasoning(deserializeList(analysis.getStepByStepReasoning(), sessionId))
                    .fixAnalysis(deserializeFixAnalysis(analysis.getFixAnalysis(), sessionId))
                    .learningResources(deserializeLearningResources(analysis.getLearningResources(), sessionId))
                    .build();

            AiArtifactsResponse response = analysisGateway.generateArtifactsReactive(request).get();
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

    /**
     * Shared AI analysis step used by runAnalysisPipeline().
     * Extracted to avoid duplication — both initial and retry eventually call AI.
     */
    private void runAiAnalysis(Session session, AnalyzeRequest request,
            ExecutionAttempt attempt, int attemptNumber) throws Exception {
        UUID sessionId = session.getId();

        sessionService.updateSessionStatus(sessionId, SessionStatus.ANALYZING);
        notificationService.notifySessionUpdate(sessionId, "ANALYZING", null);

        try {
            AiAnalyzeRequest analyzeReq = buildLiveExecutionRequest(session, attempt, request);
            AiAnalyzeResponse aiResponse = analysisGateway.analyzeCodeReactive(analyzeReq).get();

            AiAnalysis analysis = analysisService.saveAnalysis(session, aiResponse);

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

            triggerArtifactGeneration(session);

        } catch (ExecutionException e) {
            log.error("AI analysis failed for session {}", sessionId, e);
            sessionService.updateSessionStatus(sessionId, SessionStatus.ERROR);
            notificationService.notifySessionUpdate(sessionId, "ERROR",
                    java.util.Map.of("reason", "AI analysis failed: " + unwrap(e).getMessage()));
        }
    }

    /**
     * Build AiAnalyzeRequest for LIVE_EXECUTION sessions.
     * Includes sandbox output (stdout/stderr) — no log file content.
     */
    private AiAnalyzeRequest buildLiveExecutionRequest(Session session, ExecutionAttempt attempt,
            AnalyzeRequest original) {
        return AiAnalyzeRequest.builder()
                .sessionId(session.getId().toString())
                .code(original.getCode())
                .language(original.getLanguage())
                .stderr(attempt != null ? attempt.getStderr() : "")
                .stdout(attempt != null ? attempt.getStdout() : "")
                .exitCode(attempt != null ? attempt.getExitCode() : 0)
                .originalCode(original.getCode() != null ? original.getCode() : "")
                .originalLogs(original.getLogs() != null ? original.getLogs() : "") // ← null → ""
                .attemptNumber(attempt != null ? attempt.getAttemptNumber() : 1)
                .previousAttempts(java.util.List.of()) // ← null → empty list
                .executionMode(ExecutionMode.LIVE_EXECUTION.name())
                .build();
    }

    /**
     * Build AiAnalyzeRequest for LOG_ANALYSIS sessions.
     * Includes the developer's log file as logContent.
     * No stdout/stderr — sandbox was not run.
     * Includes frameworkType so AI Agent uses the correct prompt.
     */
    private AiAnalyzeRequest buildLogAnalysisRequest(Session session, AnalyzeRequest request) {
        return AiAnalyzeRequest.builder()
                .sessionId(session.getId().toString())
                .code(request.getCode())
                .language(request.getLanguage())
                .originalCode(request.getCode())
                .logContent(request.getLogs()) // developer's log file → AI reads directly
                .originalLogs(request.getLogs())
                .attemptNumber(1)
                .executionMode(ExecutionMode.LOG_ANALYSIS.name())
                .frameworkType(session.getFrameworkHint())
                // stdout/stderr/exitCode intentionally null — no sandbox was run
                .build();
    }

    /** Unwrap ExecutionException to get the real cause for logging/messaging. */
    private Throwable unwrap(ExecutionException e) {
        return e.getCause() != null ? e.getCause() : e;
    }

    private List<String> deserializeList(String json, UUID sessionId) {
        if (json == null || json.isBlank())
            return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            log.warn("Failed to deserialize list for session {}: {}", sessionId, e.getMessage());
            return null;
        }
    }

    private AiArtifactsRequest.FixAnalysis deserializeFixAnalysis(String json, UUID sessionId) {
        if (json == null || json.isBlank())
            return null;
        try {
            return objectMapper.readValue(json, AiArtifactsRequest.FixAnalysis.class);
        } catch (Exception e) {
            log.warn("Failed to deserialize fixAnalysis for session {}: {}", sessionId, e.getMessage());
            return null;
        }
    }

    private List<AiArtifactsRequest.LearningResource> deserializeLearningResources(
            String json, UUID sessionId) {
        if (json == null || json.isBlank())
            return null;
        try {
            return objectMapper.readValue(json,
                    new TypeReference<List<AiArtifactsRequest.LearningResource>>() {
                    });
        } catch (Exception e) {
            log.warn("Failed to deserialize learningResources for session {}: {}", sessionId, e.getMessage());
            return null;
        }
    }
}