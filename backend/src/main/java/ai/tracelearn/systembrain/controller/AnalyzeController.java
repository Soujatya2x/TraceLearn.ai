package ai.tracelearn.systembrain.controller;

import ai.tracelearn.systembrain.config.AppProperties;
import ai.tracelearn.systembrain.domain.User;
import ai.tracelearn.systembrain.dto.AnalyzeRequest;
import ai.tracelearn.systembrain.dto.ApiResponse;
import ai.tracelearn.systembrain.dto.SessionDetailResponse;
import ai.tracelearn.systembrain.exception.BadRequestException;
import ai.tracelearn.systembrain.exception.ResourceNotFoundException;
import ai.tracelearn.systembrain.repository.UserRepository;
import ai.tracelearn.systembrain.security.UserPrincipal;
import ai.tracelearn.systembrain.service.AnalyzeRateLimiter;
import ai.tracelearn.systembrain.service.OrchestrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * POST /api/v1/analyze
 *
 * Accepts multipart/form-data with:
 * - code (required) — the source code file e.g. main.py or Controller.java
 * - logs (optional) — a log/error output file
 * - language (required) — e.g. "python", "java", "javascript"
 * - frameworkType (optional) — e.g. "springboot", "fastapi"
 * When provided, routes to LOG_ANALYSIS pipeline (sandbox skipped).
 * When absent, auto-detection runs on log content + filename.
 *
 * Returns sessionId immediately. Frontend polls GET /session/{id} for progress.
 *
 * Multipart limits (application.yml):
 * spring.servlet.multipart.max-file-size: 10MB
 * spring.servlet.multipart.max-request-size: 20MB
 * app.execution.max-file-size-bytes: 5MB (enforced below)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analyze")
@RequiredArgsConstructor
public class AnalyzeController {

    private static final Set<String> ALLOWED_LANGUAGES = Set.of("python", "java", "javascript", "typescript", "node", "go", "rust");

    private static final Set<String> ALLOWED_FRAMEWORKS = Set.of("springboot", "fastapi", "django", "express", "nestjs",
            "react");

    private final OrchestrationService orchestrationService;
    private final UserRepository userRepository;
    private final AppProperties appProperties;
    private final AnalyzeRateLimiter rateLimiter;

    // ── multipart/form-data endpoint (primary — used by frontend) ───────────

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SessionDetailResponse>> analyzeCode(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("code") MultipartFile codeFile,
            @RequestPart(value = "logs", required = false) MultipartFile logFile,
            @RequestParam("language") String language,
            @RequestParam(value = "frameworkType", required = false) String frameworkType) {

        User user = resolveUser(principal);
        rateLimiter.checkLimit(user.getId());

        // ── Validate language ────────────────────────────────────────────────
        String normalizedLanguage = language.trim().toLowerCase();
        if (!ALLOWED_LANGUAGES.contains(normalizedLanguage)) {
            throw new BadRequestException(
                    "Unsupported language '" + language + "'. Allowed: " + ALLOWED_LANGUAGES);
        }

        // ── Validate frameworkType if provided ───────────────────────────────
        String normalizedFramework = null;
        if (frameworkType != null && !frameworkType.isBlank()) {
            normalizedFramework = frameworkType.trim().toLowerCase();
            if (!ALLOWED_FRAMEWORKS.contains(normalizedFramework)) {
                throw new BadRequestException(
                        "Unsupported frameworkType '" + frameworkType + "'. Allowed: " + ALLOWED_FRAMEWORKS);
            }
        }

        // ── Validate code file ────────────────────────────────────────────────
        if (codeFile == null || codeFile.isEmpty()) {
            throw new BadRequestException("Code file is required and cannot be empty");
        }

        long maxBytes = appProperties.getExecution().getMaxFileSizeBytes();
        if (codeFile.getSize() > maxBytes) {
            throw new BadRequestException(
                    "Code file exceeds maximum allowed size of " + maxBytes + " bytes");
        }
        if (logFile != null && !logFile.isEmpty() && logFile.getSize() > maxBytes) {
            throw new BadRequestException(
                    "Log file exceeds maximum allowed size of " + maxBytes + " bytes");
        }

        // ── Read bytes → UTF-8 strings ────────────────────────────────────────
        String code = readFileToString(codeFile, "code");
        String logs = (logFile != null && !logFile.isEmpty())
                ? readFileToString(logFile, "logs")
                : null;

        String originalFilename = codeFile.getOriginalFilename();

        log.info("POST /api/v1/analyze (multipart) — user={}, language={}, codeSize={}B, logsPresent={}, framework={}",
                user.getId(), normalizedLanguage, codeFile.getSize(), logs != null, normalizedFramework);

        AnalyzeRequest request = AnalyzeRequest.builder()
                .code(code)
                .logs(logs)
                .language(normalizedLanguage)
                .filename(originalFilename)
                .frameworkType(normalizedFramework)
                .build();

        SessionDetailResponse response = orchestrationService.analyzeCode(user, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(response, "Analysis pipeline started"));
    }

