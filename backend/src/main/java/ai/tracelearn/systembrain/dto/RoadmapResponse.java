package ai.tracelearn.systembrain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapResponse {

    private UUID userId;
    private long totalSessionsAnalyzed;
    private long completedSessions;
    private List<ConceptMetric> knowledgeGapAnalysis;
    private List<RecommendedTopic> recommendedTopics;
    private String learningPriorities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConceptMetric {
        private String conceptName;
        private double masteryScore;
        private int encounterCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedTopic {
        private String topicName;
        private String description;
        private String priority;
        private String estimatedTime;
    }
}