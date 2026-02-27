package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiArtifactsResponse {

    private String pdfUrl;
    private String pptUrl;
    private String summaryUrl;
}
