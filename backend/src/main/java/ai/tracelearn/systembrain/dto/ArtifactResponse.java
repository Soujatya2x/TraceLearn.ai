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
public class ArtifactResponse {

    private UUID id;
    private UUID sessionId;
    private String pdfUrl;
    private String pptUrl;
    private String summaryUrl;
    private String generationStatus;
    private Instant createdAt;
}
