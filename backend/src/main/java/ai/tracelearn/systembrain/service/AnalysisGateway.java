package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.integration.AiAgentClient;
import ai.tracelearn.systembrain.integration.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Gateway that runs all AI Agent calls on the dedicated "analysisExecutor" thread pool.
 *
 * WHY A SEPARATE BEAN:
 *   Same proxy reason as SandboxGateway — must be a separate bean so @Async
 *   is intercepted correctly when called from AsyncPipelineExecutor.
 *
 * RESOURCE ISOLATION:
 *   analysisExecutor: core=5, max=20, queue=100
 *   LLM inference calls can take 5–30s. Isolating them prevents AI latency
 *   from blocking sandbox slots (sandboxExecutor) or pipeline orchestration
 *   threads (taskExecutor).
 *
 *   Thread budget summary:
 *     taskExecutor    — orchestration pipelines         (core=5,  max=20)
 *     sandboxExecutor — Docker execution calls          (core=3,  max=10)
 *     analysisExecutor — LLM inference + artifact gen  (core=5,  max=20)
 *
 * Returns CompletableFuture so the calling pipeline can .get() and propagate
 * exceptions correctly without losing the stack trace.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisGateway {

    private final AiAgentClient aiAgentClient;

    /**
     * Send code + execution output to AI Agent for analysis on the analysisExecutor pool.
     */
    @Async("analysisExecutor")
    public CompletableFuture<AiAnalyzeResponse> analyzeCode(AiAnalyzeRequest request) {
        log.debug("AnalysisGateway.analyzeCode — sessionId={}, attempt={}, thread={}",
                request.getSessionId(), request.getAttemptNumber(),
                Thread.currentThread().getName());
        try {
            return CompletableFuture.completedFuture(aiAgentClient.analyzeCode(request));
        } catch (Exception e) {
            log.error("AnalysisGateway: analyzeCode failed for session {}", request.getSessionId(), e);
            CompletableFuture<AiAnalyzeResponse> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }

    /**
     * Send a chat message to AI Agent on the analysisExecutor pool.
     */
    @Async("analysisExecutor")
    public CompletableFuture<AiChatResponse> chat(AiChatRequest request) {
        log.debug("AnalysisGateway.chat — sessionId={}, thread={}",
                request.getSessionId(), Thread.currentThread().getName());
        try {
            return CompletableFuture.completedFuture(aiAgentClient.chat(request));
        } catch (Exception e) {
            log.error("AnalysisGateway: chat failed for session {}", request.getSessionId(), e);
            CompletableFuture<AiChatResponse> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }

    /**
     * Request artifact generation from AI Agent on the analysisExecutor pool.
     */
    @Async("analysisExecutor")
    public CompletableFuture<AiArtifactsResponse> generateArtifacts(AiArtifactsRequest request) {
        log.debug("AnalysisGateway.generateArtifacts — sessionId={}, thread={}",
                request.getSessionId(), Thread.currentThread().getName());
        try {
            return CompletableFuture.completedFuture(aiAgentClient.generateArtifacts(request));
        } catch (Exception e) {
            log.error("AnalysisGateway: generateArtifacts failed for session {}", request.getSessionId(), e);
            CompletableFuture<AiArtifactsResponse> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }

    /**
     * Request roadmap generation from AI Agent on the analysisExecutor pool.
     */
    @Async("analysisExecutor")
    public CompletableFuture<AiRoadmapResponse> generateRoadmap(AiRoadmapRequest request) {
        log.debug("AnalysisGateway.generateRoadmap — userId={}, thread={}",
                request.getUserId(), Thread.currentThread().getName());
        try {
            return CompletableFuture.completedFuture(aiAgentClient.generateRoadmap(request));
        } catch (Exception e) {
            log.error("AnalysisGateway: generateRoadmap failed for userId {}", request.getUserId(), e);
            CompletableFuture<AiRoadmapResponse> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }
}