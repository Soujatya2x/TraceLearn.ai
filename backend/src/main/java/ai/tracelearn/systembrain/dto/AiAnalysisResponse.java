package ai.tracelearn.systembrain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisResponse {

    private UUID id;
    private String explanation;
    private String conceptBreakdown;
    private String fixedCode;
    private String learningSummary;
    private Double confidenceScore;
    private String errorType;
    private String errorFile;
    private Integer errorLine;
    private String learningResources;
    private boolean retryRecommendation;
    private Instant createdAt;
}
