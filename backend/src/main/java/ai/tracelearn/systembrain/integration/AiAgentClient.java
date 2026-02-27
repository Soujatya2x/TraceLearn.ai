package ai.tracelearn.systembrain.integration;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.exception.ServiceUnavailableException;
import ai.tracelearn.systembrain.integration.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Integration client for the AI Agent microservice.
 * Handles analysis, chat, artifact generation, and learning roadmap requests.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiAgentClient {

    private final WebClient aiAgentWebClient;
    private final AppProperties appProperties;

    /**
     * Send code + error context for deep analysis.
     * The AI Agent returns explanation, concept breakdown, fixed code, and learning resources.
     */
    public AiAnalyzeResponse analyzeCode(AiAnalyzeRequest request) {
        log.info("Sending analysis request to AI Agent for session {}", request.getSessionId());

        try {
            AiAnalyzeResponse response = aiAgentWebClient
                    .post()
                    .uri(appProperties.getAiAgent().getAnalyzeEndpoint())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiAnalyzeResponse.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(2))
                            .filter(this::isRetryableError)
                            .doBeforeRetry(signal -> log.warn("Retrying AI Agent analysis, attempt {}",
                                    signal.totalRetries() + 1)))
                    .timeout(Duration.ofMillis(appProperties.getAiAgent().getReadTimeoutMs()))
                    .block();

            if (response != null) {
                log.info("AI analysis received for session {}: confidence={}, retryRecommended={}",
                        request.getSessionId(), response.getConfidenceScore(), response.isRetryRecommendation());
            }

            return response;
        } catch (WebClientResponseException e) {
            log.error("AI Agent analysis error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("AI Agent (analyze)", "HTTP " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to communicate with AI Agent for analysis", e);
            throw new ServiceUnavailableException("AI Agent (analyze)", e.getMessage());
        }
    }

    /**
     * Send a chat message in the context of a learning session.
     * AI Agent processes the message with full context and returns a pedagogical response.
     */
    public AiChatResponse chat(AiChatRequest request) {
        log.info("Sending chat request to AI Agent for session {}", request.getSessionId());

        try {
            AiChatResponse response = aiAgentWebClient
                    .post()
                    .uri(appProperties.getAiAgent().getChatEndpoint())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiChatResponse.class)
                    .retryWhen(Retry.backoff(1, Duration.ofSeconds(1))
                            .filter(this::isRetryableError))
                    .timeout(Duration.ofMillis(appProperties.getAiAgent().getReadTimeoutMs()))
                    .block();

            if (response != null) {
                log.info("AI chat response received for session {}", request.getSessionId());
            }

            return response;
        } catch (WebClientResponseException e) {
            log.error("AI Agent chat error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("AI Agent (chat)", "HTTP " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to communicate with AI Agent for chat", e);
            throw new ServiceUnavailableException("AI Agent (chat)", e.getMessage());
        }
    }

    /**
     * Request artifact generation (PDF, PPT, Summary) from the AI Agent.
     */
    public AiArtifactsResponse generateArtifacts(AiArtifactsRequest request) {
        log.info("Requesting artifact generation from AI Agent for session {}", request.getSessionId());

        try {
            AiArtifactsResponse response = aiAgentWebClient
                    .post()
                    .uri(appProperties.getAiAgent().getArtifactsEndpoint())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiArtifactsResponse.class)
                    .retryWhen(Retry.backoff(1, Duration.ofSeconds(2))
                            .filter(this::isRetryableError))
                    .timeout(Duration.ofMillis(appProperties.getAiAgent().getReadTimeoutMs()))
                    .block();

            if (response != null) {
                log.info("Artifacts generated for session {}", request.getSessionId());
            }

            return response;
        } catch (WebClientResponseException e) {
            log.error("AI Agent artifacts error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("AI Agent (artifacts)", "HTTP " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to communicate with AI Agent for artifacts", e);
            throw new ServiceUnavailableException("AI Agent (artifacts)", e.getMessage());
        }
    }

    /**
     * Request a personalized learning roadmap based on user's metrics.
     */
    public AiRoadmapResponse generateRoadmap(AiRoadmapRequest request) {
        log.info("Requesting learning roadmap from AI Agent for user {}", request.getUserId());

        try {
            AiRoadmapResponse response = aiAgentWebClient
                    .post()
                    .uri(appProperties.getAiAgent().getRoadmapEndpoint())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiRoadmapResponse.class)
                    .retryWhen(Retry.backoff(1, Duration.ofSeconds(2))
                            .filter(this::isRetryableError))
                    .timeout(Duration.ofMillis(appProperties.getAiAgent().getReadTimeoutMs()))
                    .block();

            if (response != null) {
                log.info("Roadmap generated for user {} with {} topics",
                        request.getUserId(),
                        response.getRecommendedTopics() != null ? response.getRecommendedTopics().size() : 0);
            }

            return response;
        } catch (WebClientResponseException e) {
            log.error("AI Agent roadmap error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("AI Agent (roadmap)", "HTTP " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to communicate with AI Agent for roadmap", e);
            throw new ServiceUnavailableException("AI Agent (roadmap)", e.getMessage());
        }
    }

    /**
     * Health check for AI Agent service.
     */
    public boolean isHealthy() {
        try {
            String result = aiAgentWebClient
                    .get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return result != null;
        } catch (Exception e) {
            log.warn("AI Agent health check failed: {}", e.getMessage());
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