    // ── JSON fallback endpoint (for API clients / testing) ───────────────────

    /**
     * JSON fallback for non-browser API clients and integration tests.
     *
     * Request body:
     * {
     * "code": "def divide...",
     * "logs": "optional log text",
     * "language": "python",
     * "filename": "main.py",
     * "frameworkType": "springboot" ← optional
     * }
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<SessionDetailResponse>> analyzeCodeJson(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody AnalyzeRequest request) {

        User user = resolveUser(principal);
        rateLimiter.checkLimit(user.getId());

        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new BadRequestException("Code content is required");
        }
        if (request.getLanguage() == null || request.getLanguage().isBlank()) {
            throw new BadRequestException("Language is required");
        }

        String normalizedLanguage = request.getLanguage().trim().toLowerCase();
        if (!ALLOWED_LANGUAGES.contains(normalizedLanguage)) {
            throw new BadRequestException(
                    "Unsupported language '" + request.getLanguage() + "'. Allowed: " + ALLOWED_LANGUAGES);
        }

        String normalizedFramework = null;
        if (request.getFrameworkType() != null && !request.getFrameworkType().isBlank()) {
            normalizedFramework = request.getFrameworkType().trim().toLowerCase();
            if (!ALLOWED_FRAMEWORKS.contains(normalizedFramework)) {
                throw new BadRequestException(
                        "Unsupported frameworkType '" + request.getFrameworkType() + "'. Allowed: "
                                + ALLOWED_FRAMEWORKS);
            }
        }

        if (request.getCode().getBytes(StandardCharsets.UTF_8).length > appProperties.getExecution()
                .getMaxFileSizeBytes()) {
            throw new BadRequestException("Code exceeds maximum allowed size of "
                    + appProperties.getExecution().getMaxFileSizeBytes() + " bytes");
        }

        log.info("POST /api/v1/analyze (JSON) — user={}, language={}, codeLength={}, framework={}",
                user.getId(), normalizedLanguage, request.getCode().length(), normalizedFramework);

        request = AnalyzeRequest.builder()
                .code(request.getCode())
                .logs(request.getLogs())
                .language(normalizedLanguage)
                .filename(request.getFilename())
                .frameworkType(normalizedFramework)
                .build();

        SessionDetailResponse response = orchestrationService.analyzeCode(user, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(response, "Analysis pipeline started"));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private User resolveUser(UserPrincipal principal) {
        if (principal == null) {
            throw new BadRequestException("Authentication required. Please sign in.");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "id", principal.getId().toString()));
    }

    private String readFileToString(MultipartFile file, String fieldName) {
        try {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to read {} file: {}", fieldName, e.getMessage());
            throw new BadRequestException("Failed to read " + fieldName + " file: " + e.getMessage());
        }
    }
}