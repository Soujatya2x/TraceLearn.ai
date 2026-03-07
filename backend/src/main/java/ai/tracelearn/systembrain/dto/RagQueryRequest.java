package ai.tracelearn.systembrain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Body for POST /api/v1/rag/query
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagQueryRequest {

    @NotBlank(message = "collectionId is required")
    private String collectionId;

    @NotBlank(message = "Query cannot be blank")
    @Size(max = 2000, message = "Query must be 2000 characters or fewer")
    private String query;

    /** Optional — how many source chunks to retrieve (1–20, default 5). */
    private Integer topK;
}