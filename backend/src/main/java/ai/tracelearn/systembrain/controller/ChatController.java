package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.ChatMessageRequest;
import ai.tracelearn.systembrain.dto.ChatSessionResponse;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.ChatService;
import ai.tracelearn.systembrain.service.OrchestrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Chat endpoints per the immutable API contract:
 *   POST /api/v1/chat/message     - Send a chat message within a session
 *   GET  /api/v1/chat/{sessionId} - Retrieve full chat session (messages + context + suggested prompts)
 *
 * NOTE on POST /message response:
 *   Returns 202 Accepted immediately — AI reply is pushed async via WebSocket
 *   on /topic/session/{sessionId} as type=CHAT_REPLY.
 *   Frontend must subscribe to the WebSocket topic BEFORE calling this endpoint.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final OrchestrationService orchestrationService;
    private final ChatService chatService;
    private final UserRepository userRepository;

    /**
     * POST /api/v1/chat/message
     *
     * Request body: { "sessionId": "uuid", "message": "user text" }
     *
     * Saves the user message and triggers async AI inference.
     * Returns 202 Accepted — AI reply arrives via WebSocket (type=CHAT_REPLY).
     */
    @PostMapping("/message")
    public ResponseEntity<Void> sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChatMessageRequest request) {

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId().toString()));

        log.info("POST /api/v1/chat/message from user {} for session {}", user.getId(), request.getSessionId());

        orchestrationService.processChat(request.getSessionId(), user, request.getMessage());

        return ResponseEntity.accepted().build();
    }

    /**
     * GET /api/v1/chat/{sessionId}
     *
     * Returns ChatSessionResponse — the complete shape the frontend ChatSession interface requires:
     *   - sessionId, createdAt          — for session context sidebar
     *   - errorType, errorContext        — for chat header display
     *   - messages[]                     — full ordered chat history
     *   - suggestedPrompts[]             — follow-up chips from the latest AI reply
     *
     * Previously returned List<ChatMessageResponse> which was missing all context fields.
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> getChatHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        log.info("GET /api/v1/chat/{} from user {}", sessionId, principal.getId());

        ChatSessionResponse response = chatService.getChatSessionResponse(sessionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}