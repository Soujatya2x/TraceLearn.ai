package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.RagQueryRequest;
import ai.tracelearn.systembrain.dto.RagQueryResponse;
import ai.tracelearn.systembrain.dto.RagUploadResponse;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.RagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * RAG (Retrieval-Augmented Generation) endpoints.
 *
 * POST /api/v1/rag/upload  — Upload files → S3 → RAG index → returns collectionId
 * POST /api/v1/rag/query   — Ask a question → RAG search → returns AI answer
 *
 * Frontend flow:
 *   1. User picks files → POST /upload  → get back { collectionId, message }
 *   2. Frontend shows "Ask Query" button (enabled after step 1 succeeds)
 *   3. User types question → POST /query with { collectionId, query }
 *   4. Frontend shows answer + source references
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    /**
     * Upload one or more files, store in S3, trigger RAG indexing.
     *
     * Accepts multipart/form-data with field name "files".
     * Returns collectionId that must be passed to /query.
     *
     * Example curl:
     *   curl -X POST /api/v1/rag/upload \
     *     -H "Authorization: Bearer <token>" \
     *     -F "files=@notes.pdf" -F "files=@README.md"
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<RagUploadResponse>> upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("files") List<MultipartFile> files) {

        log.info("POST /api/v1/rag/upload — userId={}, fileCount={}",
                principal.getId(), files.size());

        RagUploadResponse response = ragService.uploadAndIndex(principal.getId(), files);

        return ResponseEntity.ok(
                ApiResponse.success(response, "Documents indexed successfully."));
    }

    /**
     * Ask a question against the indexed documents.
     *
     * Body: { "collectionId": "...", "query": "What is X?", "topK": 5 }
     *
     * Example curl:
     *   curl -X POST /api/v1/rag/query \
     *     -H "Authorization: Bearer <token>" \
     *     -H "Content-Type: application/json" \
     *     -d '{"collectionId":"abc","query":"What does the document say about X?"}'
     */
    @PostMapping("/query")
    public ResponseEntity<ApiResponse<RagQueryResponse>> query(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RagQueryRequest request) {

        log.info("POST /api/v1/rag/query — userId={}, collectionId={}, query='{}'",
                principal.getId(),
                request.getCollectionId(),
                request.getQuery().length() > 60
                        ? request.getQuery().substring(0, 60) + "…"
                        : request.getQuery());

        RagQueryResponse response = ragService.query(request);

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}