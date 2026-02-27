package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.ChatMessage;
import ai.tracelearn.systembrain.domain.ChatRole;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.dto.ChatMessageResponse;
import ai.tracelearn.systembrain.mapper.ChatMapper;
import ai.tracelearn.systembrain.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatMapper chatMapper;

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
     */
    @Transactional
    public ChatMessage saveAssistantMessage(Session session, String messageText) {
        ChatMessage chatMsg = ChatMessage.builder()
                .session(session)
                .role(ChatRole.ASSISTANT)
                .message(messageText)
                .build();

        chatMsg = chatMessageRepository.save(chatMsg);
        log.info("Assistant message saved for session {}", session.getId());
        return chatMsg;
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

    /**
     * Retrieve all chat messages for a session, ordered by timestamp.
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
}
