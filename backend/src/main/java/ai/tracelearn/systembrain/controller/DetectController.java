package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.DetectResponse;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.CodeAnalysisDetector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * POST /api/v1/detect
 *
 * Lightweight pre-analysis detection endpoint.
 * Called by frontend immediately after user selects a code file,
 * BEFORE the user clicks "Analyze".
 *
 * No session is created. No DB writes. Pure detection only.
 *
 * Flow:
 *   1. Frontend: user picks a file
 *   2. Frontend: POST /api/v1/detect  (code file only)
 *   3. Backend:  scan code for framework signatures
 *   4. Backend:  return { mode, detectedFramework, confidence, reason }
 *   5. Frontend: if mode=LOG_ANALYSIS → show "Upload your log file" prompt
 *   6. Frontend: if mode=LIVE_EXECUTION → show "Analyze" button immediately
 *   7. Frontend: POST /api/v1/analyze  (with frameworkType pre-filled from detect response)
 *
 * This endpoint is intentionally fast and stateless:
 *   - No DB calls
 *   - No workspace creation
 *   - No session creation
 *   - Just reads the file, scans content, returns result
 *   - Typical response time: <10ms
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/detect")
@RequiredArgsConstructor
public class DetectController {

    private static final long MAX_DETECT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    private final CodeAnalysisDetector codeAnalysisDetector;

    /**
     * Detect execution mode from code file content.
     *
     * Accepts: multipart/form-data
     *   - code     (required) — the code file to analyze
     *   - filename (optional) — override filename if browser strips it
     *
     * Returns: DetectResponse
     *   { mode: "LOG_ANALYSIS", detectedFramework: "springboot", confidence: 0.9, reason: "..." }
     *   { mode: "LIVE_EXECUTION", detectedFramework: null, confidence: 1.0, reason: "..." }
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DetectResponse>> detect(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("code") MultipartFile codeFile,
            @RequestParam(value = "filename", required = false) String filenameOverride) {

        // ── Validate file ─────────────────────────────────────────────────────
        if (codeFile == null || codeFile.isEmpty()) {
            throw new BadRequestException("Code file is required");
        }

        if (codeFile.getSize() > MAX_DETECT_FILE_SIZE_BYTES) {
            throw new BadRequestException("Code file exceeds 5MB limit");
        }

        // ── Read file content ─────────────────────────────────────────────────
        String codeContent;
        try {
            codeContent = new String(codeFile.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new BadRequestException("Could not read code file: " + e.getMessage());
        }

        // Prefer browser-supplied filename; fall back to override param
        String filename = (codeFile.getOriginalFilename() != null
                && !codeFile.getOriginalFilename().isBlank())
                ? codeFile.getOriginalFilename()
                : filenameOverride;

        log.info("POST /api/v1/detect — user={}, filename={}, size={}B",
                principal != null ? principal.getId() : "anonymous",
                filename,
                codeFile.getSize());

        // ── Detect ────────────────────────────────────────────────────────────
        DetectResponse result = codeAnalysisDetector.detect(codeContent, filename);

        log.info("Detection result: mode={}, framework={}, confidence={}, reason={}",
                result.getMode(), result.getDetectedFramework(),
                result.getConfidence(), result.getReason());

        return ResponseEntity.ok(ApiResponse.success(result, "Detection complete"));
    }
}