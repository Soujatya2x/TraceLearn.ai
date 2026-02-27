package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sessions", indexes = {
        @Index(name = "idx_sessions_user_id", columnList = "user_id"),
        @Index(name = "idx_sessions_status", columnList = "status"),
        @Index(name = "idx_sessions_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "language", nullable = false, length = 30)
    private String language;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private SessionStatus status = SessionStatus.CREATED;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "workspace_path", nullable = false, length = 512)
    private String workspacePath;

    @Column(name = "original_code", columnDefinition = "TEXT")
    private String originalCode;

    @Column(name = "original_logs", columnDefinition = "TEXT")
    private String originalLogs;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("attemptNumber ASC")
    @Builder.Default
    private List<ExecutionAttempt> executionAttempts = new ArrayList<>();

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private AiAnalysis aiAnalysis;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("timestamp ASC")
    @Builder.Default
    private List<ChatMessage> chatMessages = new ArrayList<>();

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Artifact artifact;
}
