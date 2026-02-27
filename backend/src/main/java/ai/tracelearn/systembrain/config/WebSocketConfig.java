package ai.tracelearn.systembrain.config;

import ai.tracelearn.systembrain.security.WebSocketAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for real-time session updates.
 * Frontend subscribes to session-specific topics to receive:
 * - Execution status updates
 * - Analysis progress
 * - Chat messages
 * - Artifact generation status
 *
 * Authentication is enforced at the STOMP protocol layer by
 * WebSocketAuthChannelInterceptor — not at the HTTP upgrade layer.
 * This means the /ws/** HTTP endpoint remains open for the handshake,
 * but no STOMP session can be established without a valid JWT.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProperties appProperties;
    private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String allowedOrigins = appProperties.getCors().getAllowedOrigins();
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins != null ? allowedOrigins.split(",") : new String[]{"*"})
                .withSockJS();
    }

    /**
     * Register the JWT channel interceptor on the inbound STOMP channel.
     * Fires on every inbound STOMP frame — validates JWT on CONNECT,
     * reuses the authenticated principal for all subsequent frames.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthChannelInterceptor);
    }
}