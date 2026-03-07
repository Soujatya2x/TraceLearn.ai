package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response from RAG FastAPI server after indexing completes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRagIndexResponse {
    /** "indexed" on success. */
    private String status;
    /** Human-readable message, e.g. "Indexed 3 documents, 142 chunks." */
    private String message;
    /** Number of documents successfully embedded. */
    private int documentCount;
    /** Total vector chunks stored. */
    private int chunkCount;
}