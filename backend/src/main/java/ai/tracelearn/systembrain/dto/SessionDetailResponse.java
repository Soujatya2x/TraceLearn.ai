package ai.tracelearn.systembrain.dto;

import ai.tracelearn.systembrain.domain.SessionStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full session detail response.
 *
 * Returned by GET /api/v1/session/{sessionId}
 * Contains all session data including code, logs, analysis, and execution attempts.
 * Fetch this once when the session reaches a terminal state, not on every poll.
 *
 * For lightweight polling during pipeline execution, use SessionStatusResponse
 * via GET /api/v1/session/{sessionId}/status instead.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionDetailResponse {

    private UUID sessionId;
    private String language;
    private SessionStatus status;
    private int retryCount;
    private String originalCode;
    private String originalLogs;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ExecutionAttemptResponse> executionAttempts;
    private AiAnalysisResponse aiAnalysis;
}