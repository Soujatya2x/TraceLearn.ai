package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sent to the RAG FastAPI server: POST /rag/query
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRagQueryRequest {
    /** Must match the collectionId used during indexing. */
    private String collectionId;
    /** The user's natural language question. */
    private String query;
    /** Max chunks to retrieve (default 5 on the RAG server side). */
    private Integer topK;
}