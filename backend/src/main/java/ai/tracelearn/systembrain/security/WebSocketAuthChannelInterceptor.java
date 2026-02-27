package ai.tracelearn.systembrain.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * STOMP channel interceptor that enforces JWT authentication on WebSocket connections.
 *
 * WHY THIS IS NEEDED:
 *   Spring Security's HTTP filter chain only secures the initial HTTP upgrade
 *   handshake — it does NOT authenticate individual STOMP frames.
 *   Without this interceptor, any client that completes the HTTP handshake
 *   (even anonymously via the /ws/** permitAll rule) can subscribe to any
 *   /topic/session/{id} and receive execution results, AI analysis, and chat replies.
 *
 * HOW IT WORKS:
 *   1. Frontend includes the JWT in the STOMP CONNECT frame's Authorization header:
 *      client.connect({ Authorization: "Bearer <token>" }, ...)
 *   2. This interceptor fires on every inbound STOMP frame.
 *   3. On CONNECT: extracts and validates the JWT. If valid, sets the
 *      authenticated principal on the STOMP session so Spring Security
 *      knows who this connection belongs to. If invalid, throws an
 *      exception that closes the connection immediately.
 *   4. On all other frames (SUBSCRIBE, SEND, etc.): the principal set
 *      during CONNECT is already attached — no re-validation needed.
 *
 * REJECTION:
 *   Invalid or missing JWT throws MessageDeliveryException which Spring
 *   WebSocket translates to an ERROR frame sent back to the client,
 *   followed by connection close. The client receives a clear error message.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        // Only validate on CONNECT — principal is reused for the session lifetime
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);

            if (token == null) {
                log.warn("WebSocket CONNECT rejected — no JWT token provided");
                throw new org.springframework.security.access.AccessDeniedException(
                        "WebSocket connection requires a valid JWT token. " +
                        "Send Authorization: Bearer <token> in STOMP CONNECT headers.");
            }

            if (!jwtTokenProvider.validateToken(token)) {
                log.warn("WebSocket CONNECT rejected — invalid or expired JWT token");
                throw new org.springframework.security.access.AccessDeniedException(
                        "WebSocket connection rejected — token is invalid or expired.");
            }

            // Token is valid — load user and set principal on the STOMP session
            try {
                java.util.UUID userId = jwtTokenProvider.getUserIdFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserById(userId);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());

                // Attach principal to this STOMP session — persists for all subsequent frames
                accessor.setUser(auth);

                // Store userId in session attributes for downstream use
                Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                if (sessionAttributes != null) {
                    sessionAttributes.put("userId", userId.toString());
                }

                log.info("WebSocket CONNECT authenticated — userId={}, sessionId={}",
                        userId, accessor.getSessionId());

            } catch (Exception e) {
                log.error("WebSocket CONNECT rejected — failed to load user from token: {}",
                        e.getMessage());
                throw new org.springframework.security.access.AccessDeniedException(
                        "WebSocket authentication failed: " + e.getMessage());
            }
        }

        return message;
    }

    /**
     * Extracts the JWT token from the STOMP CONNECT frame.
     *
     * Checks two locations (in order):
     *   1. Authorization header: "Bearer <token>"  ← preferred
     *   2. Native header "token": "<token>"        ← SockJS fallback (cookies unavailable)
     *
     * SockJS transports (XHR, iframe) cannot set custom HTTP headers during
     * the WebSocket handshake, so some clients pass the token as a STOMP
     * native header instead.
     */
    private String extractToken(StompHeaderAccessor accessor) {
        // 1. Check Authorization header (standard)
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }

        // 2. Check raw "token" header (SockJS fallback)
        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            String token = tokenHeaders.get(0);
            if (token != null && !token.isBlank()) {
                return token;
            }
        }

        return null;
    }
}