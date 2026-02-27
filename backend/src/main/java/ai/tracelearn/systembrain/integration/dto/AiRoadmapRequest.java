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
public class AiRoadmapRequest {

    private String userId;
    private List<MetricEntry> currentMetrics;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricEntry {
        private String conceptName;
        private double masteryScore;
        private int encounterCount;
    }
}
