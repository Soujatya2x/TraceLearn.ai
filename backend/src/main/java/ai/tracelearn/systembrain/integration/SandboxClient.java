package ai.tracelearn.systembrain.integration;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.exception.ServiceUnavailableException;
import ai.tracelearn.systembrain.integration.dto.SandboxExecuteRequest;
import ai.tracelearn.systembrain.integration.dto.SandboxExecuteResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Integration client for the Sandbox microservice.
 * Handles code execution requests with retry logic and circuit-breaker semantics.
 *
 * Contract: the Sandbox mounts /workspace/session-{uuid}/ into the Docker
 * container and runs the file from disk. This client sends sessionId +
 * workspacePath + language + timeout only — no inline code.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SandboxClient {

    private final WebClient sandboxWebClient;
    private final AppProperties appProperties;

    /**
     * Execute code in the Sandbox.
     *
     * The Sandbox reads code from the mounted workspace filesystem.
     * WorkspaceService must have written the correct file to workspacePath
     * before this method is called — this is guaranteed by the call order
     * in AsyncPipelineExecutor.
     *
     * @param sessionId      Session UUID string — identifies the execution job
     * @param workspacePath  Absolute path to /workspace/session-{uuid}/ on the host
     * @param language       Programming language (python, java, javascript, go, rust)
     * @param timeoutSeconds Execution timeout in seconds
     * @return Execution result (stdout, stderr, exitCode, executionTime)
     */
    public SandboxExecuteResponse executeCode(String sessionId, String workspacePath,
                                               String language, int timeoutSeconds) {
        SandboxExecuteRequest request = SandboxExecuteRequest.builder()
                .sessionId(sessionId)
                .workspacePath(workspacePath)
                .language(language.toLowerCase())
                .timeout(timeoutSeconds > 0 ? timeoutSeconds : appProperties.getSandbox().getDefaultTimeout())
                .build();

        log.info("Sending execution request to Sandbox: sessionId={}, workspacePath={}, language={}, timeout={}s",
                sessionId, workspacePath, language, request.getTimeout());

        try {
            SandboxExecuteResponse response = sandboxWebClient
                    .post()
                    .uri(appProperties.getSandbox().getExecuteEndpoint())
                    // Send the shared internal secret so the sandbox middleware
                    // can verify this request is from System Brain and not an
                    // external caller that somehow reached the sandbox port.
                    // Empty string when not configured (sandbox warns at startup).
                    .header("X-Internal-Secret", appProperties.getSandbox().getInternalSecret())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(SandboxExecuteResponse.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                            .filter(this::isRetryableError)
                            .doBeforeRetry(signal -> log.warn(
                                    "Retrying Sandbox request for session {}, attempt {}",
                                    sessionId, signal.totalRetries() + 1)))
                    .timeout(Duration.ofMillis(appProperties.getSandbox().getReadTimeoutMs()))
                    .block();

            if (response != null) {
                log.info("Sandbox execution completed: sessionId={}, exitCode={}, executionTime={}ms",
                        sessionId, response.getExitCode(), response.getExecutionTime());
            }

            return response;

        } catch (WebClientResponseException e) {
            log.error("Sandbox returned error: sessionId={}, status={}, body={}",
                    sessionId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("Sandbox",
                    "HTTP " + e.getStatusCode() + ": " + e.getMessage());
        } catch (Exception e) {
            log.error("Failed to communicate with Sandbox service for session {}", sessionId, e);
            throw new ServiceUnavailableException("Sandbox", e.getMessage());
        }
    }

    /**
     * Execute code with default timeout.
     */
    public SandboxExecuteResponse executeCode(String sessionId, String workspacePath, String language) {
        return executeCode(sessionId, workspacePath, language,
                appProperties.getSandbox().getDefaultTimeout());
    }

    /**
     * Health check for Sandbox service.
     */
    public boolean isHealthy() {
        try {
            String result = sandboxWebClient
                    .get()
                    .uri("/sandbox/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return result != null;
        } catch (Exception e) {
            log.warn("Sandbox health check failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean isRetryableError(Throwable throwable) {
        if (throwable instanceof WebClientResponseException ex) {
            return ex.getStatusCode().is5xxServerError();
        }
        return throwable instanceof java.net.ConnectException
                || throwable instanceof java.util.concurrent.TimeoutException;
    }
}