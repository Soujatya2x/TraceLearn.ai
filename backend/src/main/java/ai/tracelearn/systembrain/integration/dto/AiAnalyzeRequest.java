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
public class AiAnalyzeRequest {

    private String sessionId;
    private String code;
    private String language;
    private String stdout;
    private String stderr;
    private Integer exitCode;
    private String originalCode;
    private String originalLogs;
    private int attemptNumber;
    private List<PreviousAttempt> previousAttempts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviousAttempt {
        private int attemptNumber;
        private String code;
        private String stderr;
        private int exitCode;
        private String aiFix;
    }
}
