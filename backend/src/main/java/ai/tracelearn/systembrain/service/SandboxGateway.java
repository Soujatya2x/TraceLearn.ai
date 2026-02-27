package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.integration.SandboxClient;
import ai.tracelearn.systembrain.integration.dto.SandboxExecuteResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Gateway that runs all Sandbox calls on the dedicated "sandboxExecutor" thread pool.
 *
 * WHY A SEPARATE BEAN:
 *   @Async requires an AOP proxy — self-calls on the same bean bypass the proxy.
 *   AsyncPipelineExecutor calls this bean externally, so the proxy intercepts
 *   correctly and the call runs on sandboxExecutor threads, not taskExecutor threads.
 *
 * RESOURCE ISOLATION:
 *   sandboxExecutor: core=3, max=10, queue=50
 *   These are Docker container calls that can block for 10–30s each.
 *   Keeping them on a separate pool prevents sandbox blocking from
 *   starving the taskExecutor (orchestration) or analysisExecutor (AI inference).
 *
 * Returns CompletableFuture so the calling pipeline can .get() and propagate
 * exceptions correctly without losing the stack trace.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SandboxGateway {

    private final SandboxClient sandboxClient;

    /**
     * Execute code in the sandbox on the sandboxExecutor thread pool.
     *
     * The Sandbox reads code from the mounted workspace filesystem —
     * WorkspaceService writes the file before this is called.
     * No inline code is sent over the wire.
     *
     * @param sessionId     Session UUID string — identifies the execution job
     * @param workspacePath Absolute path to the mounted workspace directory
     * @param language      Programming language (python, java, javascript, go, rust)
     * @return CompletableFuture containing the sandbox execution result
     */
    @Async("sandboxExecutor")
    public CompletableFuture<SandboxExecuteResponse> executeCode(
            String sessionId, String workspacePath, String language) {

        log.debug("SandboxGateway.executeCode — sessionId={}, language={}, thread={}",
                sessionId, language, Thread.currentThread().getName());

        try {
            SandboxExecuteResponse response = sandboxClient.executeCode(
                    sessionId, workspacePath, language);
            return CompletableFuture.completedFuture(response);

        } catch (Exception e) {
            log.error("SandboxGateway: execution failed for session {}", sessionId, e);
            CompletableFuture<SandboxExecuteResponse> failed = new CompletableFuture<>();
            failed.completeExceptionally(e);
            return failed;
        }
    }
}