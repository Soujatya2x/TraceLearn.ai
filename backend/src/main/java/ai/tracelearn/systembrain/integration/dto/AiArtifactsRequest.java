package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to POST /ai/artifacts.
 * Carries all analysis data the AI Agent needs to generate PDF, PPT, and daily summary.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiArtifactsRequest {

    private String sessionId;
    private String code;
    private String explanation;
    private String fixedCode;
    private String learningSummary;

    // ── Fields required by contract but previously missing ───────────────────
    private String whyItHappened;
    private String conceptBehindError;
    private List<String> stepByStepReasoning;
    private FixAnalysis fixAnalysis;
    private List<LearningResource> learningResources;

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
}