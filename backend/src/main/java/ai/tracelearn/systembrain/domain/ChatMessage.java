package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_session_id", columnList = "session_id"),
        @Index(name = "idx_chat_timestamp", columnList = "session_id, timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 10)
    private ChatRole role;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "timestamp", nullable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    /**
     * Suggested follow-up prompts from the AI Agent — only populated on ASSISTANT messages.
     * Stored as a JSON array string, e.g. ["What is a guard clause?", "Show me the fix"].
     * NULL on USER and SYSTEM messages.
     *
     * Deserialized by ChatService.getChatSessionResponse() when building ChatSessionResponse.
     * This avoids a separate join table for what is essentially display-only data.
     */
    @Column(name = "suggested_follow_ups", columnDefinition = "TEXT")
    private String suggestedFollowUpsJson;
}