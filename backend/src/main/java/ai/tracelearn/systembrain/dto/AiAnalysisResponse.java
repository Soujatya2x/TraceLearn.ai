package ai.tracelearn.systembrain.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full AI analysis response for GET /api/v1/session/{id}/analysis.
 *
 * Matches the BackendAnalysis interface in frontend types/index.ts exactly.
 * All JSON TEXT columns from the AiAnalysis entity are deserialized into typed
 * objects by SessionMapper.toAnalysisResponse() before being set here.
 *
 * Fields marked with (*) were missing from the old DTO — they are now populated
 * from the corresponding TEXT columns in the ai_analysis table.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiAnalysisResponse {

    private UUID id;

    // ── Core explanation ──────────────────────────────────────────────────────

    private String explanation;

    /** (*) Raw stack trace string — frontend splits on \n for the stack trace viewer. */
    private String stackTrace;

    /** (*) Why the error happened — displayed in the "Why This Happened" section. */
    private String whyItHappened;

    /** (*) Concept name behind the error, e.g. "Division by Zero". Plain string. */
    private String conceptBehindError;

    /** (*) Step-by-step reasoning list — deserialized from JSON array TEXT column. */
    private List<String> stepByStepReasoning;

    // ── Fix ───────────────────────────────────────────────────────────────────

    private String fixedCode;

    /** (*) Fix explanation — deserialized from JSON object TEXT column. */
    private FixAnalysis fixAnalysis;

    // ── Learning ─────────────────────────────────────────────────────────────

    private String conceptBreakdown;
    private String learningSummary;
    private Double confidenceScore;

    /** (*) Typed resource list — deserialized from JSON array TEXT column. */
    private List<LearningResource> learningResources;

    /** (*) Similar errors list — deserialized from JSON array TEXT column. */
    private List<SimilarError> similarErrors;

    // ── Error location ────────────────────────────────────────────────────────

    private String errorType;
    private String errorFile;
    private Integer errorLine;

    // ── Control flags ─────────────────────────────────────────────────────────

    private boolean retryRecommendation;
    private Instant createdAt;

    // ── Nested types ──────────────────────────────────────────────────────────

    /**
     * Deserialized from ai_analysis.fix_analysis JSON TEXT column.
     * Matches AiAnalyzeResponse.FixAnalysis inner class.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FixAnalysis {
        private String whatChanged;
        private String whyItWorks;
        private String reinforcedConcept;
    }

    /**
     * One element of the deserialized ai_analysis.learning_resources JSON array.
     * Matches AiAnalyzeResponse.LearningResource inner class.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningResource {
        private String title;
        private String url;
        private String type;   // "documentation" | "article" | "video" | "tutorial"
    }

    /**
     * One element of the deserialized ai_analysis.similar_errors JSON array.
     * Matches AiAnalyzeResponse.SimilarError inner class.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimilarError {
        private String errorType;
        private String description;
        private String example;
    }
}