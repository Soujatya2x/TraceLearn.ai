package ai.tracelearn.systembrain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Returned from POST /api/v1/rag/upload after files are stored in S3
 * and the RAG server confirms indexing is done.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagUploadResponse {
    /** Opaque collection ID the frontend must pass back in /query calls. */
    private String collectionId;
    /** Original file names that were successfully indexed. */
    private List<String> indexedFiles;
    /** Total vector chunks created. */
    private int chunkCount;
    /** Human-readable confirmation, e.g. "3 documents indexed. You can now ask questions." */
    private String message;
}