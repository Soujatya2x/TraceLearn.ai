package ai.tracelearn.systembrain.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Full response from POST /ai/analyze.
 * @JsonIgnoreProperties(ignoreUnknown = true) — safe to add new AI fields without breaking deserialization.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAnalyzeResponse {

    // ── Core explanation ─────────────────────────────────────────────────────
    private String explanation;
    private String stackTrace;
    private String whyItHappened;
    private String conceptBehindError;
    private List<String> stepByStepReasoning;

    // ── Fix ──────────────────────────────────────────────────────────────────
    private String fixedCode;
    private FixAnalysis fixAnalysis;

    // ── Learning resources ───────────────────────────────────────────────────
    private List<LearningResource> learningResources;
    private List<SimilarError> similarErrors;

    // ── Learning metrics ─────────────────────────────────────────────────────
    /** Human-readable prose — display only, never parsed for metric updates. */
    private String conceptBreakdown;

    /**
     * Per-concept mastery scores (PREFERRED for metric updates).
     * Example: [{"concept": "error-handling", "score": 0.3}]
     */
    private List<ConceptScore> conceptScores;

    /**
     * Flat concept name list — fallback when conceptScores is absent.
     * Backend uses confidenceScore as uniform delta in this case.
     */
    private List<String> concepts;

    private String learningSummary;

    /**
     * Boxed Double — null means AI Agent did not return a score.
     * Used as fallback uniform mastery delta when conceptScores is absent.
     */
    private Double confidenceScore;

    // ── Control flags ────────────────────────────────────────────────────────
    private boolean retryRecommendation;
    private ErrorDetail errorDetail;
    private List<RoadmapUpdate> roadmapUpdates;

    // ── Inner types ───────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class FixAnalysis {
        private String whatChanged;
        private String whyItWorks;
        private String reinforcedConcept;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LearningResource {
        private String title;
        private String url;
        private String type;   // "documentation", "article", "video", etc.
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SimilarError {
        private String errorType;
        private String description;
        private String example;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ConceptScore {
        /** Normalized concept name, e.g. "error-handling", "ZeroDivisionError" */
        private String concept;
        /** Mastery score for this session: 0.0–1.0 */
        private double score;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ErrorDetail {
        private String errorType;
        private String errorFile;
        private Integer errorLine;
        private String context;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RoadmapUpdate {
        private String conceptName;
        private double masteryDelta;
    }
}