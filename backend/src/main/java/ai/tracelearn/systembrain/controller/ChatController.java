package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.ChatMessageRequest;
import ai.tracelearn.systembrain.dto.ChatMessageResponse;
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

import java.util.List;
import java.util.UUID;

/**
 * Chat endpoints per the immutable API contract:
 *   POST /api/v1/chat/message     - Send a chat message within a session
 *   GET  /api/v1/chat/{sessionId} - Retrieve chat history for a session
 *
 * All chats are isolated per session as required.
 *
 * NOTE on POST /message response contract change:
 *   Previously returned 200 + ChatMessageResponse (AI reply inline).
 *   Now returns 202 Accepted with no body — AI reply is pushed async
 *   via WebSocket on /topic/session/{sessionId} as type=CHAT_REPLY.
 *   This is required because the AI inference call is no longer blocking
 *   the HTTP thread; the reply arrives out-of-band.
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
     * Accepts the user's message, saves it, and immediately returns 202 Accepted.
     * The AI reply is delivered asynchronously via WebSocket:
     *   destination : /topic/session/{sessionId}
     *   payload type: CHAT_REPLY
     *
     * Frontend must be subscribed to the session WebSocket topic before sending
     * this request, otherwise the reply notification will be missed.
     */
    @PostMapping("/message")
    public ResponseEntity<Void> sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChatMessageRequest request) {

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId().toString()));

        log.info("POST /api/v1/chat/message from user {} for session {}", user.getId(), request.getSessionId());

        orchestrationService.processChat(request.getSessionId(), user, request.getMessage());

        // 202 Accepted — message saved, AI reply coming via WebSocket
        return ResponseEntity.accepted().build();
    }

    /**
     * GET /api/v1/chat/{sessionId}
     * Retrieve the full chat history for a session.
     * Chats remain isolated per session as required.
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getChatHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {

        log.info("GET /api/v1/chat/{} from user {}", sessionId, principal.getId());

        List<ChatMessageResponse> messages = chatService.getSessionChatHistory(sessionId);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }
}