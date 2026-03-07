package ai.tracelearn.systembrain.integration;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.exception.ServiceUnavailableException;
import ai.tracelearn.systembrain.integration.dto.AiRagIndexRequest;
import ai.tracelearn.systembrain.integration.dto.AiRagIndexResponse;
import ai.tracelearn.systembrain.integration.dto.AiRagQueryRequest;
import ai.tracelearn.systembrain.integration.dto.AiRagQueryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * HTTP client for the RAG FastAPI microservice.
 *
 * Two endpoints:
 *   POST /rag/index  — send S3 file keys, wait for "indexed" confirmation
 *   POST /rag/query  — send a question, get an answer + source chunks back
 *
 * Uses the same aiAgentWebClient bean as AiAgentClient because the RAG server
 * runs inside the same FastAPI process (same base URL, different routes).
 * If your friend later splits it into a separate port, swap the WebClient bean here.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RagAgentClient {

    private final WebClient aiAgentWebClient;
    private final AppProperties appProperties;

    /**
     * Send S3 keys to RAG server for indexing.
     * This call blocks until the RAG server finishes embedding (can take 10-60s for large docs).
     * Timeout is read from ai-agent.read-timeout-ms (default 60s — increase if docs are large).
     */
    public AiRagIndexResponse indexDocuments(AiRagIndexRequest request) {
        log.info("Sending {} file(s) to RAG server for indexing. collectionId={}",
                request.getS3Keys().size(), request.getCollectionId());

        try {
            AiRagIndexResponse response = aiAgentWebClient
                    .post()
                    .uri(appProperties.getAiAgent().getRagIndexEndpoint())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiRagIndexResponse.class)
                    // No retries — indexing is not idempotent if partial state is left
                    .timeout(Duration.ofMillis(
                            Math.max(appProperties.getAiAgent().getReadTimeoutMs(), 120_000)))
                    .block();

            if (response != null) {
                log.info("RAG indexing done. collectionId={}, documents={}, chunks={}",
                        request.getCollectionId(), response.getDocumentCount(), response.getChunkCount());
            }
            return response;

        } catch (WebClientResponseException e) {
            log.error("RAG index error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("RAG server (index)", "HTTP " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to communicate with RAG server for indexing. collectionId={}", request.getCollectionId(), e);
            throw new ServiceUnavailableException("RAG server (index)", e.getMessage());
        }
    }

    /**
     * Send a user query to the RAG server. Returns the AI-generated answer
     * and the source document chunks that were used to produce it.
     */
    public AiRagQueryResponse query(AiRagQueryRequest request) {
        log.info("Sending RAG query. collectionId={}, query='{}'",
                request.getCollectionId(),
                request.getQuery().length() > 60 ? request.getQuery().substring(0, 60) + "…" : request.getQuery());

        try {
            AiRagQueryResponse response = aiAgentWebClient
                    .post()
                    .uri(appProperties.getAiAgent().getRagQueryEndpoint())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiRagQueryResponse.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(2))
                            .filter(this::isRetryable)
                            .doBeforeRetry(s -> log.warn("Retrying RAG query, attempt {}", s.totalRetries() + 1)))
                    .timeout(Duration.ofMillis(appProperties.getAiAgent().getReadTimeoutMs()))
                    .block();

            if (response != null) {
                log.info("RAG query answered. sources={}", response.getSources() != null ? response.getSources().size() : 0);
            }
            return response;

        } catch (WebClientResponseException e) {
            log.error("RAG query error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ServiceUnavailableException("RAG server (query)", "HTTP " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to communicate with RAG server for query. collectionId={}", request.getCollectionId(), e);
            throw new ServiceUnavailableException("RAG server (query)", e.getMessage());
        }
    }

    private boolean isRetryable(Throwable t) {
        if (t instanceof WebClientResponseException ex) {
            return ex.getStatusCode().is5xxServerError();
        }
        return t instanceof java.net.ConnectException
                || t instanceof java.util.concurrent.TimeoutException;
    }
}