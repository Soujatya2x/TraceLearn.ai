package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.AiAnalysis;
import ai.tracelearn.systembrain.domain.ChatMessage;
import ai.tracelearn.systembrain.domain.ChatRole;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.ChatMessageResponse;
import ai.tracelearn.systembrain.dto.ChatSessionResponse;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.mapper.ChatMapper;
import ai.tracelearn.systembrain.repository.ChatMessageRepository;
import ai.tracelearn.systembrain.repository.SessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final SessionRepository sessionRepository;
    private final ChatMapper chatMapper;
    private final ObjectMapper objectMapper;

    // ── Message persistence ───────────────────────────────────────────────────

    /**
     * Save a user message to the chat history.
     */
    @Transactional
    public ChatMessage saveUserMessage(Session session, String messageText) {
        ChatMessage chatMsg = ChatMessage.builder()
                .session(session)
                .role(ChatRole.USER)
                .message(messageText)
                .build();
        chatMsg = chatMessageRepository.save(chatMsg);
        log.info("User message saved for session {}", session.getId());
        return chatMsg;
    }

    /**
     * Save an AI assistant response to the chat history.
     * Also persists the suggestedFollowUps so they can be returned in getChatSessionResponse().
     *
     * @param session        the owning session
     * @param messageText    the AI's reply text
     * @param followUps      suggested follow-up prompts from the AI Agent (may be null or empty)
     */
    @Transactional
    public ChatMessage saveAssistantMessage(Session session, String messageText, List<String> followUps) {
        String followUpsJson = serializeFollowUps(followUps);

        ChatMessage chatMsg = ChatMessage.builder()
                .session(session)
                .role(ChatRole.ASSISTANT)
                .message(messageText)
                .suggestedFollowUpsJson(followUpsJson)
                .build();
        chatMsg = chatMessageRepository.save(chatMsg);
        log.info("Assistant message saved for session {}", session.getId());
        return chatMsg;
    }

    /**
     * Overload without follow-ups — used by system/legacy code paths that don't have them.
     */
    @Transactional
    public ChatMessage saveAssistantMessage(Session session, String messageText) {
        return saveAssistantMessage(session, messageText, null);
    }

    /**
     * Save a system message (e.g., context injections).
     */
    @Transactional
    public ChatMessage saveSystemMessage(Session session, String messageText) {
        ChatMessage chatMsg = ChatMessage.builder()
                .session(session)
                .role(ChatRole.SYSTEM)
                .message(messageText)
                .build();
        return chatMessageRepository.save(chatMsg);
    }

    // ── Query methods ─────────────────────────────────────────────────────────

    /**
     * Build the full ChatSessionResponse for GET /api/v1/chat/{sessionId}.
     *
     * Assembles everything the Chat page needs:
     *   - errorType + errorContext from AI analysis (or session fields as fallback)
     *   - full ordered messages list
     *   - suggestedPrompts from the most recent ASSISTANT message
     *   - session createdAt
     *
     * Uses a single session lookup (findByIdWithDetails) to avoid N+1 queries —
     * the session JOIN FETCHes aiAnalysis in one query. Messages are fetched
     * separately ordered by timestamp.
     */
    @Transactional(readOnly = true)
    public ChatSessionResponse getChatSessionResponse(UUID sessionId) {
        Session session = sessionRepository.findByIdWithDetails(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId.toString()));

        AiAnalysis analysis = session.getAiAnalysis();

        // ── errorType: from analysis, fallback to session language ──
        String errorType = (analysis != null && analysis.getErrorType() != null)
                ? analysis.getErrorType()
                : session.getLanguage() + " error";

        // ── errorContext: first 200 chars of explanation, fallback to original logs ──
        String errorContext = null;
        if (analysis != null && analysis.getExplanation() != null) {
            String exp = analysis.getExplanation();
            errorContext = exp.length() > 200 ? exp.substring(0, 200) + "…" : exp;
        } else if (session.getOriginalLogs() != null && !session.getOriginalLogs().isBlank()) {
            String logs = session.getOriginalLogs();
            errorContext = logs.length() > 200 ? logs.substring(0, 200) + "…" : logs;
        }

        // ── messages: full ordered history ──
        List<ChatMessage> rawMessages = chatMessageRepository
                .findBySessionIdOrderByTimestampAsc(sessionId);

        List<ChatMessageResponse> messages = rawMessages.stream()
                .map(chatMapper::toResponse)
                .collect(Collectors.toList());

        // ── suggestedPrompts: from the most recent ASSISTANT message ──
        List<String> suggestedPrompts = rawMessages.stream()
                .filter(m -> m.getRole() == ChatRole.ASSISTANT)
                .filter(m -> m.getSuggestedFollowUpsJson() != null)
                .reduce((first, second) -> second)   // get last ASSISTANT message
                .map(m -> deserializeFollowUps(m.getSuggestedFollowUpsJson()))
                .orElse(Collections.emptyList());

        return ChatSessionResponse.builder()
                .sessionId(session.getId())
                .errorType(errorType)
                .errorContext(errorContext)
                .messages(messages)
                .suggestedPrompts(suggestedPrompts)
                .createdAt(session.getCreatedAt())
                .build();
    }

    /**
     * Retrieve all chat messages for a session, ordered by timestamp.
     * Kept for backward compatibility with other service callers.
     */
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getSessionChatHistory(UUID sessionId) {
        return chatMessageRepository.findBySessionIdOrderByTimestampAsc(sessionId)
                .stream()
                .map(chatMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieve paginated chat messages for a session.
     */
    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getSessionChatHistoryPaginated(UUID sessionId, Pageable pageable) {
        return chatMessageRepository.findBySessionIdOrderByTimestampDesc(sessionId, pageable)
                .map(chatMapper::toResponse);
    }

    /**
     * Get raw chat history entities for building AI context.
     */
    @Transactional(readOnly = true)
    public List<ChatMessage> getRawChatHistory(UUID sessionId) {
        return chatMessageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    /**
     * Count messages in a session.
     */
    @Transactional(readOnly = true)
    public long getMessageCount(UUID sessionId) {
        return chatMessageRepository.countBySessionId(sessionId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String serializeFollowUps(List<String> followUps) {
        if (followUps == null || followUps.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(followUps);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize suggestedFollowUps: {}", e.getMessage());
            return null;
        }
    }

    private List<String> deserializeFollowUps(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize suggestedFollowUps JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}