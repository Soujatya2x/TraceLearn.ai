package ai.tracelearn.systembrain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response from RAG FastAPI server for a document query.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRagQueryResponse {
    /** The AI-generated answer based on retrieved context. */
    private String answer;
    /** Source chunks used to generate the answer. */
    private List<SourceChunk> sources;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceChunk {
        private String fileName;
        private String excerpt;
        private double score;
    }
}