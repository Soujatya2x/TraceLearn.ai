package ai.tracelearn.systembrain.dto;

import ai.tracelearn.systembrain.domain.SessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight session response for polling use cases.
 *
 * Returned by GET /api/v1/session/{sessionId}/status
 * Frontend polls this endpoint during pipeline execution to check progress.
 *
 * Intentionally excludes: originalCode, originalLogs, aiAnalysis, executionAttempts.
 * Those fields are large and unnecessary for status polling — fetch them once
 * via GET /api/v1/session/{sessionId} only when the session reaches a terminal
 * state (ANALYZED, COMPLETED, ERROR).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionStatusResponse {

    private UUID sessionId;
    private SessionStatus status;
    private int retryCount;
    private String language;
    private Instant createdAt;
    private Instant updatedAt;
}