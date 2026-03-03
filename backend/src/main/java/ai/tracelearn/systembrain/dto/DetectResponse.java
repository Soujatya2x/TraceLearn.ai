package ai.tracelearn.systembrain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response from POST /api/v1/detect.
 *
 * Frontend uses this to decide whether to show the "Upload log file" prompt.
 *
 * mode values:
 *   "LIVE_EXECUTION" → standalone code, send to analyze immediately, no log needed
 *   "LOG_ANALYSIS"   → framework code detected, ask user for log file first
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetectResponse {

    /**
     * "LIVE_EXECUTION" or "LOG_ANALYSIS"
     * Frontend branches on this field only.
     */
    private String mode;

    /**
     * "springboot" | "fastapi" | null
     * Null when mode = LIVE_EXECUTION.
     * Frontend passes this back as frameworkType in the analyze request.
     */
    private String detectedFramework;

    /**
     * 0.0–1.0. How confident the detector is.
     * - 1.0 = explicit user selection (not applicable here, but kept for consistency)
     * - 0.9 = log signature matched
     * - 0.7 = build filename matched
     * - 0.5 = code content heuristic matched
     * Frontend can use this to show "We think this is Spring Boot" vs
     * "This looks like Spring Boot" depending on confidence.
     */
    private double confidence;

    /**
     * Human-readable reason for the detection decision.
     * For debugging and UI tooltips.
     * Example: "Detected @RestController annotation in code"
     *          "Found BeanCreationException in log content"
     */
    private String reason;
}