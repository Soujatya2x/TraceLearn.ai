package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.dto.RagQueryRequest;
import ai.tracelearn.systembrain.dto.RagQueryResponse;
import ai.tracelearn.systembrain.dto.RagUploadResponse;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.integration.RagAgentClient;
import ai.tracelearn.systembrain.integration.S3StorageClient;
import ai.tracelearn.systembrain.integration.dto.AiRagIndexRequest;
import ai.tracelearn.systembrain.integration.dto.AiRagIndexResponse;
import ai.tracelearn.systembrain.integration.dto.AiRagQueryRequest;
import ai.tracelearn.systembrain.integration.dto.AiRagQueryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates the two-phase RAG pipeline:
 *
 *  Phase 1 — uploadAndIndex():
 *    1. Accept one or more files from the HTTP request
 *    2. Upload each file to S3 under rag/{collectionId}/{filename}
 *    3. Send the S3 keys to the RAG FastAPI server (POST /rag/index)
 *    4. Wait for "indexed" confirmation, return collectionId + stats
 *
 *  Phase 2 — query():
 *    1. Accept collectionId + question from the HTTP request
 *    2. Forward to RAG FastAPI server (POST /rag/query)
 *    3. Return the answer + source references
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    // Max file size: 20 MB per file
    private static final long MAX_FILE_BYTES = 20 * 1024 * 1024;
    // Max files per request
    private static final int MAX_FILES = 10;
    // Allowed MIME types
    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf",
            "text/plain",
            "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // .docx
            "text/x-python", "text/x-java-source", "application/javascript",
            "text/html", "text/csv"
    );

    private final S3StorageClient s3StorageClient;
    private final RagAgentClient ragAgentClient;
    private final AppProperties appProperties;

    /**
     * Upload files to S3 and trigger RAG indexing.
     *
     * @param userId the authenticated user's UUID (used as collection namespace)
     * @param files  the uploaded files
     * @return RagUploadResponse with collectionId and indexing stats
     */
    public RagUploadResponse uploadAndIndex(UUID userId, List<MultipartFile> files) {
        // ── Validation ──────────────────────────────────────────────────────
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("At least one file is required.");
        }
        if (files.size() > MAX_FILES) {
            throw new BadRequestException("Maximum " + MAX_FILES + " files per upload.");
        }

        for (MultipartFile file : files) {
            if (file.getSize() > MAX_FILE_BYTES) {
                throw new BadRequestException(
                        "File '" + file.getOriginalFilename() + "' exceeds 20 MB limit.");
            }
        }

        // ── Generate a unique collection ID for this upload batch ───────────
        // collectionId = userId + timestamp so the user can have multiple collections
        String collectionId = userId.toString() + "-" + System.currentTimeMillis();

        // ── Upload each file to S3 ───────────────────────────────────────────
        List<String> s3Keys = new ArrayList<>();
        List<String> fileNames = new ArrayList<>();

        for (MultipartFile file : files) {
            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : "file-" + UUID.randomUUID();

            // Sanitize name (spaces → underscores, strip path traversal)
            String safeName = originalName
                    .replaceAll("[^a-zA-Z0-9._\\-]", "_")
                    .replaceAll("\\.\\.", "");

            String s3Key = "rag/" + collectionId + "/" + safeName;
            String contentType = resolveContentType(file);

            log.info("Uploading RAG file to S3: key={}, size={} bytes", s3Key, file.getSize());

            try {
                s3StorageClient.uploadStream(
                        s3Key,
                        file.getInputStream(),
                        file.getSize(),
                        contentType
                );
            } catch (IOException e) {
                log.error("Failed to read uploaded file: {}", originalName, e);
                throw new BadRequestException("Could not read file: " + originalName);
            }

            s3Keys.add(s3Key);
            fileNames.add(originalName);
        }

        log.info("All {} file(s) uploaded to S3 for collectionId={}. Triggering RAG indexing.",
                s3Keys.size(), collectionId);

        // ── Send S3 keys to RAG server for embedding ────────────────────────
        AiRagIndexRequest indexRequest = AiRagIndexRequest.builder()
                .collectionId(collectionId)
                .s3Keys(s3Keys)
                .s3Bucket(appProperties.getAws().getS3().getBucketName())
                .s3Region(appProperties.getAws().getS3().getRegion())
                .build();

        AiRagIndexResponse indexResponse = ragAgentClient.indexDocuments(indexRequest);

        int chunkCount = indexResponse != null ? indexResponse.getChunkCount() : 0;
        String message = indexResponse != null
                ? indexResponse.getMessage()
                : files.size() + " document(s) indexed. You can now ask questions.";

        return RagUploadResponse.builder()
                .collectionId(collectionId)
                .indexedFiles(fileNames)
                .chunkCount(chunkCount)
                .message(message)
                .build();
    }

    /**
     * Forward a user question to the RAG server and return the answer.
     *
     * @param request collectionId + query text
     * @return RagQueryResponse with AI answer and source references
     */
    public RagQueryResponse query(RagQueryRequest request) {
        if (request.getCollectionId() == null || request.getCollectionId().isBlank()) {
            throw new BadRequestException("collectionId is required. Upload documents first.");
        }
        if (request.getQuery() == null || request.getQuery().isBlank()) {
            throw new BadRequestException("Query cannot be blank.");
        }

        AiRagQueryRequest ragRequest = AiRagQueryRequest.builder()
                .collectionId(request.getCollectionId())
                .query(request.getQuery())
                .topK(request.getTopK() != null ? request.getTopK() : 5)
                .build();

        AiRagQueryResponse ragResponse = ragAgentClient.query(ragRequest);

        if (ragResponse == null) {
            throw new ServiceUnavailableException("RAG server returned an empty response", "(null)");
        }

        List<RagQueryResponse.SourceReference> sources = ragResponse.getSources() == null
                ? List.of()
                : ragResponse.getSources().stream()
                        .map(s -> RagQueryResponse.SourceReference.builder()
                                .fileName(s.getFileName())
                                .excerpt(s.getExcerpt())
                                .score(s.getScore())
                                .build())
                        .collect(Collectors.toList());

        return RagQueryResponse.builder()
                .answer(ragResponse.getAnswer())
                .sources(sources)
                .build();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private String resolveContentType(MultipartFile file) {
        String ct = file.getContentType();
        if (ct != null && !ct.isBlank() && !ct.equals("application/octet-stream")) {
            return ct;
        }
        // Fallback: guess from extension
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (name.endsWith(".pdf"))   return "application/pdf";
        if (name.endsWith(".docx"))  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (name.endsWith(".txt"))   return "text/plain";
        if (name.endsWith(".md"))    return "text/markdown";
        if (name.endsWith(".py"))    return "text/x-python";
        if (name.endsWith(".java"))  return "text/x-java-source";
        if (name.endsWith(".js"))    return "application/javascript";
        if (name.endsWith(".csv"))   return "text/csv";
        if (name.endsWith(".html"))  return "text/html";
        return "application/octet-stream";
    }

    private static class ServiceUnavailableException extends RuntimeException {
        ServiceUnavailableException(String service, String reason) {
            super("Service unavailable: " + service + " — " + reason);
        }
    }
}