package ai.tracelearn.systembrain.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response from POST /ai/roadmap.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiRoadmapResponse {

    /** Knowledge gaps identified from error patterns. Was missing entirely. */
    private List<KnowledgeGap> knowledgeGapAnalysis;

    private List<TopicRecommendation> recommendedTopics;

    /** Single narrative string — was wrongly typed as List<String>. */
    private String learningPriorities;

    /** Map of conceptName → masteryScore. Was missing entirely. */
    private Map<String, Double> conceptMasteryScores;

    // ── Inner types ───────────────────────────────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class KnowledgeGap {
        private String conceptName;
        private double masteryScore;
        private String gapLevel;      // "HIGH", "MEDIUM", "LOW"
        private String description;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopicRecommendation {
        private String topicName;
        private String description;
        private String priority;       // "HIGH", "MEDIUM", "LOW"
        private String estimatedTime;
        /** Was missing — contract includes a resources list per topic. */
        private List<TopicResource> resources;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopicResource {
        private String title;
        private String url;
    }
}