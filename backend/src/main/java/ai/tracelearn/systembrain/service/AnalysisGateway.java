package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.integration.AiAgentClient;
import ai.tracelearn.systembrain.integration.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

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
 *
 * REACTIVE BRIDGE (non-blocking variants):
 *   The ...Reactive() methods below use Mono.toFuture() with subscribeOn(boundedElastic())
 *   to release the analysisExecutor thread during I/O wait. This means a 30-second LLM
 *   call holds 0 threads for the duration instead of 2 (one taskExecutor + one analysisExecutor).
 *   The boundedElastic scheduler is sized for blocking I/O and is the correct scheduler
 *   to use here — it parks the subscription on a thread that can block without starving
 *   the Netty event loop.
 *
 *   Call sites in AsyncPipelineExecutor use the reactive variants. The blocking variants
 *   are kept for any synchronous callers and for backward compatibility.
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

    // ─── Reactive (non-blocking) variants ────────────────────────────────────
    //
    // These bridge AiAgentClient's Mono<T> into CompletableFuture<T> without .block().
    // subscribeOn(boundedElastic()) parks the subscription on a thread that is designed
    // for blocking I/O, freeing the analysisExecutor thread immediately so it can accept
    // the next pipeline without waiting for LLM inference to complete.
    //
    // AsyncPipelineExecutor calls these instead of the blocking variants above.
    // The @Async annotation is still present — the reactive subscription is set up on
    // the analysisExecutor thread, then the thread is released back to the pool while
    // boundedElastic handles the actual wait.

    @Async("analysisExecutor")
    public CompletableFuture<AiAnalyzeResponse> analyzeCodeReactive(AiAnalyzeRequest request) {
        log.debug("AnalysisGateway.analyzeCodeReactive — sessionId={}, thread={}",
                request.getSessionId(), Thread.currentThread().getName());
        return aiAgentClient.analyzeCodeReactive(request)
                .subscribeOn(Schedulers.boundedElastic())
                .toFuture();
    }

    @Async("analysisExecutor")
    public CompletableFuture<AiChatResponse> chatReactive(AiChatRequest request) {
        log.debug("AnalysisGateway.chatReactive — sessionId={}, thread={}",
                request.getSessionId(), Thread.currentThread().getName());
        return aiAgentClient.chatReactive(request)
                .subscribeOn(Schedulers.boundedElastic())
                .toFuture();
    }

    @Async("analysisExecutor")
    public CompletableFuture<AiArtifactsResponse> generateArtifactsReactive(AiArtifactsRequest request) {
        log.debug("AnalysisGateway.generateArtifactsReactive — sessionId={}, thread={}",
                request.getSessionId(), Thread.currentThread().getName());
        return aiAgentClient.generateArtifactsReactive(request)
                .subscribeOn(Schedulers.boundedElastic())
                .toFuture();
    }

    @Async("analysisExecutor")
    public CompletableFuture<AiRoadmapResponse> generateRoadmapReactive(AiRoadmapRequest request) {
        log.debug("AnalysisGateway.generateRoadmapReactive — userId={}, thread={}",
                request.getUserId(), Thread.currentThread().getName());
        return aiAgentClient.generateRoadmapReactive(request)
                .subscribeOn(Schedulers.boundedElastic())
                .toFuture();
    }
}