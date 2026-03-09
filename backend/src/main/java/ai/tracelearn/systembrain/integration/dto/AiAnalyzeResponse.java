package ai.tracelearn.systembrain.integration.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
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
    private String conceptBreakdown;

    /**
     * Per-concept mastery scores (PREFERRED for metric updates).
     *
     * AI Agent returns: {"conceptName": "...", "masteryScore": 0.3}
     * Old field names were: {"concept": "...", "score": 0.3}
     *
     * @JsonAlias on each field accepts BOTH spellings so no matter what
     * the LLM returns, Jackson maps it correctly. The getter names
     * (getConcept / getScore) remain unchanged so LearningMetricService
     * compiles without any changes.
     */
    private List<ConceptScore> conceptScores;

    /**
     * Flat concept name list — fallback when conceptScores is absent.
     */
    private List<String> concepts;

    private String learningSummary;
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
        private String type;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SimilarError {
        private String errorType;
        private String description;
        private String example;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ConceptScore {
        /**
         * AI Agent returns "conceptName" — old code expected "concept".
         * @JsonAlias accepts both so getLearningMetricService still calls getConcept().
         */
        @JsonAlias("conceptName")
        private String concept;

        /**
         * AI Agent returns "masteryScore" — old code expected "score".
         * @JsonAlias accepts both so getLearningMetricService still calls getScore().
         */
        @JsonAlias("masteryScore")
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
