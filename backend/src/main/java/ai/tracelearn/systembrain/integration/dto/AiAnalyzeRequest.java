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


    /**
     * "LIVE_EXECUTION" or "LOG_ANALYSIS".
     * AI Agent uses this to decide which analysis path to invoke.
     *
     * LIVE_EXECUTION → existing ErrorTeacherAgent / RetryImproverAgent flow
     * LOG_ANALYSIS   → new FrameworkAnalystAgent with framework-specific prompts
     */
    private String executionMode;

    /**
     * Framework identifier for LOG_ANALYSIS sessions.
     * Tells AI Agent which prompt template to use.
     * Values: "springboot" | "fastapi" | "django" | "express" | "nestjs" | "react"
     * Null for LIVE_EXECUTION sessions.
     */
    private String frameworkType;

    /**
     * Raw log file content from the developer's machine.
     * Only populated for LOG_ANALYSIS sessions.
     * Contains the real stack trace / error output that happened on their machine.
     * For LIVE_EXECUTION sessions this is null — stdout/stderr from sandbox are used instead.
     */
    private String logContent;

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
