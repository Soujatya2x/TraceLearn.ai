package ai.tracelearn.systembrain.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import ai.tracelearn.systembrain.domain.ChatMessage;

import java.util.Map;
import java.util.UUID;

/**
 * WebSocket notification service for pushing real-time updates to the frontend.
 * Sends session status changes, execution results, and artifact status.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Notify frontend about session status change.
     */
    public void notifySessionUpdate(UUID sessionId, String status, Object data) {
        String destination = "/topic/session/" + sessionId;
        Map<String, Object> payload = Map.of(
                "type", "SESSION_UPDATE",
                "sessionId", sessionId.toString(),
                "status", status,
                "data", data != null ? data : Map.of());

        messagingTemplate.convertAndSend(destination, payload);
        log.debug("WebSocket notification sent: session={}, status={}", sessionId, status);
    }

    /**
     * Notify frontend about execution completion.
     */
    public void notifyExecutionComplete(UUID sessionId, int attemptNumber, String result) {
        String destination = "/topic/session/" + sessionId;
        Map<String, Object> payload = Map.of(
                "type", "EXECUTION_COMPLETE",
                "sessionId", sessionId.toString(),
                "attemptNumber", attemptNumber,
                "result", result);

        messagingTemplate.convertAndSend(destination, payload);
    }

    /**
     * Notify frontend about AI analysis completion.
     */
    public void notifyAnalysisComplete(UUID sessionId, Object analysisData) {
        String destination = "/topic/session/" + sessionId;
        Map<String, Object> payload = Map.of(
                "type", "ANALYSIS_COMPLETE",
                "sessionId", sessionId.toString(),
                "data", analysisData != null ? analysisData : Map.of());

        messagingTemplate.convertAndSend(destination, payload);
    }

    /**
     * Notify frontend about artifact generation status.
     */
    public void notifyArtifactStatus(UUID sessionId, String artifactStatus) {
        String destination = "/topic/session/" + sessionId;
        Map<String, Object> payload = Map.of(
                "type", "ARTIFACT_STATUS",
                "sessionId", sessionId.toString(),
                "artifactStatus", artifactStatus);

        messagingTemplate.convertAndSend(destination, payload);
    }

    /**
     * Send a user-specific notification.
     */
    public void notifyUser(UUID userId, String type, Object data) {
        String destination = "/queue/user/" + userId;
        Map<String, Object> payload = Map.of(
                "type", type,
                "data", data != null ? data : Map.of());

        messagingTemplate.convertAndSend(destination, payload);
    }

    /**
     * Push an AI chat reply to the frontend over WebSocket.
     * Frontend listens on /topic/session/{sessionId} and filters type=CHAT_REPLY.
     */
    public void notifyChatReply(UUID sessionId, ChatMessage assistantMsg) {
        String destination = "/topic/session/" + sessionId;
        Map<String, Object> payload = Map.of(
                "type", "CHAT_REPLY",
                "sessionId", sessionId.toString(),
                "id", assistantMsg.getId().toString(),
                "role", "assistant",
                "message", assistantMsg.getMessage(),
                "timestamp", assistantMsg.getTimestamp().toString());

        messagingTemplate.convertAndSend(destination, payload);
        log.debug("WebSocket chat reply sent: session={}", sessionId);
    }
}
