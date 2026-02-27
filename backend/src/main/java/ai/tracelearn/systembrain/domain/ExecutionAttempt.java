package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "execution_attempts", indexes = {
        @Index(name = "idx_exec_session_id", columnList = "session_id"),
        @Index(name = "idx_exec_attempt_number", columnList = "session_id, attempt_number")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecutionAttempt extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(name = "stdout", columnDefinition = "TEXT")
    private String stdout;

    @Column(name = "stderr", columnDefinition = "TEXT")
    private String stderr;

    @Column(name = "exit_code")
    private Integer exitCode;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExecutionStatus status = ExecutionStatus.QUEUED;

    @Column(name = "code_executed", columnDefinition = "TEXT")
    private String codeExecuted;
}
