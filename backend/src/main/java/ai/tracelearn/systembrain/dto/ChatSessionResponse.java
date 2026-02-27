package ai.tracelearn.systembrain.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Full chat session response returned by GET /api/v1/chat/{sessionId}.
 *
 * Bundles everything the Chat page needs in one call:
 *   - sessionId + createdAt for session context sidebar
 *   - errorType + errorContext so the chat header can display the error
 *   - messages[] — full ordered chat history
 *   - suggestedPrompts[] — last AI reply's follow-up suggestions (clickable chips)
 *
 * Replaces the old List<ChatMessageResponse> return type, which was missing
 * all the context fields the frontend ChatSession interface requires.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatSessionResponse {

    private UUID sessionId;

    /** Error type from AI analysis, e.g. "ZeroDivisionError". Falls back to session language. */
    private String errorType;

    /**
     * Short human-readable description of what the error was about.
     * Populated from aiAnalysis.explanation (first 200 chars) or originalLogs if no analysis yet.
     */
    private String errorContext;

    /** Full ordered chat history for this session. Never null — empty list when no messages. */
    @Builder.Default
    private List<ChatMessageResponse> messages = Collections.emptyList();

    /**
     * Suggested follow-up prompts from the most recent AI reply.
     * These are the suggestedFollowUps the AI Agent returned with its last chat response.
     * Displayed as clickable chips above the input box.
     * Empty list when no messages yet or when the last AI reply had no suggestions.
     */
    @Builder.Default
    private List<String> suggestedPrompts = Collections.emptyList();

    /** Session creation timestamp — shown in the context sidebar. */
    private Instant createdAt;
}