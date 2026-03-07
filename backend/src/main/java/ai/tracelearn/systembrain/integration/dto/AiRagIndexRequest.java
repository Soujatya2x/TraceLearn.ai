package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Sent to the RAG FastAPI server: POST /rag/index
 * Tells the RAG server which S3 files to download, chunk, and embed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRagIndexRequest {
    /** Unique ID for this document collection (userId makes it user-scoped). */
    private String collectionId;
    /** S3 object keys — e.g. ["rag/abc123/file1.pdf", "rag/abc123/notes.txt"] */
    private List<String> s3Keys;
    /** S3 bucket name so the RAG server can download directly. */
    private String s3Bucket;
    /** AWS region */
    private String s3Region;
}