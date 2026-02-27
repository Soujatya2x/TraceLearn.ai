package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    private String sessionId;
    private String userMessage;
    private String errorContext;
    private String analysisSummary;
    private List<ChatHistoryEntry> chatHistory;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatHistoryEntry {
        private String role;
        private String message;
    }
}
