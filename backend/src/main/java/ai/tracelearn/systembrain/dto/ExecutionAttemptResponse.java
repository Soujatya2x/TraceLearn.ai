package ai.tracelearn.systembrain.dto;

import ai.tracelearn.systembrain.domain.ExecutionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecutionAttemptResponse {

    private UUID id;
    private int attemptNumber;
    private String stdout;
    private String stderr;
    private Integer exitCode;
    private Long executionTimeMs;
    private ExecutionStatus status;
    private Instant createdAt;
}
