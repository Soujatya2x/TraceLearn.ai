package ai.tracelearn.systembrain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyzeRequest {

    @NotBlank(message = "Code content is required")
    private String code;

    private String logs;

    @NotBlank(message = "Language is required")
    private String language;

    private String filename;
}