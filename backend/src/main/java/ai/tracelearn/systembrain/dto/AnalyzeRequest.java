package ai.tracelearn.systembrain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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

    @Pattern(
        regexp = "^(springboot|fastapi|django|express|nestjs|react)?$",
        message = "frameworkType must be one of: springboot, fastapi, django, express, nestjs, react"
    )
    private String frameworkType;
}