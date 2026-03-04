package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sessions", indexes = {
        @Index(name = "idx_sessions_user_id", columnList = "user_id"),
        @Index(name = "idx_sessions_status", columnList = "status"),
        @Index(name = "idx_sessions_created_at", columnList = "created_at"),
        @Index(name = "idx_sessions_execution_mode", columnList = "execution_mode")
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

    // MEDIUM-4 FIX: original_code and original_logs removed from DB (V15 migration).
    // These fields are no longer persisted. The workspace filesystem is the source
    // of truth. Use WorkspaceService.readCodeFile() / readLogFile() when needed.
    // Columns dropped by V15__drop_code_from_sessions.sql.

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    // ─── Execution Mode (added for framework-aware routing) ─────────────────

    /**
     * Controls how the analysis pipeline is routed for this session.
     *
     * LIVE_EXECUTION (default): code → Sandbox → AI Agent
     *   For standalone scripts, algorithms, single-file programs.
     *
     * LOG_ANALYSIS: code + logs → AI Agent directly (Sandbox skipped)
     *   For framework-based projects: Spring Boot, FastAPI, Django, Express.
     *   The developer's error log already contains the real failure.
     *   No sandbox needed — AI reads the log directly with framework context.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", nullable = false, length = 30)
    @Builder.Default
    private ExecutionMode executionMode = ExecutionMode.LIVE_EXECUTION;

    /**
     * Optional framework identifier for LOG_ANALYSIS sessions.
     * Tells the AI Agent which framework-specific prompt to use.
     * Values: "springboot" | "fastapi" | "django" | "express" | "nestjs" | "react"
     * Null for LIVE_EXECUTION sessions.
     */
    @Column(name = "framework_hint", length = 50)
    private String frameworkHint;

    // ─── Relationships ───────────────────────────────────────────────────────

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